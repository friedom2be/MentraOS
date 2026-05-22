import {useState} from 'react';

import type {ControlAction} from '../../api/request-parsing';
import type {AppStateResponse} from '../../domain/types';
import type {LoadRequestPayload} from '../hooks/useAppState';
import {PreviewCard} from './PreviewCard';
import {SettingsPanel} from './SettingsPanel';

interface DashboardProps {
  appState: AppStateResponse;
  busy: boolean;
  error: string | null;
  onLoadScript: (payload: LoadRequestPayload) => Promise<void>;
  onRefreshState: () => Promise<void>;
  onSendControl: (action: ControlAction, percentage?: number) => Promise<void>;
  onUpdateSettings: (settings: {
    scrollSpeed?: number;
    summarizeArticles?: boolean;
    summarizeEpubs?: boolean;
    summarizePdfs?: boolean;
    volumeButtonMode?: boolean;
  }) => Promise<void>;
}

type SourceMode = 'text' | 'url' | 'file';

export function Dashboard({
  appState,
  busy,
  error,
  onLoadScript,
  onRefreshState,
  onSendControl,
  onUpdateSettings,
}: DashboardProps) {
  const [sourceMode, setSourceMode] = useState<SourceMode>('text');
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [shouldSummarize, setShouldSummarize] = useState(false);
  const [percentageInput, setPercentageInput] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const percentageValue = parsePercentageInput(percentageInput);

  async function handleLoad(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError(null);

    try {
      switch (sourceMode) {
        case 'text':
          if (!text.trim()) {
            throw new Error('Add some text before loading the teleprompter.');
          }

          await onLoadScript({
            sourceType: 'text',
            title: title.trim() || undefined,
            text,
            shouldSummarize,
          });
          break;
        case 'url':
          if (!url.trim()) {
            throw new Error('Enter a URL to ingest.');
          }

          await onLoadScript({
            sourceType: 'url',
            url: url.trim(),
            shouldSummarize,
          });
          break;
        case 'file':
          if (!file) {
            throw new Error('Choose a file first.');
          }

          await onLoadScript({
            sourceType: getFileSourceType(file.name),
            filename: file.name,
            base64Data: await fileToBase64(file),
            shouldSummarize,
          });
          break;
      }
    } catch (nextError) {
      setLocalError(nextError instanceof Error ? nextError.message : 'Unable to load this source.');
    }
  }

  async function handleJumpToPercentage() {
    if (percentageValue === null) {
      setLocalError('Enter a percentage between 0 and 100.');
      return;
    }

    setLocalError(null);
    await onSendControl('jump_to_percent', percentageValue);
  }

  async function handleResume() {
    if (percentageValue !== null) {
      await onSendControl('jump_to_percent', percentageValue);
    }

    await onSendControl('resume');
  }

  return (
    <section className="dashboard-shell">
      <header className="dashboard-hero panel panel--hero">
        <div>
          <p className="eyebrow">Mentra HUD Reader</p>
          <h1>{appState.activeScript?.sourceTitle || 'Load a script to begin'}</h1>
          <p className="lede">
            Percentage progress is tracked against the final displayed chunk sequence, so resume points stay aligned
            across plain text, URLs, PDFs, and EPUB chapter imports.
          </p>
        </div>

        <div className="hero-metrics">
          <div className="hero-metric">
            <span>Progress</span>
            <strong>{appState.preview?.percentageComplete ?? 0}%</strong>
          </div>
          <div className="hero-metric">
            <span>Chunks</span>
            <strong>{appState.preview?.totalChunks ?? 0}</strong>
          </div>
          <div className="hero-metric">
            <span>WPM</span>
            <strong>{appState.profile.scrollSpeed}</strong>
          </div>
        </div>
      </header>

      <div className="dashboard-grid">
        <div className="dashboard-main">
          <PreviewCard
            busy={busy}
            onChangePercentage={setPercentageInput}
            onFinish={async () => await onSendControl('finished')}
            onJumpToPercentage={handleJumpToPercentage}
            onNextChunk={async () => await onSendControl('advance_chunk')}
            onNextChapter={async () => await onSendControl('next_chapter')}
            onPause={async () => await onSendControl('pause')}
            onPreviousChunk={async () => await onSendControl('rewind_chunk')}
            onRepeat={async () => await onSendControl('repeat')}
            onRestart={async () => await onSendControl('restart')}
            onResume={handleResume}
            percentageInput={percentageInput}
            preview={appState.preview}
          />

          <section className="panel">
            <div className="panel__header">
              <div>
                <p className="eyebrow">Load</p>
                <h2>Bring in the next script</h2>
              </div>
              <button className="button button--ghost" disabled={busy} onClick={() => void onRefreshState()}>
                Refresh state
              </button>
            </div>

            <div className="tab-row">
              <TabButton active={sourceMode === 'text'} label="Text" onClick={() => setSourceMode('text')} />
              <TabButton active={sourceMode === 'url'} label="URL" onClick={() => setSourceMode('url')} />
              <TabButton active={sourceMode === 'file'} label="File" onClick={() => setSourceMode('file')} />
            </div>

            {!appState.activeScript ? (
              <div className="callout">
                <strong>Welcome to Mentra HUD Reader.</strong> Load a script to start reading on your HUD.
              </div>
            ) : null}

            <form className="stack" onSubmit={(event) => void handleLoad(event)}>
              {sourceMode === 'text' ? (
                <>
                  <label className="field">
                    <span className="field__label">Title</span>
                    <input className="input" onChange={(event) => setTitle(event.target.value)} value={title} />
                  </label>
                  <label className="field">
                    <span className="field__label">Script text</span>
                    <textarea
                      className="textarea"
                      onChange={(event) => setText(event.target.value)}
                      placeholder="Paste a speech, outline, or talking points."
                      rows={10}
                      value={text}
                    />
                  </label>
                </>
              ) : null}

              {sourceMode === 'url' ? (
                <label className="field">
                  <span className="field__label">Article URL</span>
                  <input
                    className="input"
                    onChange={(event) => setUrl(event.target.value)}
                    placeholder="https://example.com/story"
                    type="url"
                    value={url}
                  />
                </label>
              ) : null}

              {sourceMode === 'file' ? (
                <label className="field">
                  <span className="field__label">File upload</span>
                  <input
                    accept=".pdf,.epub,.txt,.md"
                    className="input input--file"
                    onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                    type="file"
                  />
                </label>
              ) : null}

              <label className="toggle">
                <span>Summarize before chunking</span>
                <input checked={shouldSummarize} onChange={(event) => setShouldSummarize(event.target.checked)} type="checkbox" />
              </label>

              <button className="button button--primary" disabled={busy} type="submit">
                Load into preview
              </button>
            </form>
          </section>
        </div>

        <div className="dashboard-side">
          <SettingsPanel busy={busy} onUpdateSettings={onUpdateSettings} profile={appState.profile} />
        </div>
      </div>

      {error || localError ? <p className="banner banner--error">{error || localError}</p> : null}
    </section>
  );
}

interface TabButtonProps {
  active: boolean;
  label: string;
  onClick: () => void;
}

function TabButton({active, label, onClick}: TabButtonProps) {
  return (
    <button className={`tab-button${active ? ' tab-button--active' : ''}`} onClick={onClick} type="button">
      {label}
    </button>
  );
}

function getFileSourceType(fileName: string): 'pdf' | 'epub' | 'txt' | 'md' {
  const extension = fileName.toLowerCase().split('.').pop();

  switch (extension) {
    case 'pdf':
    case 'epub':
    case 'txt':
    case 'md':
      return extension;
    default:
      throw new Error('Unsupported file type. Use PDF, EPUB, TXT, or MD.');
  }
}

async function fileToBase64(file: File): Promise<string> {
  const buffer = new Uint8Array(await file.arrayBuffer());
  let binary = '';

  for (const byte of buffer) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

function parsePercentageInput(value: string): number | null {
  if (!value.trim()) {
    return null;
  }

  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) {
    return null;
  }

  return Math.min(100, Math.max(0, Math.round(numericValue)));
}
