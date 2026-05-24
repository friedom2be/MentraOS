import {beforeEach, describe, expect, mock, test} from 'bun:test';
import {act} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {renderToStaticMarkup} from 'react-dom/server';
import {JSDOM} from 'jsdom';

import type {AppStateResponse} from '../../domain/types';
import {SettingsPanel} from './SettingsPanel';

const profile: AppStateResponse['profile'] = {
  setupComplete: true,
  scrollSpeed: 120,
  summarizeArticles: false,
  summarizeEpubs: false,
  summarizePdfs: false,
  volumeButtonMode: false,
};

describe('SettingsPanel', () => {
  beforeEach(() => {
    (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  });

  test('does not render the volume button stepping toggle', () => {
    const html = renderToStaticMarkup(
      <SettingsPanel
        busy={false}
        onUpdateSettings={async () => {}}
        profile={profile}
      />,
    );

    expect(html).not.toContain('Volume buttons step chunks');
  });

  test('shows the currently saved WPM from the backend profile', () => {
    const html = renderToStaticMarkup(
      <SettingsPanel
        busy={false}
        onUpdateSettings={async () => {}}
        profile={{...profile, scrollSpeed: 600}}
      />,
    );

    expect(html).toContain('Saved to app');
    expect(html).toContain('600 WPM');
  });

  test('does not autosave while the user is still editing the WPM field', async () => {
    const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
      url: 'http://localhost',
    });
    installDomGlobals(dom);

    const container = dom.window.document.getElementById('root');
    if (!container) {
      throw new Error('Test container not found');
    }

    const onUpdateSettings = mock(async () => {});
    let root: Root | null = null;

    await act(async () => {
      root = createRoot(container);
      root.render(<SettingsPanel busy={false} onUpdateSettings={onUpdateSettings} profile={profile} />);
    });

    const input = dom.window.document.querySelector('input[type="number"]') as HTMLInputElement | null;
    expect(input).toBeTruthy();

    await act(async () => {
      if (!input) {
        return;
      }

      setInputValue(dom, input, '180');
    });

    await new Promise((resolve) => dom.window.setTimeout(resolve, 700));

    expect(onUpdateSettings).toHaveBeenCalledTimes(0);

    await act(async () => {
      root?.unmount();
    });
  });

  test('keeps local toggle edits when the parent rerenders with the same saved profile', async () => {
    const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
      url: 'http://localhost',
    });
    installDomGlobals(dom);

    const container = dom.window.document.getElementById('root');
    if (!container) {
      throw new Error('Test container not found');
    }

    let root: Root | null = null;

    await act(async () => {
      root = createRoot(container);
      root.render(<SettingsPanel busy={false} onUpdateSettings={async () => {}} profile={profile} />);
    });

    const checkbox = dom.window.document.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
    expect(checkbox).toBeTruthy();

    await act(async () => {
      if (!checkbox) {
        return;
      }

      checkbox.click();
    });

    await act(async () => {
      root?.render(<SettingsPanel busy={false} onUpdateSettings={async () => {}} profile={{...profile}} />);
    });

    const rerenderedCheckbox = dom.window.document.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
    expect(rerenderedCheckbox?.checked).toBe(true);

    await act(async () => {
      root?.unmount();
    });
  });
});

function installDomGlobals(dom: {window: Window & typeof globalThis}) {
  globalThis.window = dom.window as unknown as Window & typeof globalThis;
  globalThis.document = dom.window.document;
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: dom.window.navigator,
  });
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.HTMLInputElement = dom.window.HTMLInputElement;
  globalThis.Event = dom.window.Event;
}

function setInputValue(dom: {window: Window & typeof globalThis}, input: HTMLInputElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value')?.set;
  valueSetter?.call(input, value);
  input.dispatchEvent(new dom.window.Event('input', {bubbles: true}));
  input.dispatchEvent(new dom.window.Event('change', {bubbles: true}));
}
