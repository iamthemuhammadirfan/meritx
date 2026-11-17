# MeritX Tender Desk prototype

Standalone interface for team review. All six notices and buyer descriptions are fictional. The fixed reference date is 17 November 2026. Punjab and federal filters, Lahore priority, search, service filters, tender details, sample briefs, amendments and shortlist interactions work locally.

Company registration and eligibility details are deliberately deferred. There is no collector, account system, backend or shared shortlist. Saved selections remain in each browser's local storage. No personal or company registration information is included.

`index.html` is the editable, standalone application. Fonts and the pinned Lucide 0.468.0 browser bundle are self-hosted in `assets/`. The initial conversion from the conversation fragment used `build.py`; subsequent product edits can be made directly in `index.html`.

Only deploy `index.html`, `.htaccess` and `assets/`. Never upload the builder, documentation, project `.env`, source tree or Git metadata. The prototype uses a robots meta tag and X-Robots-Tag header; these are indexing instructions, not access controls. It is intended for sharing a fictional-data demo by URL.

The Spaceship MCP can upload files. Attempting `SubDomain::addsubdomain` returned `subdomain creation is disabled on this platform`; subdomain provisioning must use Spaceship Hosting Manager. Do not bypass the platform hook or modify web-server or DNS internals.

## Live review deployment

Published at **https://tenders.meritxsc.com/** on 17 November 2026. The domain was connected through the signed-in Spaceship Hosting Manager, using an existing hosting slot and included FreeSSL. Spaceship added the A record for the hosting IP automatically. The standalone public output lives in `/home/rhjnctqjdv/tenders.meritxsc.com/`.

The subdomain additionally redirects HTTP to HTTPS. HTTPS returned 200 with a valid certificate. The main website's homepage and root `.htaccess` checksums were unchanged. At the owner's request, the temporary https://meritxsc.com/tenders/ copy was retired; that path should return 404. Its files were moved outside the document root to `~/.meritx-tender-releases/retired-main-route-20261117/` for recovery.

Rollback snapshots before the additions: main site `7287da5bb525feb186164b3514d62f68826d9e94`; empty subdomain `8d5cba5b1c60a9cf7b4c65787906a8ca458038df`. The deployment archive is retained privately in `~/.meritx-tender-releases/` on the hosting account. Only public output files were uploaded.

To regenerate from a reviewed conversation fragment:

```sh
python3 prototypes/tender-desk/build.py /absolute/path/to/fragment.html
```
