import json
from pathlib import Path
import sqlite3
import tempfile
import unittest

from collector import (classify, connect_db, infer_location, parse_date, parse_federal,
                       parse_pitb, parse_sbd, parse_timer_deadline, publish_feed, safe_url, update_records, SOURCES)


class CollectorTests(unittest.TestCase):
    def test_relative_deadline_is_not_invented(self):
        self.assertIsNone(parse_date('2h 4m Left'))
        self.assertEqual(parse_date('Wednesday, November 18, 2026 03:30 PM'), '2026-11-18T15:30:00+05:00')

    def test_federal_listing_uses_full_title_and_stable_reference(self):
        html = '''<table><tbody><tr><td>1</td><td>
        <a href="/opportunities/federal/procurements/123"><span title="Supply of laptops and monitors">Supply of lap...</span></a>
        <span title="Lahore regional buyer">Buyer</span><span>P123</span></td>
        <td>Published On: Tuesday, November 17, 2026 09:00 AM Closing On: 2h 4m Left</td>
        <td>Goods</td></tr></tbody></table><ul class="pagination"><a href="/?page=3">3</a></ul>'''
        records, pages = parse_federal(html)
        self.assertEqual(pages, 3)
        self.assertEqual(records[0]['title'], 'Supply of laptops and monitors')
        self.assertEqual(records[0]['buyer'], 'Lahore regional buyer')
        self.assertIsNone(records[0]['closingAt'])
        self.assertEqual(records[0]['id'], 'EPADS-P123')

    def test_date_only_pitb_values_do_not_become_fake_times(self):
        html = '''<table><tbody><tr><td class="views-field-title">Supply of tablets</td>
        <td class="views-field-field-tenderfile"><a href="/system/files?file=notice.pdf">PDF</a></td>
        <td><time datetime="2026-11-17T12:00:00Z">Nov 17, 2026</time></td>
        <td><time datetime="2026-11-18T12:00:00Z">Nov 18, 2026</time></td></tr></tbody></table>'''
        records, _ = parse_pitb(html)
        self.assertEqual(records[0]['closingAt'], '2026-11-18')
        self.assertEqual(records[0]['datePrecision'], 'date')
        self.assertEqual(records[0]['location']['basis'], 'buyer')

    def test_document_deadline_is_submission_not_opening(self):
        html = '''<section id="nit-doc"><p>Submit on or before <b>Wednesday, November 18, 2026 03:00 PM</b>.
        Open on Wednesday, November 18, 2026 03:30 PM.</p><p>Buyer address, Lahore</p></section>'''
        self.assertEqual(parse_sbd(html)['documentDeadline'], '2026-11-18T15:00:00+05:00')

    def test_official_countdown_epoch_is_read_without_executing_script(self):
        self.assertEqual(parse_timer_deadline('<script>showBiddingTimer("1794921120", "0");</script>'), '2026-11-17T18:12:00+05:00')
        self.assertIsNone(parse_timer_deadline('<p>2h Left</p>'))

    def test_location_distinguishes_title_and_buyer(self):
        self.assertEqual(infer_location('CCTV supply in Multan', 'Lahore buyer'), {'city': 'Multan', 'basis': 'title'})
        self.assertEqual(infer_location('Supply of computers', 'Lahore buyer')['basis'], 'buyer')
        self.assertEqual(infer_location('Network across Pakistan', 'Lahore buyer')['city'], 'Multiple locations')

    def test_keyword_matching_is_explainable_and_not_a_percentage(self):
        self.assertEqual(classify('Purchase of CCTV cameras')[0], {'category': 'CCTV', 'keyword': 'CCTV'})
        self.assertEqual(classify('Repair of office furniture'), [])
        self.assertEqual(classify('Stone masonry work at 132KV T/Line under upgradation of GSO Network'), [])
        self.assertEqual(classify('Procurement of Computer Based Interlocking (CBI) signaling system Items'), [])

    def test_source_urls_reject_internal_and_script_targets(self):
        for url in ('http://epads.gov.pk/', 'https://127.0.0.1/', 'https://epads.gov.pk.evil.test/', 'javascript:alert(1)', 'https://epads.gov.pk:8443/'):
            with self.assertRaises(ValueError):
                safe_url(url)

    def test_amendments_and_last_good_records_survive_republication(self):
        with tempfile.TemporaryDirectory() as directory:
            db = connect_db(Path(directory) / 'test.sqlite3')
            old = {'id': 'EPADS-P1', 'sourceKey': 'federal-epads', 'title': 'Laptops', 'closingAt': '2026-11-20', 'datePrecision': 'date', 'amendmentFlag': False}
            update_records(db, [old], '2026-11-17T06:00:00+05:00', True, 'federal-epads')
            newer = {**old, 'closingAt': '2026-11-25', 'amendmentFlag': True}
            update_records(db, [newer], '2026-11-18T06:00:00+05:00', True, 'federal-epads')
            self.assertEqual(db.execute('SELECT COUNT(*) FROM notices').fetchone()[0], 1)
            changes = json.loads(db.execute('SELECT fields FROM changes').fetchone()[0])
            self.assertEqual(changes['closingAt']['before'], '2026-11-20')
            self.assertEqual(changes['closingAt']['after'], '2026-11-25')
            for source in SOURCES:
                state = {**source, 'status': 'unavailable', 'count': 0}
                db.execute('INSERT INTO source_state VALUES(?,?)', (source['key'], json.dumps(state)))
            feed = publish_feed(db, Path(directory), '2026-11-19T06:00:00+05:00')
            self.assertEqual(len(feed['tenders']), 1)
            self.assertEqual(feed['tenders'][0]['sourceStatus'], 'unavailable')
            self.assertEqual(feed['tenders'][0]['firstSeenAt'], '2026-11-17T06:00:00+05:00')
            self.assertEqual(feed['tenders'][0]['closingAt'], '2026-11-25')
            db.close()


if __name__ == '__main__':
    unittest.main()
