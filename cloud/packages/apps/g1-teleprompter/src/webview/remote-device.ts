export interface RemoteWakeLockSentinel {
  released?: boolean;
  release?: () => Promise<void>;
}

type NavigatorWithRemoteFeatures = {
  vibrate?: (pattern: number | number[]) => boolean;
  wakeLock?: {
    request: (type: 'screen') => Promise<RemoteWakeLockSentinel>;
  };
};

export function triggerRemoteHaptic(): void {
  try {
    const navigatorWithFeatures = globalThis.navigator as NavigatorWithRemoteFeatures | undefined;
    navigatorWithFeatures?.vibrate?.(10);
  } catch {}
}

export async function requestRemoteWakeLock(): Promise<RemoteWakeLockSentinel | null> {
  try {
    const navigatorWithFeatures = globalThis.navigator as NavigatorWithRemoteFeatures | undefined;
    if (!navigatorWithFeatures?.wakeLock?.request) {
      return null;
    }

    return await navigatorWithFeatures.wakeLock.request('screen');
  } catch {
    return null;
  }
}
