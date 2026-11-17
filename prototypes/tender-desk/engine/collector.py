#!/usr/bin/env python3
"""Collect public official notices; publish an atomic, provenance-bearing feed.

Run under Python 3.11+ outside the web root. No model, private company details,
browser session, paid data source or API key is needed for these connectors.
"""

import argparse
from datetime import datetime, timedelta
import fcntl
import hashlib
import json
import logging
import os
from pathlib import Path
import re
import sqlite3
import time
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, urlencode, urljoin, urlsplit
from urllib.request import build_opener, HTTPRedirectHandler, Request
from urllib.robotparser import RobotFileParser
from zoneinfo import ZoneInfo

from bs4 import BeautifulSoup

PKT = ZoneInfo('Asia/Karachi')
AGENT = 'MeritXTenderDesk/1.0 (+https://tenders.meritxsc.com/)'
ALLOWED_HOSTS = {'epads.gov.pk', 'www.epads.gov.pk', 'pa.epads.gov.pk',
                 'pitb.gov.pk', 'www.pitb.gov.pk', 'eproc.punjab.gov.pk', 'ep.punjab.gov.pk',
                 'epms.ppra.gov.pk'}
PRESS_LIST = 'https://epms.ppra.gov.pk/public/tenders/active-tenders'
PRESS_DETAIL = '/public/tenders/tender-details/'
DATE_PATTERN = r'(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+[A-Za-z]+\s+\d{1,2},\s+\d{4}\s+\d{1,2}:\d{2}\s*[AP]M'
RULES = {
    'IT equipment': r'\b(?:laptops?|desktops?|computers?|workstations?|servers?|printers?|scanners?|tablets?|it hardware|it equipment|san storage|data cent(?:er|re))\b',
    'Networking': r'\b(?:network(?:ing|s)?|switch(?:es)?|routers?|firewalls?|wi[ -]?fi|cabling|fiber|fibre|internet connectivity)\b',
    'CCTV': r'\b(?:cctv|surveillance|security cameras?|nvr|dvr|access control)\b',
    'Software': r'\b(?:software|websites?|web portals?|erp|web applications?|mobile applications?|application development|reporting portal|dashboard)\b',
    'IT support': r'\b(?:it support|technical support|ict support|it maintenance|computer maintenance|it services|computer repair)\b',
}
CITIES = ('Lahore', 'Islamabad', 'Rawalpindi', 'Karachi', 'Multan', 'Faisalabad',
          'Peshawar', 'Quetta', 'Gujranwala', 'Sialkot', 'Bahawalpur', 'Haripur',
          'Hyderabad', 'Sukkur', 'Muzaffarabad', 'Gilgit')
SOURCES = [
    {'key': 'federal-epads', 'name': 'Federal EPADS', 'region': 'Federal',
     'url': 'https://epads.gov.pk/', 'coverage': 'Public open procurements, all published listing pages.'},
    {'key': 'punjab-pitb', 'name': 'Punjab Information Technology Board', 'region': 'Punjab',
     'url': 'https://pitb.gov.pk/tendernotices', 'coverage': 'Official PITB notices; recent listings. Other Punjab departments are not yet included.'},
    {'key': 'punjab-central', 'name': 'Punjab central procurement portal', 'region': 'Punjab',
     'url': 'https://eproc.punjab.gov.pk/ActiveTenders.aspx',
     'coverage': 'The central portal is being checked for availability. Its notices are not included yet.'},
    {'key': 'federal-print', 'name': 'Federal PPRA advertisements', 'region': 'Federal',
     'url': PRESS_LIST, 'coverage': 'Official advertisement copies attached to selected current PPRA notices. Publisher and edition coverage is not established.'},
]


def clean(value):
    return re.sub(r'\s+', ' ', str(value or '')).strip()


def iso_now():
    return datetime.now(PKT).isoformat(timespec='seconds')


def parse_date(value):
    value = clean(value)
    for pattern in ('%A, %B %d, %Y %I:%M %p', '%b %d, %Y', '%B %d, %Y', '%Y-%m-%d'):
        try:
            parsed = datetime.strptime(value, pattern)
            return parsed.replace(tzinfo=PKT).isoformat() if '%I' in pattern else parsed.date().isoformat()
        except ValueError:
            continue
    return None  # Never manufacture an absolute deadline from "3h Left".


def classify(title):
    matches = []
    for category, expression in RULES.items():
        match = re.search(expression, title, re.I)
        if match:
            if category == 'Networking' and match.group(0).lower() in ('network', 'networks') and re.search(r'\b(?:gso|grid|transmission|stone masonry|\d+\s*kv)\b', title, re.I):
                continue  # Electricity infrastructure is not an IT network.
            if category == 'IT equipment' and re.search(r'computer[ -]based interlocking|\bCBI\b.*signall?ing', title, re.I) and not re.search(r'\b(?:laptop|desktop|server|printer|workstation)\b', title, re.I):
                continue  # Railway signalling is outside ordinary IT supply.
            matches.append({'category': category, 'keyword': match.group(0)})
    return matches


def infer_location(title, buyer):
    if re.search(r'across Pakistan|throughout Pakistan|nationwide', title, re.I):
        return {'city': 'Multiple locations', 'basis': 'title'}
    for text, basis in ((title, 'title'), (buyer, 'buyer')):
        found = [city for city in CITIES if re.search(r'\b' + city + r'\b', text, re.I)]
        if len(found) == 1:
            return {'city': found[0], 'basis': basis}
        if len(found) > 1:
            return {'city': 'Multiple locations', 'basis': basis}
    return {'city': 'Location not stated', 'basis': 'unknown'}


def safe_url(url):
    parsed = urlsplit(url)
    if parsed.scheme != 'https' or parsed.hostname not in ALLOWED_HOSTS or parsed.username or parsed.password or parsed.port not in (None, 443):
        raise ValueError('Source URL is outside the approved public hosts')
    return url


class SafeRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        safe_url(newurl)
        return super().redirect_request(req, fp, code, msg, headers, newurl)


class Client:
    def __init__(self, cache):
        self.cache = cache
        self.cache.mkdir(parents=True, exist_ok=True, mode=0o700)
        self.opener = build_opener(SafeRedirect())
        self.robots = {}
        self.last_request = {}

    def raw(self, url, timeout=20):
        safe_url(url)
        host = urlsplit(url).hostname
        time.sleep(max(0, 0.65 - (time.monotonic() - self.last_request.get(host, 0))))
        self.last_request[host] = time.monotonic()
        request = Request(url, headers={'User-Agent': AGENT, 'Accept': 'text/html,text/plain;q=0.9'})
        with self.opener.open(request, timeout=timeout) as response:
            safe_url(response.url)
            body = response.read(6_000_001)
            if len(body) > 6_000_000:
                raise ValueError('Source response exceeds the configured limit')
            return body.decode(response.headers.get_content_charset() or 'utf-8', errors='replace')

    def check_robots(self, url):
        host = urlsplit(url).hostname
        if host not in self.robots:
            parser = RobotFileParser()
            robot_url = 'https://' + host + '/robots.txt'
            try:
                parser.parse(self.raw(robot_url).splitlines())
            except HTTPError as error:
                if error.code in (404, 410):
                    parser.parse([])
                else:
                    raise ValueError('Source crawler policy could not be verified (HTTP %s)' % error.code)
            self.robots[host] = parser
        if not self.robots[host].can_fetch(AGENT, url):
            raise ValueError('Source crawler policy excludes this URL')

    def get(self, url):
        self.check_robots(url)
        last_error = None
        for attempt in range(2):
            try:
                html = self.raw(url)
                if not html.strip():
                    raise ValueError('Source returned an empty response')
                digest = datetime.now(PKT).date().isoformat() + '-' + hashlib.sha256(url.encode()).hexdigest()
                atomic_write(self.cache / (digest + '.html'), html)
                return html
            except (URLError, TimeoutError, OSError) as error:
                last_error = error
                if isinstance(error, HTTPError) and error.code not in (429, 500, 502, 503, 504):
                    break
                time.sleep(1 + attempt)
        raise last_error


def parse_federal(html):
    soup = BeautifulSoup(html, 'html.parser')
    records = []
    for row in soup.select('table tbody tr'):
        cells = row.find_all('td', recursive=False)
        link = row.select_one('a[href^="/opportunities/federal/procurements/"]')
        if not link or len(cells) < 4:
            continue
        title_node = link.find(attrs={'title': True})
        title = clean(title_node.get('title') if title_node else link.get_text(' ', strip=True))
        buyer_nodes = [node for node in cells[1].select('span[title]') if not link.find(lambda child: child is node)]
        buyer = clean(buyer_nodes[-1].get('title')) if buyer_nodes else 'Buyer not stated'
        reference = re.search(r'\bP\d+\b', cells[1].get_text(' ', strip=True))
        if not reference:
            raise ValueError('Federal listing reference format changed')
        timing = cells[2].get_text(' ', strip=True)
        dates = re.search(r'Published On:\s*(.*?)\s*Closing On:\s*(.*)', timing, re.S)
        if not dates:
            raise ValueError('Federal listing dates are missing')
        published, closing = parse_date(dates.group(1)), parse_date(dates.group(2))
        if not published:
            raise ValueError('Federal publication date could not be parsed')
        records.append({'id': 'EPADS-' + reference.group(), 'reference': reference.group(),
                        'sourceKey': 'federal-epads', 'title': title, 'buyer': buyer,
                        'region': 'Federal', 'sourceUrl': urljoin('https://epads.gov.pk/', link['href']),
                        'publishedAt': published, 'closingAt': closing,
                        'datePrecision': 'time' if closing else 'unknown',
                        'procurementType': clean(cells[3].get_text(' ', strip=True)),
                        'amendmentFlag': 'Under Corrigendum' in cells[1].get_text(' ', strip=True),
                        'documents': [], 'location': infer_location(title, buyer)})
    if not records:
        raise ValueError('Federal listing structure changed or no records were returned')
    pages = [int(parse_qs(urlsplit(a['href']).query)['page'][0]) for a in soup.select('.pagination a[href]') if 'page' in parse_qs(urlsplit(a['href']).query)]
    return records, max(pages, default=1)


def parse_pitb(html):
    soup = BeautifulSoup(html, 'html.parser')
    records = []
    for row in soup.select('table tbody tr'):
        title_node = row.select_one('td.views-field-title')
        file_link = row.select_one('td.views-field-field-tenderfile a[href]')
        dates = row.select('time')
        if not title_node or not file_link or len(dates) != 2:
            continue
        title = clean(title_node.get_text(' ', strip=True))
        published, closing = [parse_date(node.get_text(' ', strip=True)) for node in dates]
        if not published or not closing:
            raise ValueError('PITB dates could not be parsed')
        document = safe_url(urljoin('https://pitb.gov.pk/', file_link['href']))
        identifier = hashlib.sha256(document.encode()).hexdigest()[:16]
        location = infer_location(title, '')
        if location['basis'] == 'unknown':
            location = {'city': 'Lahore', 'basis': 'buyer'}  # PITB's published office location; delivery location is unverified.
        records.append({'id': 'PITB-' + identifier, 'reference': None, 'sourceKey': 'punjab-pitb',
                        'title': title, 'buyer': 'Punjab Information Technology Board', 'region': 'Punjab',
                        'sourceUrl': 'https://pitb.gov.pk/tendernotices', 'publishedAt': published,
                        'closingAt': closing, 'datePrecision': 'date', 'procurementType': 'Official departmental notice',
                        'amendmentFlag': bool(re.search(r'corrigendum|amendment', title, re.I)),
                        'documents': [{'label': 'Official bidding document / notice', 'url': document}], 'location': location})
    if not records:
        raise ValueError('PITB listing structure changed or no records were returned')
    next_page = soup.select_one('li.pager__item--next a[href]')
    return records, urljoin('https://pitb.gov.pk/tendernotices', next_page['href']) if next_page else None


def parse_federal_detail(html):
    soup = BeautifulSoup(html, 'html.parser')
    iframe = soup.select_one('iframe.iframe-content[src]')
    return safe_url(iframe['src']) if iframe else None


def parse_timer_deadline(html):
    # EPADS' own showBiddingTimer implementation multiplies this Unix value by
    # 1000 and compares it with Date.now(). Read the value; never execute source JS.
    timer = re.search(r'showBiddingTimer\(\s*[\"\'](\d{10})[\"\']\s*,', html)
    if not timer:
        return None
    parsed = datetime.fromtimestamp(int(timer.group(1)), PKT)
    return parsed.isoformat() if 2000 <= parsed.year <= 2100 else None


def parse_sbd(html):
    soup = BeautifulSoup(html, 'html.parser')
    notice = soup.select_one('#nit-doc')
    if not notice:
        return {}
    text = clean(notice.get_text(' ', strip=True))
    match = re.search(r'on or before\s+(' + DATE_PATTERN + ')', text, re.I)
    bds = soup.select_one('#bds-doc')
    if not match and bds:
        match = re.search(r'deadline for bids submission is\s*:\s*(' + DATE_PATTERN + ')', clean(bds.get_text(' ', strip=True)), re.I)
    result = {'documentDeadline': parse_date(match.group(1)) if match else None}
    # Contact paragraphs provide a buyer address, not a delivery-site guarantee.
    paragraphs = [clean(node.get_text(' ', strip=True)) for node in notice.select('p')]
    address = ' '.join(paragraphs[-2:])
    found = [city for city in CITIES if re.search(r'\b' + city + r'\b', address, re.I)]
    if len(found) == 1:
        result['buyerCity'] = found[0]
    return result


def atomic_write(path, content):
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    temporary = path.with_name(path.name + '.tmp')
    with temporary.open('w', encoding='utf-8') as stream:
        stream.write(content)
        stream.flush()
        os.fsync(stream.fileno())
    temporary.chmod(0o600)
    temporary.replace(path)


def connect_db(path):
    connection = sqlite3.connect(path)
    connection.row_factory = sqlite3.Row
    connection.executescript('''
      PRAGMA journal_mode=WAL;
      CREATE TABLE IF NOT EXISTS notices(id TEXT PRIMARY KEY, source_key TEXT NOT NULL,
        payload TEXT NOT NULL, first_seen TEXT NOT NULL, last_seen TEXT NOT NULL, listed INTEGER NOT NULL DEFAULT 1);
      CREATE TABLE IF NOT EXISTS changes(id INTEGER PRIMARY KEY, notice_id TEXT NOT NULL,
        recorded_at TEXT NOT NULL, fields TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS source_state(source_key TEXT PRIMARY KEY, payload TEXT NOT NULL);
    ''')
    return connection


def update_records(db, records, now, complete=False, source_key=None):
    if complete:
        db.execute('UPDATE notices SET listed=0 WHERE source_key=?', (source_key,))
    for record in records:
        previous = db.execute('SELECT * FROM notices WHERE id=?', (record['id'],)).fetchone()
        first_seen = previous['first_seen'] if previous else now
        if previous:
            old = json.loads(previous['payload'])
            tracked = ('title', 'closingAt', 'datePrecision', 'amendmentFlag')
            fields = {key: {'before': old.get(key), 'after': record.get(key)} for key in tracked
                      if old.get(key) != record.get(key)
                      and not (key in ('closingAt', 'datePrecision') and old.get('datePrecision') == 'unknown')}
            if fields:
                db.execute('INSERT INTO changes(notice_id,recorded_at,fields) VALUES(?,?,?)', (record['id'], now, json.dumps(fields)))
        record['firstSeenAt'] = first_seen
        record['lastSeenAt'] = now
        record['matches'] = classify(record['title'])
        record['eligibility'] = 'Not assessed — company details not added'
        record['documents'] = record.get('documents', [])
        db.execute('INSERT INTO notices(id,source_key,payload,first_seen,last_seen,listed) VALUES(?,?,?,?,?,1) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,last_seen=excluded.last_seen,listed=1',
                   (record['id'], record['sourceKey'], json.dumps(record, ensure_ascii=False), first_seen, now))


def collect_federal(client, db, now, detail_limit=120):
    records, pages = parse_federal(client.get(SOURCES[0]['url']))
    if pages > 40:
        raise ValueError('Federal pagination exceeded its safety limit')
    for page in range(2, pages + 1):
        logging.info('Federal listing page %s/%s', page, pages)
        items, _ = parse_federal(client.get('https://epads.gov.pk/?' + urlencode({'page': page})))
        records.extend(items)
    identifiers = [item['id'] for item in records]
    if len(set(identifiers)) < len(identifiers) * 0.9:
        raise ValueError('Federal pagination repeated too many records')
    records = list({item['id']: item for item in records}.values())
    relevant = sorted([r for r in records if classify(r['title'])], key=lambda r: (r['location']['city'] != 'Lahore', r['closingAt'] is not None))
    detail_errors = 0
    for index, record in enumerate(relevant[:detail_limit]):
        if index % 10 == 0:
            logging.info('Federal bidding document %s/%s', index + 1, min(detail_limit, len(relevant)))
        old = db.execute('SELECT payload FROM notices WHERE id=?', (record['id'],)).fetchone()
        old = json.loads(old['payload']) if old else {}
        try:
            document_url = old.get('detailUrl')
            if not document_url or not record['closingAt']:
                detail_html = client.get(record['sourceUrl'])
                document_url = parse_federal_detail(detail_html)
                if not record['closingAt']:
                    record['closingAt'] = parse_timer_deadline(detail_html)
                    if record['closingAt']:
                        record['datePrecision'] = 'time'
                        record['deadlineBasis'] = 'official page countdown timestamp'
                record['detailVerifiedAt'] = now
            if not document_url:
                continue
            document = parse_sbd(client.get(document_url))
            record['detailUrl'] = document_url
            record['detailVerifiedAt'] = now
            record['documents'] = [{'label': 'Official bidding document', 'url': document_url}]
            if not record['closingAt'] and document.get('documentDeadline'):
                record['closingAt'] = document['documentDeadline']
                record['datePrecision'] = 'time'
            elif record['closingAt'] and document.get('documentDeadline') and record['closingAt'] != document['documentDeadline']:
                record['deadlineWarning'] = 'Listing and bidding document show different deadlines. Review the official amendment.'
            if record['location']['basis'] == 'unknown' and document.get('buyerCity'):
                record['location'] = {'city': document['buyerCity'], 'basis': 'buyer'}
        except Exception as error:
            detail_errors += 1
            logging.warning('Detail unavailable for %s: %s', record['id'], type(error).__name__)
            record['detailWarning'] = 'Bidding document could not be refreshed; verify the official source.'
            if old.get('documents'):
                record['documents'] = old['documents']
    return records, {'pagesChecked': pages, 'detailErrors': detail_errors,
                     'detailsChecked': min(detail_limit, len(relevant)), 'detailLimitReached': len(relevant) > detail_limit,
                     'listingComplete': True}


def collect_pitb(client, now):
    records, url, pages, closed_pages = [], SOURCES[1]['url'], 0, 0
    today = datetime.fromisoformat(now).date().isoformat()
    while url and pages < 20:
        items, next_url = parse_pitb(client.get(url))
        logging.info('PITB listing page %s', pages + 1)
        records.extend(items)
        pages += 1
        closed_pages = closed_pages + 1 if all(item['closingAt'] < today for item in items) else 0
        url = next_url
        if closed_pages >= 3:
            break
    return list({r['id']: r for r in records}.values()), {'pagesChecked': pages,
        'listingComplete': False, 'coverage': 'Recent official PITB notices. Coverage is limited to this department; older long-running opportunities may require an extra source check.'}


def parse_press_listing(html):
    soup = BeautifulSoup(html, 'html.parser')
    records = []
    for row in soup.select('table tbody tr'):
        link = row.select_one(f'a[href^="{PRESS_DETAIL}"]')
        if not link:
            continue
        cells = {td.get('data-label'): td for td in row.find_all('td', recursive=False)}
        number = re.fullmatch(PRESS_DETAIL + r'([A-Z]{2}\d{10,14}E?)', link['href'])
        if not number or not {'Tender Details', 'Tender No', 'Status', 'Advertised', 'Closing'} <= cells.keys():
            raise ValueError('PPRA advertisement listing structure changed')
        status = clean(cells['Status'].get_text(' ', strip=True))
        if not status.startswith('Published') or 'Procurement' not in cells['Tender No'].get_text(' ', strip=True):
            continue
        details = cells['Tender Details']
        title = clean(details.strong.get_text(' ', strip=True))
        closing = datetime.strptime(clean(cells['Closing'].get_text(' ', strip=True)), '%b %d, %Y %I:%M %p').replace(tzinfo=PKT)
        published = datetime.strptime(clean(cells['Advertised'].get_text(' ', strip=True)), '%b %d, %Y').date()
        following = row.find_next_sibling('tr')
        office = following.select_one('.cb-rt-grid > div .cb-rt-dv') if following else None
        buyer = clean(office.get_text(' ', strip=True)) if office else 'Buyer not stated'
        ref = details.select_one('.badge.text-muted')
        records.append({
            'id': 'PPRA-' + number[1], 'reference': number[1], 'sourceKey': 'federal-print',
            'portalReference': clean(ref.get_text(' ', strip=True)) if ref else None,
            'title': title, 'buyer': buyer, 'region': 'Federal',
            'sourceUrl': urljoin(PRESS_LIST, link['href']), 'publishedAt': published.isoformat(),
            'closingAt': closing.isoformat(), 'datePrecision': 'time', 'procurementType': 'Official advertisement',
            'amendmentFlag': 'Corrigendum' in status, 'documents': [], 'location': infer_location(title, buyer),
        })
    if not soup.select_one('td[data-label="Tender No"]'):
        raise ValueError('PPRA listing returned no recognizable tender rows')
    next_link = next((a for a in soup.select('a.page-link[href]') if clean(a.get_text()) == 'Next'), None)
    return records, urljoin(PRESS_LIST, next_link['href']) if next_link else None


def parse_press_advertisement(record, html):
    soup = BeautifulSoup(html, 'html.parser')
    heading = soup.find('h1')
    if not heading or record['reference'] not in heading.parent.get_text(' ', strip=True):
        raise ValueError('PPRA detail returned an unexpected tender')
    for link in soup.select('a[href^="/pdf?file="]'):
        if clean(link.get_text(' ', strip=True)) == 'Download Advertisement':
            return safe_url(urljoin(PRESS_LIST, link['href']))
    return None


def collect_press(client, now):
    candidates, seen_pages = {}, set()
    url = PRESS_LIST
    while url and len(seen_pages) < 40:
        if url in seen_pages:
            raise ValueError('PPRA advertisement pagination repeated a page')
        seen_pages.add(url)
        page, next_url = parse_press_listing(client.get(url))
        candidates.update((record['id'], record) for record in page)
        if next_url and (urlsplit(next_url).netloc != urlsplit(PRESS_LIST).netloc
                         or urlsplit(next_url).path != urlsplit(PRESS_LIST).path):
            raise ValueError('Unexpected PPRA advertisement pagination')
        url = next_url
    active = [record for record in candidates.values() if record['closingAt'] > now]
    active.sort(key=lambda record: (record['location']['city'] != 'Lahore',
                                    not bool(classify(record['title'])), record['closingAt']))
    selected = active[:120]
    records, errors = [], 0
    for record in selected:
        try:
            document = parse_press_advertisement(record, client.get(record['sourceUrl']))
            if document:
                record['advertisements'] = [{'url': document, 'sourceUrl': record['sourceUrl'],
                                              'label': 'Official advertisement copy',
                                              'reference': record['reference']}]
                record['documents'] = [{'url': document, 'label': 'Official advertisement copy'}]
                records.append(record)
        except (OSError, ValueError) as error:
            errors += 1
            logging.warning('Advertisement unavailable for %s: %s', record['id'], type(error).__name__)
    if selected and errors == len(selected):
        raise ValueError('All selected PPRA advertisement pages were unavailable')
    return records, {'pagesChecked': len(seen_pages), 'detailsChecked': len(selected), 'detailErrors': errors,
                     'detailLimitReached': len(active) > len(selected) or bool(url), 'listingComplete': False}


def merge_advertisements(tenders):
    # EPADS references are globally assigned. Keep stable shortlist IDs when
    # the same procurement appears in both official sources.
    epads = {item['reference']: item for item in tenders
             if item.get('sourceKey') == 'federal-epads' and item['listed'] and item.get('reference')}
    for item in tenders:
        reference = item.pop('portalReference', None)
        target = epads.get(reference)
        if not target or not item.get('advertisements') or not item['listed']:
            continue
        target['advertisements'] = item['advertisements']
        if target.get('closingAt') != item['closingAt']:
            target['deadlineWarning'] = 'EPADS and the advertisement listing show different deadlines. Check the latest official amendment.'
            item['deadlineWarning'] = target['deadlineWarning']
            continue
        item['listed'] = False


def friendly_error(error):
    if isinstance(error, HTTPError):
        return 'Source returned HTTP %s. Previous results retained.' % error.code
    if isinstance(error, (URLError, OSError, TimeoutError)):
        return 'Source connection or TLS verification failed. Previous results retained.'
    return clean(str(error))[:220] + '. Previous results retained.'


def publish_feed(db, data_dir, now):
    sources = [json.loads(row['payload']) for row in db.execute('SELECT payload FROM source_state ORDER BY source_key')]
    source_map = {item['key']: item for item in sources}
    changes = {}
    for row in db.execute('SELECT notice_id,recorded_at,fields FROM changes WHERE recorded_at>=? ORDER BY id DESC',
                          ((datetime.fromisoformat(now) - timedelta(days=30)).isoformat(),)):
        changes.setdefault(row['notice_id'], []).append({'recordedAt': row['recorded_at'], 'fields': json.loads(row['fields'])})
    tenders = []
    for row in db.execute('SELECT payload,listed FROM notices'):
        item = json.loads(row['payload'])
        item['listed'] = bool(row['listed'])
        item['sourceName'] = source_map[item['sourceKey']]['name']
        item['sourceStatus'] = source_map[item['sourceKey']]['status']
        item['changes'] = changes.get(item['id'], [])[:5]
        tenders.append(item)
    merge_advertisements(tenders)
    feed = {'schemaVersion': 1, 'generatedAt': now,
            'schedule': {'time': '06:00', 'timezone': 'Asia/Karachi', 'frequency': 'daily'},
            'coverageNote': 'Federal EPADS, selected Punjab notices and selected official advertisement copies. Full newspaper edition coverage is pending.',
            'sources': sources, 'tenders': tenders}
    atomic_write(data_dir / 'feed.json', json.dumps(feed, ensure_ascii=False, separators=(',', ':')))
    return feed


def run(data_dir, detail_limit=120):
    os.umask(0o077)
    data_dir.mkdir(parents=True, exist_ok=True, mode=0o700)
    with (data_dir / 'collector.lock').open('w') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            return {'skipped': 'another collection is already running'}
        db = connect_db(data_dir / 'tenders.sqlite3')
        client, now, connected = Client(data_dir / 'raw'), iso_now(), 0
        for source in SOURCES:
            old = db.execute('SELECT payload FROM source_state WHERE source_key=?', (source['key'],)).fetchone()
            state = {**source, 'lastAttemptAt': iso_now(), 'lastSuccessAt': json.loads(old['payload']).get('lastSuccessAt') if old else None}
            try:
                if source['key'] == 'punjab-central':
                    # Probe only: no claims of full Punjab coverage until its schema is verified.
                    client.get(source['url'])
                    state.update(status='pending', error='The portal is reachable; its notices are not included yet.', count=0)
                else:
                    if source['key'] == 'federal-epads':
                        records, metadata = collect_federal(client, db, now, detail_limit)
                    elif source['key'] == 'federal-print':
                        records, metadata = collect_press(client, now)
                    else:
                        records, metadata = collect_pitb(client, now)
                    with db:
                        update_records(db, records, now, metadata['listingComplete'], source['key'])
                    state.update(metadata, status='connected', count=len(records), lastSuccessAt=iso_now())
                    connected += 1
            except Exception as error:
                logging.exception('Collection failed for %s', source['key'])
                retained = db.execute('SELECT COUNT(*) FROM notices WHERE source_key=?', (source['key'],)).fetchone()[0]
                state.update(status='unavailable', error=friendly_error(error), count=retained)
            with db:
                db.execute('INSERT INTO source_state(source_key,payload) VALUES(?,?) ON CONFLICT(source_key) DO UPDATE SET payload=excluded.payload', (source['key'], json.dumps(state, ensure_ascii=False)))
        with db:
            feed = publish_feed(db, data_dir, iso_now())
        # Raw public source responses are private audit inputs, retained for 14 days.
        cutoff = time.time() - 14 * 86400
        for path in (data_dir / 'raw').glob('*.html'):
            if path.stat().st_mtime < cutoff:
                path.unlink()
        db.close()
        return {'generatedAt': feed['generatedAt'], 'records': len(feed['tenders']),
                'connectedSources': connected, 'sources': [{'key': s['key'], 'status': s['status'], 'count': s['count']} for s in feed['sources']]}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--data-dir', type=Path, default=Path(__file__).resolve().parent / 'data')
    parser.add_argument('--detail-limit', type=int, default=120)
    arguments = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
    result = run(arguments.data_dir, max(0, min(arguments.detail_limit, 250)))
    print(json.dumps(result))
    if result.get('connectedSources') == 0 and not result.get('skipped'):
        raise SystemExit(1)
