import {type AppSession, ViewType} from '@mentra/sdk';

import type {ActiveScript} from '../../domain/types';

export class DisplayManager {
  constructor(private readonly session: AppSession) {}

  showChunk(text: string): void {
    this.session.layouts.showTextWall(text, {
      durationMs: 20000,
      view: ViewType.MAIN,
    });
  }

  showActiveScript(activeScript: ActiveScript | null): void {
    if (!activeScript) {
      this.clear();
      return;
    }

    this.showChunk(activeScript.chunks[activeScript.chunkIndex] ?? '');
  }

  clear(): void {
    this.session.layouts.showTextWall('', {
      durationMs: 1000,
      view: ViewType.MAIN,
    });
  }
}
