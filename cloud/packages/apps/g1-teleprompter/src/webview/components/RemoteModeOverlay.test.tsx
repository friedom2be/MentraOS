import {beforeEach, describe, expect, test} from 'bun:test';
import {JSDOM} from 'jsdom';
import {act} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {renderToStaticMarkup} from 'react-dom/server';

import type {PreviewState} from '../../domain/types';
import {RemoteModeOverlay} from './RemoteModeOverlay';

const preview: PreviewState = {
  chapterIndex: 1,
  chunkIndex: 4,
  globalChunkIndex: 4,
  currentChunk: 'This text should stay off the remote screen.',
  currentChapterTitle: 'Chapter Two',
  percentage: 50,
  percentageComplete: 50,
  totalChunks: 8,
  totalChapters: 3,
};

describe('RemoteModeOverlay', () => {
  beforeEach(() => {
    (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
    delete (globalThis as Record<string, unknown>).window;
    delete (globalThis as Record<string, unknown>).document;
    delete (globalThis as Record<string, unknown>).navigator;
  });

  test('renders a minimal remote surface without the full script preview text', () => {
    const html = renderToStaticMarkup(
      <RemoteModeOverlay
        busy={false}
        isPlaying={false}
        onClose={() => {}}
        onNextChunk={async () => {}}
        onPause={async () => {}}
        onPreviousChunk={async () => {}}
        onResume={async () => {}}
        preview={preview}
        title="Test Script"
      />,
    );

    expect(html).toContain('Remote Mode');
    expect(html).toContain('Test Script');
    expect(html).toContain('5 / 8');
    expect(html).toContain('50%');
    expect(html).toContain('Paused');
    expect(html).not.toContain('This text should stay off the remote screen.');
  });

  test('maps left, center, and right taps to previous, play/pause, and next actions', async () => {
    const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
      url: 'http://localhost',
    });
    const container = dom.window.document.getElementById('root');
    if (!container) {
      throw new Error('Test container not found');
    }

    installDomGlobals(dom);

    const calls: string[] = [];
    let root: Root | null = null;

    await act(async () => {
      root = createRoot(container);
      root.render(
        <RemoteModeOverlay
          busy={false}
          isPlaying={false}
          onClose={() => {}}
          onNextChunk={async () => {
            calls.push('next');
          }}
          onPause={async () => {
            calls.push('pause');
          }}
          onPreviousChunk={async () => {
            calls.push('previous');
          }}
          onResume={async () => {
            calls.push('resume');
          }}
          preview={preview}
          title="Test Script"
        />,
      );
    });

    const previousButton = dom.window.document.querySelector('[aria-label="Previous chunk remote control"]') as HTMLButtonElement | null;
    const toggleButton = dom.window.document.querySelector('[aria-label="Play or pause remote control"]') as HTMLButtonElement | null;
    const nextButton = dom.window.document.querySelector('[aria-label="Next chunk remote control"]') as HTMLButtonElement | null;

    expect(previousButton).toBeTruthy();
    expect(toggleButton).toBeTruthy();
    expect(nextButton).toBeTruthy();

    await act(async () => {
      previousButton?.click();
      await Promise.resolve();
    });

    await act(async () => {
      toggleButton?.click();
      await Promise.resolve();
    });

    await act(async () => {
      nextButton?.click();
      await Promise.resolve();
    });

    expect(calls).toEqual(['previous', 'resume', 'next']);

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
  globalThis.HTMLButtonElement = dom.window.HTMLButtonElement;
  globalThis.Event = dom.window.Event;
  globalThis.MouseEvent = dom.window.MouseEvent;
}
