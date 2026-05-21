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

export type ScriptFamily = 'latin' | 'cjk' | 'rtl';

export type PublicTeleprompterProfile = Omit<TeleprompterProfile, 'tokenHash'>;

export interface ScriptProgress {
  percentage: number;
  globalChunkIndex: number;
  totalChunks: number;
  totalChapters: number;
}

export interface PreviewState extends ScriptProgress {
  chapterIndex: number;
  chunkIndex: number;
  currentChunk: string | null;
  currentChapterTitle: string | null;
  percentageComplete: number;
}

export interface AppStateResponse {
  profile: PublicTeleprompterProfile;
  activeScript: ActiveScript | null;
  preview: PreviewState | null;
}
