#!/usr/bin/env python3
"""Isolated free OCR using the Tesseract runtime bundled in tesserocr wheels."""
import argparse
import json
import os

# Set before loading the native runtime; the parent also enforces this limit.
os.environ['OMP_THREAD_LIMIT'] = '1'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--tessdata', required=True)
    parser.add_argument('--languages', default='eng+urd')
    parser.add_argument('--check', action='store_true')
    parser.add_argument('image', nargs='?')
    args = parser.parse_args()
    import tesserocr
    available = tesserocr.get_languages(args.tessdata)[1]
    if not set(args.languages.split('+')) <= set(available):
        raise RuntimeError('Both English and Urdu OCR language files are required')
    with tesserocr.PyTessBaseAPI(path=args.tessdata, lang=args.languages,
                               psm=tesserocr.PSM.AUTO, oem=tesserocr.OEM.LSTM_ONLY) as api:
        if args.check:
            print(json.dumps({'languages': available, 'engine': tesserocr.tesseract_version().splitlines()[0]}))
            return
        if not args.image:
            parser.error('An image path is required for OCR')
        api.SetImageFile(args.image)
        print(api.GetUTF8Text()[:80_000], end='')


if __name__ == '__main__':
    main()
