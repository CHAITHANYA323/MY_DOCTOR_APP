import os
import sys
from flask import Flask, jsonify
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

    # Choose DB URI
    db_uri = Config.get_database_uri()
    app.config['SECRET_KEY'] = Config.SECRET_KEY
    app.config['SQLALCHEMY_DATABASE_URI'] = db_uri
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    # Enable CORS for all frontend clients
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    @app.after_request
    def add_cors_headers(response):
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, Accept, X-Requested-With, Origin'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
        return response

    db.init_app(app)

    # Register blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(doctors_bp)
    app.register_blueprint(hospitals_bp)
    app.register_blueprint(specializations_bp)
    app.register_blueprint(appointments_bp)
    app.register_blueprint(ambulances_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(reviews_bp)

    @app.route('/api/health', methods=['GET'])
    def health_check():
        db_type = 'MySQL' if 'mysql' in app.config['SQLALCHEMY_DATABASE_URI'].lower() else 'SQLite'
        return jsonify({
            'status': 'healthy',
            'service': 'Doctor & Hospital Management API',
            'version': '1.0.0',
            'database': db_type
        }), 200

    # Professional Global Error Handlers
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
            print(f"[DB Notice] Could not connect to primary database ({conn_err}).")
            if os.getenv("VERCEL"):
                sqlite_path = "/tmp/doctor_hospital.db"
            else:
                sqlite_path = (BASE_DIR / "doctor_hospital.db").as_posix()
            fallback_uri = f"sqlite:///{sqlite_path}"
            print(f"[DB] Switching to SQLite fallback: {fallback_uri}")
            app.config['SQLALCHEMY_DATABASE_URI'] = fallback_uri
            # Rebind engine
            db.engine.dispose()
            db.init_app(app)

        # Create all tables if they do not exist
        db.create_all()

        # Check if seeder needs to run
        from models import User
        if User.query.count() == 0:
            print("[DB] Database is empty. Running initial seeder...")
            try:
                from seed import run_seed
                run_seed()
                print("[DB] Seeding completed successfully!")
            except Exception as seed_err:
                print(f"[DB Warning] Could not run automatic seed: {seed_err}")


app = create_app()
initialize_database(app)

if __name__ == '__main__':
    port = int(os.getenv('FLASK_PORT', 5000))
    print(f"[START] Doctor & Hospital Management API is running on http://127.0.0.1:{port}")
    app.run(host='0.0.0.0', port=port, debug=False)