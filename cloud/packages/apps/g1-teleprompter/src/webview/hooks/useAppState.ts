import {useEffect, useState} from 'react';

import type {AppStateResponse, PublicTeleprompterProfile} from '../../domain/types';

const TOKEN_STORAGE_KEY = 'g1-teleprompter-token';

interface SetupInitResponse {
  token: string;
  shortcutUrl: string;
}

interface SetupVerifyResponse {
  ok: true;
  profile: PublicTeleprompterProfile;
}

interface SetupResetResponse extends SetupInitResponse {
  profile: PublicTeleprompterProfile;
}

export interface AppStateController {
  state: AppStateResponse | null;
  token: string | null;
  error: string | null;
  busy: string | null;
  refresh: () => Promise<void>;
  initSetup: () => Promise<SetupInitResponse>;
  verifySetup: (token: string) => Promise<SetupVerifyResponse>;
  applyControl: (action: string, percentage?: number) => Promise<void>;
  saveSettings: (settings: Partial<PublicTeleprompterProfile>) => Promise<void>;
  resetSetup: () => Promise<SetupResetResponse>;
}

export function useAppState(): AppStateController {
  const [token, setToken] = useState<string | null>(() => window.localStorage.getItem(TOKEN_STORAGE_KEY));
  const [state, setState] = useState<AppStateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setState(null);
      setError(null);
      return;
    }

    let cancelled = false;

    const poll = async () => {
      try {
        const nextState = await requestJson<AppStateResponse>('/state', {
          headers: {authorization: `Bearer ${token}`},
        });

        if (!cancelled) {
          setState(nextState);
          setError(null);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(toMessage(requestError));
        }
      }
    };

    void poll();
    const interval = window.setInterval(() => {
      void poll();
    }, 2_000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [token]);

  async function refresh(nextToken = token): Promise<void> {
    if (!nextToken) {
      setState(null);
      return;
    }

    const nextState = await requestJson<AppStateResponse>('/state', {
      headers: {authorization: `Bearer ${nextToken}`},
    });
    setState(nextState);
    setError(null);
  }

  async function initSetup(): Promise<SetupInitResponse> {
    setBusy('Initializing setup…');
    setError(null);

    try {
      return await requestJson<SetupInitResponse>('/setup/init', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
      });
    } catch (requestError) {
      const message = toMessage(requestError);
      setError(message);
      throw requestError;
    } finally {
      setBusy(null);
    }
  }

  async function verifySetup(plainToken: string): Promise<SetupVerifyResponse> {
    setBusy('Verifying setup…');
    setError(null);

    try {
      const response = await requestJson<SetupVerifyResponse>('/setup/verify', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({token: plainToken}),
      });

      window.localStorage.setItem(TOKEN_STORAGE_KEY, plainToken);
      setToken(plainToken);
      await refresh(plainToken);
      return response;
    } catch (requestError) {
      const message = toMessage(requestError);
      setError(message);
      throw requestError;
    } finally {
      setBusy(null);
    }
  }

  async function applyControl(action: string, percentage?: number): Promise<void> {
    if (!token) {
      throw new Error('Setup token is not available');
    }

    setBusy('Updating playback…');
    setError(null);

    try {
      const nextState = await requestJson<AppStateResponse>('/state/control', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify(
          typeof percentage === 'number'
            ? {
                action,
                percentage,
              }
            : {action},
        ),
      });

      setState(nextState);
    } catch (requestError) {
      const message = toMessage(requestError);
      setError(message);
      throw requestError;
    } finally {
      setBusy(null);
    }
  }

  async function saveSettings(settings: Partial<PublicTeleprompterProfile>): Promise<void> {
    if (!token) {
      throw new Error('Setup token is not available');
    }

    setBusy('Saving settings…');
    setError(null);

    try {
      const nextState = await requestJson<AppStateResponse>('/settings', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      setState(nextState);
    } catch (requestError) {
      const message = toMessage(requestError);
      setError(message);
      throw requestError;
    } finally {
      setBusy(null);
    }
  }

  async function resetSetup(): Promise<SetupResetResponse> {
    if (!token) {
      throw new Error('Setup token is not available');
    }

    setBusy('Re-initializing setup…');
    setError(null);

    try {
      const response = await requestJson<SetupResetResponse>('/setup/reset', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({confirmReset: true}),
      });

      window.localStorage.setItem(TOKEN_STORAGE_KEY, response.token);
      setToken(response.token);
      setState({
        profile: response.profile,
        activeScript: null,
        preview: null,
      });
      return response;
    } catch (requestError) {
      const message = toMessage(requestError);
      setError(message);
      throw requestError;
    } finally {
      setBusy(null);
    }
  }

  return {
    state,
    token,
    error,
    busy,
    refresh,
    initSetup,
    verifySetup,
    applyControl,
    saveSettings,
    resetSetup,
  };
}

async function requestJson<T>(input: string, init: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const body = (await response.json().catch(() => ({}))) as {error?: string};

  if (!response.ok) {
    throw new Error(body.error || `Request failed with status ${response.status}`);
  }

  return body as T;
}

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong.';
}
