import type {ScriptSourceType} from '../domain/types';

export interface DetectedChapter {
  title: string;
  text: string;
}

export function detectChapters(text: string, sourceType: ScriptSourceType): DetectedChapter[] {
  const markdownChapters = detectMarkdownChapters(text);
  if (markdownChapters.length > 0) {
    return markdownChapters;
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
  if (matches.length === 0) {
    return [];
  }

  const chapters: DetectedChapter[] = [];
  const introText = text.slice(0, matches[0]?.index ?? 0).trim();
  if (introText) {
    chapters.push({
      title: 'Intro',
      text: introText,
    });
  }

  chapters.push(
    ...matches.map((match, index) => {
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
    }),
  );

  return chapters.filter((chapter) => chapter.text.length > 0);
}
