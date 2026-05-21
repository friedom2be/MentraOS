import {describe, expect, test} from 'bun:test';

import {buildProxyHeaders, shouldStartAppServer} from './startup';

describe('shouldStartAppServer', () => {
  test('returns false when the api key is missing or blank', () => {
    expect(shouldStartAppServer(undefined)).toBe(false);
    expect(shouldStartAppServer('')).toBe(false);
    expect(shouldStartAppServer('   ')).toBe(false);
  });

  test('returns true when the api key is present', () => {
    expect(shouldStartAppServer('dev-key')).toBe(true);
  });
});

describe('buildProxyHeaders', () => {
  test('copies incoming headers and forwards auth metadata', () => {
    expect(
      buildProxyHeaders({
        headers: {
          accept: 'application/json',
          cookie: ['a=1', 'b=2'],
        },
        authUserId: 'user-123',
        hasActiveSession: true,
      }),
    ).toEqual({
      accept: 'application/json',
      cookie: 'a=1, b=2',
      'x-auth-user-id': 'user-123',
      'x-has-active-session': 'true',
    });
  });
});
