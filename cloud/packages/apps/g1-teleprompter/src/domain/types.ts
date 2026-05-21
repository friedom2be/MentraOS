export interface ScriptChapter {
  title: string;
  startChunkIndex: number;
  endChunkIndex: number;
}

export type ScriptSourceType = 'text' | 'url' | 'pdf' | 'epub';

export interface ActiveScript {
  sourceType: ScriptSourceType;
  sourceTitle: string;
  rawText: string;
  displayText: string;
  chapterIndex: number;
  chunkIndex: number;
  chapterList: ScriptChapter[];
  chunks: string[];
  isSummarized: boolean;
  wordCountOriginal: number;
  wordCountDisplay: number;
  updatedAt: string;
}

export interface TeleprompterProfile {
  setupComplete: boolean;
  tokenHash?: string;
  tokenCreatedAt?: string;
  scrollSpeed: number;
  summarizeArticles: boolean;
  summarizeEpubs: boolean;
  summarizePdfs: boolean;
  volumeButtonMode: boolean;
  lastSetupAt?: string;
}
