# MediConnect – Managed Cloud Redis Production Setup Guide

**Architecture Layer:** Distributed Cache & OWASP Rate-Limiting Engine  
**Target Environment:** Staging & Multi-Worker Production  
**Security Standard:** TLS 1.2+ Encrypted In-Transit (`rediss://`) with Strict Access Control  
**Document Status:** Technical Architecture & Provisioning Blueprint  

---

## 1. Executive Overview & Existing Implementation

The MediConnect backend utilizes distributed rate-limiting to protect authentication, patient appointment booking, and administrative endpoints from brute-force credential stuffing and distributed denial-of-service (DDoS) attacks.

### Existing Architecture (`backend/config.py` & `backend/utils/auth_middleware.py`)
- **Connection Variable:** `REDIS_URL`
- **Rate-Limiter Storage:** Controlled via `RATE_LIMIT_STORAGE=auto`.
- **Fail-Safe Policy (`RATE_LIMIT_FAIL_CLOSED`):**
  - **In Development / Testing:** If Redis is unavailable or unconfigured, the application logs a warning and falls back to thread-local in-memory rate limiting without interrupting local testing.
  - **In Production (`FLASK_ENV=production`):** In accordance with healthcare application security guidelines, `RATE_LIMIT_FAIL_CLOSED=true` enforces that authentication and sensitive APIs fail safely, preventing unthrottled brute-force penetration if the rate-limiter drops offline.

```mermaid
flowchart LR
    Client[Incoming API Traffic] --> Nginx[Ingress Reverse Proxy]
    Nginx --> Waitress[Waitress WSGI Cluster]
    Waitress --> RateLimiter{Rate Limit Middleware}
    RateLimiter -->|Check IP & Token Budget| Redis[(Managed Cloud Redis - TLS 1.3)]
    Redis -->|Within Budget: 200 OK| FlaskApp[MediConnect Core Backend]
    Redis -->|Budget Exceeded: 429| ThrottleResponse[HTTP 429 Too Many Requests]
```

---

## 2. Managed Redis Hosting Options Comparison

For the MediConnect hospital pilot and multi-worker production cluster, a managed cloud Redis instance with automated backups, high availability, and native TLS is required.

| Hosting Provider | Tier / Plan | TLS Support | High Availability / SLA | Monthly Est. Cost | Best Fit For |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **Upstash Serverless Redis** | Serverless / Pay-per-request | Native `rediss://` (TLS 1.3) | Multi-zone replica, 99.99% SLA | \$0 – \$15 / mo | **Recommended for Hospital 1 Pilot** (Zero idle cost, instant setup) |
| **AWS ElastiCache for Redis** | `cache.t4g.micro` / Serverless | In-transit encryption | Multi-AZ with Auto-Failover, 99.99% | \$18 – \$45 / mo | Large AWS Enterprise deployments |
| **Redis Enterprise Cloud** | Flexible / Fixed | Dedicated TLS endpoint | Active-Active Geo-Distribution | \$10 – \$30 / mo | Multi-cloud and HIPAA-dedicated VPCs |

---

## 3. Provisioning Instructions (Upstash Recommended for Pilot)

> [!CAUTION]
> **External Cloud Infrastructure Notice:**
> Provisioning managed Redis involves creating a cloud provider account and configuring cloud billing. In accordance with system safety rules, **do not attempt automated provisioning without explicit user authorization**. Follow the documented manual steps below:

### Step-by-Step Provisioning:
1. **Account Setup:**
   - Log into the [Upstash Console](https://console.upstash.com/).
2. **Database Creation:**
   - Click **Create Database**.
   - **Name:** `mediconnect-prod-redis`
   - **Type:** Regional (select AWS region closest to hospital deployment, e.g., `us-east-1` or `ap-south-1`).
   - **TLS (SSL):** Set to **Enabled (Mandatory)**.
   - **Eviction:** `volatile-lru` or `allkeys-lru`.
3. **Retrieving Encrypted Connection URI:**
   - Once created, open the database details page.
   - Select the **Node.js / Python / ioredis** tab.
   - Copy the `rediss://` connection URI formatted as:
     ```
     rediss://default:<UPSTASH_PASSWORD>@<UPSTASH_ENDPOINT>:6379
     ```
4. **Credential Safety:**
   - **NEVER** commit this connection string to Git.
   - Store it securely in the server's environment file (`backend/.env`).

---

## 4. Production Configuration Injection

Inject the retrieved connection URI into the production environment file:

```bash
# -----------------------------------------------------------------------------
# Distributed Redis Rate Limiting (backend/.env)
# -----------------------------------------------------------------------------
REDIS_URL=rediss://default:REPLACE_WITH_ACTUAL_REDIS_PASSWORD@sample-endpoint.upstash.io:6379
RATE_LIMIT_STORAGE=auto
RATE_LIMIT_FAIL_CLOSED=true
```

### Connection Verification Command
Execute an isolated connection probe from the production server to verify TLS handshake and ping response:

```python
# test_redis_connection.py (Run locally or in staging)
import os
import redis

redis_url = os.getenv("REDIS_URL")
if not redis_url:
    print("[ERROR] REDIS_URL environment variable is missing.")
    exit(1)

try:
    # ssl_cert_reqs=None or 'required' based on CA bundle
    client = redis.from_url(redis_url, socket_timeout=3, ssl_cert_reqs=None)
    pong = client.ping()
    print(f"[SUCCESS] Connected to Managed Redis! Ping response: {pong}")
except Exception as e:
    print(f"[FAIL] Redis TLS Connection failed: {e}")
```

---

## 5. Security & Failure-Handling Directives

1. **In-Transit Encryption:** Only URIs beginning with `rediss://` are accepted in production. Plaintext `redis://` is automatically rejected by production validation.
2. **Access Control:** The Redis instance must not accept open public traffic. Restrict access via IP whitelisting or VPC peering if supported by the provider tier.
3. **Fail-Safe Behavior in Staging vs. Production:**
   - **Staging / Demonstration:** Operates with in-memory fallback to prevent test disruptions.
   - **Production:** In production mode, rate-limiting failures block suspicious bursts while allowing low-volume trusted operations, ensuring hospital administrative and clinical channels remain safeguarded.
