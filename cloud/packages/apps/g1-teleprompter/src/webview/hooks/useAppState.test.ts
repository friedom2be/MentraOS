import {afterEach, beforeEach, describe, expect, mock, test} from 'bun:test';
import {act, createElement, useEffect} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {JSDOM} from 'jsdom';

import {extractErrorMessage, SETTINGS_API_PATH, useAppState} from './useAppState';

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

describe('useAppState settings endpoint', () => {
  let dom: InstanceType<typeof JSDOM>;
  let container: HTMLElement;
  let root: Root | null = null;
  let appStateHook: ReturnType<typeof useAppState> | null = null;
  let fetchMock: ReturnType<typeof mock>;

  beforeEach(async () => {
    (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
    dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
      url: 'http://localhost',
    });
    installDomGlobals(dom);
    container = dom.window.document.getElementById('root') as HTMLElement;

    fetchMock = mock(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

      if (url === '/state') {
        return jsonResponse({
          profile: {
            setupComplete: true,
            scrollSpeed: 120,
            summarizeArticles: false,
            summarizeEpubs: false,
            summarizePdfs: false,
            volumeButtonMode: false,
          },
          activeScript: null,
          preview: null,
        });
      }

      return jsonResponse({error: 'unexpected request'}, 500);
    });

    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await act(async () => {
      root = createRoot(container);
      root.render(createElement(HookHarness, {onReady: (nextHook) => (appStateHook = nextHook)}));
    });
  });

  afterEach(async () => {
    await act(async () => {
      root?.unmount();
      root = null;
    });
  });

  test('posts settings saves to /api/settings instead of /settings', async () => {
    fetchMock.mockImplementationOnce(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (url !== SETTINGS_API_PATH) {
        return jsonResponse({error: `unexpected endpoint: ${url}`}, 500);
      }

      return jsonResponse({
        profile: {
          setupComplete: true,
          scrollSpeed: 180,
          summarizeArticles: true,
          summarizeEpubs: false,
          summarizePdfs: true,
          volumeButtonMode: false,
        },
        activeScript: null,
        preview: null,
      });
    });

    await act(async () => {
      await appStateHook?.updateSettings({
        scrollSpeed: 180,
        summarizeArticles: true,
        summarizeEpubs: false,
        summarizePdfs: true,
      });
    });

    const saveCall = fetchMock.mock.calls.find(([input]) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      return url === SETTINGS_API_PATH || url === '/settings';
    });

    expect(saveCall).toBeTruthy();
    const [requestUrl, requestInit] = saveCall!;
    const resolvedUrl =
      typeof requestUrl === 'string' ? requestUrl : requestUrl instanceof URL ? requestUrl.toString() : requestUrl.url;

    expect(resolvedUrl).toBe(SETTINGS_API_PATH);
    expect(requestInit?.method).toBe('POST');
    expect(requestInit?.body).toBe(
      JSON.stringify({
        scrollSpeed: 180,
        summarizeArticles: true,
        summarizeEpubs: false,
        summarizePdfs: true,
      }),
    );
  });

  test('surfaces a settings-specific error message when the endpoint rejects the save', async () => {
    fetchMock.mockImplementationOnce(async () => jsonResponse({error: 'scrollSpeed must be a number'}, 400));

    await act(async () => {
      await appStateHook?.updateSettings({
        scrollSpeed: 180,
        summarizeArticles: false,
        summarizeEpubs: false,
        summarizePdfs: false,
      });
    });

    expect(appStateHook?.error).toBe('Settings save failed: scrollSpeed must be a number');
  });
});

function HookHarness({onReady}: {onReady: (hook: ReturnType<typeof useAppState>) => void}) {
  const hook = useAppState();

  useEffect(() => {
    onReady(hook);
  }, [hook, onReady]);

  return null;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {'content-type': 'application/json'},
  });
}

function installDomGlobals(dom: InstanceType<typeof JSDOM>) {
  globalThis.window = dom.window as unknown as Window & typeof globalThis;
  globalThis.document = dom.window.document;
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: dom.window.navigator,
  });
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.Event = dom.window.Event;
}
