# MeritX Tender Desk

Live at **https://tenders.meritxsc.com/**. Official notices replaced the fictional prototype on 17 November 2026. The main-domain `/tenders` and `/tenders/` routes remain retired and return 404.

## Coverage and matching

The daily collector also checks Federal PPRA's public tender listings and selects up to 120 active detail pages, prioritizing Lahore and MeritX service keywords. Official advertisement PDFs are linked from the issuing agency's PPRA record. These can include newspaper clippings and publication-ready ad copies. The dashboard's advertisement filter shows this evidence. Exact EPADS references are merged when deadlines agree. Conflicting deadlines keep both records and display a warning. Failed checks retain previously collected evidence.

This connector scans up to 40 listing pages and reports its detail-check limit in Sources. Full newspaper/edition coverage requires publisher or aggregator access. Direct e-paper scans, OCR and comprehensive Punjab newspaper coverage are still pending. Existing Punjab departmental notices remain available. No publisher name or edition is inferred from an advertisement filename.

Federal EPADS public open procurement listings and recent Punjab Information Technology Board notices are connected. Punjab's central procurement portal is currently unreachable from hosting; its availability is checked, but its notices are not represented as collected. PITB coverage is limited to recent departmental notices, up to 20 pages, stopping after three wholly expired pages. Older long-running opportunities can require a source check. Newspapers are not connected yet. Source status, last success and record provenance are visible in the dashboard.

Service matches use explainable title keywords for equipment, networking, CCTV, software and IT support. Electricity-grid networks and railway computer-based interlocking are excluded from these ordinary IT rules. A match is not an eligibility decision or a win prediction. Lahore in the title is distinguished from a buyer located in Lahore; buyer location does not establish the delivery site. Missing deadline times are not guessed.

Company details, tenant accounts, shared shortlists, subscriptions and eligibility checks are deferred. The current shortlist stays in each browser. The catalog is publicly readable; search-indexing exclusions are not access controls. See `docs/tender-platform-plan.txt` for newspaper intake and the commercial product plan.

## Public application and private collector

The current live release serves `index.html`, `assets/` and `/api/tenders` from the private Node application root at `~/meritx-tender-web/releases/9d5ac48/`. The subdomain document root contains routing/security configuration only. `/api/tenders.php` is retired. Fonts and Lucide, including their licenses, are self-hosted. The browser loads the snapshot on opening and refreshes it every five minutes while visible; it never launches a crawl.

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

## Node.js application

The application runs the dashboard and `/api/tenders` on one origin with Node.js 22, using built-in HTTP, filesystem and compression libraries with no npm runtime dependencies. The CommonJS startup file `app.cjs` calls `listen()` once for the host's reverse port binding. Marketing-site enquiry PHP is a separate application. API startup never starts the collector. Collection continues as a separate daily Python process, publishing an atomic snapshot.

The API caches the public projection and its gzip representation until the snapshot changes, supports GET/HEAD and conditional ETags, and marks data stale after 36 hours even if the file is unchanged. Weak ETags identify equivalent JSON across encodings because LiteSpeed can transform upstream gzip into identity responses. Missing or corrupt snapshots return 503 without exposing paths. `/healthz` checks process liveness; `/readyz` checks the snapshot and reports staleness. Only the dashboard and `assets/` are served as files. Collector code, databases and raw source material are not public routes.

Use Node.js 22 or newer. From the repository root:

```sh
# Set this to an existing public snapshot; a page visit does not create one.
MERITX_FEED_PATH=/absolute/private/path/feed.json node prototypes/tender-desk/app.cjs
```

Open `http://127.0.0.1:8053/`. To collect locally, install `engine/requirements.txt` in a private Python environment and run `engine/collector.py --data-dir /absolute/private/path`, following the source-access policies above. Tests use synthetic fixtures and make no external collection requests:

```sh
node --test prototypes/tender-desk/api/server.test.cjs
.private/tender-api-venv/bin/python -m unittest discover -s prototypes/tender-desk/engine -p 'test_*.py' -v
```

Ten API tests cover projection, compression, conditional responses, atomic refresh, stale transitions, invalid feeds, private paths, symlinks and concurrent requests. CI runs these and the nine collector tests.

## Deployment requirements and cutover

Verified on 17 November 2026 through read-only account queries: CloudLinux Python Selector and Node Selector both report `selector_enabled: true` and `passenger_active: true`. Python 3.13.18 and Node 22.23.5 are enabled; a short-lived Node 22 HTTP server returned 200 on loopback and exited. cPanel's separate `passengerapps` feature is disabled, which does not disable the CloudLinux selectors. The account has limits of one CPU equivalent, 2 GiB RAM, 20 entry processes and 200 total processes at inspection. The live subdomain returns HTTPS 200 with a valid certificate.

The Node app passed all ten API tests in a temporary private directory on this hosting account. Its startup file served the live 1,157-record snapshot over loopback. The app was then registered on the existing subdomain with no DNS change, and public health, readiness and API requests returned 200. The host runs the app as an account-owned `lsnode` process. The selector's restart action touches `tmp/restart.txt`; at inspection it did not replace the running PID. Controlled SIGTERM of the single process verified by account UID and full application path caused LiteSpeed to spawn a new PID, with readiness restored. Never stop unrelated Node processes or the shared web server. Future releases must verify actual process replacement rather than relying solely on the selector's success message.

The supported current-host path is **Node.js via CloudLinux/Passenger + the existing Python collector**. Spaceship documents Node app registration, version selection, custom subdomains, environment variables and restart controls: https://www.spaceship.com/knowledgebase/setup-nodejs-application-spaceship-hosting/. Passenger owns the public socket; do not expose port 8053, add a port to DNS, or start an unmanaged background server. CommonJS avoids Passenger's module-loader compatibility constraints.

Python Selector's ordinary hosting interface is WSGI, whereas FastAPI/Uvicorn requires ASGI. Installing Uvicorn alone does not add domain routing or restart supervision. Native Uvicorn hosting on this shared plan is not established. References: https://docs.cloudlinux.com/cloudlinuxos/cloudlinux_os_components/#python-selector and https://fastapi.tiangolo.com/deployment/manually/. FastAPI would need a provider-approved ASGI route or another host. Hyperlift supports containers and custom domains, but its published terms currently reserve persistent storage for OpenClaw templates; it is not a drop-in persistent SQLite/worker home. Reference: https://www.spaceship.com/legal/vps-and-hyperlift-terms-of-service/.

After an explicit production release request:

1. Follow the repository's development-to-main release rule, with passing validation. The marketing workflow excludes tenders and does not perform this subdomain cutover.
2. Stage only `app.cjs`, `api/server.cjs`, `package.json`, `index.html` and `assets/` in a private versioned application directory outside all document roots. No runtime npm install is needed. Set private ownership/permissions for the hosting account. Do not upload tests, raw responses, company records or collector state to a public directory.
3. Back up the current subdomain files and configuration privately. Record the old app mapping for rollback. Keep SQLite and collector backups separate.
4. In **Setup Node.js App**, register Node 22 in Production mode, application root pointing at that private release, URL `tenders.meritxsc.com` with root URI `/`, startup file `app.cjs`. Set `MERITX_FEED_PATH=/home/rhjnctqjdv/.meritx-tender-engine/data/feed.json`, `MERITX_ALLOWED_HOSTS=tenders.meritxsc.com,localhost,127.0.0.1` and `NODE_ENV=production`. Use the same account UID; the API can read the private snapshot without weakening its permissions.
5. Preserve the subdomain's existing DNS and TLS. Preserve HTTPS redirect and public security headers, but retain the app manager's generated Passenger directives. Move the obsolete public index/assets/PHP files to the private release backup so stale static files cannot shadow the Node routes. The private app serves the new UI and assets. Verify manager registration on this specific subdomain; that public mapping has not been exercised by the loopback tests.
6. Restart through the app manager. Check public GET/HEAD, gzip, conditional ETags, `/healthz`, `/readyz`, actual source data and browser filters. Confirm the old PHP endpoint and private source paths return 404, and `/tenders/` on the main domain remains 404. Confirm process restart behavior through the manager. If checks fail, remove the new app mapping and restore the previous document-root files/configuration.
7. Keep the existing 06:00 Asia/Karachi job. It writes the same atomic snapshot; no duplicate scheduler or database migration is required. Confirm one natural scheduled firing after cutover.

The optional Dockerfile is a portable web-only candidate, not locally Docker-tested or needed for Spaceship shared hosting. Build its context from this directory. It uses Node 22 and port 8080 as the unprivileged `node` user (UID 1000). Mount only a public `feed.json` read-only at `/data/feed.json`, with suitable ownership. A separate Python worker must publish updates; this image does not contain Python or worker state. Cross-host deployment needs an explicit snapshot transfer mechanism and durable storage, not just a local bind mount.

## Recovery

The pre-Node public files, original configuration and consistent SQLite backup are at `~/.meritx-tender-releases/before-node-9d5ac48-20261117T164300Z/`; code snapshot `f835bcf392fb14427827159e1d16854b5c84102a`. The displaced public directory is `~/.meritx-tender-releases/node-docroot-9d5ac48/`, but its configuration already contains Node routing. For a full PHP rollback, unregister the Node app mapping and restore the original `public/` backup, including its `.htaccess`. Keep the Python collector job running. Do not overwrite current SQLite state with the older backup unless deliberately rolling back data.

The pre-live UI snapshot is `b5ec971af0dd74bd7ee0dc8462364e1e8df88f37`. The previous public directory is retained privately at `~/.meritx-tender-releases/before-live-feed-20261117/`. Restoring public files does not restore SQLite data or disable the separate collector job; handle those separately if rolling back the integration. The marketing site's release workflow does not deploy this subdomain.

The original subdomain was connected through Spaceship Hosting Manager using the existing hosting slot and included FreeSSL; Spaceship added its A record. Direct cPanel subdomain creation is disabled by the platform. HTTP redirects to HTTPS. Keep this application separate from the main website.
