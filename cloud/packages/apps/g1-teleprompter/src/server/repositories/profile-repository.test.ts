import {beforeEach, describe, expect, test} from 'bun:test';

import {createDatabase} from '../db';
import {ProfileRepository} from './profile-repository';

describe('ProfileRepository', () => {
  let repo: ProfileRepository;

  beforeEach(() => {
    const db = createDatabase(':memory:');
    repo = new ProfileRepository(db);
  });

  test('returns default profile values for the seeded single row', () => {
    expect(repo.getProfile()).toEqual({
      setupComplete: false,
      scrollSpeed: 120,
      summarizeArticles: false,
      summarizeEpubs: false,
      summarizePdfs: false,
      volumeButtonMode: false,
      tokenHash: undefined,
      tokenCreatedAt: undefined,
      lastSetupAt: undefined,
    });
  });

  test('merges partial profile updates without resetting existing values', () => {
    repo.saveProfile({
      setupComplete: true,
      tokenHash: 'hashed-token',
      scrollSpeed: 160,
      summarizeArticles: true,
    });

    const saved = repo.saveProfile({
      summarizePdfs: true,
    });

    expect(saved.setupComplete).toBe(true);
    expect(saved.tokenHash).toBe('hashed-token');
    expect(saved.scrollSpeed).toBe(160);
    expect(saved.summarizeArticles).toBe(true);
    expect(saved.summarizePdfs).toBe(true);
    expect(saved.summarizeEpubs).toBe(false);
    expect(saved.volumeButtonMode).toBe(false);
  });
});
