import type {PreviewState} from '../../domain/types';

interface PreviewCardProps {
  busy: boolean;
  percentageInput: string;
  preview: PreviewState | null;
  onChangePercentage: (value: string) => void;
  onJumpToPercentage: () => Promise<void>;
  onPause: () => Promise<void>;
  onResume: () => Promise<void>;
  onRestart: () => Promise<void>;
  onNextChapter: () => Promise<void>;
  onRepeat: () => Promise<void>;
  onFinish: () => Promise<void>;
}

export function PreviewCard({
  busy,
  percentageInput,
  preview,
  onChangePercentage,
  onFinish,
  onJumpToPercentage,
  onNextChapter,
  onPause,
  onRepeat,
  onRestart,
  onResume,
}: PreviewCardProps) {
  const progressWidth = `${preview?.percentageComplete ?? 0}%`;
  const positionLabel = preview?.globalChunkIndex ? 'Resume at %' : 'Start at %';

  return (
    <article className="panel panel--preview">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Preview</p>
          <h2>Current display position</h2>
        </div>
        <div className="stat-badge">
          <strong>{preview?.percentageComplete ?? 0}%</strong>
          <span>completed</span>
        </div>
      </div>

      <div className="progress-strip">
        <div className="progress-strip__fill" style={{width: progressWidth}} />
      </div>

      {preview ? (
        <>
          <div className="preview-meta">
            <div>
              <span className="meta-label">Chapter</span>
              <strong>{preview.currentChapterTitle || `Chapter ${preview.chapterIndex + 1}`}</strong>
            </div>
            <div>
              <span className="meta-label">Chunk</span>
              <strong>
                {preview.globalChunkIndex + 1} / {preview.totalChunks}
              </strong>
            </div>
            <div>
              <span className="meta-label">Sections</span>
              <strong>{preview.totalChapters}</strong>
            </div>
          </div>

          <div className="teleprompter-preview">
            <p>{preview.currentChunk || 'No chunk ready yet.'}</p>
          </div>
        </>
      ) : (
        <div className="empty-inline">Load a script to populate the teleprompter preview and controls.</div>
      )}

      <div className="percentage-jump">
        <label className="field">
          <span className="field__label">{positionLabel}</span>
          <input
            className="input"
            inputMode="numeric"
            max={100}
            min={0}
            onChange={(event) => onChangePercentage(event.target.value)}
            placeholder="Optional"
            type="number"
            value={percentageInput}
          />
        </label>
        <button className="button button--ghost" disabled={busy || !preview} onClick={() => void onJumpToPercentage()}>
          Set position
        </button>
      </div>

      <div className="button-grid">
        <button className="button button--primary" disabled={busy || !preview} onClick={() => void onResume()}>
          Resume
        </button>
        <button className="button" disabled={busy || !preview} onClick={() => void onPause()}>
          Pause
        </button>
        <button className="button" disabled={busy || !preview} onClick={() => void onRestart()}>
          Restart
        </button>
        <button className="button" disabled={busy || !preview} onClick={() => void onRepeat()}>
          Repeat
        </button>
        <button className="button" disabled={busy || !preview} onClick={() => void onNextChapter()}>
          Next chapter
        </button>
        <button className="button button--danger" disabled={busy || !preview} onClick={() => void onFinish()}>
          Finish
        </button>
      </div>
    </article>
  );
}
