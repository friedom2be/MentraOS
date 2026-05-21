import {describe, expect, test} from 'bun:test';
import AdmZip from 'adm-zip';

import {extractFromEpub} from './epub-extractor';

describe('extractFromEpub', () => {
  test('extracts spine text and title from a minimal epub archive', async () => {
    const zip = new AdmZip();
    zip.addFile(
      'META-INF/container.xml',
      Buffer.from(`<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`),
    );
    zip.addFile(
      'OEBPS/content.opf',
      Buffer.from(`<?xml version="1.0" encoding="utf-8"?>
<package version="3.0" xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>Sample EPUB</dc:title>
  </metadata>
  <manifest>
    <item id="chapter1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>
    <item id="chapter2" href="chapter2.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="chapter1"/>
    <itemref idref="chapter2"/>
  </spine>
</package>`),
    );
    zip.addFile(
      'OEBPS/chapter1.xhtml',
      Buffer.from(`<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <body>
    <h1>Chapter 1</h1>
    <p>Hello teleprompter world.</p>
  </body>
</html>`),
    );
    zip.addFile(
      'OEBPS/chapter2.xhtml',
      Buffer.from(`<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <body>
    <h1>Chapter 2</h1>
    <p>Second chapter content.</p>
  </body>
</html>`),
    );

    const result = await extractFromEpub(Uint8Array.from(zip.toBuffer()), 'Fallback');
    expect(result.title).toBe('Sample EPUB');
    expect(result.text).toContain('Chapter 1');
    expect(result.text).toContain('Hello teleprompter world.');
    expect(result.text).toContain('Chapter 2');
    expect(result.chapters).toEqual([
      {
        title: 'Chapter 1',
        text: 'Chapter 1 Hello teleprompter world.',
      },
      {
        title: 'Chapter 2',
        text: 'Chapter 2 Second chapter content.',
      },
    ]);
  });
});
