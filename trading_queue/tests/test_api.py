import unittest

from trading_queue import create_app, db
from trading_queue.models import License, QueuedTrade
from trading_queue.security import hash_secret


class QueueApiTests(unittest.TestCase):
    def setUp(self):
        self.app = create_app(
            {
                "TESTING": True,
                "SQLALCHEMY_DATABASE_URI": "sqlite://",
                "SQLALCHEMY_ENGINE_OPTIONS": {"pool_pre_ping": True},
                "MAX_TRADE_VOLUME": "1.00",
                "CORS_ALLOWED_ORIGINS": ["https://apexium.example"],
            }
        )
        self.context = self.app.app_context()
        self.context.push()
        db.create_all()
        self.license_key = "test-license-key-that-is-long-enough"
        db.session.add(License(id="test-license", key_hash=hash_secret(self.license_key), active=True))
        db.session.commit()
        self.client = self.app.test_client()
        self.headers = {"X-License-Key": self.license_key}

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        db.engine.dispose()
        self.context.pop()

    def valid_payload(self):
        return {
            "symbol": "EURUSD",
            "signal_bias": "BUY",
            "market_context": "Price is holding above a visible support zone.",
            "entry_zone_low": 1.1000,
            "entry_zone_high": 1.1010,
            "stop_loss": 1.0980,
            "take_profit_1": 1.1060,
            "take_profit_2": 1.1090,
            "invalidations_rationale": "A close below the marked support invalidates the long setup.",
            "volume": 0.01,
        }

    def test_trade_is_queued_claimed_once_and_acknowledged(self):
        response = self.client.post(
            "/api/execute-trade",
            json=self.valid_payload(),
            headers={**self.headers, "Idempotency-Key": "request-1"},
        )
        self.assertEqual(response.status_code, 201)
        trade_id = response.get_json()["trade_id"]

        claimed = self.client.get("/api/get-pending-trade", headers=self.headers)
        self.assertEqual(claimed.status_code, 200)
        trade = claimed.get_json()["trade"]
        self.assertEqual(trade["id"], trade_id)
        self.assertEqual(trade["action"], "BUY")
        self.assertTrue(trade["claim_token"])
        self.assertEqual(db.session.get(QueuedTrade, trade_id).status, "processing")

        empty = self.client.get("/api/get-pending-trade", headers=self.headers)
        self.assertIsNone(empty.get_json()["trade"])

        acknowledged = self.client.post(
            f"/api/trades/{trade_id}/result",
            json={"status": "filled", "claim_token": trade["claim_token"], "message": "Order accepted"},
            headers=self.headers,
        )
        self.assertEqual(acknowledged.status_code, 200)
        self.assertEqual(db.session.get(QueuedTrade, trade_id).status, "filled")

    def test_risk_reward_below_minimum_is_rejected(self):
        payload = self.valid_payload()
        payload["take_profit_1"] = 1.1040  # 1:1 from the worst entry, below 1:1.5.
        response = self.client.post("/api/execute-trade", json=payload, headers=self.headers)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.get_json()["error"], "invalid_trade")

    def test_license_is_required_and_not_accepted_in_query_string(self):
        response = self.client.post("/api/execute-trade", json=self.valid_payload())
        self.assertEqual(response.status_code, 401)
        response = self.client.get(f"/api/get-pending-trade?key={self.license_key}")
        self.assertEqual(response.status_code, 401)

    def test_idempotency_key_prevents_duplicate_queue_entries(self):
        headers = {**self.headers, "Idempotency-Key": "same-request"}
        first = self.client.post("/api/execute-trade", json=self.valid_payload(), headers=headers)
        second = self.client.post("/api/execute-trade", json=self.valid_payload(), headers=headers)
        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 200)
        self.assertTrue(second.get_json()["duplicate"])
        self.assertEqual(QueuedTrade.query.count(), 1)

    def test_claim_token_cannot_be_reused_or_forged(self):
        created = self.client.post("/api/execute-trade", json=self.valid_payload(), headers=self.headers)
        trade_id = created.get_json()["trade_id"]
        claim = self.client.get("/api/get-pending-trade", headers=self.headers).get_json()["trade"]
        response = self.client.post(
            f"/api/trades/{trade_id}/result",
            json={"status": "filled", "claim_token": "wrong-token"},
            headers=self.headers,
        )
        self.assertEqual(response.status_code, 409)
        self.assertEqual(db.session.get(QueuedTrade, trade_id).status, "processing")
        self.assertTrue(claim["claim_token"])

    def test_cors_allows_only_configured_origins(self):
        allowed = self.client.options(
            "/api/execute-trade",
            headers={
                "Origin": "https://apexium.example",
                "Access-Control-Request-Method": "POST",
            },
        )
        self.assertEqual(allowed.headers.get("Access-Control-Allow-Origin"), "https://apexium.example")
        denied = self.client.options(
            "/api/execute-trade",
            headers={"Origin": "https://attacker.example"},
        )
        self.assertIsNone(denied.headers.get("Access-Control-Allow-Origin"))

    def test_health_endpoint_reports_database_connectivity(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["ok"], True)

    def test_neutral_signal_cannot_be_queued(self):
        payload = self.valid_payload()
        payload["signal_bias"] = "NEUTRAL"
        response = self.client.post("/api/execute-trade", json=payload, headers=self.headers)
        self.assertEqual(response.status_code, 400)

    def test_non_positive_optional_take_profit_is_rejected(self):
        payload = self.valid_payload()
        payload["take_profit_2"] = -1
        response = self.client.post("/api/execute-trade", json=payload, headers=self.headers)
        self.assertEqual(response.status_code, 400)


if __name__ == "__main__":
    unittest.main()