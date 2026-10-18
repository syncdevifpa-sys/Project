"""Inspeção local de texto e geometria. Não acessa API, banco ou serviços externos."""
import argparse
import hashlib
import importlib.metadata
import json
from pathlib import Path

import pdfplumber


def inspect(filename, page_number, region=None):
    data = Path(filename).read_bytes()
    if not data.startswith(b'%PDF-') or len(data) > 4 * 1024 * 1024:
        raise ValueError('Use um PDF válido de até 4 MiB.')
    with pdfplumber.open(filename) as document:
        if not 1 <= page_number <= len(document.pages) or len(document.pages) > 30:
            raise ValueError('Página inválida ou limite de 30 páginas excedido.')
        page = document.pages[page_number - 1]
        if region:
            x0, top, x1, bottom = region
            if not (0 <= x0 < x1 <= 1 and 0 <= top < bottom <= 1):
                raise ValueError('A região deve ter limites relativos entre 0 e 1.')
            page = page.crop((x0 * page.width, top * page.height,
                              x1 * page.width, bottom * page.height))
        words = [{key: word[key] for key in ['text', 'x0', 'top', 'x1', 'bottom']}
                 for word in page.extract_words()]
        rectangles = [{key: rect.get(key) for key in
                       ['x0', 'top', 'x1', 'bottom', 'fill', 'non_stroking_color']}
                      for rect in page.rects]
        return {'engine': 'pdfplumber', 'version': importlib.metadata.version('pdfplumber'),
                'document': {'sha256': hashlib.sha256(data).hexdigest(), 'pages': len(document.pages)},
                'page': page_number, 'coordinateSystem': 'points-top-left',
                'regionRelative': region, 'words': words, 'rectangles': rectangles,
                'text': page.extract_text() or '',
                'warnings': ['REFERENCE_ONLY_NOT_AN_EVENT_IMPORTER']}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('pdf')
    parser.add_argument('--page', type=int, required=True)
    parser.add_argument('--region', type=float, nargs=4, metavar=('LEFT', 'TOP', 'RIGHT', 'BOTTOM'))
    args = parser.parse_args()
    try:
        print(json.dumps(inspect(args.pdf, args.page, args.region), ensure_ascii=False))
    except ValueError as error:
        parser.exit(2, str(error) + '\n')
