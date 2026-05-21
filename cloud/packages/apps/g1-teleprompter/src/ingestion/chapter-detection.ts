import type {ScriptSourceType} from '../domain/types';

export interface DetectedChapter {
  title: string;
  text: string;
}

export function detectChapters(text: string, sourceType: ScriptSourceType): DetectedChapter[] {
  if (sourceType === 'text') {
    const markdownChapters = detectMarkdownChapters(text);
    if (markdownChapters.length > 0) {
      return markdownChapters;
    }
  }

  const lineHeadingChapters = detectLineHeadingChapters(text);
  if (lineHeadingChapters.length > 1) {
    return lineHeadingChapters;
  }

  return [
    {
      title: 'Full Script',
      text: text.trim(),
    },
  ];
}

function detectMarkdownChapters(text: string): DetectedChapter[] {
  const matches = [...text.matchAll(/^#\s+(.+)$/gm)];

  return matches.map((match, index) => {
    const start = match.index ?? 0;
    const nextStart = matches[index + 1]?.index ?? text.length;
    const title = match[1].trim();
    const body = text
      .slice(start, nextStart)
      .replace(/^#\s+.+$/m, '')
      .trim();

    return {
      title,
      text: body,
    };
  });
}

function detectLineHeadingChapters(text: string): DetectedChapter[] {
  const sections = text
    .split(/\n{2,}/)
    .map((section) => section.trim())
    .filter(Boolean);

  if (sections.length < 2) {
    return [];
  }

  return sections
    .map((section) => {
      const [firstLine, ...rest] = section.split('\n');
      if (!firstLine) {
        return null;
      }

      const body = rest.join('\n').trim() || firstLine.trim();
      return {
        title: firstLine.trim().slice(0, 80),
        text: body,
      };
    })
    .filter((section): section is DetectedChapter => Boolean(section));
}
