import unittest

from collector import parse_press_listing, parse_press_advertisement, merge_advertisements


class NewspaperTests(unittest.TestCase):
    def test_listing_uses_submission_time_and_exact_portal_reference(self):
        html = '''<table><tbody><tr>
          <td data-label="Tender No">TS0000017278E Procurement</td>
          <td data-label="Tender Details"><strong>Software in Lahore</strong><small class="badge text-muted">P177348</small></td>
          <td data-label="Status">Published Corrigendum</td><td data-label="Advertised">Nov 02, 2026</td>
          <td data-label="Closing">Nov 25, 2026 11:00 AM</td>
          <td><a href="/public/tenders/tender-details/TS0000017278E">View</a></td>
          </tr><tr><td><div class="cb-rt-grid"><div><span class="cb-rt-dv">PCAA</span></div></div></td></tr>
          </tbody></table><a class="page-link" href="?page=2">Next</a>'''
        records, next_url = parse_press_listing(html)
        self.assertEqual(records[0]['closingAt'], '2026-11-25T11:00:00+05:00')
        self.assertEqual(records[0]['portalReference'], 'P177348')
        self.assertTrue(records[0]['amendmentFlag'])
        self.assertEqual(records[0]['location']['city'], 'Lahore')
        self.assertTrue(next_url.endswith('?page=2'))

    def test_ad_requires_matching_tender_and_official_document_endpoint(self):
        record = {'reference': 'TS0000017278E'}
        html = '<div><h1>Software</h1>TS0000017278E</div><a href="/pdf?file=abc">Download Advertisement</a>'
        self.assertEqual(parse_press_advertisement(record, html), 'https://epms.ppra.gov.pk/pdf?file=abc')
        self.assertIsNone(parse_press_advertisement(record, html.replace('Download Advertisement', 'Download Tender Document')))
        with self.assertRaises(ValueError):
            parse_press_advertisement(record, html.replace('TS0000017278E', 'TS0000010000E'))

    def test_exact_reference_dedup_preserves_saved_id_and_reports_deadline_conflict(self):
        official = {'id': 'EPADS-P177348', 'reference': 'P177348', 'sourceKey': 'federal-epads',
                    'listed': True, 'closingAt': '2026-11-16T11:00:00+05:00'}
        ad = {'id': 'PPRA-TS0000017278E', 'portalReference': 'P177348', 'listed': True,
              'closingAt': '2026-11-25T11:00:00+05:00',
              'advertisements': [{'url': 'https://epms.ppra.gov.pk/pdf?file=abc'}]}
        merge_advertisements([official, ad])
        self.assertEqual(official['id'], 'EPADS-P177348')
        self.assertIn('deadlineWarning', official)
        self.assertEqual(official['closingAt'], '2026-11-16T11:00:00+05:00')
        self.assertTrue(ad['listed'])
        self.assertEqual(len(official['advertisements']), 1)
        official['closingAt'] = ad['closingAt']
        ad['portalReference'] = 'P177348'
        merge_advertisements([official, ad])
        self.assertFalse(ad['listed'])

    def test_similar_titles_without_matching_reference_stay_separate(self):
        first = {'reference': 'P1', 'sourceKey': 'federal-epads', 'listed': True}
        second = {'portalReference': 'P2', 'listed': True, 'advertisements': [{'url': 'document'}]}
        merge_advertisements([first, second])
        self.assertTrue(second['listed'])
