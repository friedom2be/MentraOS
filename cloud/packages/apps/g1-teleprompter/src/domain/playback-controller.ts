export type PlaybackStatus = 'paused' | 'playing';

export interface PlaybackState {
  chapterIndex: number;
  chunkIndex: number;
  scrollSpeed: number;
  status: PlaybackStatus;
}

export type PlaybackAction =
  | {type: 'pause'}
  | {type: 'resume'}
  | {type: 'restart'}
  | {type: 'repeat'}
  | {type: 'faster'}
  | {type: 'slower'}
  | {type: 'save'}
  | {type: 'finished'}
  | {type: 'next_chapter'; chapterStarts: number[]}
  | {type: 'advance_chunk'; chapterStarts: number[]; chunkCount: number}
  | {type: 'rewind_chunk'; chapterStarts: number[]};

export type RuntimeControlType =
  | 'pause'
  | 'resume'
  | 'restart'
  | 'repeat'
  | 'faster'
  | 'slower'
  | 'save'
  | 'finished'
  | 'next_chapter'
  | 'advance_chunk'
  | 'rewind_chunk';

export function applyControlAction(state: PlaybackState, action: PlaybackAction): PlaybackState {
  switch (action.type) {
    case 'pause':
      return {...state, status: 'paused'};
    case 'resume':
      return {...state, status: 'playing'};
    case 'restart':
      return {...state, chapterIndex: 0, chunkIndex: 0, status: 'paused'};
    case 'repeat':
      return {...state, status: 'paused'};
    case 'next_chapter': {
      const nextChapterIndex = Math.min(state.chapterIndex + 1, Math.max(action.chapterStarts.length - 1, 0));
      return {
        ...state,
        chapterIndex: nextChapterIndex,
        chunkIndex: action.chapterStarts[nextChapterIndex] ?? state.chunkIndex,
      };
    }
    case 'advance_chunk': {
      const chunkIndex = Math.min(state.chunkIndex + 1, Math.max(action.chunkCount - 1, 0));
      return {
        ...state,
        chunkIndex,
        chapterIndex: chapterIndexForChunk(chunkIndex, action.chapterStarts),
      };
    }
    case 'rewind_chunk': {
      const chunkIndex = Math.max(state.chunkIndex - 1, 0);
      return {
        ...state,
        chunkIndex,
        chapterIndex: chapterIndexForChunk(chunkIndex, action.chapterStarts),
      };
    }
    case 'faster':
      return {...state, scrollSpeed: Math.min(state.scrollSpeed + 10, 220)};
    case 'slower':
      return {...state, scrollSpeed: Math.max(state.scrollSpeed - 10, 60)};
    case 'save':
    case 'finished':
      return state;
    default:
      return state;
  }
}

export function chapterIndexForChunk(chunkIndex: number, chapterStarts: number[]): number {
  let index = 0;

  for (let i = 0; i < chapterStarts.length; i += 1) {
    if ((chapterStarts[i] ?? 0) <= chunkIndex) {
      index = i;
    } else {
      break;
    }
  }

  return index;
}
