import AdmZip from 'adm-zip';
import {XMLParser} from 'fast-xml-parser';
import {JSDOM} from 'jsdom';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
});

export async function extractFromEpub(
  bytes: ArrayBuffer | Uint8Array,
  fallbackTitle = 'Imported EPUB',
): Promise<{title: string; text: string}> {
  const zip = new AdmZip(Buffer.from(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)));
  const containerXml = zip.readAsText('META-INF/container.xml');

  if (!containerXml) {
    throw new Error('EPUB container.xml is missing');
  }

  const container = parser.parse(containerXml);
  const rootfilePath = container?.container?.rootfiles?.rootfile?.['full-path'];
  if (!rootfilePath) {
    throw new Error('EPUB package document path is missing');
  }

  const packageXml = zip.readAsText(rootfilePath);
  if (!packageXml) {
    throw new Error('EPUB package document is missing');
  }

  const packageDoc = parser.parse(packageXml);
  const manifestItems = normalizeArray(packageDoc?.package?.manifest?.item);
  const spineRefs = normalizeArray(packageDoc?.package?.spine?.itemref);
  const metadataTitle = normalizeArray(packageDoc?.package?.metadata?.['dc:title'])[0];
  const packageDir = rootfilePath.includes('/') ? rootfilePath.slice(0, rootfilePath.lastIndexOf('/') + 1) : '';

  const textParts = spineRefs.map((itemRef: {idref?: string}) => {
    const manifest = manifestItems.find((item: {id?: string}) => item.id === itemRef.idref);
    if (!manifest?.href) {
      return '';
    }

    const entryPath = new URL(manifest.href, `https://epub.local/${packageDir}`).pathname.slice(1);
    const content = zip.readAsText(entryPath);
    if (!content) {
      return '';
    }

    const dom = new JSDOM(content);
    return dom.window.document.body?.textContent?.replace(/\s+/g, ' ').trim() || '';
  });

  const text = textParts.filter(Boolean).join('\n\n').trim();
  if (!text) {
    throw new Error('Unable to extract text from EPUB');
  }

  return {
    title: typeof metadataTitle === 'string' ? metadataTitle : fallbackTitle,
    text,
  };
}

function normalizeArray<T>(value: T | T[] | undefined): T[] {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}
