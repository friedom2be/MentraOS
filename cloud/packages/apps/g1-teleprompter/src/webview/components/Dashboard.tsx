import {useState} from 'react';

import type {AppStateResponse} from '../../domain/types';
import type {AppStateController} from '../hooks/useAppState';

interface DashboardProps {
  app: AppStateController;
  state: AppStateResponse;
}

export function Dashboard({app, state}: DashboardProps) {
  const [percentageInput, setPercentageInput] = useState('');
  const activeScript = state.activeScript;
  const preview = state.preview;

  async function handleJump(): Promise<void> {
    if (!percentageInput.trim()) {
      return;
    }

    await app.applyControl('jump_to_percent', Number.parseFloat(percentageInput));
  }

  if (!activeScript || !preview) {
    return (
      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Dashboard</p>
            <h2>No active script yet</h2>
          </div>
        </div>
        <p className="muted-copy">
          Send selected text, a web article URL, a PDF, or a DRM-free ePub from your iPhone Shortcut to prepare the
          next teleprompter script.
        </p>
      </section>
    );
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h2>{activeScript.sourceTitle}</h2>
        </div>
        <div className="pill-row">
          <span className="stat-pill">{preview.percentageComplete}% completed</span>
          {activeScript.isSummarized ? <span className="stat-pill stat-pill-accent">Summarized</span> : null}
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-label">Chapter</span>
          <strong>{preview.currentChapterTitle || 'Full Script'}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">Saved chunk</span>
          <strong>
            {preview.globalChunkIndex + 1} / {preview.totalChunks}
          </strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">Playback speed</span>
          <strong>{state.profile.scrollSpeed} WPM</strong>
        </div>
      </div>

      <div className="jump-panel">
        <label className="field" htmlFor="resume-percentage">
          <span>Start at % / Resume at %</span>
          <input
            id="resume-percentage"
            inputMode="decimal"
            max={100}
            min={0}
            onChange={(event) => setPercentageInput(event.target.value)}
            placeholder="Optional, 0-100"
            type="number"
            value={percentageInput}
          />
        </label>
        <button className="button button-secondary" disabled={!percentageInput.trim()} onClick={() => void handleJump()} type="button">
          Set position
        </button>
      </div>
      <p className="field-hint">
        Leave this blank to keep today&apos;s default behavior: resume from the saved position or start at the beginning
        as usual.
      </p>

      <div className="button-row">
        <button className="button button-primary" onClick={() => void app.applyControl('resume')} type="button">
          Resume
        </button>
        <button className="button button-secondary" onClick={() => void app.applyControl('pause')} type="button">
          Pause
        </button>
        <button className="button button-secondary" onClick={() => void app.applyControl('restart')} type="button">
          Restart
        </button>
        <button className="button button-secondary" onClick={() => void app.applyControl('next_chapter')} type="button">
          Next chapter
        </button>
        <button className="button button-danger" onClick={() => void app.applyControl('finished')} type="button">
          Finished
        </button>
      </div>

      <div className="preview-copy">{preview.currentChunk || 'Current teleprompter chunk unavailable.'}</div>
      {app.busy ? <div className="notice">{app.busy}</div> : null}
    </section>
  );
}
