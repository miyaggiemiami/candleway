from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import CheckConstraint, Index, UniqueConstraint

from . import db


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class License(db.Model):
    __tablename__ = "apx_trade_licenses"

    id = db.Column(db.String(36), primary_key=True)
    key_hash = db.Column(db.String(64), nullable=False, unique=True)
    active = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now)


class QueuedTrade(db.Model):
    __tablename__ = "apx_trade_queue"
    __table_args__ = (
        CheckConstraint("volume > 0", name="ck_apx_queue_positive_volume"),
        CheckConstraint(
            "entry_zone_low > 0 AND entry_zone_high > 0 AND stop_loss > 0 AND take_profit_1 > 0",
            name="ck_apx_queue_positive_prices",
        ),
        CheckConstraint(
            "status IN ('pending', 'processing', 'submitted', 'partial', 'filled', 'rejected', 'failed')",
            name="ck_apx_queue_status",
        ),
        CheckConstraint("action IN ('BUY', 'SELL')", name="ck_apx_queue_action"),
        UniqueConstraint("license_id", "client_request_id", name="uq_apx_queue_client_request"),
        Index("ix_apx_queue_license_status_created", "license_id", "status", "created_at"),
    )

    id = db.Column(db.String(36), primary_key=True)
    license_id = db.Column(
        db.String(36),
        db.ForeignKey("apx_trade_licenses.id", ondelete="RESTRICT"),
        nullable=False,
    )
    client_request_id = db.Column(db.String(100), nullable=True)
    symbol = db.Column(db.String(32), nullable=False)
    action = db.Column(db.String(4), nullable=False)
    signal_bias = db.Column(db.String(16), nullable=False)
    volume = db.Column(db.Numeric(16, 6), nullable=False)
    entry_zone_low = db.Column(db.Numeric(24, 10), nullable=False)
    entry_zone_high = db.Column(db.Numeric(24, 10), nullable=False)
    stop_loss = db.Column(db.Numeric(24, 10), nullable=False)
    take_profit_1 = db.Column(db.Numeric(24, 10), nullable=False)
    take_profit_2 = db.Column(db.Numeric(24, 10), nullable=True)
    market_context = db.Column(db.String(500), nullable=False)
    invalidations_rationale = db.Column(db.String(1000), nullable=False)
    status = db.Column(db.String(16), nullable=False, default="pending")
    attempts = db.Column(db.Integer, nullable=False, default=0)
    claimed_at = db.Column(db.DateTime(timezone=True), nullable=True)
    claim_token_hash = db.Column(db.String(64), nullable=True)
    result_message = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)