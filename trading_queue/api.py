from __future__ import annotations

import os

from dotenv import load_dotenv

from trading_queue import create_app


load_dotenv()
app = create_app()


if __name__ == "__main__":
    port = int(os.getenv("TRADING_QUEUE_PORT", os.getenv("PORT", "8000")))
    app.run(host="0.0.0.0", port=port, debug=False)