import json
from datetime import datetime, timezone
from flask import request
from models import db, AuditLog

# Sensitive keys that must NEVER be written to audit log details
SENSITIVE_KEYS = {
    'password', 'confirm_password', 'current_password', 'new_password',
    'token', 'raw_token', 'token_hash', 'secret', 'secret_key'
}

def sanitize_details(details_dict: dict) -> dict:
    """Removes any sensitive tokens or passwords from audit log details."""
    if not isinstance(details_dict, dict):
        return {}
    sanitized = {}
    for k, v in details_dict.items():
        if k.lower() in SENSITIVE_KEYS:
            continue
        sanitized[k] = v
    return sanitized

def record_audit(user_id: int, action: str, resource_type: str, resource_id: int = None, hospital_id: int = None, details: dict = None, ip_address: str = None) -> AuditLog:
    """
    Creates and records an immutable audit log entry.
    Guarantees no raw tokens, passwords, or hashes are written.
    """
    clean_details = sanitize_details(details or {})
    details_json = json.dumps(clean_details) if clean_details else None

    if ip_address is None and request:
        try:
            ip_address = request.headers.get('X-Forwarded-For', request.remote_addr)
            if ip_address and ',' in ip_address:
                ip_address = ip_address.split(',')[0].strip()
        except Exception:
            ip_address = '127.0.0.1'

    entry = AuditLog(
        hospital_id=hospital_id,
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        details=details_json,
        ip_address=ip_address,
        created_at=datetime.now(timezone.utc)
    )
    db.session.add(entry)
    return entry
