import os
import re
import time
import logging
import ipaddress
import threading
import sqlite3
import tempfile
from collections import defaultdict, deque
from typing import Optional, Tuple, Dict, Any, List
from flask import request

logger = logging.getLogger("mediconnect.rate_limiter")

try:
    import redis
except ImportError:
    redis = None

# -----------------------------------------------------------------------------
# Rate Limiting Policies (SEC-06)
# -----------------------------------------------------------------------------
VERIFY_LIMIT = 60          # 60 requests
VERIFY_WINDOW = 60         # per 60 seconds per IP

ACCEPT_LIMIT = 20          # 20 acceptance requests
ACCEPT_WINDOW = 60         # per 60 seconds per IP

PASSWORD_FAILED_LIMIT = 5  # 5 failed password attempts
PASSWORD_FAILED_WINDOW = 900  # per 15 minutes per (IP, email)

DEFAULT_FAIL_CLOSED_RETRY = 60

# -----------------------------------------------------------------------------
# Atomic Redis Lua Scripts
# -----------------------------------------------------------------------------
# KEYS[1]: bucket key
# ARGV[1]: current timestamp (float)
# ARGV[2]: window in seconds (int)
# ARGV[3]: limit (int)
# ARGV[4]: unique member id (string)
SLIDING_WINDOW_LUA = """
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local member = ARGV[4]
local cutoff = now - window

-- 1. Remove expired entries older than cutoff
redis.call('ZREMRANGEBYSCORE', key, '-inf', cutoff)

-- 2. Count active entries in current window
local current_count = redis.call('ZCARD', key)

if current_count >= limit then
    -- Oldest entry defines retry_after
    local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
    local retry_after = 1
    if oldest and #oldest >= 2 then
        local oldest_ts = tonumber(oldest[2])
        retry_after = math.max(1, math.ceil(oldest_ts + window - now))
    end
    return {1, retry_after}
else
    -- Add entry for this request
    redis.call('ZADD', key, now, member)
    redis.call('EXPIRE', key, math.ceil(window + 5))
    return {0, 0}
end
"""

# KEYS[1]: bucket key
# ARGV[1]: action ('check', 'record', 'clear')
# ARGV[2]: current timestamp (float)
# ARGV[3]: window in seconds (int)
# ARGV[4]: limit (int)
# ARGV[5]: member (string)
FAILED_PASSWORD_LUA = """
local key = KEYS[1]
local action = ARGV[1]
local now = tonumber(ARGV[2] or 0)
local window = tonumber(ARGV[3] or 900)
local limit = tonumber(ARGV[4] or 5)
local member = ARGV[5]

if action == 'clear' then
    redis.call('DEL', key)
    return {0, 0}
end

local cutoff = now - window
redis.call('ZREMRANGEBYSCORE', key, '-inf', cutoff)
local current_count = redis.call('ZCARD', key)

if action == 'check' then
    if current_count >= limit then
        local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
        local retry_after = 1
        if oldest and #oldest >= 2 then
            retry_after = math.max(1, math.ceil(tonumber(oldest[2]) + window - now))
        end
        return {1, retry_after}
    else
        return {0, 0}
    end
elseif action == 'record' then
    redis.call('ZADD', key, now, member)
    redis.call('EXPIRE', key, math.ceil(window + 5))
    return {0, 0}
end

return {0, 0}
"""


# -----------------------------------------------------------------------------
# Client IP Extraction & Proxy Verification
# -----------------------------------------------------------------------------
def is_ip_in_trusted_proxies(ip_str: str, trusted_list: List[str]) -> bool:
    """Verifies whether an IP address matches the trusted proxy whitelist (IP or CIDR network)."""
    if not ip_str or not trusted_list:
        return False
    if '*' in trusted_list:
        return True
    try:
        ip = ipaddress.ip_address(ip_str)
        for trusted in trusted_list:
            if not trusted:
                continue
            if '/' in trusted:
                if ip in ipaddress.ip_network(trusted, strict=False):
                    return True
            else:
                if ip == ipaddress.ip_address(trusted):
                    return True
    except ValueError:
        return False
    return False


def get_client_ip() -> str:
    """
    Extracts client IP safely.
    Only trusts X-Forwarded-For when TRUST_PROXY_HEADERS is enabled AND
    the direct remote connection (request.remote_addr) originates from an explicitly trusted proxy.
    Otherwise, returns request.remote_addr directly to prevent header spoofing.
    """
    if not request:
        return '127.0.0.1'

    remote_addr = (request.remote_addr or '127.0.0.1').strip()

    trust_proxy_headers = os.getenv("TRUST_PROXY_HEADERS", "false").lower() in ("true", "1", "yes")
    if not trust_proxy_headers:
        return remote_addr

    trusted_proxies_raw = os.getenv("TRUSTED_PROXIES", "127.0.0.1,::1")
    trusted_proxies = [p.strip() for p in trusted_proxies_raw.split(",") if p.strip()]

    # If direct connection is not from a trusted proxy, ignore forwarded headers
    if not is_ip_in_trusted_proxies(remote_addr, trusted_proxies):
        return remote_addr

    xff = request.headers.get('X-Forwarded-For')
    if xff:
        # Extract the leftmost valid IP address
        ips = [i.strip() for i in xff.split(',') if i.strip()]
        for ip in ips:
            try:
                ipaddress.ip_address(ip)
                return ip
            except ValueError:
                continue

    return remote_addr


# -----------------------------------------------------------------------------
# Base Rate Limiter Interface
# -----------------------------------------------------------------------------
class BaseRateLimiter:
    def is_rate_limited(self, bucket_key: str, limit: int, window_seconds: int) -> Tuple[bool, int]:
        raise NotImplementedError

    def check_failed_password_limit(self, ip: str, email: str) -> Tuple[bool, int]:
        raise NotImplementedError

    def record_failed_password(self, ip: str, email: str) -> None:
        raise NotImplementedError

    def clear_failed_passwords(self, ip: str, email: str) -> None:
        raise NotImplementedError

    def reset_all(self) -> None:
        raise NotImplementedError


# -----------------------------------------------------------------------------
# 1. Redis Shared Rate Limiter (Production Distributed Storage)
# -----------------------------------------------------------------------------
class RedisRateLimiter(BaseRateLimiter):
    """
    Distributed Redis-backed sliding window rate limiter.
    Ensures multiple application worker processes coordinate against identical counters.
    Uses atomic Lua scripts to guarantee zero race conditions.
    """
    def __init__(self, redis_client=None, redis_url: Optional[str] = None):
        self.redis_url = redis_url or os.getenv("REDIS_URL")
        self._client = redis_client

    def _get_client(self):
        if self._client is not None:
            return self._client
        if not self.redis_url:
            raise RuntimeError("REDIS_URL is not configured.")
        if redis is None:
            raise RuntimeError("The 'redis' Python package is required when using RedisRateLimiter. Please run 'pip install redis'.")
        self._client = redis.Redis.from_url(
            self.redis_url,
            decode_responses=True,
            socket_connect_timeout=2,
            socket_timeout=2
        )
        return self._client

    def _handle_redis_error(self, exc: Exception, default_retry: int = DEFAULT_FAIL_CLOSED_RETRY) -> Tuple[bool, int]:
        """
        Enforces defensive fail-closed policy during Redis outages on sensitive public endpoints.
        """
        is_prod = os.getenv("FLASK_ENV") == "production" or os.getenv("ENV") == "production"
        fail_closed = os.getenv("RATE_LIMIT_FAIL_CLOSED", "true").lower() in ("true", "1", "yes")

        logger.error(f"[SECURITY ALERT] Redis outage in RateLimiter: {exc}")
        if is_prod or fail_closed:
            # Reject request to prevent unthrottled brute force during database/cache outage
            return True, default_retry
        raise exc

    def is_rate_limited(self, bucket_key: str, limit: int, window_seconds: int) -> Tuple[bool, int]:
        try:
            client = self._get_client()
            now = time.time()
            member = f"{now}:{time.time_ns()}"
            res = client.eval(SLIDING_WINDOW_LUA, 1, f"rl:{bucket_key}", now, window_seconds, limit, member)
            is_limited = bool(res[0])
            retry_after = int(res[1])
            return is_limited, retry_after
        except Exception as e:
            return self._handle_redis_error(e, default_retry=max(1, window_seconds))

    def check_failed_password_limit(self, ip: str, email: str) -> Tuple[bool, int]:
        try:
            client = self._get_client()
            bucket_key = f"rl:pwd_fail:{ip}:{email.strip().lower()}"
            now = time.time()
            res = client.eval(FAILED_PASSWORD_LUA, 1, bucket_key, 'check', now, PASSWORD_FAILED_WINDOW, PASSWORD_FAILED_LIMIT, '')
            is_limited = bool(res[0])
            retry_after = int(res[1])
            return is_limited, retry_after
        except Exception as e:
            return self._handle_redis_error(e, default_retry=PASSWORD_FAILED_WINDOW)

    def record_failed_password(self, ip: str, email: str) -> None:
        try:
            client = self._get_client()
            bucket_key = f"rl:pwd_fail:{ip}:{email.strip().lower()}"
            now = time.time()
            member = f"{now}:{time.time_ns()}"
            client.eval(FAILED_PASSWORD_LUA, 1, bucket_key, 'record', now, PASSWORD_FAILED_WINDOW, PASSWORD_FAILED_LIMIT, member)
        except Exception as e:
            self._handle_redis_error(e)

    def clear_failed_passwords(self, ip: str, email: str) -> None:
        try:
            client = self._get_client()
            bucket_key = f"rl:pwd_fail:{ip}:{email.strip().lower()}"
            client.eval(FAILED_PASSWORD_LUA, 1, bucket_key, 'clear', 0, 0, 0, '')
        except Exception as e:
            self._handle_redis_error(e)

    def reset_all(self) -> None:
        try:
            client = self._get_client()
            keys = client.keys("rl:*")
            if keys:
                client.delete(*keys)
        except Exception as e:
            logger.warning(f"Could not reset Redis rate limits: {e}")


# -----------------------------------------------------------------------------
# 2. SQLite Shared Rate Limiter (Multi-Worker Dev/Test Fallback Storage)
# -----------------------------------------------------------------------------
class SqliteRateLimiter(BaseRateLimiter):
    """
    Atomic SQLite-backed shared sliding window rate limiter.
    Shares counters across multiple OS worker processes (Gunicorn workers / multiprocessing processes).
    Uses SQLite WAL mode and BEGIN IMMEDIATE to guarantee ACID consistency across process boundaries.
    """
    def __init__(self, db_path: Optional[str] = None):
        if not db_path:
            db_path = os.getenv("RATE_LIMIT_DB_PATH") or os.path.join(tempfile.gettempdir(), "mediconnect_shared_ratelimit.db")
        self.db_path = db_path
        db_dir = os.path.dirname(self.db_path)
        if db_dir:
            os.makedirs(db_dir, exist_ok=True)
        self._init_db()

    def _get_connection(self):
        conn = sqlite3.connect(self.db_path, timeout=15.0, isolation_level=None)
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA busy_timeout=5000;")
        return conn

    def _init_db(self):
        conn = self._get_connection()
        try:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS rate_limit_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    bucket_key TEXT NOT NULL,
                    timestamp REAL NOT NULL
                );
            """)
            conn.execute("CREATE INDEX IF NOT EXISTS idx_rl_key_time ON rate_limit_events(bucket_key, timestamp);")
            conn.execute("""
                CREATE TABLE IF NOT EXISTS failed_passwords (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    bucket_key TEXT NOT NULL,
                    timestamp REAL NOT NULL
                );
            """)
            conn.execute("CREATE INDEX IF NOT EXISTS idx_fp_key_time ON failed_passwords(bucket_key, timestamp);")
        finally:
            conn.close()

    def is_rate_limited(self, bucket_key: str, limit: int, window_seconds: int) -> Tuple[bool, int]:
        now = time.time()
        cutoff = now - window_seconds
        conn = self._get_connection()
        try:
            conn.execute("BEGIN IMMEDIATE;")
            # 1. Purge expired events
            conn.execute("DELETE FROM rate_limit_events WHERE bucket_key = ? AND timestamp <= ?;", (bucket_key, cutoff))
            # 2. Count active events
            cursor = conn.execute("SELECT count(*), min(timestamp) FROM rate_limit_events WHERE bucket_key = ?;", (bucket_key,))
            row = cursor.fetchone()
            count = row[0]
            oldest = row[1]

            if count >= limit:
                conn.execute("COMMIT;")
                retry_after = max(1, int(oldest + window_seconds - now)) if oldest else 1
                return True, retry_after
            else:
                conn.execute("INSERT INTO rate_limit_events (bucket_key, timestamp) VALUES (?, ?);", (bucket_key, now))
                conn.execute("COMMIT;")
                return False, 0
        except Exception:
            try:
                conn.execute("ROLLBACK;")
            except Exception:
                pass
            raise
        finally:
            conn.close()

    def check_failed_password_limit(self, ip: str, email: str) -> Tuple[bool, int]:
        bucket_key = f"pwd_fail:{ip}:{email.strip().lower()}"
        now = time.time()
        cutoff = now - PASSWORD_FAILED_WINDOW
        conn = self._get_connection()
        try:
            conn.execute("BEGIN IMMEDIATE;")
            conn.execute("DELETE FROM failed_passwords WHERE bucket_key = ? AND timestamp <= ?;", (bucket_key, cutoff))
            cursor = conn.execute("SELECT count(*), min(timestamp) FROM failed_passwords WHERE bucket_key = ?;", (bucket_key,))
            row = cursor.fetchone()
            count = row[0]
            oldest = row[1]
            conn.execute("COMMIT;")
            if count >= PASSWORD_FAILED_LIMIT:
                retry_after = max(1, int(oldest + PASSWORD_FAILED_WINDOW - now)) if oldest else 1
                return True, retry_after
            return False, 0
        finally:
            conn.close()

    def record_failed_password(self, ip: str, email: str) -> None:
        bucket_key = f"pwd_fail:{ip}:{email.strip().lower()}"
        now = time.time()
        conn = self._get_connection()
        try:
            conn.execute("BEGIN IMMEDIATE;")
            conn.execute("INSERT INTO failed_passwords (bucket_key, timestamp) VALUES (?, ?);", (bucket_key, now))
            conn.execute("COMMIT;")
        finally:
            conn.close()

    def clear_failed_passwords(self, ip: str, email: str) -> None:
        bucket_key = f"pwd_fail:{ip}:{email.strip().lower()}"
        conn = self._get_connection()
        try:
            conn.execute("BEGIN IMMEDIATE;")
            conn.execute("DELETE FROM failed_passwords WHERE bucket_key = ?;", (bucket_key,))
            conn.execute("COMMIT;")
        finally:
            conn.close()

    def reset_all(self) -> None:
        conn = self._get_connection()
        try:
            conn.execute("BEGIN IMMEDIATE;")
            conn.execute("DELETE FROM rate_limit_events;")
            conn.execute("DELETE FROM failed_passwords;")
            conn.execute("COMMIT;")
        finally:
            conn.close()


# -----------------------------------------------------------------------------
# 3. Thread-Safe Memory Rate Limiter (Test Double / In-Memory Mode)
# -----------------------------------------------------------------------------
class MemoryRateLimiter(BaseRateLimiter):
    """
    Fast thread-safe in-memory sliding window rate limiter.
    Used for unit tests and isolated single-process environments.
    """
    def __init__(self):
        self._lock = threading.Lock()
        self._history = defaultdict(deque)

    def is_rate_limited(self, bucket_key: str, limit: int, window_seconds: int) -> Tuple[bool, int]:
        now = time.time()
        cutoff = now - window_seconds
        with self._lock:
            history = self._history[bucket_key]
            while history and history[0] <= cutoff:
                history.popleft()
            if len(history) >= limit:
                oldest = history[0]
                retry_after = max(1, int(oldest + window_seconds - now))
                return True, retry_after
            history.append(now)
            return False, 0

    def check_failed_password_limit(self, ip: str, email: str) -> Tuple[bool, int]:
        bucket_key = f"pwd_fail:{ip}:{email.strip().lower()}"
        now = time.time()
        cutoff = now - PASSWORD_FAILED_WINDOW
        with self._lock:
            history = self._history[bucket_key]
            while history and history[0] <= cutoff:
                history.popleft()
            if len(history) >= PASSWORD_FAILED_LIMIT:
                oldest = history[0]
                retry_after = max(1, int(oldest + PASSWORD_FAILED_WINDOW - now))
                return True, retry_after
            return False, 0

    def record_failed_password(self, ip: str, email: str) -> None:
        bucket_key = f"pwd_fail:{ip}:{email.strip().lower()}"
        now = time.time()
        with self._lock:
            self._history[bucket_key].append(now)

    def clear_failed_passwords(self, ip: str, email: str) -> None:
        bucket_key = f"pwd_fail:{ip}:{email.strip().lower()}"
        with self._lock:
            if bucket_key in self._history:
                del self._history[bucket_key]

    def reset_all(self) -> None:
        with self._lock:
            self._history.clear()


# -----------------------------------------------------------------------------
# Rate Limiter Singleton / Factory
# -----------------------------------------------------------------------------
_CURRENT_LIMITER: Optional[BaseRateLimiter] = None
_LIMITER_LOCK = threading.Lock()


def get_rate_limiter() -> BaseRateLimiter:
    """
    Returns the configured rate limiter:
    1. If manually injected (e.g. in tests via set_rate_limiter), uses that instance.
    2. If REDIS_URL is provided: uses RedisRateLimiter.
    3. If in production (FLASK_ENV=production or ENV=production) and REDIS_URL is missing:
       Refuses startup to prevent silent uncoordinated rate limiting.
    4. In development / testing:
       Uses SqliteRateLimiter (atomic multi-worker fallback) or MemoryRateLimiter based on RATE_LIMIT_STORAGE.
    """
    global _CURRENT_LIMITER
    with _LIMITER_LOCK:
        if _CURRENT_LIMITER is not None:
            return _CURRENT_LIMITER

        storage_mode = os.getenv("RATE_LIMIT_STORAGE", "auto").lower()
        redis_url = os.getenv("REDIS_URL")
        is_prod = os.getenv("FLASK_ENV") == "production" or os.getenv("ENV") == "production"

        if storage_mode == "redis" or (storage_mode == "auto" and redis_url):
            if not redis_url and is_prod:
                raise RuntimeError(
                    "CRITICAL: REDIS_URL is required in production for distributed rate limiting. "
                    "Process-local storage is not permitted in production. "
                    "Example: REDIS_URL=redis://localhost:6379/0"
                )
            _CURRENT_LIMITER = RedisRateLimiter(redis_url=redis_url)

        elif is_prod:
            raise RuntimeError(
                "CRITICAL: REDIS_URL is mandatory in production (FLASK_ENV=production). "
                "Shared Redis storage must be configured to coordinate rate limits across multiple worker processes."
            )

        elif storage_mode == "memory":
            _CURRENT_LIMITER = MemoryRateLimiter()

        else:
            # Default dev/test fallback: SqliteRateLimiter (shared across all OS processes)
            _CURRENT_LIMITER = SqliteRateLimiter()

        return _CURRENT_LIMITER


def set_rate_limiter(limiter: Optional[BaseRateLimiter]) -> None:
    """Sets or resets the active rate limiter instance (used for dependency injection and tests)."""
    global _CURRENT_LIMITER
    with _LIMITER_LOCK:
        _CURRENT_LIMITER = limiter


# -----------------------------------------------------------------------------
# Convenience Functions (Preserves exact existing API for routes/invitations.py)
# -----------------------------------------------------------------------------
def is_rate_limited(bucket_key: str, limit: int, window_seconds: int) -> Tuple[bool, int]:
    return get_rate_limiter().is_rate_limited(bucket_key, limit, window_seconds)


def check_failed_password_limit(ip: str, email: str) -> Tuple[bool, int]:
    return get_rate_limiter().check_failed_password_limit(ip, email)


def record_failed_password(ip: str, email: str) -> None:
    get_rate_limiter().record_failed_password(ip, email)


def clear_failed_passwords(ip: str, email: str) -> None:
    get_rate_limiter().clear_failed_passwords(ip, email)


def reset_rate_limits() -> None:
    """Clears all rate limit state across the active backend."""
    get_rate_limiter().reset_all()
