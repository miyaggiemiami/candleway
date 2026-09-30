"""Standalone Flask trade-queue service; separate from the Apexium web API."""

from __future__ import annotations

import os
from pathlib import Path
from decimal import Decimal, InvalidOperation

from flask import Flask, request
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


db = SQLAlchemy(model_class=Base)


def normalize_database_url(value: str) -> str:
    """Use psycopg 3 explicitly for PostgreSQL URLs."""
    if value.startswith("postgres://"):
        return "postgresql+psycopg://" + value.removeprefix("postgres://")
    if value.startswith("postgresql://"):
        return "postgresql+psycopg://" + value.removeprefix("postgresql://")
    return value


def create_app(test_config: dict | None = None) -> Flask:
    app = Flask(__name__)

    configured_url = (test_config or {}).get("SQLALCHEMY_DATABASE_URI")
    database_url = configured_url or os.getenv("TRADING_QUEUE_DATABASE_URL") or os.getenv("DATABASE_URL")
    if not database_url:
        # Avoid silently creating an ephemeral database in a deployment that
        # was not explicitly marked as development.
        if os.getenv("APP_ENV", "").lower() != "development":
            raise RuntimeError(
                "TRADING_QUEUE_DATABASE_URL or DATABASE_URL is required; "
                "use trading_queue.dev for isolated local development"
            )
        data_dir = Path(__file__).resolve().parent / "data"
        data_dir.mkdir(parents=True, exist_ok=True)
        database_url = f"sqlite:///{data_dir / 'queue-dev.sqlite3'}"

    database_url = normalize_database_url(database_url)
    if os.getenv("APP_ENV", "").lower() == "production" and database_url.startswith("sqlite:"):
        raise RuntimeError("SQLite is for local development only; production requires PostgreSQL")

    app.config.update(
        SQLALCHEMY_DATABASE_URI=database_url,
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        SQLALCHEMY_ENGINE_OPTIONS={"pool_pre_ping": True},
        MAX_CONTENT_LENGTH=64 * 1024,
        CLAIM_LEASE_SECONDS=max(30, int(os.getenv("QUEUE_CLAIM_LEASE_SECONDS", "180"))),
        MAX_CLAIM_ATTEMPTS=max(1, int(os.getenv("QUEUE_MAX_CLAIM_ATTEMPTS", "5"))),
        MAX_TRADE_VOLUME=os.getenv("QUEUE_MAX_TRADE_VOLUME", "1.00"),
        ALLOW_SCHEMA_CREATE=os.getenv("TRADING_QUEUE_AUTO_CREATE_SCHEMA", "").lower() == "true",
        CORS_ALLOWED_ORIGINS=[
            origin.strip()
            for origin in os.getenv("TRADING_QUEUE_ALLOWED_ORIGINS", "").split(",")
            if origin.strip()
        ],
    )
    if test_config:
        app.config.update(test_config)
    try:
        max_volume = Decimal(str(app.config["MAX_TRADE_VOLUME"]))
    except InvalidOperation as exc:
        raise RuntimeError("QUEUE_MAX_TRADE_VOLUME must be a positive decimal number") from exc
    if not max_volume.is_finite() or max_volume <= 0:
        raise RuntimeError("QUEUE_MAX_TRADE_VOLUME must be a positive decimal number")
    if (
        os.getenv("APP_ENV", "").lower() == "production"
        and app.config["ALLOW_SCHEMA_CREATE"]
    ):
        raise RuntimeError("Automatic schema creation is disabled in production")

    db.init_app(app)

    # Importing models registers their tables with SQLAlchemy metadata. DDL is
    # deliberately opt-in and is never run against an existing app database
    # merely because the service started.
    from . import models  # noqa: F401
    from .routes import queue_api

    app.register_blueprint(queue_api)

    @app.after_request
    def cors_headers(response):
        # Reflect only an explicitly configured origin. Native clients without
        # an Origin header do not need CORS.
        origin = request.headers.get("Origin")
        if origin and origin in app.config["CORS_ALLOWED_ORIGINS"]:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Vary"] = "Origin"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
            response.headers["Access-Control-Allow-Headers"] = (
                "Content-Type, X-License-Key, Idempotency-Key"
            )
            response.headers["Access-Control-Max-Age"] = "600"
        return response

    @app.get("/health")
    def health():
        from sqlalchemy import text

        try:
            db.session.execute(text("SELECT 1"))
        except Exception:
            db.session.rollback()
            return {"ok": False, "database": "unavailable"}, 503
        return {"ok": True, "service": "apexium-trading-queue"}

    if app.config["ALLOW_SCHEMA_CREATE"]:
        with app.app_context():
            db.create_all()

    return app