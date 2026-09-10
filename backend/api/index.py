import os
import sys

# Ensure the backend directory is in sys.path so modules like app, models, config, routes are accessible
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app import app

# Vercel serverless function entrypoint
# Flask's app object implements the standard WSGI interface
handler = app
