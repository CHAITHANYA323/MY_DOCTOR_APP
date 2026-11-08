import os
import tempfile
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

class Config:
    DEFAULT_SECRET_KEY = "medicare-secret-key-healthcare-pro-2026"
    SECRET_KEY = os.getenv("SECRET_KEY", DEFAULT_SECRET_KEY)
    JWT_EXPIRATION_HOURS = int(os.getenv("JWT_EXPIRATION_HOURS", "72"))

    # Database configuration
    MYSQL_HOST = os.getenv("MYSQL_HOST", "localhost")
    MYSQL_PORT = os.getenv("MYSQL_PORT", "3306")
    MYSQL_USER = os.getenv("MYSQL_USER", "root")
    MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "")
    MYSQL_DB = os.getenv("MYSQL_DB", "doctor_hospital_db")

    DATABASE_URL = os.getenv("DATABASE_URL")

    # Shared Rate Limiting & Proxy Configuration (SEC-06 & BLK-04)
    REDIS_URL = os.getenv("REDIS_URL")
    TRUST_PROXY_HEADERS = os.getenv("TRUST_PROXY_HEADERS", "false").lower() in ("true", "1", "yes")
    TRUSTED_PROXIES = os.getenv("TRUSTED_PROXIES", "127.0.0.1,::1")
    PROXY_FIX_X_FOR = int(os.getenv("PROXY_FIX_X_FOR", "1"))
    PROXY_FIX_X_PROTO = int(os.getenv("PROXY_FIX_X_PROTO", "1"))
    PROXY_FIX_X_HOST = int(os.getenv("PROXY_FIX_X_HOST", "1"))
    PROXY_FIX_X_PORT = int(os.getenv("PROXY_FIX_X_PORT", "0"))
    PROXY_FIX_X_PREFIX = int(os.getenv("PROXY_FIX_X_PREFIX", "0"))
    RATE_LIMIT_STORAGE = os.getenv("RATE_LIMIT_STORAGE", "auto")
    RATE_LIMIT_FAIL_CLOSED = os.getenv("RATE_LIMIT_FAIL_CLOSED", "true").lower() in ("true", "1", "yes")
    RATE_LIMIT_DB_PATH = os.getenv("RATE_LIMIT_DB_PATH")

    @classmethod
    def is_production(cls):
        return (
            os.getenv("FLASK_ENV") == "production"
            or os.getenv("ENV") == "production"
            or os.getenv("APP_ENV") == "production"
        )

    @classmethod
    def validate_production_config(cls):
        """
        Validates mandatory security configurations for production environments:
        1. A dedicated, non-default SECRET_KEY is set.
        2. A persistent production database (PostgreSQL/MySQL via DATABASE_URL) is configured.
        3. Local/ephemeral SQLite is strictly forbidden in production (BLK-01).
        """
        if not cls.is_production():
            return

        if not cls.SECRET_KEY or cls.SECRET_KEY == cls.DEFAULT_SECRET_KEY:
            raise RuntimeError(
                "CRITICAL SECURITY CONFIGURATION ERROR: A custom SECRET_KEY is strictly required in production. "
                "Default fallback secrets are forbidden."
            )

        env_url = (os.getenv("DATABASE_URL") or cls.DATABASE_URL or "").strip()
        has_mysql = bool(cls.MYSQL_USER and cls.MYSQL_DB and cls.MYSQL_PASSWORD)
        if not env_url and not has_mysql:
            raise RuntimeError(
                "CRITICAL DATABASE CONFIGURATION ERROR: A persistent database URL (DATABASE_URL) is required in production. "
                "Running with local/ephemeral SQLite in production is forbidden."
            )

        if env_url.lower().startswith("sqlite"):
            raise RuntimeError(
                "CRITICAL DATABASE CONFIGURATION ERROR: Running with SQLite in production is strictly forbidden. "
                "Please configure a remote PostgreSQL or MySQL database URL (e.g. postgresql+psycopg2://...)."
            )

    @classmethod
    def get_database_uri(cls, target_uri=None):
        from sqlalchemy.engine import URL

        # 1. Explicit override passed as parameter
        if target_uri:
            uri = target_uri.strip()
            if uri.startswith("postgres://"):
                uri = uri.replace("postgres://", "postgresql://", 1)
            elif uri.startswith("mysql://"):
                uri = uri.replace("mysql://", "mysql+pymysql://", 1)
            if ("neon.tech" in uri or "amazonaws.com" in uri) and "sslmode" not in uri:
                sep = "&" if "?" in uri else "?"
                uri = f"{uri}{sep}sslmode=require"
            return uri

        # 2. Explicit SQLite override via USE_SQLITE flag
        if os.getenv("USE_SQLITE", "false").lower() in ("true", "1", "yes"):
            if cls.is_production():
                raise RuntimeError(
                    "CRITICAL DATABASE CONFIGURATION ERROR: Running with SQLite in production is strictly forbidden. "
                    "Please configure a remote PostgreSQL or MySQL database URL."
                )
            db_file = BASE_DIR / "doctor_hospital.db"
            return f"sqlite:///{db_file.as_posix()}"

        env_url = (os.getenv("DATABASE_URL") or cls.DATABASE_URL or "").strip()

        # Check if env_url is a dummy PostgreSQL placeholder
        is_placeholder_pg = any(p in env_url for p in ("YOUR_NEON", "<user>", "<password>"))

        # Check MySQL configuration
        mysql_user = os.getenv("MYSQL_USER") or cls.MYSQL_USER
        mysql_pwd = os.getenv("MYSQL_PASSWORD") or cls.MYSQL_PASSWORD
        mysql_db = os.getenv("MYSQL_DB") or cls.MYSQL_DB
        mysql_host = os.getenv("MYSQL_HOST") or cls.MYSQL_HOST or "localhost"
        mysql_port = os.getenv("MYSQL_PORT") or cls.MYSQL_PORT or "3306"

        has_mysql = bool(mysql_user and mysql_db and mysql_pwd)

        # 3. If DATABASE_URL is explicitly set to SQLite (e.g. during test runs), honor it immediately
        if env_url and env_url.lower().startswith("sqlite"):
            if cls.is_production():
                raise RuntimeError(
                    "CRITICAL DATABASE CONFIGURATION ERROR: Running with SQLite in production is strictly forbidden. "
                    "Please configure a remote PostgreSQL or MySQL database URL."
                )
            return env_url

        # 4. If a real remote DATABASE_URL is set (and not a placeholder)
        if env_url and not is_placeholder_pg:
            uri = env_url
            if uri.startswith("postgres://"):
                uri = uri.replace("postgres://", "postgresql://", 1)
            elif uri.startswith("mysql://"):
                uri = uri.replace("mysql://", "mysql+pymysql://", 1)
            if ("neon.tech" in uri or "amazonaws.com" in uri) and "sslmode" not in uri:
                sep = "&" if "?" in uri else "?"
                uri = f"{uri}{sep}sslmode=require"
            if cls.is_production() and uri.lower().startswith("sqlite"):
                raise RuntimeError(
                    "CRITICAL DATABASE CONFIGURATION ERROR: Running with SQLite in production is strictly forbidden. "
                    "Please configure a remote PostgreSQL or MySQL database URL."
                )
            return uri

        # 5. If MySQL credentials are provided, construct MySQL URI via URL.create for safe encoding
        if has_mysql:
            url_obj = URL.create(
                drivername="mysql+pymysql",
                username=mysql_user,
                password=mysql_pwd,
                host=mysql_host,
                port=int(mysql_port),
                database=mysql_db,
                query={"charset": "utf8mb4"}
            )
            return url_obj.render_as_string(hide_password=False)

        # 6. In production, never fall back to SQLite
        if cls.is_production():
            raise RuntimeError(
                "CRITICAL DATABASE CONFIGURATION ERROR: Production environment detected without a valid remote database configuration. "
                "Silent fallback to SQLite is strictly forbidden in production."
            )

        # 7. Fallback to local SQLite for instant out-of-the-box readiness (Dev / Test only)
        if os.getenv("VERCEL"):
            tmp_dir = Path("/tmp") if os.name != "nt" else Path(tempfile.gettempdir())
            tmp_dir.mkdir(parents=True, exist_ok=True)
            db_file = tmp_dir / "doctor_hospital.db"
            bundled_db = BASE_DIR / "doctor_hospital.db"
            if not db_file.exists() and bundled_db.exists():
                try:
                    import shutil
                    shutil.copy2(bundled_db, db_file)
                except Exception as copy_err:
                    print(f"[DB Notice] Could not copy SQLite database to temp directory: {copy_err}")
        else:
            db_file = BASE_DIR / "doctor_hospital.db"
        return f"sqlite:///{db_file.as_posix()}"

    @classmethod
    def get_engine_options(cls, target_uri=None):
        """
        Returns optimized SQLAlchemy engine options:
        - Enables pool_pre_ping to defend against stale serverless / PgBouncer connections.
        - Enables pool_recycle to periodically refresh idle connections.
        - Configures pool_size, max_overflow, and pool_timeout from environment.
        """
        uri = cls.get_database_uri(target_uri)
        if uri.lower().startswith("sqlite"):
            return {}
        return {
            "pool_pre_ping": os.getenv("DB_POOL_PRE_PING", "true").lower() in ("true", "1", "yes"),
            "pool_recycle": int(os.getenv("DB_POOL_RECYCLE", "300")),
            "pool_size": int(os.getenv("DB_POOL_SIZE", "10")),
            "max_overflow": int(os.getenv("DB_MAX_OVERFLOW", "20")),
            "pool_timeout": int(os.getenv("DB_POOL_TIMEOUT", "30")),
        }

    SQLALCHEMY_TRACK_MODIFICATIONS = False
