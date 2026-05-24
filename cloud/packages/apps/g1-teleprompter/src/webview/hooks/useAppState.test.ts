import {describe, expect, test} from 'bun:test';

import {extractErrorMessage} from './useAppState';

describe('extractErrorMessage', () => {
  test('surfaces backend JSON validation messages', () => {
    expect(extractErrorMessage(400, JSON.stringify({error: 'scrollSpeed must be a number'}))).toBe(
      'scrollSpeed must be a number',
    );
  });

  test('falls back to raw text when the backend does not return JSON', () => {
    expect(extractErrorMessage(400, 'scrollSpeed must be a number')).toBe('scrollSpeed must be a number');
  });

  test('falls back to the generic status message for empty bodies', () => {
    expect(extractErrorMessage(400, '')).toBe('Request failed (400)');
  });
});
