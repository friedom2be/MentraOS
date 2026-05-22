import {renderToStaticMarkup} from 'react-dom/server';
import {describe, expect, test} from 'bun:test';

import type {AppStateResponse} from '../../domain/types';
import {Dashboard} from './Dashboard';

const appState: AppStateResponse = {
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
};

describe('Dashboard', () => {
  test('shows a simple welcome message above the load area when no script is loaded', () => {
    const html = renderToStaticMarkup(
      <Dashboard
        appState={appState}
        busy={false}
        error={null}
        onLoadScript={async () => {}}
        onRefreshState={async () => {}}
        onSendControl={async () => {}}
        onUpdateSettings={async () => {}}
      />,
    );

    expect(html).toContain('Welcome to Mentra HUD Reader');
    expect(html).toContain('Load a script to start reading on your HUD.');
  });
});
