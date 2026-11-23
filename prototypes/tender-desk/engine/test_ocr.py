import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

from PIL import Image, ImageDraw, ImageFont
from collector import connect_db
from newspaper_pilot import LocalOCR, initialize_db, is_tender


@unittest.skipUnless(os.environ.get('MERITX_TEST_TESSDATA'), 'Set MERITX_TEST_TESSDATA to verified English/Urdu language files')
class BundledOCRTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.directory = Path(self.temporary.name)
        self.db = connect_db(self.directory / 'test.sqlite3')
        self.addCleanup(self.db.close)
        initialize_db(self.db)
        self.image = Image.new('L', (700, 220), 'white')
        draw = ImageDraw.Draw(self.image)
        draw.multiline_text((20, 20), 'TENDER NOTICE\nSupply of IT Equipment\nSubmit sealed bids',
                            font=ImageFont.load_default(size=36), fill='black', spacing=12)
        with patch('newspaper_pilot.shutil.which', return_value=None):
            self.ocr = LocalOCR(self.db, self.directory, Path(os.environ['MERITX_TEST_TESSDATA']).resolve())

    def test_no_system_executable_is_required_and_repeated_images_use_cache(self):
        text, digest, png = self.ocr.read(self.image)
        self.assertEqual(self.ocr.backend, 'bundled')
        self.assertTrue(is_tender(text), text)
        self.assertIn('IT Equipment', text)
        self.assertTrue(png.startswith(b'\x89PNG'))
        with patch('newspaper_pilot.subprocess.run', side_effect=AssertionError('Repeated image spawned another OCR process')):
            again = self.ocr.read(self.image)
        self.assertEqual(again[:2], (text, digest))
        self.assertEqual(list(self.directory.glob('*.work.png')), [])

    def test_a_stalled_native_worker_times_out_without_leaving_input_files(self):
        with patch('newspaper_pilot.subprocess.run', side_effect=subprocess.TimeoutExpired('ocr', 60)):
            with self.assertRaises(subprocess.TimeoutExpired):
                self.ocr.read(self.image)
        self.assertEqual(list(self.directory.glob('*.work.png')), [])
        self.assertEqual(self.db.execute('SELECT COUNT(*) FROM newspaper_ocr').fetchone()[0], 0)
