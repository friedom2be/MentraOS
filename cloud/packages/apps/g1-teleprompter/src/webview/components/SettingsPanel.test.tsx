import {renderToStaticMarkup} from 'react-dom/server';
import {describe, expect, test} from 'bun:test';

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
});
