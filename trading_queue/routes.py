from __future__ import annotations

import os
import re
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal, InvalidOperation

from flask import Blueprint, current_app, jsonify, request
from sqlalchemy import and_, or_
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from . import db
from .models import License, QueuedTrade, utc_now
from .security import hash_secret, secrets_match


queue_api = Blueprint("trading_queue_api", __name__)
SYMBOL_RE = re.compile(r"^[A-Za-z0-9._-]{1,32}$")
BIAS_TO_ACTION = {
    "STRONG_BUY": "BUY",
    "BUY": "BUY",
    "SELL": "SELL",
    "STRONG_SELL": "SELL",
}


def authenticated_license():
    raw_key = request.headers.get("X-License-Key", "").strip()
    if not raw_key or len(raw_key) > 256:
        return None, (jsonify(error="invalid_license"), 401)

    license_record = License.query.filter_by(key_hash=hash_secret(raw_key)).first()
    if not license_record or not license_record.active:
        return None, (jsonify(error="invalid_license"), 401)
    return license_record, None


def parse_decimal(payload: dict, field: str, *, nullable: bool = False) -> Decimal | None:
    value = payload.get(field)
    if value is None and nullable:
        return None
    if isinstance(value, bool) or value is None:
        raise ValueError(f"{field} must be a number")
    try:
        result = Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError) as exc:
        raise ValueError(f"{field} must be a number") from exc
    if not result.is_finite():
        raise ValueError(f"{field} must be finite")
    return result


def validate_trade(payload: object) -> dict:
    if not isinstance(payload, dict):
        raise ValueError("request body must be a JSON object")

    bias = payload.get("signal_bias")
    action = BIAS_TO_ACTION.get(bias) if isinstance(bias, str) else None
    if not action:
        raise ValueError("signal_bias must be BUY, STRONG_BUY, SELL, or STRONG_SELL")

    symbol = payload.get("symbol")
    if not isinstance(symbol, str) or not SYMBOL_RE.fullmatch(symbol):
        raise ValueError("symbol must contain 1-32 letters, digits, dots, underscores, or hyphens")
    if symbol.upper() in {"UNKNOWN", "N/A"}:
        raise ValueError("a chart with an unidentified symbol cannot be queued")

    # The vision parser returns only the documented price schema. These
    # optional operator annotations remain accepted for richer app clients.
    context = payload.get("market_context", "")
    rationale = payload.get("invalidations_rationale", "")
    if not isinstance(context, str) or len(context) > 500:
        raise ValueError("market_context must be a string of at most 500 characters")
    if not isinstance(rationale, str) or len(rationale) > 1000:
        raise ValueError("invalidations_rationale must be a string of at most 1000 characters")

    volume = parse_decimal(payload, "volume")
    low = parse_decimal(payload, "entry_zone_low")
    high = parse_decimal(payload, "entry_zone_high")
    stop = parse_decimal(payload, "stop_loss")
    tp1 = parse_decimal(payload, "take_profit_1")
    tp2 = parse_decimal(payload, "take_profit_2", nullable=True)
    if any(value <= 0 for value in (volume, low, high, stop, tp1)):
        raise ValueError("volume and all required prices must be positive")
    if tp2 is not None and tp2 <= 0:
        raise ValueError("take_profit_2 must be positive when supplied")
    if volume.as_tuple().exponent < -6:
        raise ValueError("volume supports at most 6 decimal places")
    for name, value in (
        ("entry_zone_low", low),
        ("entry_zone_high", high),
        ("stop_loss", stop),
        ("take_profit_1", tp1),
        ("take_profit_2", tp2),
    ):
        if value is None:
            continue
        if value.adjusted() >= 14:
            raise ValueError(f"{name} exceeds the supported price range")
        if value.as_tuple().exponent < -10:
            raise ValueError(f"{name} supports at most 10 decimal places")
    if low > high:
        raise ValueError("entry_zone_low must be less than or equal to entry_zone_high")

    max_volume = Decimal(str(current_app.config["MAX_TRADE_VOLUME"]))
    if volume > max_volume:
        raise ValueError(f"volume exceeds the configured maximum of {max_volume}")

    if action == "BUY":
        if not stop < low:
            raise ValueError("BUY stop_loss must be below the entry zone")
        if not tp1 > high:
            raise ValueError("BUY take_profit_1 must be above the entry zone")
        risk = high - stop
        reward = tp1 - high
        if tp2 is not None and tp2 <= tp1:
            raise ValueError("BUY take_profit_2 must be above take_profit_1")
    else:
        if not stop > high:
            raise ValueError("SELL stop_loss must be above the entry zone")
        if not tp1 < low:
            raise ValueError("SELL take_profit_1 must be below the entry zone")
        risk = stop - low
        reward = low - tp1
        if tp2 is not None and tp2 >= tp1:
            raise ValueError("SELL take_profit_2 must be below take_profit_1")
    if risk <= 0 or reward < Decimal("1.5") * risk:
        raise ValueError("take_profit_1 must provide at least 1.5:1 reward-to-risk from the worst entry")

    client_request_id = request.headers.get("Idempotency-Key")
    if client_request_id is not None:
        client_request_id = client_request_id.strip()
        if not client_request_id or len(client_request_id) > 100:
            raise ValueError("Idempotency-Key must contain 1-100 characters")

    return {
        "client_request_id": client_request_id,
        "symbol": symbol,
        "action": action,
        "signal_bias": bias,
        "volume": volume,
        "entry_zone_low": low,
        "entry_zone_high": high,
        "stop_loss": stop,
        "take_profit_1": tp1,
        "take_profit_2": tp2,
        "market_context": context.strip(),
        "invalidations_rationale": rationale.strip(),
    }


@queue_api.post("/api/execute-trade")
def enqueue_trade():
    license_record, error_response = authenticated_license()
    if error_response:
        return error_response

    try:
        values = validate_trade(request.get_json(silent=True))
    except ValueError as exc:
        return jsonify(error="invalid_trade", message=str(exc)), 400

    client_request_id = values.pop("client_request_id")
    if client_request_id:
        existing = QueuedTrade.query.filter_by(
            license_id=license_record.id,
            client_request_id=client_request_id,
        ).first()
        if existing:
            return jsonify(trade_id=existing.id, status=existing.status, duplicate=True), 200

    trade = QueuedTrade(
        id=str(uuid.uuid4()),
        license_id=license_record.id,
        client_request_id=client_request_id,
        **values,
    )
    db.session.add(trade)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        # A concurrent request with the same idempotency key won the insert.
        if client_request_id:
            existing = QueuedTrade.query.filter_by(
                license_id=license_record.id,
                client_request_id=client_request_id,
            ).first()
            if existing:
                return jsonify(trade_id=existing.id, status=existing.status, duplicate=True), 200
        current_app.logger.exception("Unable to enqueue a validated trade")
        return jsonify(error="trade_could_not_be_queued"), 500

    return jsonify(trade_id=trade.id, status=trade.status), 201


@queue_api.get("/api/get-pending-trade")
def claim_pending_trade():
    license_record, error_response = authenticated_license()
    if error_response:
        return error_response

    now = utc_now()
    lease_cutoff = now - timedelta(seconds=current_app.config["CLAIM_LEASE_SECONDS"])
    max_attempts = current_app.config["MAX_CLAIM_ATTEMPTS"]

    # A crashed client cannot strand a trade forever. Trades whose claim lease
    # expired too many times are terminally failed before selecting a new one.
    QueuedTrade.query.filter(
        QueuedTrade.license_id == license_record.id,
        QueuedTrade.status == "processing",
        QueuedTrade.claimed_at < lease_cutoff,
        QueuedTrade.attempts >= max_attempts,
    ).update(
        {
            QueuedTrade.status: "failed",
            QueuedTrade.result_message: "Claim lease expired too many times",
            QueuedTrade.updated_at: now,
        },
        synchronize_session=False,
    )

    candidate = (
        QueuedTrade.query.filter(
            QueuedTrade.license_id == license_record.id,
            QueuedTrade.attempts < max_attempts,
            or_(
                QueuedTrade.status == "pending",
                and_(
                    QueuedTrade.status == "processing",
                    QueuedTrade.claimed_at < lease_cutoff,
                ),
            ),
        )
        .order_by(QueuedTrade.created_at.asc(), QueuedTrade.id.asc())
        .with_for_update(skip_locked=True)
        .first()
    )
    if candidate is None:
        db.session.commit()
        return jsonify(trade=None), 200

    claim_token = secrets.token_urlsafe(32)
    candidate.status = "processing"
    candidate.claimed_at = now
    candidate.claim_token_hash = hash_secret(claim_token)
    candidate.attempts += 1
    candidate.updated_at = now
    db.session.commit()

    return jsonify(
        trade={
            "id": candidate.id,
            "symbol": candidate.symbol,
            "action": candidate.action,
            "signal_bias": candidate.signal_bias,
            "volume": float(candidate.volume),
            "entry_zone_low": float(candidate.entry_zone_low),
            "entry_zone_high": float(candidate.entry_zone_high),
            "stop_loss": float(candidate.stop_loss),
            "take_profit_1": float(candidate.take_profit_1),
            "take_profit_2": (
                float(candidate.take_profit_2) if candidate.take_profit_2 is not None else None
            ),
            "market_context": candidate.market_context,
            "invalidations_rationale": candidate.invalidations_rationale,
            "claim_token": claim_token,
            "attempt": candidate.attempts,
        }
    ), 200


@queue_api.post("/api/trades/<trade_id>/result")
def report_trade_result(trade_id: str):
    license_record, error_response = authenticated_license()
    if error_response:
        return error_response

    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify(error="invalid_result"), 400
    status = payload.get("status")
    claim_token = payload.get("claim_token")
    message = payload.get("message", "")
    if status not in {"submitted", "partial", "filled", "rejected", "failed"}:
        return jsonify(
            error="invalid_result",
            message="status must be submitted, partial, filled, rejected, or failed",
        ), 400
    if not isinstance(claim_token, str) or not claim_token or len(claim_token) > 256:
        return jsonify(error="invalid_result", message="claim_token is required"), 400
    if not isinstance(message, str):
        return jsonify(error="invalid_result", message="message must be a string"), 400

    trade = QueuedTrade.query.filter_by(id=trade_id, license_id=license_record.id).first()
    if not trade:
        return jsonify(error="trade_not_found"), 404
    if trade.status != "processing" or not secrets_match(claim_token, trade.claim_token_hash):
        return jsonify(error="claim_not_current"), 409

    trade.status = status
    trade.result_message = message.strip()[:500] or None
    trade.updated_at = datetime.now(timezone.utc)
    trade.claim_token_hash = None
    db.session.commit()
    return jsonify(trade_id=trade.id, status=trade.status), 200


@queue_api.errorhandler(SQLAlchemyError)
def handle_database_error(_error):
    db.session.rollback()
    current_app.logger.exception("Trading queue database operation failed")
    return jsonify(error="database_unavailable"), 503