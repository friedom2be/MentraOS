import type {AppStateResponse} from '../../domain/types';

export function getSettingsSyncKey(profile: AppStateResponse['profile']): string {
  return [
    profile.scrollSpeed,
    profile.summarizeArticles ? 1 : 0,
    profile.summarizeEpubs ? 1 : 0,
    profile.summarizePdfs ? 1 : 0,
    profile.volumeButtonMode ? 1 : 0,
  ].join(':');
}
