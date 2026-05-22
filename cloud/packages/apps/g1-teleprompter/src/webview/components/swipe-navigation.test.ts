import {describe, expect, test} from 'bun:test';

import {getSwipeDirection} from './swipe-navigation';

describe('getSwipeDirection', () => {
  test('returns next for a meaningful left swipe', () => {
    expect(getSwipeDirection({x: 220, y: 100}, {x: 120, y: 108})).toBe('next');
  });

  test('returns previous for a meaningful right swipe', () => {
    expect(getSwipeDirection({x: 120, y: 100}, {x: 220, y: 92})).toBe('previous');
  });

  test('ignores short horizontal movement', () => {
    expect(getSwipeDirection({x: 120, y: 100}, {x: 155, y: 100})).toBeNull();
  });

  test('ignores mostly vertical movement', () => {
    expect(getSwipeDirection({x: 120, y: 100}, {x: 170, y: 190})).toBeNull();
  });
});
