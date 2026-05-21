import {beforeEach, describe, expect, test} from 'bun:test';

import type {ActiveScript, TeleprompterProfile} from '../domain/types';
import {createRoutes} from './routes';

describe('routes', () => {
  let profile: TeleprompterProfile;
  let activeScript: ActiveScript | null;
  let savedLoadInput: unknown;

  beforeEach(() => {
    profile = {
      setupComplete: false,
      scrollSpeed: 120,
      summarizeArticles: false,
      summarizeEpubs: false,
      summarizePdfs: false,
      volumeButtonMode: false,
    };
    activeScript = null;
    savedLoadInput = undefined;
  });

  test('POST /setup/init returns a one-time token and shortcut install URL', async () => {
    const routes = createRoutes(createFakeDeps());

    const response = await routes['/setup/init'].POST(new Request('http://localhost/setup/init', {method: 'POST'}));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.token).toMatch(/[A-Za-z0-9_-]{20,}/);
    expect(body.shortcutUrl).toContain('shortcuts://');
    expect(profile.tokenHash).toBeDefined();
    expect(profile.setupComplete).toBe(false);
  });

  test('POST /setup/init only shows the setup token once before verification', async () => {
    const routes = createRoutes(createFakeDeps());

    const firstResponse = await routes['/setup/init'].POST(new Request('http://localhost/setup/init', {method: 'POST'}));
    const firstBody = await firstResponse.json();

    const secondResponse = await routes['/setup/init'].POST(new Request('http://localhost/setup/init', {method: 'POST'}));

    expect(firstResponse.status).toBe(200);
    expect(firstBody.token).toBeTruthy();
    expect(secondResponse.status).toBe(409);
  });

  test('POST /setup/verify marks setup complete when the token matches', async () => {
    const routes = createRoutes(createFakeDeps());
    const initResponse = await routes['/setup/init'].POST(new Request('http://localhost/setup/init', {method: 'POST'}));
    const {token} = await initResponse.json();

    const response = await routes['/setup/verify'].POST(
      new Request('http://localhost/setup/verify', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({token}),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.profile.setupComplete).toBe(true);
    expect(profile.setupComplete).toBe(true);
    expect(profile.lastSetupAt).toBeDefined();
  });

  test('POST /load requires bearer auth', async () => {
    const routes = createRoutes(createFakeDeps());

    const response = await routes['/load'].POST(
      new Request('http://localhost/load', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({
          sourceType: 'text',
          title: 'Draft',
          text: 'Hello world',
          shouldSummarize: false,
        }),
      }),
    );

    expect(response.status).toBe(401);
  });

  test('POST /state/control requires bearer auth', async () => {
    const routes = createRoutes(createFakeDeps());

    const response = await routes['/state/control'].POST(
      new Request('http://localhost/state/control', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({action: 'faster'}),
      }),
    );

    expect(response.status).toBe(401);
  });

  test('POST /voice-command requires bearer auth', async () => {
    const routes = createRoutes(createFakeDeps());

    const response = await routes['/voice-command'].POST(
      new Request('http://localhost/voice-command', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({command: 'pause'}),
      }),
    );

    expect(response.status).toBe(401);
  });

  test('POST /load accepts a text payload and stores preview state', async () => {
    const routes = createRoutes(createFakeDeps());
    const initResponse = await routes['/setup/init'].POST(new Request('http://localhost/setup/init', {method: 'POST'}));
    const {token} = await initResponse.json();

    await routes['/setup/verify'].POST(
      new Request('http://localhost/setup/verify', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({token}),
      }),
    );

    const response = await routes['/load'].POST(
      new Request('http://localhost/load', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sourceType: 'text',
          title: 'Draft',
          text: 'Hello world',
          shouldSummarize: false,
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(savedLoadInput).toEqual({
      sourceType: 'text',
      title: 'Draft',
      text: 'Hello world',
      shouldSummarize: false,
    });
    expect(body.activeScript.sourceTitle).toBe('Draft');
    expect(body.preview.currentChunk).toBe('Hello world');
  });

  test('GET /state returns profile and active script state', async () => {
    activeScript = createActiveScript();
    const routes = createRoutes(createFakeDeps());

    const response = await routes['/state'].GET(new Request('http://localhost/state'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.profile.scrollSpeed).toBe(120);
    expect(body.activeScript?.sourceTitle).toBe('Draft');
    expect(body.preview.currentChunk).toBe('chunk 1');
  });

  test('POST /state/control applies persisted speed and chapter controls', async () => {
    activeScript = createActiveScript();
    const routes = createRoutes(createFakeDeps());
    const token = await initializeSetup(routes);

    const fasterResponse = await routes['/state/control'].POST(
      new Request('http://localhost/state/control', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({action: 'faster'}),
      }),
    );
    const fasterBody = await fasterResponse.json();

    expect(fasterBody.profile.scrollSpeed).toBe(130);

    const nextChapterResponse = await routes['/state/control'].POST(
      new Request('http://localhost/state/control', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({action: 'next_chapter'}),
      }),
    );
    const nextChapterBody = await nextChapterResponse.json();

    expect(nextChapterBody.activeScript.chapterIndex).toBe(1);
    expect(nextChapterBody.activeScript.chunkIndex).toBe(2);
    expect(nextChapterBody.preview.currentChunk).toBe('chunk 3');
  });

  function createFakeDeps() {
    return {
      profileRepository: {
        getProfile: () => profile,
        saveProfile(update: Partial<TeleprompterProfile>) {
          profile = {...profile, ...update};
          return profile;
        },
      },
      scriptRepository: {
        getActiveScript: () => activeScript,
        saveActiveScript(script: ActiveScript) {
          activeScript = script;
        },
      },
      loadScript: async (input: unknown) => {
        savedLoadInput = input;
        activeScript = createLoadedScript(input);
        return activeScript;
      },
      now: () => '2026-05-21T12:00:00.000Z',
    };
  }
});

function createActiveScript(): ActiveScript {
  return {
    sourceType: 'text',
    sourceTitle: 'Draft',
    rawText: 'Hello world',
    displayText: 'Hello world',
    chapterIndex: 0,
    chunkIndex: 0,
    chapterList: [
      {title: 'Intro', startChunkIndex: 0, endChunkIndex: 1},
      {title: 'Next', startChunkIndex: 2, endChunkIndex: 2},
    ],
    chunks: ['chunk 1', 'chunk 2', 'chunk 3'],
    isSummarized: false,
    wordCountOriginal: 2,
    wordCountDisplay: 2,
    updatedAt: '2026-05-21T12:00:00.000Z',
  };
}

async function initializeSetup(routes: ReturnType<typeof createRoutes>): Promise<string> {
  const initResponse = await routes['/setup/init'].POST(new Request('http://localhost/setup/init', {method: 'POST'}));
  const {token} = await initResponse.json();

  await routes['/setup/verify'].POST(
    new Request('http://localhost/setup/verify', {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({token}),
    }),
  );

  return token;
}

function createLoadedScript(input: unknown): ActiveScript {
  if (typeof input === 'object' && input && 'sourceType' in input && input.sourceType === 'text' && 'text' in input) {
    const title = 'title' in input && typeof input.title === 'string' ? input.title : 'Imported Text';
    const text = typeof input.text === 'string' ? input.text : 'Loaded text';

    return {
      ...createActiveScript(),
      sourceTitle: title,
      rawText: text,
      displayText: text,
      chunks: [text],
      chapterList: [{title, startChunkIndex: 0, endChunkIndex: 0}],
    };
  }

  return createActiveScript();
}
