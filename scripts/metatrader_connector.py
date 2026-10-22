import json
import sys


def fail(message):
    print(json.dumps({"error": message}))
    return 1


def main():
    try:
        import MetaTrader5 as mt5
    except ImportError:
        return fail(
            "The MetaTrader5 Python package is missing. Install requirements-mt5.txt "
            "in the Python environment used by the app server."
        )

    try:
        request = json.load(sys.stdin)
        login = int(request["login"])
        password = request["password"]
        server = request["server"]
        if not mt5.initialize(login=login, password=password, server=server):
            return fail(f"MT5 initialization failed: {mt5.last_error()}")

        action = request["action"]
        if action == "get-account-info":
            account = mt5.account_info()
            if account is None:
                return fail(f"Could not read MT5 account information: {mt5.last_error()}")
            result = {
                "success": True,
                "account": {
                    "balance": account.balance,
                    "equity": account.equity,
                    "margin": account.margin,
                    "freeMargin": account.margin_free,
                    "leverage": account.leverage,
                    "currency": account.currency,
                    "server": account.server,
                    "platform": "MetaTrader 5",
                },
            }
        elif action == "get-positions":
            positions = mt5.positions_get()
            if positions is None:
                return fail(f"Could not read MT5 positions: {mt5.last_error()}")
            result = {
                "success": True,
                "positions": [
                    {
                        "id": str(position.ticket),
                        "symbol": position.symbol,
                        "type": "BUY" if position.type == mt5.POSITION_TYPE_BUY else "SELL",
                        "volume": position.volume,
                        "openPrice": position.price_open,
                        "profit": position.profit,
                    }
                    for position in positions
                ],
            }
        elif action == "execute-trade":
            result = execute_trade(mt5, request)
        elif action == "close-position":
            result = close_position(mt5, request)
        else:
            return fail("Invalid MT5 action.")

        print(json.dumps(result))
        return 0
    except (KeyError, TypeError, ValueError) as error:
        return fail(f"Invalid MT5 request: {error}")
    except Exception as error:
        return fail(f"MT5 request failed: {error}")
    finally:
        mt5.shutdown()


def execute_trade(mt5, request):
    symbol = request["symbol"].replace("/", "").strip()
    direction = request["direction"]
    volume = float(request["volume"])
    if not symbol or direction not in ("BUY", "SELL") or volume <= 0:
        raise ValueError("A valid symbol, direction, and positive volume are required.")
    if not mt5.symbol_select(symbol, True):
        raise RuntimeError(f"Could not select {symbol}: {mt5.last_error()}")

    tick = mt5.symbol_info_tick(symbol)
    symbol_info = mt5.symbol_info(symbol)
    if tick is None or symbol_info is None:
        raise RuntimeError(f"Could not read the latest {symbol} price: {mt5.last_error()}")

    order_type = mt5.ORDER_TYPE_BUY if direction == "BUY" else mt5.ORDER_TYPE_SELL
    price = tick.ask if direction == "BUY" else tick.bid
    request_data = {
        "action": mt5.TRADE_ACTION_DEAL,
        "symbol": symbol,
        "volume": volume,
        "type": order_type,
        "price": price,
        "deviation": 20,
        "magic": 234000,
        "comment": "Candleway MT5",
        "type_time": mt5.ORDER_TIME_GTC,
    }
    for field, key in (("stopLoss", "sl"), ("takeProfit", "tp")):
        value = request.get(field)
        if value is not None and float(value) > 0:
            request_data[key] = float(value)

    result = send_market_order(mt5, request_data, symbol_info)
    if result.retcode != mt5.TRADE_RETCODE_DONE:
        raise RuntimeError(f"MT5 rejected the order (code {result.retcode}): {result.comment}")
    return {
        "success": True,
        "orderId": str(result.order),
        "price": result.price,
        "retcode": result.retcode,
        "message": result.comment,
    }


def close_position(mt5, request):
    ticket = int(request["positionId"])
    positions = mt5.positions_get(ticket=ticket)
    if not positions:
        raise RuntimeError(f"MT5 position {ticket} was not found.")
    position = positions[0]
    if not mt5.symbol_select(position.symbol, True):
        raise RuntimeError(f"Could not select {position.symbol}: {mt5.last_error()}")
    tick = mt5.symbol_info_tick(position.symbol)
    symbol_info = mt5.symbol_info(position.symbol)
    if tick is None or symbol_info is None:
        raise RuntimeError(f"Could not read the latest {position.symbol} price: {mt5.last_error()}")

    is_buy = position.type == mt5.POSITION_TYPE_BUY
    request_data = {
        "action": mt5.TRADE_ACTION_DEAL,
        "symbol": position.symbol,
        "volume": position.volume,
        "type": mt5.ORDER_TYPE_SELL if is_buy else mt5.ORDER_TYPE_BUY,
        "position": ticket,
        "price": tick.bid if is_buy else tick.ask,
        "deviation": 20,
        "magic": 234000,
        "comment": "Candleway MT5 close",
        "type_time": mt5.ORDER_TIME_GTC,
    }
    result = send_market_order(mt5, request_data, symbol_info)
    if result.retcode != mt5.TRADE_RETCODE_DONE:
        raise RuntimeError(f"MT5 rejected the close request (code {result.retcode}): {result.comment}")
    return {"success": True, "orderId": str(result.order), "message": result.comment}


def send_market_order(mt5, request, symbol_info):
    filling_modes = (
        (mt5.ORDER_FILLING_IOC, mt5.SYMBOL_FILLING_IOC),
        (mt5.ORDER_FILLING_FOK, mt5.SYMBOL_FILLING_FOK),
        (mt5.ORDER_FILLING_RETURN, 0),
    )
    result = None
    for order_mode, symbol_mode in filling_modes:
        if symbol_mode and not symbol_info.filling_mode & symbol_mode:
            continue
        request["type_filling"] = order_mode
        result = mt5.order_send(request)
        if result is None:
            raise RuntimeError(f"MT5 could not send the order: {mt5.last_error()}")
        if result.retcode != mt5.TRADE_RETCODE_INVALID_FILL:
            return result
    if result is None:
        raise RuntimeError("No supported order filling mode is available for this symbol.")
    return result


if __name__ == "__main__":
    sys.exit(main())
