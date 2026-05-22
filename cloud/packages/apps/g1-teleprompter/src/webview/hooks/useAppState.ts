import {useEffect, useState} from 'react';

import {TELEPROMPTER_TOKEN_HEADER} from '../../api/auth';
import type {ControlAction, SettingsRequest} from '../../api/request-parsing';
import type {AppStateResponse} from '../../domain/types';

const TOKEN_STORAGE_KEY = 'g1-teleprompter.setup-token';

export type LoadRequestPayload =
  | {
      sourceType: 'text';
      title?: string;
      text: string;
      shouldSummarize?: boolean;
    }
  | {
      sourceType: 'url';
      url: string;
      shouldSummarize?: boolean;
    }
  | {
      sourceType: 'pdf' | 'epub' | 'txt' | 'md';
      filename: string;
      base64Data: string;
      shouldSummarize?: boolean;
    };

interface SetupInitResponse {
  token: string;
  shortcutUrl: string;
}

interface SetupResetResponse extends SetupInitResponse {
  profile: AppStateResponse['profile'];
}

interface RequestOptions {
  auth?: boolean;
  method?: 'GET' | 'POST';
  body?: unknown;
}

export function useAppState() {
  const [token, setToken] = useState<string | null>(() => readStoredToken());
  const [generatedToken, setGeneratedToken] = useState<string | null>(() => readStoredToken());
  const [shortcutUrl, setShortcutUrl] = useState<string | null>(null);
  const [appState, setAppState] = useState<AppStateResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialStateResolved, setInitialStateResolved] = useState(false);

  useEffect(() => {
    let canceled = false;

    const bootstrapState = async () => {
      try {
        const nextState = await requestJson<AppStateResponse>('/state', {auth: true}, token);
        if (!canceled) {
          setAppState(nextState);
          setError(null);
        }
      } catch (nextError) {
        if (!canceled) {
          setError(toMessage(nextError));
        }
      } finally {
        if (!canceled) {
          setInitialStateResolved(true);
        }
      }
    };

    void bootstrapState();

    return () => {
      canceled = true;
    };
  }, []);

  useEffect(() => {
    if (!token && !appState?.profile.setupComplete) {
      return;
    }

    let canceled = false;

    const tick = async () => {
      if (document.visibilityState === 'hidden') {
        return;
      }

      try {
        const nextState = await requestJson<AppStateResponse>('/state', {auth: true}, token);
        if (!canceled) {
          setAppState(nextState);
          setError(null);
          setInitialStateResolved(true);
        }
      } catch (nextError) {
        if (!canceled) {
          setError(toMessage(nextError));
          setInitialStateResolved(true);
        }
      }
    };

    void tick();
    const intervalId = window.setInterval(() => {
      void tick();
    }, 3000);

    return () => {
      canceled = true;
      window.clearInterval(intervalId);
    };
  }, [token]);

  async function initializeSetup() {
    await runWithBusy(async () => {
      const response = await requestJson<SetupInitResponse>('/setup/init', {method: 'POST', auth: false});
      persistToken(response.token);
      setToken(response.token);
      setGeneratedToken(response.token);
      setShortcutUrl(response.shortcutUrl);
      setAppState(null);
    });
  }

  async function verifySetup(nextToken?: string) {
    await runWithBusy(async () => {
      const tokenToUse = nextToken?.trim() || token;
      if (!tokenToUse) {
        throw new Error('Enter your setup token first.');
      }

      persistToken(tokenToUse);
      setToken(tokenToUse);
      setGeneratedToken(tokenToUse);

      await requestJson('/setup/verify', {
        method: 'POST',
        auth: false,
        body: {token: tokenToUse},
      });

      const nextState = await requestJson<AppStateResponse>('/state', {auth: true}, tokenToUse);
      setAppState(nextState);
    });
  }

  async function resetSetup() {
    await runWithBusy(async () => {
      const response = await requestJson<SetupResetResponse>(
        '/setup/reset',
        {method: 'POST', auth: true, body: {confirmReset: true}},
        token,
      );

      persistToken(response.token);
      setToken(response.token);
      setGeneratedToken(response.token);
      setShortcutUrl(response.shortcutUrl);
      setAppState((currentState) =>
        currentState
          ? {
              ...currentState,
              profile: response.profile,
            }
          : null,
      );
    });
  }

  async function refreshState() {
    await runWithBusy(async () => {
      const nextState = await requestJson<AppStateResponse>('/state', {auth: true}, token);
      setAppState(nextState);
      setInitialStateResolved(true);
    });
  }

  async function loadScript(payload: LoadRequestPayload) {
    await runWithBusy(async () => {
      const nextState = await requestJson<AppStateResponse>('/load', {method: 'POST', auth: true, body: payload}, token);
      setAppState(nextState);
    });
  }

  async function sendControl(action: ControlAction, percentage?: number) {
    await runWithBusy(async () => {
      const nextState = await requestJson<AppStateResponse>(
        '/state/control',
        {
          method: 'POST',
          auth: true,
          body: typeof percentage === 'number' ? {action, percentage} : {action},
        },
        token,
      );
      setAppState(nextState);
    });
  }

  async function updateSettings(settings: SettingsRequest) {
    await runWithBusy(async () => {
      const nextState = await requestJson<AppStateResponse>('/settings', {method: 'POST', auth: true, body: settings}, token);
      setAppState(nextState);
    });
  }

  async function runWithBusy(task: () => Promise<void>) {
    setBusy(true);
    setError(null);

    try {
      await task();
    } catch (nextError) {
      setError(toMessage(nextError));
    } finally {
      setBusy(false);
    }
  }

  return {
    appState,
    busy,
    error,
    generatedToken,
    initialStateResolved,
    shortcutUrl,
    token,
    initializeSetup,
    loadScript,
    refreshState,
    resetSetup,
    sendControl,
    updateSettings,
    verifySetup,
  };
}

async function requestJson<T = unknown>(path: string, options: RequestOptions, token?: string | null): Promise<T> {
  const headers = new Headers();

  if (options.body !== undefined) {
    headers.set('content-type', 'application/json');
  }

  if (options.auth !== false) {
    if (token) {
      headers.set(TELEPROMPTER_TOKEN_HEADER, token);
    }
  }

  const response = await fetch(path, {
    method: options.method || 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return (await response.json()) as T;
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as {error?: string};
    if (typeof body.error === 'string' && body.error) {
      return body.error;
    }
  } catch {}

  return `Request failed (${response.status})`;
}

function persistToken(token: string | null) {
  if (typeof window === 'undefined') {
    return;
  }

  if (!token) {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

function readStoredToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const stored = window.localStorage.getItem(TOKEN_STORAGE_KEY);
  return stored && stored.trim() ? stored.trim() : null;
}

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong.';
}
