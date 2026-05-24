import {describe, expect, test} from 'bun:test';

import type {AppStateResponse} from '../../domain/types';
import {getSettingsSyncKey} from './settings-sync';

const profile: AppStateResponse['profile'] = {
  setupComplete: true,
  scrollSpeed: 120,
  summarizeArticles: false,
  summarizeEpubs: false,
  summarizePdfs: false,
  volumeButtonMode: false,
};

describe('getSettingsSyncKey', () => {
  test('stays stable for equivalent profile objects', () => {
    expect(getSettingsSyncKey({...profile})).toBe(getSettingsSyncKey(profile));
  });

  test('changes when a saved setting changes', () => {
    expect(getSettingsSyncKey({...profile, scrollSpeed: 180})).not.toBe(getSettingsSyncKey(profile));
    expect(getSettingsSyncKey({...profile, volumeButtonMode: true})).not.toBe(getSettingsSyncKey(profile));
  });
});
