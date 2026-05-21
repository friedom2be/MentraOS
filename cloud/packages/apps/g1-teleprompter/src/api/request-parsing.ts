import type {TeleprompterProfile} from '../domain/types';
import {normalizeVoiceCommand as normalizeRuntimeVoiceCommand} from '../domain/voice-commands';
import type {LoadScriptInput} from '../ingestion/load-script';

const CONTROL_ACTIONS = ['pause', 'resume', 'restart', 'next_chapter', 'faster', 'slower', 'save', 'finished'] as const;

export type ControlAction = (typeof CONTROL_ACTIONS)[number];

export interface ResetRequest {
  confirmReset: boolean;
}

export interface VerifyRequest {
  token: string;
}

export interface VoiceCommandRequest {
  command: string;
}

export async function parseJsonBody<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw Response.json({error: 'Invalid JSON body'}, {status: 400});
  }
}

export function parseVerifyRequest(input: unknown): VerifyRequest {
  if (!isObject(input) || typeof input.token !== 'string' || !input.token.trim()) {
    throw Response.json({error: 'token is required'}, {status: 400});
  }

  return {token: input.token.trim()};
}

export function parseResetRequest(input: unknown): ResetRequest {
  if (!isObject(input) || input.confirmReset !== true) {
    throw Response.json({error: 'confirmReset must be true'}, {status: 400});
  }

  return {confirmReset: true};
}

export function parseControlRequest(input: unknown): {action: ControlAction} {
  if (!isObject(input) || typeof input.action !== 'string' || !isControlAction(input.action)) {
    throw Response.json({error: 'Unsupported control action'}, {status: 400});
  }

  return {action: input.action};
}

export function parseVoiceCommandRequest(input: unknown): VoiceCommandRequest {
  if (!isObject(input) || typeof input.command !== 'string' || !input.command.trim()) {
    throw Response.json({error: 'command is required'}, {status: 400});
  }

  return {command: input.command.trim()};
}

export function normalizeVoiceCommand(command: string): ControlAction | null {
  const normalized = normalizeRuntimeVoiceCommand(command);
  return normalized && isControlAction(normalized) ? normalized : null;
}

export function parseLoadRequest(input: unknown, profile: TeleprompterProfile): LoadScriptInput {
  if (!isObject(input) || typeof input.sourceType !== 'string') {
    throw Response.json({error: 'sourceType is required'}, {status: 400});
  }

  const shouldSummarize =
    typeof input.shouldSummarize === 'boolean' ? input.shouldSummarize : getDefaultSummarize(input.sourceType, profile);

  switch (input.sourceType) {
    case 'text':
      if (typeof input.text !== 'string' || !input.text.trim()) {
        throw Response.json({error: 'text is required'}, {status: 400});
      }

      return {
        sourceType: 'text',
        title: typeof input.title === 'string' ? input.title : undefined,
        text: input.text,
        shouldSummarize,
      };
    case 'url':
      if (typeof input.url !== 'string' || !input.url.trim()) {
        throw Response.json({error: 'url is required'}, {status: 400});
      }

      return {
        sourceType: 'url',
        url: input.url,
        shouldSummarize,
      };
    case 'pdf':
    case 'epub':
      return {
        sourceType: input.sourceType,
        fileName: typeof input.filename === 'string' ? input.filename : undefined,
        fileData: decodeBase64File(input),
        shouldSummarize,
      };
    case 'txt':
    case 'md': {
      const bytes = decodeBase64File(input);
      return {
        sourceType: 'text',
        title: typeof input.filename === 'string' ? input.filename : undefined,
        text: new TextDecoder().decode(bytes),
        shouldSummarize,
      };
    }
    default:
      throw Response.json({error: 'Unsupported sourceType'}, {status: 400});
  }
}

function decodeBase64File(input: Record<string, unknown>): Uint8Array {
  if (typeof input.base64Data !== 'string' || !input.base64Data.trim()) {
    throw Response.json({error: 'base64Data is required'}, {status: 400});
  }

  const normalized = input.base64Data.trim().replace(/\s+/g, '');
  if (!isValidBase64(normalized)) {
    throw Response.json({error: 'Invalid base64Data'}, {status: 400});
  }

  return Uint8Array.from(Buffer.from(normalized, 'base64'));
}

function getDefaultSummarize(sourceType: string, profile: TeleprompterProfile): boolean {
  switch (sourceType) {
    case 'url':
      return profile.summarizeArticles;
    case 'pdf':
      return profile.summarizePdfs;
    case 'epub':
      return profile.summarizeEpubs;
    default:
      return false;
  }
}

function isControlAction(action: string): action is ControlAction {
  return CONTROL_ACTIONS.includes(action as ControlAction);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isValidBase64(value: string): boolean {
  if (!value || value.length % 4 !== 0) {
    return false;
  }

  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value)) {
    return false;
  }

  const decoded = Buffer.from(value, 'base64');
  return decoded.length > 0 && decoded.toString('base64') === value;
}
