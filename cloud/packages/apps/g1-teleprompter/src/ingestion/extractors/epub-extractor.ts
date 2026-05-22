import AdmZip from 'adm-zip';
import {XMLParser} from 'fast-xml-parser';

import type {DetectedChapter} from '../chapter-detection';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
});

export async function extractFromEpub(
  bytes: ArrayBuffer | Uint8Array,
  fallbackTitle = 'Imported EPUB',
): Promise<{title: string; text: string; chapters: DetectedChapter[]}> {
  const archiveBytes = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const zip = new AdmZip(Buffer.isBuffer(archiveBytes) ? archiveBytes : Buffer.from(archiveBytes));
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

  const chapters = spineRefs
    .map((itemRef: {idref?: string}) => {
      const manifest = manifestItems.find((item: {id?: string}) => item.id === itemRef.idref);
      if (!manifest?.href) {
        return null;
      }

      const entryPath = new URL(manifest.href, `https://epub.local/${packageDir}`).pathname.slice(1);
      const content = zip.readAsText(entryPath);
      if (!content) {
        return null;
      }

      const bodyText = extractBodyText(content);
      if (!bodyText) {
        return null;
      }

      const title =
        extractChapterTitle(content) ||
        manifest['media-overlay'] ||
        `Chapter ${chaptersIndexFallback(itemRef, spineRefs)}`;

      return {
        title,
        text: bodyText,
      };
    })
    .filter((chapter): chapter is DetectedChapter => Boolean(chapter));

  const text = chapters.map((chapter) => chapter.text).join('\n\n').trim();
  if (!text) {
    throw new Error('Unable to extract text from EPUB');
  }

  return {
    title: typeof metadataTitle === 'string' ? metadataTitle : fallbackTitle,
    text,
    chapters,
  };
}

function normalizeArray<T>(value: T | T[] | undefined): T[] {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function chaptersIndexFallback(itemRef: {idref?: string}, spineRefs: Array<{idref?: string}>): number {
  const index = spineRefs.findIndex((ref) => ref.idref === itemRef.idref);
  return index >= 0 ? index + 1 : 1;
}

function extractChapterTitle(content: string): string | null {
  return firstNonEmptyText([
    extractTagText(content, 'h1'),
    extractTagText(content, 'h2'),
    extractTagText(content, 'title'),
  ]);
}

function extractBodyText(content: string): string {
  const bodyMatch = content.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  const body = bodyMatch?.[1] ?? content;
  return stripMarkup(body);
}

function extractTagText(content: string, tagName: string): string | null {
  const regex = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const match = content.match(regex);
  if (!match?.[1]) {
    return null;
  }

  const text = stripMarkup(match[1]);
  return text || null;
}

function stripMarkup(content: string): string {
  return decodeHtmlEntities(
    content
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|section|article|li|h1|h2|h3|h4|h5|h6|tr)>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  );
}

function decodeHtmlEntities(content: string): string {
  return content
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, codepoint: string) => String.fromCodePoint(Number.parseInt(codepoint, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, codepoint: string) => String.fromCodePoint(Number.parseInt(codepoint, 16)));
}

function firstNonEmptyText(values: Array<string | null>): string | null {
  for (const value of values) {
    if (value) {
      return value;
    }
  }

  return null;
}
