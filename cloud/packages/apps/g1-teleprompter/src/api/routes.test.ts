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

  test('POST /setup/reset requires explicit confirmation and resets setup state', async () => {
    const routes = createRoutes(createFakeDeps());
    const token = await initializeSetup(routes);
    const previousTokenHash = profile.tokenHash;

    const unauthorizedResponse = await routes['/setup/reset'].POST(
      new Request('http://localhost/setup/reset', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({confirmReset: true}),
      }),
    );

    expect(unauthorizedResponse.status).toBe(401);

    const rejectedResponse = await routes['/setup/reset'].POST(
      new Request('http://localhost/setup/reset', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({confirmReset: false}),
      }),
    );

    expect(rejectedResponse.status).toBe(400);

    const response = await routes['/setup/reset'].POST(
      new Request('http://localhost/setup/reset', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({confirmReset: true}),
      }),
    );
    const body = await response.json();

    expect(token).toBeTruthy();
    expect(response.status).toBe(200);
    expect(body.token).toMatch(/[A-Za-z0-9_-]{20,}/);
    expect(body.profile.setupComplete).toBe(false);
    expect(body.profile.lastSetupAt).toBeUndefined();
    expect(profile.setupComplete).toBe(false);
    expect(profile.tokenHash).toBeDefined();
    expect(profile.tokenHash).not.toBe(previousTokenHash);
  });

  test('GET /state requires bearer auth', async () => {
    activeScript = createActiveScript();
    const routes = createRoutes(createFakeDeps());

    const response = await routes['/state'].GET(new Request('http://localhost/state'));

    expect(response.status).toBe(401);
  });

  test('GET /state accepts the teleprompter token header', async () => {
    activeScript = createActiveScript();
    const routes = createRoutes(createFakeDeps());
    const token = await initializeSetup(routes);

    const response = await routes['/state'].GET(
      new Request('http://localhost/state', {
        headers: {'x-teleprompter-token': token},
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.profile).toBeDefined();
    expect(body.activeScript?.sourceTitle).toBe('Draft');
  });

  test('GET /state accepts a proxied Mentra session header', async () => {
    activeScript = createActiveScript();
    const routes = createRoutes(createFakeDeps());
    await initializeSetup(routes);

    const response = await routes['/state'].GET(
      new Request('http://localhost/state', {
        headers: {
          'x-auth-user-id': 'friedom@icloud.com',
          'x-has-active-session': 'true',
        },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.profile).toBeDefined();
    expect(body.activeScript?.sourceTitle).toBe('Draft');
  });

  test('POST /load rejects malformed base64 uploads cleanly', async () => {
    const routes = createRoutes(createFakeDeps());
    const token = await initializeSetup(routes);

    const response = await routes['/load'].POST(
      new Request('http://localhost/load', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sourceType: 'pdf',
          filename: 'bad.pdf',
          base64Data: '%%%not-base64%%%',
          shouldSummarize: false,
        }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({error: 'Invalid base64Data'});
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

  test('POST /api/settings persists toggle updates into profile state', async () => {
    const routes = createRoutes(createFakeDeps());
    const token = await initializeSetup(routes);

    const response = await routes['/api/settings'].POST(
      new Request('http://localhost/api/settings', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          summarizeArticles: true,
          summarizeEpubs: true,
          volumeButtonMode: true,
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.profile.summarizeArticles).toBe(true);
    expect(body.profile.summarizeEpubs).toBe(true);
    expect(body.profile.volumeButtonMode).toBe(true);
    expect(profile.summarizeArticles).toBe(true);
    expect(profile.summarizeEpubs).toBe(true);
    expect(profile.volumeButtonMode).toBe(true);
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
    const token = await initializeSetup(routes);

    const response = await routes['/state'].GET(
      new Request('http://localhost/state', {
        headers: {authorization: `Bearer ${token}`},
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.profile.scrollSpeed).toBe(120);
    expect(body.activeScript?.sourceTitle).toBe('Draft');
    expect(body.preview.currentChunk).toBe('chunk 1');
    expect(body.preview.percentageComplete).toBe(0);
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
    expect(nextChapterBody.preview.percentageComplete).toBe(100);
  });

  test('POST /state/control can manually advance and rewind chunks', async () => {
    activeScript = createActiveScript();
    const routes = createRoutes(createFakeDeps());
    const token = await initializeSetup(routes);

    const advanceResponse = await routes['/state/control'].POST(
      new Request('http://localhost/state/control', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({action: 'advance_chunk'}),
      }),
    );
    const advanceBody = await advanceResponse.json();

    expect(advanceResponse.status).toBe(200);
    expect(advanceBody.activeScript.chunkIndex).toBe(1);
    expect(advanceBody.preview.currentChunk).toBe('chunk 2');
    expect(advanceBody.preview.percentageComplete).toBe(50);

    const rewindResponse = await routes['/state/control'].POST(
      new Request('http://localhost/state/control', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({action: 'rewind_chunk'}),
      }),
    );
    const rewindBody = await rewindResponse.json();

    expect(rewindResponse.status).toBe(200);
    expect(rewindBody.activeScript.chunkIndex).toBe(0);
    expect(rewindBody.preview.currentChunk).toBe('chunk 1');
    expect(rewindBody.preview.percentageComplete).toBe(0);
  });

  test('POST /state/control can jump to a target percentage before playback begins', async () => {
    activeScript = createPercentScript();
    const routes = createRoutes(createFakeDeps());
    const token = await initializeSetup(routes);

    const response = await routes['/state/control'].POST(
      new Request('http://localhost/state/control', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({action: 'jump_to_percent', percentage: 50}),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.activeScript.chapterIndex).toBe(1);
    expect(body.activeScript.chunkIndex).toBe(2);
    expect(body.preview.currentChunk).toBe('chunk 3');
    expect(body.preview.globalChunkIndex).toBe(2);
    expect(body.preview.percentageComplete).toBe(50);
  });

  test('POST /state/control clears the active script when finished is applied', async () => {
    activeScript = createActiveScript();
    const routes = createRoutes(createFakeDeps());
    const token = await initializeSetup(routes);

    const response = await routes['/state/control'].POST(
      new Request('http://localhost/state/control', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({action: 'finished'}),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.activeScript).toBeNull();
    expect(body.preview).toBeNull();
    expect(activeScript).toBeNull();
  });

  test('POST /api/settings persists teleprompter preferences directly', async () => {
    const routes = createRoutes(createFakeDeps());
    const token = await initializeSetup(routes);

    const response = await routes['/api/settings'].POST(
      new Request('http://localhost/api/settings', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          scrollSpeed: 175,
          summarizeArticles: true,
          volumeButtonMode: true,
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.profile.scrollSpeed).toBe(175);
    expect(body.profile.summarizeArticles).toBe(true);
    expect(body.profile.volumeButtonMode).toBe(true);
  });

  test('POST /api/settings accepts high WPM values for faster teleprompter playback', async () => {
    const routes = createRoutes(createFakeDeps());
    const token = await initializeSetup(routes);

    const response = await routes['/api/settings'].POST(
      new Request('http://localhost/api/settings', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          scrollSpeed: 600,
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.profile.scrollSpeed).toBe(600);
  });

  test('POST /api/settings rejects a null scrollSpeed with the backend validation message', async () => {
    const routes = createRoutes(createFakeDeps());
    const token = await initializeSetup(routes);

    const response = await routes['/api/settings'].POST(
      new Request('http://localhost/api/settings', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          scrollSpeed: null,
          summarizeArticles: false,
          summarizeEpubs: false,
          summarizePdfs: false,
        }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({error: 'scrollSpeed must be a number'});
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
        clearActiveScript() {
          activeScript = null;
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

function createPercentScript(): ActiveScript {
  return {
    ...createActiveScript(),
    chapterList: [
      {title: 'Intro', startChunkIndex: 0, endChunkIndex: 1},
      {title: 'Middle', startChunkIndex: 2, endChunkIndex: 3},
      {title: 'End', startChunkIndex: 4, endChunkIndex: 4},
    ],
    chunks: ['chunk 1', 'chunk 2', 'chunk 3', 'chunk 4', 'chunk 5'],
  };
}
