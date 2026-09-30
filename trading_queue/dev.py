"""Run the isolated Flask API against its own local SQLite database."""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv


def main() -> None:
    load_dotenv()
    data_dir = Path(__file__).resolve().parent / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    database_file = data_dir / "queue-dev.sqlite3"

    # Explicitly isolate the development service from the root app's configured
    # PostgreSQL database. Schema creation is enabled only for this local SQLite.
    os.environ["TRADING_QUEUE_DATABASE_URL"] = f"sqlite:///{database_file}"
    os.environ["TRADING_QUEUE_AUTO_CREATE_SCHEMA"] = "true"
    os.environ["APP_ENV"] = "development"
    os.environ["TRADING_QUEUE_PORT"] = "8000"

    from trading_queue.api import app

    app.run(host="0.0.0.0", port=int(os.getenv("TRADING_QUEUE_PORT", "8000")), debug=False)


if __name__ == "__main__":
    main()