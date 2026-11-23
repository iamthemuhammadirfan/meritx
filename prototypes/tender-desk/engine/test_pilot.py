import json
from datetime import date, datetime, timezone
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from collector import (OFFICIAL_RUN_HOUR, classify_newspaper, connect_db, publish_feed,
                       scheduled_hour, update_records)
from newspaper_pilot import (approved, candidate, discover_pages, edition_sources,
                             decode_image, initialize_db, is_tender, main, NEWSPAPER_RUN_HOURS,
                             parse_page, Page, PublisherClient, verify_private_site)
from urllib.error import HTTPError
from zoneinfo import ZoneInfo
from PIL import Image
import io


class PilotTests(unittest.TestCase):
    day = date(2026, 11, 23)

    def test_dawn_inventory_includes_national_and_priority_metros_only(self):
        source = edition_sources(self.day)[0]
        html = '''<select id="ep-page"><optgroup label="Main paper"><option value="23_11_2026_001">1 Front Page</option></optgroup>
        <optgroup label="Metro"><option value="23_11_2026_019">19 Islamabad</option><option value="23_11_2026_022">22 Lahore</option><option value="23_11_2026_015">15 Karachi</option></optgroup>
        <optgroup label="Business &amp; Finance"><option value="23_11_2026_028">28 Business</option></optgroup></select>'''
        urls = discover_pages(source, self.day, html)
        self.assertEqual(len(urls), 4)
        self.assertFalse(any('015' in url for url in urls))
        with self.assertRaises(ValueError):
            discover_pages(source, date(2026, 11, 24), html)

    def test_jang_and_express_do_not_mix_dates_or_editions(self):
        jang = edition_sources(self.day)[1]
        html = '''<a href="/lahore/23-11-2026/page1">1</a><a href="/lahore/23-11-2026/page2">2</a>
        <a href="/pindi/23-11-2026/page3">other edition</a><a href="/lahore/22-11-2026/page3">yesterday</a>'''
        self.assertEqual(len(discover_pages(jang, self.day, html)), 2)
        express = edition_sources(self.day)[3]
        html = '''<a href="Index.aspx?Issue=NP_LHE&amp;Date=20261123&amp;Pageno=1">1</a>
        <a href="index.aspx?Issue=NP_LHE&amp;Date=20261123&amp;Pageno=1&amp;View=1">same page</a>
        <a href="Index.aspx?Issue=NP_ISB&amp;Date=20261123&amp;Pageno=2">other edition</a>
        <a href="Index.aspx?Issue=NP_LHE&amp;Date=20261122&amp;Pageno=2">yesterday</a>'''
        self.assertEqual(len(discover_pages(express, self.day, html)), 1)

    def test_page_parsers_require_publisher_image_date_and_parse_scripts_as_literals(self):
        sources = edition_sources(self.day)
        html = '<img class="ep-sheet__image" src="https://e.dawn.com/2026/11/23/pages/23_11_2026_001.jpg"><a class="ep-spot" aria-label="Advertisement, opens in a new tab" href="/Advt.php?StoryImage=23_11_2026_001_001"></a>'
        self.assertEqual(len(parse_page(sources[0], self.day, sources[0]['url'], html).clips), 1)
        with self.assertRaises(ValueError):
            parse_page(sources[0], date(2026, 11, 24), sources[0]['url'], html)
        html = '''<img id="img1" src="https://e.jang.com.pk/static_pages/11-23-2026/lahore/mainpage/page1.jpg">
        <area onclick="window.open('pic/01_02.jpg','new',)"><area onclick="fetch('https://attacker.invalid')">'''
        result = parse_page(sources[1], self.day, sources[1]['url'], html)
        self.assertEqual(result.clips, [('https://e.jang.com.pk/lahore/23-11-2026/pic/01_02.jpg', None)])
        html = '<div id="Express_MainContent_imgdiv"><img src="/images/NP_LHE/20261123/20261123-NP_LHE-Front_Page_1.jpg"></div>'
        self.assertIn('/NP_LHE/', parse_page(sources[3], self.day, sources[3]['url'], html).image)
        with self.assertRaises(ValueError):
            parse_page(sources[4], self.day, sources[4]['url'], html)

    def test_untrusted_images_and_urls_cannot_escape_source_hosts(self):
        for url in ['http://e.jang.com.pk/image.png', 'https://e.jang.com.pk.attacker.invalid/a', 'https://e.jang.com.pk@127.0.0.1/a', 'https://localhost/a', 'file:///etc/passwd', 'https://e.dawn.com:8443/a']:
            with self.assertRaises(ValueError, msg=url):
                approved(url)
        client = PublisherClient()
        client.raw = lambda url: (b'User-agent: *\nDisallow: /private/', 'text/plain')
        with self.assertRaises(ValueError):
            client.policy('https://e.jang.com.pk/private/file.png')
        with patch.object(client, 'policy'), patch.object(client, 'raw', return_value=(b'<html>Challenge</html>', 'text/html')):
            with self.assertRaises(ValueError):
                client.get('https://e.jang.com.pk/image.png', image=True)

    def test_collection_cannot_start_against_a_public_dashboard(self):
        with patch('newspaper_pilot.build_opener') as opener:
            with self.assertRaisesRegex(ValueError, 'team login'):
                verify_private_site('https://tenders.meritxsc.com')
            opener.return_value.open.side_effect = HTTPError('https://tenders.meritxsc.com/api/tenders', 401, 'Please sign in', {}, None)
            verify_private_site('https://tenders.meritxsc.com')
        with self.assertRaises(ValueError):
            verify_private_site('http://unsecured.invalid')

    def test_hourly_cron_follows_karachi_through_new_york_dst(self):
        new_york = ZoneInfo('America/New_York')
        for month, expected_host_hours in [(1, [20, 22, 11]), (7, [21, 23, 12])]:
            for hour, host_hour in zip((OFFICIAL_RUN_HOUR, *NEWSPAPER_RUN_HOURS), expected_host_hours):
                with self.subTest(month=month, hour=hour):
                    tick = datetime(2026, month, 2, hour - 5, tzinfo=timezone.utc).astimezone(new_york)
                    self.assertEqual(tick.hour, host_hour)
                    self.assertEqual(tick.day, 1 if host_hour >= 20 else 2)
                    self.assertTrue(scheduled_hour((hour,), tick))
                    self.assertFalse(scheduled_hour((hour,), tick.replace(hour=host_hour - 1)))

    @patch('newspaper_pilot.run')
    @patch('newspaper_pilot.verify_private_site')
    def test_scheduled_collection_skips_off_hours_and_checks_privacy_before_writes(self, verify, run):
        with tempfile.TemporaryDirectory() as directory:
            data = Path(directory) / 'data'
            with patch('sys.argv', ['newspaper_pilot.py', '--data-dir', str(data), '--scheduled']):
                with patch('newspaper_pilot.scheduled_hour', return_value=False):
                    self.assertEqual(main(), 0)
                verify.assert_not_called()
                self.assertFalse(data.exists())
                with patch('newspaper_pilot.scheduled_hour', return_value=True), \
                     patch('newspaper_pilot.configure_logging'), self.assertLogs(level='ERROR'):
                    verify.side_effect = ValueError('Team login unavailable')
                    self.assertEqual(main(), 1)
            run.assert_not_called()

    @patch('newspaper_pilot.verify_private_site')
    @patch('newspaper_pilot.run')
    def test_collection_with_no_processed_pages_returns_failure(self, run, verify):
        run.return_value = {'status': 'collected', 'editions': [{'pagesProcessed': 0}]}
        with patch('sys.argv', ['newspaper_pilot.py', '--data-dir', 'unused']), \
             patch('builtins.print'), self.assertLogs(level='ERROR'):
            self.assertEqual(main(), 1)
        verify.assert_called_once()

    def test_truncated_publisher_jpeg_is_flagged_instead_of_reported_complete(self):
        output = io.BytesIO(); Image.new('RGB', (60, 60), 'white').save(output, 'JPEG')
        image, truncated = decode_image(output.getvalue()[:-2])
        self.assertTrue(truncated)
        self.assertEqual(image.size, (60, 60)); image.close()

    def test_candidates_keep_deadlines_unknown_and_edition_does_not_invent_delivery_city(self):
        source = edition_sources(self.day)[1]
        page = Page(source['url'], '1', 'https://e.jang.com.pk/page.jpg')
        record = candidate(source, self.day, page, 'TENDER NOTICE\nSupply of computers\nSubmit bids by 03/04/2026. TS12345', 'a' * 64)
        self.assertTrue(is_tender(record['ocrText']))
        self.assertIsNone(record['closingAt'])
        self.assertIsNone(record['reference'])
        self.assertEqual(record['reviewStatus'], 'needs-review')
        self.assertEqual(record['location']['city'], 'Location not stated')
        self.assertEqual(record['region'], 'Unverified')
        self.assertFalse(is_tender('Tender feelings about the weather'))
        self.assertTrue(is_tender('ٹینڈر نوٹس مہر بند بولی جمع کروائیں'))
        self.assertEqual(classify_newspaper('Tenders must be submitted on the EP System website.\nAvailable on the PPRA website at www.ppra.org.pk.'), [])
        self.assertEqual(classify_newspaper('11th Floor, Arfa Software Technology Park, Lahore'), [])
        self.assertEqual(classify_newspaper('Development of the department website')[0]['category'], 'Software')
        self.assertEqual(classify_newspaper('کمپیوٹر کی خریداری')[0]['category'], 'IT equipment')

    def test_seven_day_summary_reports_missing_editions_and_preserves_candidates(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory); db = connect_db(path / 'tenders.sqlite3'); initialize_db(db)
            source = edition_sources(self.day)[0]
            state = {'key': source['key'], 'name': 'Dawn', 'status': 'partial'}
            db.execute('INSERT INTO source_state VALUES(?,?)', (source['key'], json.dumps(state)))
            db.execute('INSERT INTO newspaper_pilot VALUES(1,?)', ('2026-11-23',))
            db.execute('INSERT INTO newspaper_daily VALUES(?,?,?)', ('2026-11-23', source['key'], json.dumps({'status': 'partial', 'count': 1, 'pagesProcessed': 3})))
            record = candidate(source, self.day, Page(source['url'], '1', 'image'), 'TENDER NOTICE supply of software. Submit bids.', 'a' * 64)
            update_records(db, [record], '2026-11-23T06:00:00+05:00')
            feed = publish_feed(db, path, '2026-11-24T06:00:00+05:00')
            self.assertEqual(feed['pilot']['days'][0]['unavailableEditions'], 4)
            self.assertEqual(feed['pilot']['days'][1]['unavailableEditions'], 5)
            self.assertEqual(feed['pilot']['days'][2]['unavailableEditions'], 0)
            self.assertEqual(feed['pilot']['endDate'], '2026-11-29')
            self.assertEqual(feed['tenders'][0]['matches'][0]['category'], 'Software')
            finished = publish_feed(db, path, '2026-11-30T06:00:00+05:00')
            self.assertEqual(finished['pilot']['status'], 'complete')
            self.assertEqual(len(finished['tenders']), 1)
            db.close()


if __name__ == '__main__':
    unittest.main()
