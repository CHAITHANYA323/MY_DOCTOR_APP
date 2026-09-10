import os
import tempfile
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "medicare-secret-key-healthcare-pro-2026")
    JWT_EXPIRATION_HOURS = int(os.getenv("JWT_EXPIRATION_HOURS", "72"))
    
    # Database configuration
    MYSQL_HOST = os.getenv("MYSQL_HOST", "localhost")
    MYSQL_PORT = os.getenv("MYSQL_PORT", "3306")
    MYSQL_USER = os.getenv("MYSQL_USER", "root")
    MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "")
    MYSQL_DB = os.getenv("MYSQL_DB", "doctor_hospital_db")

    DATABASE_URL = os.getenv("DATABASE_URL")
    
    @classmethod
    def get_database_uri(cls):
        # Explicit override
        if cls.DATABASE_URL:
            uri = cls.DATABASE_URL.strip()
            if uri.startswith("postgres://"):
                uri = uri.replace("postgres://", "postgresql://", 1)
            return uri
            
        # Try MySQL if credentials supplied
        if cls.MYSQL_USER and cls.MYSQL_DB and cls.MYSQL_PASSWORD:
            return (
                f"mysql+pymysql://{cls.MYSQL_USER}:{cls.MYSQL_PASSWORD}@"
                f"{cls.MYSQL_HOST}:{cls.MYSQL_PORT}/{cls.MYSQL_DB}?charset=utf8mb4"
            )
            
        # Fallback to local SQLite for instant out-of-the-box readiness
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

    SQLALCHEMY_TRACK_MODIFICATIONS = False
