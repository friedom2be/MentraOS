import {describe, expect, test} from 'bun:test';

import {detectChapters} from './chapter-detection';

describe('detectChapters', () => {
  test('splits markdown headings into separate chapters', () => {
    const text = '# Intro\nHello\n\n# Chapter 2\nWorld';
    const chapters = detectChapters(text, 'text');
    expect(chapters.map((chapter) => chapter.title)).toEqual(['Intro', 'Chapter 2']);
  });

  test('preserves intro text before the first markdown heading', () => {
    const text = 'Opening note\n\n# Intro\nHello\n\n# Chapter 2\nWorld';
    const chapters = detectChapters(text, 'text');

    expect(chapters).toEqual([
      {title: 'Intro', text: 'Opening note'},
      {title: 'Intro', text: 'Hello'},
      {title: 'Chapter 2', text: 'World'},
    ]);
  });

  test('keeps fallback body content intact for blank-line-separated prose', () => {
    const text = 'Paragraph one first line\nParagraph one second line.\n\nParagraph two body stays together.';
    const chapters = detectChapters(text, 'pdf');

    expect(chapters).toEqual([
      {
        title: 'Full Script',
        text,
      },
    ]);
  });
});
