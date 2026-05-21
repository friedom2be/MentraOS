import {describe, expect, test} from 'bun:test';

import {detectChapters} from './chapter-detection';

describe('detectChapters', () => {
  test('splits markdown headings into separate chapters', () => {
    const text = '# Intro\nHello\n\n# Chapter 2\nWorld';
    const chapters = detectChapters(text, 'text');
    expect(chapters.map((chapter) => chapter.title)).toEqual(['Intro', 'Chapter 2']);
  });
});
