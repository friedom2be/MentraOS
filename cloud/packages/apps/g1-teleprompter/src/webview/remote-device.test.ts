import {afterEach, beforeEach, describe, expect, test} from 'bun:test';

import {requestRemoteWakeLock, triggerRemoteHaptic} from './remote-device';

describe('remote-device helpers', () => {
  const originalNavigator = globalThis.navigator;

  beforeEach(() => {
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {},
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: originalNavigator,
    });
  });

  test('triggerRemoteHaptic silently ignores missing vibrate support', () => {
    expect(() => triggerRemoteHaptic()).not.toThrow();
  });

  test('requestRemoteWakeLock silently returns null when wake lock is unavailable', async () => {
    await expect(requestRemoteWakeLock()).resolves.toBeNull();
  });
});
