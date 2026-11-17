# MeritX Tender Desk

Live at **https://tenders.meritxsc.com/**. Official notices replaced the fictional prototype on 17 November 2026. The main-domain `/tenders` and `/tenders/` routes remain retired and return 404.

## Coverage and matching

Federal EPADS public open procurement listings and recent Punjab Information Technology Board notices are connected. Punjab's central procurement portal is currently unreachable from hosting; its availability is checked, but its notices are not represented as collected. PITB coverage is limited to recent departmental notices, up to 20 pages, stopping after three wholly expired pages. Older long-running opportunities can require a source check. Newspapers are not connected yet. Source status, last success and record provenance are visible in the dashboard.

Service matches use explainable title keywords for equipment, networking, CCTV, software and IT support. Electricity-grid networks and railway computer-based interlocking are excluded from these ordinary IT rules. A match is not an eligibility decision or a win prediction. Lahore in the title is distinguished from a buyer located in Lahore; buyer location does not establish the delivery site. Missing deadline times are not guessed.

Company details, tenant accounts, shared shortlists, subscriptions and eligibility checks are deferred. The current shortlist stays in each browser. The catalog is publicly readable; search-indexing exclusions are not access controls. See `docs/tender-platform-plan.txt` for newspaper intake and the commercial product plan.

## Public application and private collector

The current live release uses `index.html`, `.htaccess`, `assets/` and a read-only PHP endpoint at `/api/tenders.php` in `/home/rhjnctqjdv/tenders.meritxsc.com/`. Development replaces that endpoint with the FastAPI candidate below. Do not upload the development frontend to the current PHP host: it requests the new `/api/tenders` route. Fonts and Lucide, including their licenses, are self-hosted. The browser loads the snapshot on opening and refreshes it every five minutes while visible; it never launches a crawl.

Install `engine/collector.py` outside the document root at `~/.meritx-tender-engine/collector.py`, using the Python 3.13 virtual environment at `~/.meritx-tender-engine/venv/` with `engine/requirements.txt`. Private state lives under `~/.meritx-tender-engine/data/`: `tenders.sqlite3` holds stable IDs, first/last seen dates, source health and observed amendments; `feed.json` is the atomically published public snapshot; `raw/` holds source responses for 14 days. Project credentials, collector code, databases, raw responses and documentation must never be uploaded into the public document root.

Crawler policies are checked, requests are paced and bounded, and TLS verification stays enabled. There is no login, paywall bypass or search-engine scrape. Failed source collection retains previous records. Exact deadlines are read from source dates, bidding documents or the official EPADS countdown Unix timestamp without executing source JavaScript. Date-only notices keep their time unknown.

## Daily schedule and checks

Spaceship job **`job-01M7MABKDDTV1EMX9VMVRYTMRP`** runs at **06:00 Asia/Karachi daily**, with overlap prevention, one catch-up run for a missed firing, and a 20-minute runtime limit. It is enabled and synced to crontab. A scheduler-triggered end-to-end run succeeded on 17 November 2026 with two connected sources and the central Punjab timeout reported accurately. The next natural daily firing had not occurred at initial deployment.

```sh
# Hosting: run manually
~/.meritx-tender-engine/venv/bin/python ~/.meritx-tender-engine/collector.py --data-dir ~/.meritx-tender-engine/data

# Local: after installing the pinned dependencies in a private environment
python3 -m unittest discover -s prototypes/tender-desk/engine -p 'test_*.py' -v
node --check prototypes/tender-desk/assets/dashboard.js
```

Nine tests cover source parsing, relative versus exact deadlines, official countdown timestamps, date-only notices, location provenance, false-positive contexts, untrusted URLs, stable IDs, amendments and last-good retention. Browser checks cover actual official records, Punjab filtering, saving, source health, empty results and 320px/1024px layouts.

## FastAPI candidate on development

The candidate runs the dashboard and `/api/tenders` on one origin with FastAPI and Uvicorn. There is no tender PHP endpoint in this candidate. Marketing-site enquiry PHP is a separate application. API startup never starts the collector. Collection continues as a separate daily Python process, publishing an atomic snapshot.

The API caches the public projection and its gzip representation until the snapshot changes, supports GET/HEAD and conditional ETags, and marks data stale after 36 hours even if the file is unchanged. Missing or corrupt snapshots return 503 without exposing paths. `/healthz` checks process liveness; `/readyz` checks the snapshot and reports staleness. Only the dashboard and `assets/` are served as files. Collector code, databases and raw source material are not public routes.

Use Python 3.13 or newer for the local environment (the API dependencies require at least 3.11). From the repository root:

```sh
python3.13 -m venv .private/tender-api-venv
.private/tender-api-venv/bin/pip install -r prototypes/tender-desk/api/requirements-dev.txt -r prototypes/tender-desk/engine/requirements.txt
# Set this to an existing public snapshot; a page visit does not create one.
MERITX_FEED_PATH=/absolute/private/path/feed.json .private/tender-api-venv/bin/python -m uvicorn app:app --app-dir prototypes/tender-desk/api --host 127.0.0.1 --port 8052
```

Open `http://127.0.0.1:8052/`. To collect locally, run `engine/collector.py --data-dir /absolute/private/path` with that environment's Python, following the source-access policies above. Tests use synthetic fixtures and make no external collection requests:

```sh
.private/tender-api-venv/bin/python -m unittest discover -s prototypes/tender-desk/api -p 'test_*.py' -v
.private/tender-api-venv/bin/python -m unittest discover -s prototypes/tender-desk/engine -p 'test_*.py' -v
```

Eight API tests cover projection, compression, conditional responses, atomic refresh, stale transitions, invalid feeds and private-path protection. CI runs these and the nine collector tests.

## Deployment requirements and cutover

FastAPI requires a supported ASGI server, such as Uvicorn. Spaceship reports Python Selector enabled, but the inspected account does not expose Passenger application management. Native ASGI process supervision and HTTPS proxy routing on this account remain unverified; Python availability alone does not establish support. Do not start an unmanaged background server or change DNS until a supported deployment route is confirmed. An ASGI-capable VM or container host is an alternative, with Spaceship continuing to manage DNS.

The included Dockerfile is a portable candidate, not a deployed or locally Docker-tested release. Build its context from this directory. It serves on port 8080 as UID 10001. Mount only a public `feed.json` snapshot read-only at `/data/feed.json` for the API, with ownership/read permissions that permit UID 10001. Do not mount the private SQLite database or raw archive into the API container. The same image can run the separate collector with `python /app/engine/collector.py --data-dir /worker-data`; its private persistent data directory must be writable by that UID. A scheduled worker must publish the public snapshot to the API's snapshot location atomically. A hosting migration needs explicit snapshot transfer and private-state backup/restore planning; a local bind mount does not synchronize two hosts.

For a release: confirm TLS, trusted host/proxy settings, process restart supervision and persistent storage; stage the real snapshot and verify GET, HEAD, gzip, ETags, freshness and source failures; then switch the subdomain proxy and frontend together after an explicit production request. Configure `MERITX_FEED_PATH` and, for a staging hostname, `MERITX_ALLOWED_HOSTS` as a comma-separated list. Trust forwarded headers only from the actual reverse proxy. Retain the existing live files and worker state for rollback. Keep the existing 06:00 Asia/Karachi collector job unless deliberately relocating it; never run two scheduled collectors against the same store. Confirm one natural scheduled firing after cutover. The marketing deployment workflow does not deploy this candidate.

## Recovery

The pre-live UI snapshot is `b5ec971af0dd74bd7ee0dc8462364e1e8df88f37`. The previous public directory is retained privately at `~/.meritx-tender-releases/before-live-feed-20261117/`. Restoring public files does not restore SQLite data or disable the separate collector job; handle those separately if rolling back the integration. The marketing site's release workflow does not deploy this subdomain.

The original subdomain was connected through Spaceship Hosting Manager using the existing hosting slot and included FreeSSL; Spaceship added its A record. Direct cPanel subdomain creation is disabled by the platform. HTTP redirects to HTTPS. Keep this application separate from the main website.
