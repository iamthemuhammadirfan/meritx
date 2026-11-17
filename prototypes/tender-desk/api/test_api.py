from datetime import datetime, timedelta, timezone
import gzip
import json
import os
from pathlib import Path
import tempfile
import unittest

from fastapi.testclient import TestClient

from app import create_app, MAX_FEED_BYTES


class TenderApiTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.path = Path(self.directory.name) / 'feed.json'
        self.now = datetime(2026, 11, 17, 8, tzinfo=timezone.utc)
        self.payload = {'schemaVersion': 1, 'generatedAt': self.now.isoformat(),
                        'schedule': {'time': '06:00', 'timezone': 'Asia/Karachi', 'frequency': 'daily'},
                        'coverageNote': 'Selected official sources',
                        'sources': [{'key': 'federal-epads', 'status': 'connected'}],
                        'tenders': [{'id': 'EPADS-P1', 'title': 'Laptops in Lahore',
                                     'documents': [], 'matches': [], 'location': {'city': 'Lahore', 'basis': 'title'}, 'changes': []}]}
        self.write()
        self.client = TestClient(create_app(snapshot=self.path, clock=lambda: self.now))

    def tearDown(self):
        self.client.close()
        self.directory.cleanup()

    def write(self):
        self.path.write_text(json.dumps(self.payload))

    def test_public_projection_excludes_future_private_fields(self):
        self.payload['companyProfiles'] = [{'secret': 'private-profile'}]
        self.payload['tenders'][0]['internalNote'] = 'private-note'
        self.payload['tenders'][0]['location']['privateSiteCode'] = 'private-site'
        self.write()
        response = self.client.get('/api/tenders')
        self.assertEqual(response.status_code, 200)
        self.assertNotIn('private-', response.text)
        self.assertFalse(response.json()['stale'])
        self.assertEqual(response.json()['tenders'][0]['title'], 'Laptops in Lahore')

    def test_gzip_and_identity_have_distinct_representation_etags(self):
        compressed = self.client.get('/api/tenders', headers={'Accept-Encoding': 'gzip'})
        identity = self.client.get('/api/tenders', headers={'Accept-Encoding': 'identity'})
        self.assertEqual(compressed.headers['content-encoding'], 'gzip')
        self.assertNotIn('content-encoding', identity.headers)
        self.assertEqual(compressed.json(), identity.json())
        self.assertNotEqual(compressed.headers['etag'], identity.headers['etag'])
        self.assertEqual(compressed.headers['vary'], 'Accept-Encoding')
        # HTTPX transparently decompresses body bytes, but wire Content-Length
        # must describe the compressed representation.
        expected = gzip.compress(identity.content, compresslevel=6, mtime=0)
        self.assertEqual(int(compressed.headers['content-length']), len(expected))

    def test_encoding_negotiation_respects_zero_quality(self):
        identity = self.client.get('/api/tenders', headers={'Accept-Encoding': 'gzip;q=0'})
        self.assertNotIn('content-encoding', identity.headers)
        rejected = self.client.get('/api/tenders', headers={'Accept-Encoding': 'gzip;q=0, identity;q=0'})
        self.assertEqual(rejected.status_code, 406)

    def test_head_and_conditional_get_return_no_body(self):
        get = self.client.get('/api/tenders', headers={'Accept-Encoding': 'identity'})
        head = self.client.head('/api/tenders', headers={'Accept-Encoding': 'identity'})
        self.assertEqual(head.content, b'')
        self.assertEqual(head.headers['content-length'], get.headers['content-length'])
        response = self.client.get('/api/tenders', headers={'Accept-Encoding': 'identity', 'If-None-Match': 'W/' + get.headers['etag']})
        self.assertEqual(response.status_code, 304)
        self.assertEqual(response.content, b'')

    def test_atomic_replacement_invalidates_cache_even_with_same_size_and_mtime(self):
        first = self.client.get('/api/tenders', headers={'Accept-Encoding': 'identity'})
        stat = self.path.stat()
        self.payload['tenders'][0]['title'] = 'Laptops in Multan'
        replacement = self.path.with_suffix('.tmp')
        replacement.write_text(json.dumps(self.payload))
        os.utime(replacement, ns=(stat.st_atime_ns, stat.st_mtime_ns))
        replacement.replace(self.path)
        second = self.client.get('/api/tenders', headers={'Accept-Encoding': 'identity'})
        self.assertEqual(second.json()['tenders'][0]['title'], 'Laptops in Multan')
        self.assertNotEqual(first.headers['etag'], second.headers['etag'])

    def test_stale_transition_updates_cached_response_without_file_write(self):
        first = self.client.get('/api/tenders')
        self.now += timedelta(hours=37)
        later = self.client.get('/api/tenders')
        self.assertTrue(later.json()['stale'])
        self.assertNotEqual(first.headers['etag'], later.headers['etag'])
        self.assertEqual(self.client.get('/readyz').json()['status'], 'stale')

    def test_missing_corrupt_oversized_or_invalid_snapshot_fails_without_path_leak(self):
        for mode in ('missing', 'corrupt', 'oversized', 'schema', 'timezone'):
            with self.subTest(mode=mode):
                self.write()
                if mode == 'missing':
                    self.path.unlink()
                elif mode == 'corrupt':
                    self.path.write_text('{invalid')
                elif mode == 'oversized':
                    with self.path.open('wb') as stream:
                        stream.truncate(MAX_FEED_BYTES + 1)
                elif mode == 'schema':
                    self.path.write_text('{"schemaVersion":2}')
                else:
                    self.path.write_text(json.dumps({**self.payload, 'generatedAt': '2026-11-17T08:00:00'}))
                response = self.client.get('/api/tenders')
                self.assertEqual(response.status_code, 503)
                self.assertNotIn(str(self.path), response.text)
                self.assertEqual(response.headers['retry-after'], '300')
                self.assertEqual(self.client.get('/healthz').status_code, 200)

    def test_only_public_assets_are_served_and_write_requests_are_rejected(self):
        self.assertEqual(self.client.get('/').status_code, 200)
        self.assertEqual(self.client.get('/assets/dashboard.js').status_code, 200)
        for path in ('/engine/collector.py', '/api/app.py', '/api/tenders.php', '/README.md', '/tenders/'):
            self.assertEqual(self.client.get(path).status_code, 404, path)
        self.assertEqual(self.client.post('/api/tenders', json={'overwrite': True}).status_code, 405)
        self.assertEqual(self.client.get('/api/tenders', headers={'Host': 'unapproved.invalid'}).status_code, 400)
        self.assertEqual(self.client.get('/api/tenders').headers['x-robots-tag'], 'noindex, nofollow, noarchive')


if __name__ == '__main__':
    unittest.main()
