import {Readability} from '@mozilla/readability';
import {JSDOM} from 'jsdom';

export async function extractFromUrl(url: string): Promise<{title: string; text: string}> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`URL fetch failed with status ${response.status}`);
  }

  const html = await response.text();
  const dom = new JSDOM(html, {url});
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  if (!article?.textContent) {
    throw new Error('Unable to extract article body from URL');
  }

  return {
    title: article.title || url,
    text: article.textContent.trim(),
  };
}
