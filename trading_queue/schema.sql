-- New, isolated tables for the Flask queue. These do not alter the Apexium app's
-- existing "trades" table. Apply through the database's approved migration path.
CREATE TABLE IF NOT EXISTS apx_trade_licenses (
    id VARCHAR(36) PRIMARY KEY,
    key_hash CHAR(64) NOT NULL UNIQUE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS apx_trade_queue (
    id VARCHAR(36) PRIMARY KEY,
    license_id VARCHAR(36) NOT NULL REFERENCES apx_trade_licenses(id) ON DELETE RESTRICT,
    client_request_id VARCHAR(100),
    symbol VARCHAR(32) NOT NULL,
    action VARCHAR(4) NOT NULL CHECK (action IN ('BUY', 'SELL')),
    signal_bias VARCHAR(16) NOT NULL,
    volume NUMERIC(16, 6) NOT NULL CHECK (volume > 0),
    entry_zone_low NUMERIC(24, 10) NOT NULL CHECK (entry_zone_low > 0),
    entry_zone_high NUMERIC(24, 10) NOT NULL CHECK (entry_zone_high > 0),
    stop_loss NUMERIC(24, 10) NOT NULL CHECK (stop_loss > 0),
    take_profit_1 NUMERIC(24, 10) NOT NULL CHECK (take_profit_1 > 0),
    take_profit_2 NUMERIC(24, 10),
    market_context VARCHAR(500) NOT NULL,
    invalidations_rationale VARCHAR(1000) NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'submitted', 'partial', 'filled', 'rejected', 'failed')),
    attempts INTEGER NOT NULL DEFAULT 0,
    claimed_at TIMESTAMPTZ,
    claim_token_hash CHAR(64),
    result_message VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_apx_queue_client_request UNIQUE (license_id, client_request_id)
);

CREATE INDEX IF NOT EXISTS ix_apx_queue_license_status_created
    ON apx_trade_queue(license_id, status, created_at);