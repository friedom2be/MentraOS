import type {RuntimeControlType} from './playback-controller';

const VOICE_COMMANDS: Record<string, RuntimeControlType> = {
  pause: 'pause',
  resume: 'resume',
  play: 'resume',
  restart: 'restart',
  repeat: 'restart',
  next: 'next_chapter',
  next_chapter: 'next_chapter',
  faster: 'faster',
  slower: 'slower',
  save: 'save',
  finished: 'finished',
  finish: 'finished',
};

export function normalizeVoiceCommand(command: string): RuntimeControlType | null {
  const normalized = command.trim().toLowerCase().replace(/\s+/g, '_');
  return VOICE_COMMANDS[normalized] ?? null;
}
