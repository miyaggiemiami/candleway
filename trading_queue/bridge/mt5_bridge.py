"""Windows-side Apexium queue poller and MetaTrader 5 execution bridge.

Trading is disabled on real accounts by default. Configure this client locally;
never commit the .env file containing its license key.
"""

from __future__ import annotations

import logging
import os
import signal
import sys
import threading
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import requests
from dotenv import load_dotenv

try:
    import MetaTrader5 as mt5
except ImportError:
    mt5 = None  # The MetaTrader5 package is Windows-only.


def app_directory() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parent


load_dotenv(app_directory() / ".env")
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s %(levelname)s %(message)s",
)
logger = logging.getLogger("apexium-mt5-bridge")

API_URL = os.getenv("TRADING_QUEUE_URL", "").rstrip("/")
LICENSE_KEY = os.getenv("TRADING_QUEUE_LICENSE_KEY", "")
POLL_SECONDS = max(1, int(os.getenv("POLL_SECONDS", "2")))
MONITOR_SECONDS = max(2, int(os.getenv("MONITOR_SECONDS", "5")))
MAGIC = int(os.getenv("MT5_MAGIC", "234000"))
DEVIATION_POINTS = max(0, int(os.getenv("MT5_DEVIATION_POINTS", "20")))
ALLOW_LIVE_TRADING = os.getenv("MT5_ALLOW_LIVE_TRADING", "false").lower() == "true"
STOP_EVENT = threading.Event()
HTTP = requests.Session()


def _headers() -> dict[str, str]:
    return {"X-License-Key": LICENSE_KEY, "Accept": "application/json"}


def _report_result(trade: dict[str, Any], status: str, message: str) -> None:
    endpoint = f"{API_URL}/api/trades/{trade['id']}/result"
    try:
        response = HTTP.post(
            endpoint,
            headers=_headers(),
            json={
                "status": status,
                "claim_token": trade["claim_token"],
                "message": message[:500],
            },
            timeout=15,
        )
        response.raise_for_status()
        logger.info("Queue item %s acknowledged as %s", trade["id"], status)
    except requests.RequestException as exc:
        # The server lease will eventually expire. Before a retry, the bridge
        # searches MT5 positions and recent deals for the same order comment.
        logger.error("Could not acknowledge queue item %s: %s", trade.get("id"), exc)


def _pip_size(symbol_info: Any) -> float:
    overrides = os.getenv("MT5_PIP_SIZE_OVERRIDES", "")
    for item in overrides.split(","):
        if ":" not in item:
            continue
        name, raw_size = item.split(":", 1)
        if name.strip().upper() == symbol_info.name.upper():
            try:
                value = float(raw_size.strip())
                if value > 0:
                    return value
            except ValueError:
                logger.warning("Ignoring invalid pip-size override for %s", name)
    point = float(symbol_info.point)
    digits = int(symbol_info.digits)
    return point * 10 if digits in (3, 5) else point


def _matching_existing_order(symbol: str, comment: str) -> bool:
    positions = mt5.positions_get(symbol=symbol) or ()
    if any(
        getattr(position, "magic", None) == MAGIC
        and getattr(position, "comment", "") == comment
        for position in positions
    ):
        return True
    start = datetime.now(timezone.utc) - timedelta(days=7)
    end = datetime.now(timezone.utc)
    try:
        deals = mt5.history_deals_get(start, end) or ()
    except Exception:
        return False
    return any(
        getattr(deal, "magic", None) == MAGIC
        and getattr(deal, "symbol", None) == symbol
        and getattr(deal, "comment", "") == comment
        for deal in deals
    )


def _volume_is_valid(symbol_info: Any, volume: float) -> bool:
    minimum = float(symbol_info.volume_min)
    maximum = float(symbol_info.volume_max)
    step = float(symbol_info.volume_step)
    if step <= 0 or volume < minimum or volume > maximum:
        return False
    steps = round((volume - minimum) / step)
    aligned = minimum + steps * step
    return abs(aligned - volume) <= max(1e-8, step * 1e-6)


def _validate_execution_price(trade: dict[str, Any], info: Any, tick: Any) -> tuple[float, str | None]:
    action = trade["action"]
    price = float(tick.ask if action == "BUY" else tick.bid)
    low = float(trade["entry_zone_low"])
    high = float(trade["entry_zone_high"])
    stop = float(trade["stop_loss"])
    take_profit = float(trade["take_profit_1"])

    if not low <= price <= high:
        return price, "Current market price is outside the approved entry zone"
    if action == "BUY" and not (stop < price < take_profit):
        return price, "BUY stop-loss or take-profit is on the wrong side of market price"
    if action == "SELL" and not (take_profit < price < stop):
        return price, "SELL stop-loss or take-profit is on the wrong side of market price"

    min_points = max(
        int(getattr(info, "trade_stops_level", 0) or 0),
        int(getattr(info, "trade_freeze_level", 0) or 0),
    )
    min_distance = min_points * float(info.point)
    if action == "BUY" and (price - stop < min_distance or take_profit - price < min_distance):
        return price, "Trade targets are closer than the broker's minimum stop distance"
    if action == "SELL" and (stop - price < min_distance or price - take_profit < min_distance):
        return price, "Trade targets are closer than the broker's minimum stop distance"
    return price, None


def execute_trade(trade: dict[str, Any]) -> None:
    status = "failed"
    message = "Execution did not complete"
    try:
        symbol = str(trade["symbol"])
        if not mt5.symbol_select(symbol, True):
            status, message = "rejected", f"Symbol is unavailable in this MT5 terminal: {symbol}"
            return
        info = mt5.symbol_info(symbol)
        tick = mt5.symbol_info_tick(symbol)
        if info is None or tick is None:
            status, message = "failed", f"Could not read symbol information or tick for {symbol}"
            return

        comment = f"APX-{trade['id'].replace('-', '')[:24]}"
        if _matching_existing_order(symbol, comment):
            status, message = "filled", "Matching MT5 order already exists; duplicate send prevented"
            return

        volume = float(trade["volume"])
        if not _volume_is_valid(info, volume):
            status, message = "rejected", "Requested volume is not valid for this broker symbol"
            return
        price, issue = _validate_execution_price(trade, info, tick)
        if issue:
            status, message = "rejected", issue
            return

        is_buy = trade["action"] == "BUY"
        request_data = {
            "action": mt5.TRADE_ACTION_DEAL,
            "symbol": symbol,
            "volume": volume,
            "type": mt5.ORDER_TYPE_BUY if is_buy else mt5.ORDER_TYPE_SELL,
            "price": price,
            "sl": float(trade["stop_loss"]),
            # TP1 is attached directly to the broker order as requested.
            "tp": float(trade["take_profit_1"]),
            "deviation": DEVIATION_POINTS,
            "magic": MAGIC,
            "comment": comment,
            "type_time": mt5.ORDER_TIME_GTC,
            "type_filling": mt5.ORDER_FILLING_IOC,
        }
        result = mt5.order_send(request_data)
        if result is not None and result.retcode == mt5.TRADE_RETCODE_INVALID_FILL:
            request_data["type_filling"] = mt5.ORDER_FILLING_FOK
            result = mt5.order_send(request_data)
        if result is None:
            status, message = "failed", f"MT5 order_send returned no result: {mt5.last_error()}"
            return

        filled_codes = {
            mt5.TRADE_RETCODE_DONE,
            mt5.TRADE_RETCODE_DONE_PARTIAL,
        }
        if result.retcode in filled_codes:
            if result.retcode == mt5.TRADE_RETCODE_DONE_PARTIAL:
                status = "partial"
                message = f"MT5 partially filled order; retcode={result.retcode}; order={result.order}"
            else:
                status = "filled"
                message = f"MT5 filled order; retcode={result.retcode}; order={result.order}"
            logger.info("Queue item %s: %s", trade["id"], message)
        elif result.retcode == mt5.TRADE_RETCODE_PLACED:
            status = "submitted"
            message = f"MT5 accepted order for processing; retcode={result.retcode}; order={result.order}"
            logger.info("Queue item %s: %s", trade["id"], message)
        else:
            status = "rejected"
            message = f"MT5 rejected order; retcode={result.retcode}; {result.comment}"
            logger.warning("Queue item %s: %s", trade["id"], message)
    except (KeyError, TypeError, ValueError, RuntimeError) as exc:
        status, message = "failed", f"Invalid trade or MT5 execution error: {exc}"
        logger.exception("Queue item %s failed", trade.get("id"))
    except Exception as exc:
        status, message = "failed", f"Unexpected MT5 execution error: {exc}"
        logger.exception("Queue item %s failed unexpectedly", trade.get("id"))
    finally:
        _report_result(trade, status, message)


def _move_stop_to_break_even(position: Any) -> None:
    info = mt5.symbol_info(position.symbol)
    tick = mt5.symbol_info_tick(position.symbol)
    if info is None or tick is None:
        return

    pip = _pip_size(info)
    point = float(info.point)
    entry = float(position.price_open)
    is_buy = position.type == mt5.POSITION_TYPE_BUY
    market_price = float(tick.bid if is_buy else tick.ask)
    profit_pips = (market_price - entry) / pip if is_buy else (entry - market_price) / pip
    if profit_pips < 30:
        return

    desired_sl = entry + 2 * pip if is_buy else entry - 2 * pip
    digits = int(info.digits)
    desired_sl = round(desired_sl, digits)
    current_sl = float(position.sl or 0)
    if is_buy and current_sl >= desired_sl:
        return
    if not is_buy and current_sl != 0 and current_sl <= desired_sl:
        return

    minimum_gap = max(
        int(getattr(info, "trade_stops_level", 0) or 0),
        int(getattr(info, "trade_freeze_level", 0) or 0),
    ) * point
    if is_buy and market_price - desired_sl < minimum_gap:
        return
    if not is_buy and desired_sl - market_price < minimum_gap:
        return

    result = mt5.order_send(
        {
            "action": mt5.TRADE_ACTION_SLTP,
            "position": position.ticket,
            "symbol": position.symbol,
            "sl": desired_sl,
            "tp": float(position.tp or 0),
            "magic": MAGIC,
        }
    )
    if result is None:
        logger.warning("Break-even update failed for position %s: %s", position.ticket, mt5.last_error())
    elif result.retcode == mt5.TRADE_RETCODE_DONE:
        logger.info("Position %s stop moved to break-even +2 pips", position.ticket)
    else:
        logger.warning(
            "Break-even update rejected for position %s: retcode=%s %s",
            position.ticket,
            result.retcode,
            result.comment,
        )


def monitor_positions() -> None:
    logger.info("Position monitor started (magic=%s)", MAGIC)
    while not STOP_EVENT.is_set():
        try:
            positions = mt5.positions_get()
            if positions is not None:
                for position in positions:
                    if getattr(position, "magic", None) == MAGIC:
                        _move_stop_to_break_even(position)
        except Exception:
            logger.exception("Position monitor iteration failed")
        STOP_EVENT.wait(MONITOR_SECONDS)


def poll_queue() -> None:
    logger.info("Polling trading queue every %s seconds", POLL_SECONDS)
    while not STOP_EVENT.is_set():
        try:
            response = HTTP.get(
                f"{API_URL}/api/get-pending-trade",
                headers=_headers(),
                timeout=20,
            )
            if response.status_code == 200:
                trade = response.json().get("trade")
                if trade:
                    logger.info("Claimed queue item %s (%s %s)", trade["id"], trade["action"], trade["symbol"])
                    execute_trade(trade)
            elif response.status_code == 401:
                logger.error("License key was rejected. Stopping the client.")
                STOP_EVENT.set()
            else:
                logger.warning("Queue returned HTTP %s: %s", response.status_code, response.text[:300])
        except (requests.RequestException, ValueError, KeyError) as exc:
            logger.warning("Queue poll failed: %s", exc)
        STOP_EVENT.wait(POLL_SECONDS)


def main() -> int:
    if not API_URL.startswith(("https://", "http://")):
        logger.error("Set TRADING_QUEUE_URL to the Flask service URL in bridge/.env")
        return 2
    if not LICENSE_KEY:
        logger.error("Set TRADING_QUEUE_LICENSE_KEY in bridge/.env")
        return 2
    if mt5 is None:
        logger.error("MetaTrader5 is not installed. Run this client on Windows with MetaTrader 5 installed.")
        return 2
    if not mt5.initialize():
        logger.error("MetaTrader 5 initialize failed: %s", mt5.last_error())
        return 2

    account = mt5.account_info()
    if account is None:
        logger.error("Could not read the logged-in MT5 account: %s", mt5.last_error())
        mt5.shutdown()
        return 2
    if account.trade_mode == mt5.ACCOUNT_TRADE_MODE_REAL and not ALLOW_LIVE_TRADING:
        logger.error(
            "Real-account trading is disabled. Use a demo account, or explicitly set "
            "MT5_ALLOW_LIVE_TRADING=true in the local bridge configuration."
        )
        mt5.shutdown()
        return 2

    logger.info(
        "Connected to MT5 account %s; mode=%s; live_trading_enabled=%s",
        account.login,
        account.trade_mode,
        ALLOW_LIVE_TRADING,
    )

    def request_stop(signum, _frame):
        logger.info("Received signal %s; shutting down", signum)
        STOP_EVENT.set()

    signal.signal(signal.SIGINT, request_stop)
    if hasattr(signal, "SIGTERM"):
        signal.signal(signal.SIGTERM, request_stop)

    monitor = threading.Thread(target=monitor_positions, name="position-monitor", daemon=True)
    monitor.start()
    try:
        poll_queue()
    finally:
        STOP_EVENT.set()
        monitor.join(timeout=MONITOR_SECONDS + 2)
        mt5.shutdown()
        HTTP.close()
        logger.info("MT5 bridge stopped")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())