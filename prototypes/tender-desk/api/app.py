"""Read-only FastAPI service for the Python tender collector's atomic snapshot.

The API never starts collection. Serve it with Uvicorn behind a TLS proxy; the
separate daily worker writes the snapshot outside the public asset directory.
"""

from dataclasses import dataclass
from datetime import datetime, timezone
import gzip
import hashlib
import json
import logging
import os
from pathlib import Path
import threading
from typing import Callable

from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from starlette.middleware.trustedhost import TrustedHostMiddleware

MAX_FEED_BYTES = 12_000_000
MAX_AGE_SECONDS = 36 * 3600
SOURCE_FIELDS = {'key', 'name', 'region', 'url', 'coverage', 'lastAttemptAt',
                 'lastSuccessAt', 'pagesChecked', 'detailErrors', 'detailsChecked',
                 'detailLimitReached', 'listingComplete', 'status', 'count', 'error'}
TENDER_FIELDS = {'id', 'reference', 'sourceKey', 'title', 'buyer', 'region',
                 'sourceUrl', 'publishedAt', 'closingAt', 'datePrecision',
                 'procurementType', 'amendmentFlag', 'documents', 'location',
                 'detailUrl', 'detailVerifiedAt', 'deadlineWarning', 'detailWarning',
                 'deadlineBasis', 'firstSeenAt', 'lastSeenAt', 'matches',
                 'eligibility', 'listed', 'sourceName', 'sourceStatus', 'changes'}
SECURITY_HEADERS = {
    'X-Content-Type-Options': 'nosniff',
    'X-Robots-Tag': 'noindex, nofollow, noarchive',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'self'",
}


class FeedUnavailable(Exception):
    pass


def public_feed(data):
    """Explicit public projection: future company/tenant fields cannot leak."""
    if not isinstance(data, dict) or data.get('schemaVersion') != 1:
        raise FeedUnavailable('Invalid feed version')
    if not isinstance(data.get('sources'), list) or not isinstance(data.get('tenders'), list):
        raise FeedUnavailable('Invalid feed collections')
    if not all(isinstance(item, dict) for item in data['sources'] + data['tenders']):
        raise FeedUnavailable('Invalid feed records')
    projected = {key: data[key] for key in ('schemaVersion', 'generatedAt', 'coverageNote') if key in data}
    schedule = data.get('schedule', {})
    projected['schedule'] = {key: schedule[key] for key in ('time', 'timezone', 'frequency') if key in schedule} if isinstance(schedule, dict) else {}
    projected['sources'] = [{key: value for key, value in item.items() if key in SOURCE_FIELDS} for item in data['sources']]
    projected['tenders'] = []
    for item in data['tenders']:
        tender = {key: value for key, value in item.items() if key in TENDER_FIELDS}
        for field, allowed in (
            ('documents', {'label', 'url'}), ('matches', {'category', 'keyword'}),
        ):
            tender[field] = [{key: value for key, value in child.items() if key in allowed} for child in item.get(field, []) if isinstance(child, dict)]
        location = item.get('location', {})
        tender['location'] = {key: location[key] for key in ('city', 'basis') if key in location} if isinstance(location, dict) else {}
        history = []
        for change in item.get('changes', []):
            if not isinstance(change, dict) or not isinstance(change.get('fields'), dict):
                continue
            fields = {key: {part: value[part] for part in ('before', 'after') if part in value}
                      for key, value in change['fields'].items()
                      if key in ('title', 'closingAt', 'datePrecision', 'amendmentFlag') and isinstance(value, dict)}
            history.append({'recordedAt': change.get('recordedAt'), 'fields': fields})
        tender['changes'] = history[:5]
        projected['tenders'].append(tender)
    return projected


@dataclass(frozen=True)
class Representation:
    body: bytes
    etag: str


class SnapshotStore:
    def __init__(self, path: Path, clock: Callable[[], datetime]):
        self.path, self.clock = path, clock
        self.lock = threading.Lock()
        self.signature = None
        self.payload = None
        self.variants = {}

    def read(self, compressed=False):
        with self.lock:
            try:
                stat = self.path.stat()
                signature = (stat.st_dev, stat.st_ino, stat.st_size, stat.st_mtime_ns)
                if stat.st_size > MAX_FEED_BYTES:
                    raise FeedUnavailable('Feed exceeds the size limit')
                if self.signature != signature:
                    # Read an opened file's identity so an atomic collector swap
                    # cannot pair old bytes with a new file's cache signature.
                    with self.path.open('rb') as stream:
                        opened = os.fstat(stream.fileno())
                        content = stream.read(MAX_FEED_BYTES + 1)
                    if len(content) > MAX_FEED_BYTES:
                        raise FeedUnavailable('Feed exceeds the size limit')
                    payload = public_feed(json.loads(content))
                    generated = datetime.fromisoformat(payload['generatedAt'])
                    if generated.tzinfo is None:
                        raise FeedUnavailable('Feed timestamp needs a timezone')
                    self.payload, self.generated = payload, generated
                    self.signature = (opened.st_dev, opened.st_ino, opened.st_size, opened.st_mtime_ns)
                    self.variants = {}
                stale = (self.clock() - self.generated).total_seconds() > MAX_AGE_SECONDS
                key = (stale, compressed)
                if key not in self.variants:
                    body = json.dumps({**self.payload, 'stale': stale}, ensure_ascii=False, separators=(',', ':')).encode()
                    if compressed:
                        body = gzip.compress(body, compresslevel=6, mtime=0)
                    self.variants[key] = Representation(body, '"' + hashlib.sha256(body).hexdigest() + '"')
                return self.variants[key], stale
            except (OSError, ValueError, KeyError, TypeError, OverflowError) as error:
                raise FeedUnavailable('Snapshot cannot be read') from error


def encoding_quality(header, name):
    values = {}
    for part in header.lower().split(','):
        coding, *parameters = part.strip().split(';')
        quality = 1.0
        for parameter in parameters:
            if parameter.strip().startswith('q='):
                try:
                    quality = float(parameter.strip()[2:])
                except ValueError:
                    quality = 0
        values[coding] = quality if 0 <= quality <= 1 else 0
    return values.get(name, values.get('*', 0 if name != 'identity' else 1))


def etag_matches(header, etag):
    return any(value.strip().removeprefix('W/') in ('*', etag) for value in header.split(','))


def create_app(snapshot=None, frontend=None, clock=None):
    snapshot = Path(snapshot or os.environ.get('MERITX_FEED_PATH', Path.home() / '.meritx-tender-engine/data/feed.json'))
    frontend = Path(frontend or Path(__file__).resolve().parent.parent)
    store = SnapshotStore(snapshot, clock or (lambda: datetime.now(timezone.utc)))
    service = FastAPI(title='MeritX Tender API', docs_url=None, redoc_url=None, openapi_url=None)
    hosts = os.environ.get('MERITX_ALLOWED_HOSTS', 'tenders.meritxsc.com,localhost,127.0.0.1,testserver')
    service.add_middleware(TrustedHostMiddleware, allowed_hosts=[host.strip() for host in hosts.split(',') if host.strip()])

    @service.middleware('http')
    async def security_headers(request, call_next):
        response = await call_next(request)
        response.headers.update(SECURITY_HEADERS)
        return response

    @service.exception_handler(FeedUnavailable)
    async def unavailable(request, error):
        logging.warning('Tender snapshot unavailable: %s', type(error.__cause__).__name__)
        return JSONResponse({'error': 'The tender feed is not ready. Please try again shortly.'}, status_code=503,
                            headers={'Retry-After': '300', 'Cache-Control': 'no-store'})

    @service.api_route('/api/tenders', methods=['GET', 'HEAD'])
    def tender_feed(request: Request):
        compressed = encoding_quality(request.headers.get('accept-encoding', ''), 'gzip') > 0
        if not compressed and encoding_quality(request.headers.get('accept-encoding', ''), 'identity') == 0:
            return JSONResponse({'error': 'Accept gzip or identity encoding.'}, status_code=406)
        representation, _ = store.read(compressed)
        headers = {'ETag': representation.etag, 'Cache-Control': 'public, max-age=60, must-revalidate', 'Vary': 'Accept-Encoding'}
        if compressed:
            headers['Content-Encoding'] = 'gzip'
        if etag_matches(request.headers.get('if-none-match', ''), representation.etag):
            return Response(status_code=304, headers=headers)
        headers['Content-Length'] = str(len(representation.body))
        return Response(b'' if request.method == 'HEAD' else representation.body, media_type='application/json', headers=headers)

    @service.get('/healthz')
    def health():
        return JSONResponse({'status': 'ok'}, headers={'Cache-Control': 'no-store'})

    @service.get('/readyz')
    def ready():
        _, stale = store.read()
        return JSONResponse({'status': 'stale' if stale else 'ready', 'stale': stale}, headers={'Cache-Control': 'no-store'})

    @service.api_route('/', methods=['GET', 'HEAD'])
    def dashboard():
        return FileResponse(frontend / 'index.html', headers={'Cache-Control': 'no-cache, must-revalidate'})

    # Mount only public assets. Collector code, database, PHP, documentation and
    # the rest of the repository are never a static-file root.
    service.mount('/assets', StaticFiles(directory=frontend / 'assets'), name='assets')
    return service


app = create_app()
