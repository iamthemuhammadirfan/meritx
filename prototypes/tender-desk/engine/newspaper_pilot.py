#!/usr/bin/env python3
"""Automatic, seven-calendar-day newspaper pilot. No uploads or hosted AI calls.

Date-verified publisher pages, paced HTTPS, local OCR, private evidence, explicit
partial coverage. Newspaper candidates never acquire a trusted OCR deadline.
"""
import argparse
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
import fcntl
import hashlib
import io
import importlib.util
import json
import logging
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import time
from urllib.error import HTTPError
from urllib.parse import parse_qs, urlencode, urljoin, urlsplit
from urllib.request import build_opener, HTTPRedirectHandler, Request
from urllib.robotparser import RobotFileParser

from bs4 import BeautifulSoup
from PIL import Image, ImageOps, ImageFile
from collector import (AGENT, PKT, classify_newspaper, clean, configure_logging, connect_db,
                       infer_location, iso_now, publish_feed, scheduled_hour, update_records)

HOSTS = {'epaper.dawn.com', 'e.dawn.com', 'e.jang.com.pk', 'www.express.com.pk', 'express.com.pk'}
MAX_PAGES = 48
MAX_BYTES = 12_000_000
NEWSPAPER_RUN_HOURS = (8, 21)
OCR_VERSION = 'tesseract-ads-v1'
TENDER = re.compile(r'\b(?:tenders?|bidding|pre[- ]?qualification|expression[s]? of interest|procurement notice|request for (?:proposal|quotation))\b|ٹینڈر|ٹنڈر|بولی|پیشگی اہلیت', re.I)
CONTEXT = re.compile(r'\b(?:submit|submission|bids?|quotations?|procurement|sealed|supply|supplies|closing|purchase|contract|security|proposals?)\b|جمع|خرید|فراہم|نیلام|دستاویز|مہر بند', re.I)


def approved(url):
    parts = urlsplit(url)
    if parts.scheme != 'https' or parts.hostname not in HOSTS or parts.username or parts.password or parts.port not in (None, 443):
        raise ValueError('Publisher URL is outside the approved HTTPS hosts')
    return url


class Redirects(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        approved(newurl)
        return super().redirect_request(req, fp, code, msg, headers, newurl)


class PublisherClient:
    def __init__(self, seconds=900):
        self.opener = build_opener(Redirects())
        self.robots, self.last, self.cache = {}, {}, {}
        self.end = time.monotonic() + seconds
        self.edition_end = self.end
        self.total = self.requests = 0

    def raw(self, url):
        approved(url)
        if time.monotonic() >= self.end or self.total > 300_000_000 or self.requests >= 600:
            raise TimeoutError('Pilot run budget reached; retry resumes cached OCR')
        host = urlsplit(url).hostname
        time.sleep(max(0, 1 - (time.monotonic() - self.last.get(host, 0))))
        self.last[host] = time.monotonic()
        self.requests += 1
        with self.opener.open(Request(url, headers={'User-Agent': AGENT, 'Accept': 'text/html,image/*;q=0.9,text/plain;q=0.8'}), timeout=20) as response:
            approved(response.url)
            data = response.read(MAX_BYTES + 1)
            self.total += len(data)
            if len(data) > MAX_BYTES:
                raise ValueError('Publisher file exceeded the download limit')
            return data, response.headers.get_content_type()

    def policy(self, url):
        host = urlsplit(url).hostname
        if host not in self.robots:
            parser = RobotFileParser()
            try:
                body, kind = self.raw('https://' + host + '/robots.txt')
                # Some publishers redirect a missing robots file to their home page.
                # An HTML home page has no crawler directives; it is not a bypass.
                text = body.decode('utf-8', errors='replace')
                parser.parse([] if '<html' in text[:1000].lower() else text.splitlines())
            except HTTPError as error:
                error.close()
                if error.code not in (404, 410):
                    raise ValueError('Publisher crawler policy is unavailable') from error
                parser.parse([])
            self.robots[host] = parser
        if not self.robots[host].can_fetch(AGENT, url):
            raise ValueError('Publisher crawler policy excludes this URL')
        delay = self.robots[host].crawl_delay(AGENT) or self.robots[host].crawl_delay('*') or 0
        if delay:
            time.sleep(max(0, delay - (time.monotonic() - self.last.get(host, 0))))

    def get(self, url, image=False):
        approved(url)
        if url not in self.cache:
            self.policy(url)
            data, kind = self.raw(url)
            if image and not kind.startswith('image/'):
                raise ValueError('Publisher did not return an image')
            self.cache[url] = data
        return self.cache[url] if image else self.cache[url].decode('utf-8', errors='replace')


@dataclass
class Page:
    url: str
    number: str
    image: str
    clips: list = field(default_factory=list)  # (source URL or None, bbox as fractions or None)


def edition_sources(day):
    stamp = day.strftime('%d-%m-%Y')
    return [
        {'key': 'paper-dawn', 'paper': 'Dawn', 'edition': 'National + Lahore + Islamabad', 'region': 'Unverified',
         'url': 'https://epaper.dawn.com/?' + urlencode({'page': day.strftime('%d_%m_%Y_001')}), 'kind': 'dawn'},
        *[{'key': 'paper-jang-' + city, 'paper': 'Jang', 'edition': label, 'region': 'Unverified',
           'url': f'https://e.jang.com.pk/{city}/{stamp}/page1', 'kind': 'jang', 'city': city}
          for city, label in [('lahore', 'Lahore'), ('pindi', 'Rawalpindi')] ],
        *[{'key': 'paper-express-' + code.lower(), 'paper': 'Express', 'edition': label, 'region': 'Unverified',
           'url': 'https://www.express.com.pk/epaper/Index.aspx?' + urlencode({'Issue': code, 'Date': day.strftime('%Y%m%d')}), 'kind': 'express', 'code': code}
          for code, label in [('NP_LHE', 'Lahore'), ('NP_ISB', 'Islamabad')] ],
    ]


def discover_pages(source, day, html):
    soup = BeautifulSoup(html, 'html.parser')
    urls = []
    if source['kind'] == 'dawn':
        # Include national/business pages and the two priority metros. Exclude
        # other metros explicitly; never describe this as all Dawn editions.
        for option in soup.select('#ep-page option'):
            group = option.parent.get('label', '')
            label = option.get_text(' ', strip=True)
            value = option.get('value', '')
            if re.fullmatch(day.strftime('%d_%m_%Y_') + r'\d{3}', value) and (group != 'Metro' or re.search(r'Lahore|Islamabad', label, re.I)):
                urls.append('https://epaper.dawn.com/?' + urlencode({'page': value}))
    elif source['kind'] == 'jang':
        expression = re.compile(r'https://e\.jang\.com\.pk/' + source['city'] + '/' + day.strftime('%d-%m-%Y') + r'/page\d+$')
        urls = [urljoin(source['url'], a['href']) for a in soup.select('a[href]') if expression.fullmatch(urljoin(source['url'], a['href']))]
    else:
        for a in soup.select('a[href]'):
            url = urljoin(source['url'], a['href'])
            query = parse_qs(urlsplit(url).query)
            if urlsplit(url).path.lower() == '/epaper/index.aspx' and query.get('Issue') == [source['code']] and query.get('Date') == [day.strftime('%Y%m%d')] and query.get('Pageno'):
                urls.append(url)
    if source['kind'] == 'express':
        # Menus repeat the same printed page with View and path-case changes.
        unique = {}
        for url in urls:
            query = parse_qs(urlsplit(url).query)
            unique.setdefault((query['Pageno'][0], query.get('Page', [''])[0].lower()), url)
        urls = list(unique.values())
    else:
        urls = list(dict.fromkeys(urls))
        if source['kind'] == 'jang':
            urls.sort(key=lambda url: int(url.rsplit('page', 1)[-1]))
    if not urls or len(urls) > MAX_PAGES:
        raise ValueError('Dated edition page inventory is missing or outside the pilot limit')
    return urls


def parse_page(source, day, url, html):
    soup = BeautifulSoup(html, 'html.parser')
    clips = []
    if source['kind'] == 'dawn':
        image = soup.select_one('img.ep-sheet__image')
        number = parse_qs(urlsplit(url).query).get('page', [''])[-1].split('_')[-1]
        if not image or f'/{day:%Y/%m/%d}/pages/' not in image.get('src', ''):
            raise ValueError('Dawn page date or image is missing')
        for a in soup.select('a.ep-spot[href]'):
            if a.get('aria-label', '').lower().startswith('advertisement'):
                clips.append((urljoin(url, a['href']), None))
    elif source['kind'] == 'jang':
        image = soup.select_one('img#img1')
        number = url.rsplit('page', 1)[-1]
        if not image or f'/static_pages/{day:%m-%d-%Y}/{source["city"]}/' not in image.get('src', ''):
            raise ValueError('Jang page date or edition is missing')
        for area in soup.select('area[onclick]'):
            # Parse a literal image path only; never execute publisher scripts.
            match = re.search(r"window\.open\(['\"](pic/[\w.-]+\.(?:png|jpg))(?:\?[^'\"]*)?['\"]", area['onclick'], re.I)
            if match:
                clips.append((urljoin(url, match[1]), None))
    else:
        image = soup.select_one('#Express_MainContent_imgdiv img')
        query = parse_qs(urlsplit(url).query)
        number = query.get('Pageno', ['1'])[0]
        if not image or f'/{source["code"]}/{day:%Y%m%d}/'.lower() not in image.get('src', '').lower():
            raise ValueError('Express page date or edition is missing')
        # Full-page OCR is used here. Popup links contain both stories and ads,
        # so treating all popups as advertisements would create false coverage.
    return Page(url, number, approved(urljoin(url, image['src'])), list(dict.fromkeys(clips)))


def is_tender(text):
    return bool(TENDER.search(text) and CONTEXT.search(text))


def verify_private_site(origin):
    parsed = urlsplit(origin)
    if parsed.scheme != 'https' and not (parsed.scheme == 'http' and parsed.hostname in ('127.0.0.1', 'localhost')):
        raise ValueError('Use an HTTPS team site, or a loopback preview')
    if parsed.username or parsed.password or parsed.path not in ('', '/') or parsed.query or parsed.fragment:
        raise ValueError('Enter the team site origin only')
    try:
        with build_opener().open(Request(origin.rstrip('/') + '/api/tenders', headers={'User-Agent': AGENT}), timeout=20):
            pass
    except HTTPError as error:
        error.close()
        if error.code == 401:
            return
        raise ValueError('Team-login readiness check failed') from error
    raise ValueError('Deploy and verify team login before starting newspaper collection')


class LocalOCR:
    def __init__(self, db, directory, tessdata=None, languages='eng+urd', backend='auto'):
        self.db, self.directory, self.tessdata, self.languages = db, directory, tessdata, languages
        self.binary = shutil.which('tesseract')
        if backend not in ('auto', 'cli', 'bundled'):
            raise ValueError('Choose an available OCR backend')
        self.backend = 'bundled' if backend == 'bundled' or (backend == 'auto' and not self.binary) else 'cli'
        self.extra = ['--tessdata-dir', str(tessdata)] if tessdata else []
        self.helper = Path(__file__).with_name('ocr_worker.py')
        if self.backend == 'cli':
            if not self.binary:
                raise RuntimeError('The Tesseract command-line executable is unavailable')
            command = [self.binary, '--list-langs', *self.extra]
        else:
            if not tessdata or not importlib.util.find_spec('tesserocr'):
                raise RuntimeError('Install the free tesserocr wheel and provide the OCR language-data directory')
            command = [sys.executable, str(self.helper), '--tessdata', str(tessdata), '--languages', languages, '--check']
        result = subprocess.run(command, capture_output=True, text=True, timeout=15, check=True,
                                env={**os.environ, 'OMP_THREAD_LIMIT': '1'})
        available = json.loads(result.stdout)['languages'] if self.backend == 'bundled' else result.stdout.splitlines()
        if not set(languages.split('+')) <= set(available):
            raise RuntimeError('The pilot requires both English and Urdu Tesseract language files')

    def read(self, image):
        image = ImageOps.exif_transpose(image).convert('L')
        if image.width * image.height > 20_000_000:
            raise ValueError('Publisher image exceeds the OCR pixel limit')
        # Never upsample an entire huge edition. A modest enlargement helps
        # narrow ad columns. The private image is the OCR input; the publisher
        # page remains linked as the original source.
        if image.width < 1400 and image.width * image.height * 4 <= 16_000_000:
            image = image.resize((image.width * 2, image.height * 2))
        output = io.BytesIO(); image.save(output, 'PNG')
        data = output.getvalue()
        digest = hashlib.sha256(data).hexdigest()
        cache_key = hashlib.sha256((OCR_VERSION + self.backend + self.languages + digest).encode()).hexdigest()
        old = self.db.execute('SELECT text FROM newspaper_ocr WHERE digest=?', (cache_key,)).fetchone()
        if old:
            return old['text'], digest, data
        filename = self.directory / (digest + '.work.png')
        filename.write_bytes(data)
        try:
            command = ([self.binary, str(filename), 'stdout', '-l', self.languages, '--psm', '3', *self.extra]
                       if self.backend == 'cli' else [sys.executable, str(self.helper), '--tessdata', str(self.tessdata), '--languages', self.languages, str(filename)])
            result = subprocess.run(command,
                                    capture_output=True, text=True, timeout=60, check=True,
                                    env={**os.environ, 'OMP_THREAD_LIMIT': '1'})
            text = result.stdout[:80_000]
        finally:
            filename.unlink(missing_ok=True)
        with self.db:
            self.db.execute('INSERT OR REPLACE INTO newspaper_ocr(digest,text) VALUES(?,?)', (cache_key, text))
        return text, digest, data


def decode_image(data):
    image = Image.open(io.BytesIO(data))
    if image.width * image.height > 20_000_000:
        image.close()
        raise ValueError('Publisher image exceeds the pixel limit')
    try:
        image.load()
        return image, False
    except OSError as error:
        image.close()
        if 'truncated' not in str(error).lower():
            raise
        # A publisher JPEG can be missing its final bytes. Decode what is
        # available, but flag the whole edition partial; never call it complete.
        try:
            ImageFile.LOAD_TRUNCATED_IMAGES = True
            image = Image.open(io.BytesIO(data))
            image.load()
            return image, True
        finally:
            ImageFile.LOAD_TRUNCATED_IMAGES = False


def candidate(source, day, page, text, digest):
    lines = [clean(line) for line in text.splitlines() if clean(line)]
    service = next((line for line in lines if classify_newspaper(line)), None)
    title = (service or f'Tender advertisement · {source["paper"]} · page {page.number}')[:220]
    location = infer_location(text, '')
    location['basis'] = 'ad-text' if location['basis'] != 'unknown' else 'unknown'
    # Edition city does not establish the procuring authority or delivery site.
    federal = bool(re.search(r'\b(?:Government of Pakistan|federal|Ministry of|Pakistan Railways|NADRA|WAPDA|NTDC)\b|حکومت پاکستان|وفاقی', text, re.I))
    region = 'Federal' if federal else 'Punjab' if location['city'] in ('Lahore', 'Multan', 'Faisalabad', 'Gujranwala', 'Sialkot', 'Rawalpindi') else 'Unverified'
    # OCR references and dates are deliberately not authoritative merge keys.
    return {'id': 'NEWS-' + hashlib.sha256((source['key'] + day.isoformat() + page.url + digest).encode()).hexdigest()[:32],
            'reference': None, 'sourceKey': source['key'], 'title': title, 'buyer': 'Buyer needs source review',
            'region': region, 'sourceUrl': page.url, 'publishedAt': day.isoformat(), 'closingAt': None,
            'datePrecision': 'unknown', 'location': location, 'procurementType': 'Newspaper candidate',
            'amendmentFlag': bool(re.search(r'corrigendum|extension|تصحیح|توسیع', text, re.I)),
            'deadlineWarning': 'Automatically extracted newspaper candidate. Deadline and eligibility are not verified.',
            'newspaper': source['paper'], 'edition': source['edition'], 'page': page.number,
            'reviewStatus': 'needs-review', 'ocrText': text[:6000], 'evidenceId': digest,
            'advertisements': [{'label': 'Publisher page', 'url': page.url, 'sourceUrl': page.url}]}


def process_page(client, ocr, source, day, page, evidence):
    raw = client.get(page.image, image=True)
    decoded, truncated = decode_image(raw)
    with decoded as original:
        images = []
        clip_errors = int(truncated)
        for clip_url, _ in page.clips[:60]:
            if time.monotonic() >= client.edition_end:
                clip_errors += 1
                break
            try:
                if source['kind'] == 'dawn':
                    soup = BeautifulSoup(client.get(clip_url), 'html.parser')
                    img = soup.find('img', src=lambda value: value and '/stories/' in value)
                    if not img or f'/{day:%Y/%m/%d}/' not in img['src']:
                        raise ValueError('Dated advertisement image not found')
                    clip_url = approved(urljoin(clip_url, img['src']))
                data = client.get(clip_url, image=True)
                clip_image, clip_truncated = decode_image(data)
                clip_errors += int(clip_truncated)
                with clip_image as clip:
                    text, digest, png = ocr.read(clip)
                if is_tender(text):
                    images.append((text, digest, png))
            except Exception:
                clip_errors += 1
        text, digest, png = ocr.read(original)
        # Page-level fallback avoids silently losing an ad when a publisher has
        # no clipping map. It may contain multiple notices; keep it unverified.
        if is_tender(text) and not images:
            images.append((text, digest, png))
        records = []
        for text, digest, png in {digest: (text, digest, png) for text, digest, png in images}.values():
            filename = evidence / (digest + '.png')
            if not filename.exists():
                if len(png) > MAX_BYTES or sum(file.stat().st_size for file in evidence.glob('*.png')) + len(png) > 512_000_000:
                    raise ValueError('Private evidence storage limit reached')
                filename.write_bytes(png)
            records.append(candidate(source, day, page, text, digest))
        return records, clip_errors + int(len(page.clips) > 60)


def initialize_db(db):
    db.executescript('''
      CREATE TABLE IF NOT EXISTS newspaper_pilot(id INTEGER PRIMARY KEY CHECK(id=1), start_date TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS newspaper_daily(day TEXT NOT NULL, source_key TEXT NOT NULL, payload TEXT NOT NULL, PRIMARY KEY(day,source_key));
      CREATE TABLE IF NOT EXISTS newspaper_ocr(digest TEXT PRIMARY KEY, text TEXT NOT NULL);
    ''')


def run(data_dir, start=False, requested_day=None, tessdata=None, seconds=900):
    os.umask(0o077)
    data_dir.mkdir(mode=0o700, parents=True, exist_ok=True)
    with (data_dir / 'collector.lock').open('w') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            return {'skipped': 'another collection is running'}
        db = connect_db(data_dir / 'tenders.sqlite3')
        initialize_db(db)
        today = datetime.now(PKT).date()
        config = db.execute('SELECT start_date FROM newspaper_pilot WHERE id=1').fetchone()
        if not config and start:
            config = {'start_date': today.isoformat()}
        if not config:
            raise ValueError('Start the pilot explicitly with --start after team login is deployed')
        beginning = date.fromisoformat(config['start_date'])
        day = requested_day or today
        if not beginning <= day < beginning + timedelta(days=7) or day > today:
            try:
                previous_status = json.loads((data_dir / 'feed.json').read_text()).get('pilot', {}).get('status')
            except (OSError, ValueError):
                previous_status = None
            if today >= beginning + timedelta(days=7) and previous_status != 'complete':
                with db:
                    publish_feed(db, data_dir, iso_now())
            db.close()
            return {'status': 'outside-seven-day-window', 'startDate': beginning.isoformat()}
        private = data_dir / 'newspapers'
        evidence = private / 'evidence'
        evidence.mkdir(mode=0o700, parents=True, exist_ok=True)
        client = PublisherClient(seconds)
        ocr = LocalOCR(db, private, tessdata)
        with db:
            db.execute('INSERT OR IGNORE INTO newspaper_pilot VALUES(1,?)', (beginning.isoformat(),))
        outcomes = []
        for source in edition_sources(day):
            # Dawn combines national/business pages and both priority metros.
            weight = 2 if source['kind'] == 'dawn' else 1
            client.edition_end = min(client.end, time.monotonic() + max(15, seconds * weight / 6))
            now = iso_now()
            old = db.execute('SELECT payload FROM source_state WHERE source_key=?', (source['key'],)).fetchone()
            old = json.loads(old['payload']) if old else {}
            state = {'key': source['key'], 'name': source['paper'] + ' · ' + source['edition'],
                     'region': 'Unverified', 'url': source['url'], 'edition': source['edition'],
                     'publicationDate': day.isoformat(), 'coverage': 'Automatic dated e-paper collection. OCR candidates need review. Edition location is not delivery location; detection is not guaranteed complete.',
                     'lastAttemptAt': now, 'lastSuccessAt': old.get('lastSuccessAt'), 'pagesExpected': 0,
                     'pagesFetched': 0, 'pagesProcessed': 0, 'reviewCount': 0, 'count': 0, 'listingComplete': False}
            records, errors = [], 0
            try:
                html = client.get(source['url'])
                urls = discover_pages(source, day, html)
                state['pagesExpected'] = len(urls)
                for url in urls:
                    if time.monotonic() >= client.edition_end:
                        errors += 1
                        break
                    try:
                        page = parse_page(source, day, url, client.get(url))
                        # Fetched means the page image was retrieved, not just HTML.
                        client.get(page.image, image=True)
                        state['pagesFetched'] += 1
                        items, clip_errors = process_page(client, ocr, source, day, page, evidence)
                        records.extend(items); errors += clip_errors
                        state['pagesProcessed'] += 1
                        logging.info('%s %s: page %s, %s candidates', source['paper'], source['edition'], page.number, len(items))
                        if time.monotonic() >= client.end:
                            raise TimeoutError('Pilot run budget reached')
                    except Exception as error:
                        errors += 1
                        logging.warning('%s page unavailable: %s', source['key'], type(error).__name__)
                if state['pagesProcessed'] == 0:
                    raise ValueError('No newspaper pages were processed')
                state['status'] = 'connected' if not errors and state['pagesProcessed'] == len(urls) else 'partial'
                if state['status'] == 'connected':
                    state['lastSuccessAt'] = iso_now()
                if errors:
                    state['error'] = f'{errors} page or clipping checks failed; retained records remain available.'
            except Exception as error:
                state.update(status='unavailable', error=str(error) if isinstance(error, (ValueError, TimeoutError)) else 'Publisher could not be collected. Automatic retry is needed.')
            unique = list({record['id']: record for record in records}.values())
            with db:
                update_records(db, unique, now, False, source['key'])
                retained = [json.loads(row['payload']) for row in db.execute('SELECT payload FROM notices WHERE source_key=?', (source['key'],))]
                count = sum(item.get('publishedAt') == day.isoformat() for item in retained)
                state.update(count=count, reviewCount=count, candidateCount=count)
                # Keep the best result from retries; a transient failed retry
                # must not erase an earlier successful edition in the pilot log.
                prior = db.execute('SELECT payload FROM newspaper_daily WHERE day=? AND source_key=?', (day.isoformat(), source['key'])).fetchone()
                previous = json.loads(prior['payload']) if prior else None
                best = previous if previous and (previous['status'] == 'connected', previous['pagesProcessed'], previous['count']) > (state['status'] == 'connected', state['pagesProcessed'], state['count']) else state
                db.execute('INSERT OR REPLACE INTO newspaper_daily VALUES(?,?,?)', (day.isoformat(), source['key'], json.dumps(best)))
                db.execute('INSERT OR REPLACE INTO source_state VALUES(?,?)', (source['key'], json.dumps(state)))
                publish_feed(db, data_dir, iso_now())
            outcomes.append({key: state[key] for key in ('key', 'status', 'pagesExpected', 'pagesFetched', 'pagesProcessed', 'count')})
        db.close()
        return {'status': 'collected', 'date': day.isoformat(), 'editions': outcomes, 'requests': client.requests}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--data-dir', type=Path, required=True)
    parser.add_argument('--start', action='store_true', help='Begin the seven-day pilot today; never resets an existing pilot')
    parser.add_argument('--date', type=date.fromisoformat, help='Retry an elapsed day within the pilot window')
    parser.add_argument('--tessdata', type=Path)
    parser.add_argument('--seconds', type=int, default=900)
    parser.add_argument('--scheduled', action='store_true', help='Run only at 08:00 or 21:00 Asia/Karachi from hourly cron')
    parser.add_argument('--site-origin', default='https://tenders.meritxsc.com', help='Anonymous API access must return 401 before collection')
    args = parser.parse_args()
    if args.scheduled:
        if args.start or args.date:
            parser.error('--scheduled cannot be combined with --start or --date')
        if not scheduled_hour(NEWSPAPER_RUN_HOURS):
            return 0
    configure_logging(args.data_dir / 'newspaper-cron.log' if args.scheduled else None)
    if args.scheduled:
        logging.info('Scheduled newspaper collection started at %s', iso_now())
    try:
        verify_private_site(args.site_origin)
        result = run(args.data_dir.resolve(), args.start, args.date, args.tessdata, max(30, min(1200, args.seconds)))
    except Exception as error:
        logging.error('Newspaper pilot did not run: %s', error)
        return 1
    summary = json.dumps(result)
    if args.scheduled:
        logging.info('%s', summary)
    print(summary)
    if result.get('status') == 'collected' and not any(edition['pagesProcessed'] for edition in result['editions']):
        logging.error('Newspaper collection processed no pages')
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
