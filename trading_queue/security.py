from __future__ import annotations

import hashlib
import hmac


def hash_secret(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def secrets_match(value: str, expected_hash: str | None) -> bool:
    return bool(expected_hash) and hmac.compare_digest(hash_secret(value), expected_hash)