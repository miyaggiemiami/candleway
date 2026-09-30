"""Create one license and print its secret once. Run only from an operator shell."""

from __future__ import annotations

import uuid

from dotenv import load_dotenv

from trading_queue import create_app, db
from trading_queue.models import License
from trading_queue.security import hash_secret


def main() -> None:
    load_dotenv()
    app = create_app()
    import secrets

    raw_key = secrets.token_urlsafe(32)
    with app.app_context():
        record = License(id=str(uuid.uuid4()), key_hash=hash_secret(raw_key), active=True)
        db.session.add(record)
        db.session.commit()
    print("License created. Copy this key to the customer configuration now; it cannot be retrieved later:")
    print(raw_key)


if __name__ == "__main__":
    main()