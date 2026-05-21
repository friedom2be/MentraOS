import type {ActiveScript, ScriptChapter, ScriptFamily, ScriptSourceType} from '../domain/types';
import {buildChunks} from '../domain/chunking';
import type {ScriptRepository} from '../server/repositories/script-repository';
import {detectChapters, type DetectedChapter} from './chapter-detection';
import {extractFromEpub} from './extractors/epub-extractor';
import {extractFromPdf} from './extractors/pdf-extractor';
import {extractFromText} from './extractors/text-extractor';
import {extractFromUrl} from './extractors/url-extractor';
import {detectScriptFamily} from './language-detection';
import {summarizeText, type SummarizeFn} from './summarize';

type FileSourceType = 'pdf' | 'epub';

interface BaseLoadScriptInput {
  sourceType: ScriptSourceType;
  shouldSummarize: boolean;
}

export interface LoadTextScriptInput extends BaseLoadScriptInput {
  sourceType: 'text';
  text: string;
  title?: string;
}

export interface LoadUrlScriptInput extends BaseLoadScriptInput {
  sourceType: 'url';
  url: string;
}

export interface LoadFileScriptInput extends BaseLoadScriptInput {
  sourceType: FileSourceType;
  fileName?: string;
  fileData: ArrayBuffer | Uint8Array;
}

export type LoadScriptInput = LoadTextScriptInput | LoadUrlScriptInput | LoadFileScriptInput;

export interface LoadScriptDeps {
  scriptRepository: Pick<ScriptRepository, 'saveActiveScript'>;
  summarize?: SummarizeFn;
  now?: () => string;
}

interface ExtractedSource {
  title: string;
  text: string;
}

export async function loadScript(input: LoadScriptInput, deps: LoadScriptDeps): Promise<ActiveScript> {
  const extracted = await resolveSource(input);
  const scriptFamily = detectScriptFamily(extracted.text);
  const chapterTexts = detectChapters(extracted.text, input.sourceType);
  const summarize = deps.summarize || summarizeText;
  const displayText = input.shouldSummarize ? await summarize(extracted.text, input.sourceType) : extracted.text;
  const chunks = buildChunks(displayText, scriptFamily);

  const activeScript: ActiveScript = {
    sourceType: input.sourceType,
    sourceTitle: extracted.title,
    rawText: extracted.text,
    displayText,
    chapterIndex: 0,
    chunkIndex: 0,
    chapterList: mapChaptersToChunkRanges(chapterTexts, scriptFamily),
    chunks,
    isSummarized: input.shouldSummarize,
    wordCountOriginal: extracted.text.split(/\s+/).filter(Boolean).length,
    wordCountDisplay: displayText.split(/\s+/).filter(Boolean).length,
    updatedAt: (deps.now || (() => new Date().toISOString()))(),
  };

  deps.scriptRepository.saveActiveScript(activeScript);
  return activeScript;
}

async function resolveSource(input: LoadScriptInput): Promise<ExtractedSource> {
  switch (input.sourceType) {
    case 'text':
      return extractFromText(input.text, input.title);
    case 'url':
      return extractFromUrl(input.url);
    case 'pdf':
      return extractFromPdf(input.fileData, input.fileName || 'Imported PDF');
    case 'epub':
      return extractFromEpub(input.fileData, input.fileName || 'Imported EPUB');
    default:
      throw new Error(`Unsupported source type: ${String(input satisfies never)}`);
  }
}

export function mapChaptersToChunkRanges(
  chapters: DetectedChapter[],
  scriptFamily: ScriptFamily,
): ScriptChapter[] {
  let cursor = 0;

  return chapters.map((chapter) => {
    const chapterChunks = buildChunks(chapter.text, scriptFamily);
    const startChunkIndex = cursor;
    const endChunkIndex = cursor + Math.max(chapterChunks.length - 1, 0);
    cursor = endChunkIndex + 1;

    return {
      title: chapter.title,
      startChunkIndex,
      endChunkIndex,
    };
  });
}
