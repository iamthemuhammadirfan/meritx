#!/usr/bin/env python3
"""Install verified, free English/Urdu language files in private storage."""
import argparse
import hashlib
import importlib.util
import os
from pathlib import Path
import shutil
from urllib.request import Request, urlopen

COMMIT = '87416418657359cb625c412a48b6e1d6d41c29bd'
MODELS = {'eng': '7d4322bd2a7749724879683fc3912cb542f19906c83bcc1a52132556427170b2',
          'urd': '62e8250ce2a994106e313a82e26a516a39e2cf159d0ce3c5b5008387fd0d555f'}


def prepare(directory):
    if not shutil.which('tesseract') and not importlib.util.find_spec('tesserocr'):
        raise RuntimeError('Install the free tesserocr wheel or Tesseract executable first; no AI API is used')
    os.umask(0o077)
    directory.mkdir(parents=True, exist_ok=True, mode=0o700)
    for language, expected in MODELS.items():
        target = directory / (language + '.traineddata')
        if target.is_file() and hashlib.sha256(target.read_bytes()).hexdigest() == expected:
            continue
        url = f'https://raw.githubusercontent.com/tesseract-ocr/tessdata_fast/{COMMIT}/{language}.traineddata'
        with urlopen(Request(url, headers={'User-Agent': 'MeritXTenderDesk/1.0'}), timeout=30) as response:
            content = response.read(20_000_001)
        if len(content) > 20_000_000 or hashlib.sha256(content).hexdigest() != expected:
            raise ValueError('OCR language-file integrity check failed')
        temporary = directory / (language + '.download')
        temporary.write_bytes(content)
        temporary.replace(target)
    return {'languages': list(MODELS), 'sourceCommit': COMMIT}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--tessdata', type=Path, required=True)
    print(prepare(parser.parse_args().tessdata.resolve()))
