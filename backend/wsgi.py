"""
MediConnect Production WSGI Entrypoint.

This module exposes the Flask application instance 'app' for production
WSGI application servers (Waitress on Windows, Gunicorn on Linux).

Supported Server Execution Patterns:

1. Windows Production (Waitress):
   python -m waitress --listen=127.0.0.1:5000 wsgi:app
   -or-
   waitress-serve --listen=127.0.0.1:5000 --threads=8 wsgi:app

2. Linux Production (Gunicorn):
   gunicorn -w 4 -k gthread --threads 4 -b 127.0.0.1:5000 wsgi:app

3. Direct execution (Diagnostics/Development fallback only):
   python wsgi.py
"""

import os
from app import app

if __name__ == "__main__":
    port = int(os.getenv("FLASK_PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
