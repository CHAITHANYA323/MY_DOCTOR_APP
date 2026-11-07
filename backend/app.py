import os
import sys
from flask import Flask, jsonify, request
from flask_cors import CORS
from sqlalchemy import text
from config import Config, BASE_DIR
from models import db

# Import Blueprints
from routes.auth import auth_bp
from routes.doctors import doctors_bp
from routes.hospitals import hospitals_bp
from routes.specializations import specializations_bp
from routes.appointments import appointments_bp
from routes.ambulances import ambulances_bp
from routes.dashboard import dashboard_bp
from routes.reviews import reviews_bp

def create_app():
    app = Flask(__name__)

    # Match routes with or without trailing slash
    app.url_map.strict_slashes = False

    # Choose DB URI
    db_uri = Config.get_database_uri()
    app.config['SECRET_KEY'] = Config.SECRET_KEY
    app.config['SQLALCHEMY_DATABASE_URI'] = db_uri
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    # Configure CORS: local development, Vercel preview/production domains, and custom env origins
    allowed_origin_patterns = [
        r"^https?://localhost(:\d+)?$",
        r"^https?://127\.0\.0\.1(:\d+)?$",
        r"^https://.*\.vercel\.app$",
    ]

    custom_origins = os.getenv("ALLOWED_ORIGINS") or os.getenv("FRONTEND_URL")
    if custom_origins:
        for orig in custom_origins.split(","):
            cleaned = orig.strip()
            if cleaned and cleaned not in allowed_origin_patterns:
                allowed_origin_patterns.append(cleaned)

    CORS(
        app,
        resources={r"/*": {"origins": allowed_origin_patterns}},
        allow_headers=["Content-Type", "Authorization", "Accept", "X-Requested-With", "Origin", "Idempotency-Key", "idempotency-key"],
        expose_headers=["Idempotent-Replay"],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        supports_credentials=False,
        max_age=86400
    )

    # Seamless preflight OPTIONS handler
    @app.before_request
    def handle_preflight():
        if request.method == 'OPTIONS':
            response = app.make_default_options_response()
            origin = request.headers.get('Origin')
            if origin:
                response.headers['Access-Control-Allow-Origin'] = origin
                response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, Accept, X-Requested-With, Origin'
                response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS, PATCH'
                response.headers['Access-Control-Max-Age'] = '86400'
            return response

    @app.after_request
    def add_cors_headers(response):
        origin = request.headers.get('Origin')
        if origin:
            response.headers['Access-Control-Allow-Origin'] = origin
            response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, Accept, X-Requested-With, Origin'
            response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS, PATCH'
        return response

    db.init_app(app)

    # Register blueprints (with /api prefix by default)
    app.register_blueprint(auth_bp)
    app.register_blueprint(doctors_bp)
    app.register_blueprint(hospitals_bp)
    app.register_blueprint(specializations_bp)
    app.register_blueprint(appointments_bp)
    app.register_blueprint(ambulances_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(reviews_bp)

    # Register root aliases for blueprints so requests without /api prefix also resolve cleanly
    app.register_blueprint(auth_bp, name='auth_alt', url_prefix='/auth')
    app.register_blueprint(doctors_bp, name='doctors_alt', url_prefix='/doctors')
    app.register_blueprint(hospitals_bp, name='hospitals_alt', url_prefix='/hospitals')
    app.register_blueprint(specializations_bp, name='specializations_alt', url_prefix='/specializations')
    app.register_blueprint(appointments_bp, name='appointments_alt', url_prefix='/appointments')
    app.register_blueprint(ambulances_bp, name='ambulances_alt', url_prefix='')
    app.register_blueprint(dashboard_bp, name='dashboard_alt', url_prefix='')
    app.register_blueprint(reviews_bp, name='reviews_alt', url_prefix='')

    # Root and API status endpoints
    @app.route('/', methods=['GET', 'OPTIONS'])
    @app.route('/api', methods=['GET', 'OPTIONS'])
    def root_endpoint():
        if request.method == 'OPTIONS':
            return jsonify({'success': True, 'status': 'ok'}), 200
        return jsonify({
            'success': True,
            'status': 'ok',
            'message': 'Healthcare Management API is running'
        }), 200

    # Canonical health endpoints
    @app.route('/api/health', methods=['GET', 'OPTIONS'])
    @app.route('/health', methods=['GET', 'OPTIONS'])
    def health_check():
        if request.method == 'OPTIONS':
            return jsonify({'success': True, 'status': 'ok'}), 200
        return jsonify({
            'success': True,
            'status': 'ok',
            'message': 'Backend is running'
        }), 200

    # Route aliases for backward compatibility
    from routes.auth import register as auth_register_view
    from routes.auth import login as auth_login_view

    app.add_url_rule('/api/register', endpoint='alias_api_register', view_func=auth_register_view, methods=['POST', 'OPTIONS'], strict_slashes=False)
    app.add_url_rule('/auth/register', endpoint='alias_auth_register', view_func=auth_register_view, methods=['POST', 'OPTIONS'], strict_slashes=False)
    app.add_url_rule('/register', endpoint='alias_root_register', view_func=auth_register_view, methods=['POST', 'OPTIONS'], strict_slashes=False)

    app.add_url_rule('/api/login', endpoint='alias_api_login', view_func=auth_login_view, methods=['POST', 'OPTIONS'], strict_slashes=False)
    app.add_url_rule('/auth/login', endpoint='alias_auth_login', view_func=auth_login_view, methods=['POST', 'OPTIONS'], strict_slashes=False)
    app.add_url_rule('/login', endpoint='alias_root_login', view_func=auth_login_view, methods=['POST', 'OPTIONS'], strict_slashes=False)

    # Global Error Handlers
    @app.errorhandler(404)
    def handle_not_found(e):
        return jsonify({'success': False, 'message': 'Requested resource was not found.'}), 404

    @app.errorhandler(405)
    def handle_method_not_allowed(e):
        return jsonify({'success': False, 'message': 'HTTP method not allowed on this endpoint.'}), 405

    @app.errorhandler(500)
    def handle_internal_error(e):
        return jsonify({'success': False, 'message': 'An unexpected server error occurred. Please try again later.'}), 500

    @app.errorhandler(Exception)
    def handle_unexpected_exception(e):
        app.logger.error(f"Unhandled Exception: {str(e)}")
        return jsonify({'success': False, 'message': 'An unexpected server error occurred. Please try again later.'}), 500

    return app


def initialize_database(app):
    with app.app_context():
        try:
            # Test connection
            db.session.execute(text("SELECT 1"))
            print(f"[DB] Successfully connected using {app.config['SQLALCHEMY_DATABASE_URI'].split('://')[0].upper()}")
        except Exception as conn_err:
            print(f"[DB Notice] Could not connect to configured database: {conn_err}")
            # Fallback to local / tmp SQLite if primary failed
            if os.getenv("VERCEL"):
                import tempfile
                tmp_dir = Path("/tmp") if os.name != "nt" else Path(tempfile.gettempdir())
                tmp_dir.mkdir(parents=True, exist_ok=True)
                sqlite_path = (tmp_dir / "doctor_hospital.db").as_posix()
            else:
                sqlite_path = (BASE_DIR / "doctor_hospital.db").as_posix()
            fallback_uri = f"sqlite:///{sqlite_path}"
            print(f"[DB] Switching to SQLite fallback: {fallback_uri}")
            app.config['SQLALCHEMY_DATABASE_URI'] = fallback_uri
            try:
                db.engine.dispose()
            except Exception:
                pass

        # Dedicated one-time WAL initialization for SQLite using AUTOCOMMIT isolation
        # Must execute on its own connection outside active session transactions
        if db.engine.name == 'sqlite':
            try:
                with db.engine.connect().execution_options(isolation_level="AUTOCOMMIT") as wal_conn:
                    wal_mode = wal_conn.execute(text("PRAGMA journal_mode=WAL")).scalar()
                    if str(wal_mode).lower() != 'wal':
                        print(f"[DB Warning] SQLite WAL mode rejected; current mode is '{wal_mode}'.")
                    else:
                        print(f"[DB] SQLite WAL mode successfully verified: {wal_mode.upper()}")
            except Exception as wal_err:
                print(f"[DB Error] Failed to initialize SQLite WAL mode: {wal_err}")

        try:
            # Create all tables if they do not exist
            db.create_all()

            # Check if seeder needs to run
            from models import User
            if User.query.count() == 0:
                print("[DB] Database is empty. Running initial seeder...")
                from seed import run_seed
                run_seed()
                print("[DB] Seeding completed successfully!")
        except Exception as db_init_err:
            print(f"[DB Warning] Database init/migration notice: {db_init_err}")


# Expose WSGI app and handler for local server & Vercel serverless functions
app = create_app()
initialize_database(app)
handler = app

if __name__ == '__main__':
    port = int(os.getenv('FLASK_PORT', 5000))
    print(f"[START] Doctor & Hospital Management API is running on http://127.0.0.1:{port}")
    app.run(host='0.0.0.0', port=port, debug=False)