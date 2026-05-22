import {useEffect, useState} from 'react';

import {MAX_SCROLL_SPEED, MIN_SCROLL_SPEED} from '../../api/request-parsing';
import type {AppStateResponse} from '../../domain/types';
import {getSettingsSyncKey} from './settings-sync';

interface SettingsPanelProps {
  busy: boolean;
  profile: AppStateResponse['profile'];
  onUpdateSettings: (settings: {
    scrollSpeed?: number;
    summarizeArticles?: boolean;
    summarizeEpubs?: boolean;
    summarizePdfs?: boolean;
    volumeButtonMode?: boolean;
  }) => Promise<void>;
}

export function SettingsPanel({busy, profile, onUpdateSettings}: SettingsPanelProps) {
  const [scrollSpeed, setScrollSpeed] = useState(String(profile.scrollSpeed));
  const [summarizeArticles, setSummarizeArticles] = useState(profile.summarizeArticles);
  const [summarizeEpubs, setSummarizeEpubs] = useState(profile.summarizeEpubs);
  const [summarizePdfs, setSummarizePdfs] = useState(profile.summarizePdfs);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const syncKey = getSettingsSyncKey(profile);

  useEffect(() => {
    setScrollSpeed(String(profile.scrollSpeed));
    setSummarizeArticles(profile.summarizeArticles);
    setSummarizeEpubs(profile.summarizeEpubs);
    setSummarizePdfs(profile.summarizePdfs);
    setSaveMessage(null);
  }, [syncKey]);

  const hasUnsavedChanges =
    Number(scrollSpeed) !== profile.scrollSpeed ||
    summarizeArticles !== profile.summarizeArticles ||
    summarizeEpubs !== profile.summarizeEpubs ||
    summarizePdfs !== profile.summarizePdfs;

  useEffect(() => {
    if (!hasUnsavedChanges || busy) {
      return;
    }

    setSaveMessage('Saving...');

    const timeoutId = window.setTimeout(() => {
      void onUpdateSettings({
        scrollSpeed: Number(scrollSpeed),
        summarizeArticles,
        summarizeEpubs,
        summarizePdfs,
      });
    }, 450);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [busy, hasUnsavedChanges, onUpdateSettings, scrollSpeed, summarizeArticles, summarizeEpubs, summarizePdfs]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveMessage(null);

    await onUpdateSettings({
      scrollSpeed: Number(scrollSpeed),
      summarizeArticles,
      summarizeEpubs,
      summarizePdfs,
    });

    setSaveMessage('Settings saved');
  }

  return (
    <aside className="panel panel--settings">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Settings</p>
          <h2>Reading defaults</h2>
        </div>
      </div>

      <p className="muted">Saved to app: {profile.scrollSpeed} WPM</p>

      <form className="stack" onSubmit={(event) => void handleSubmit(event)}>
        <label className="field">
          <span className="field__label">Scroll speed (WPM)</span>
          <input
            className="input"
            inputMode="numeric"
            max={MAX_SCROLL_SPEED}
            min={MIN_SCROLL_SPEED}
            onChange={(event) => setScrollSpeed(event.target.value)}
            type="number"
            value={scrollSpeed}
          />
        </label>

        <div className="toggle-list">
          <Toggle
            checked={summarizeArticles}
            label="Summarize URL articles"
            onChange={(checked) => setSummarizeArticles(checked)}
          />
          <Toggle
            checked={summarizeEpubs}
            label="Summarize EPUBs"
            onChange={(checked) => setSummarizeEpubs(checked)}
          />
          <Toggle
            checked={summarizePdfs}
            label="Summarize PDFs"
            onChange={(checked) => setSummarizePdfs(checked)}
          />
        </div>

        <div className="stack stack--inline">
          <button className="button button--primary" disabled={busy || !hasUnsavedChanges} type="submit">
            Save settings
          </button>
        </div>
      </form>

      {saveMessage ? <p className="banner banner--success">{saveMessage}</p> : null}
    </aside>
  );
}

interface ToggleProps {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}

function Toggle({checked, label, onChange}: ToggleProps) {
  return (
    <label className="toggle">
      <span>{label}</span>
      <input checked={checked} onChange={(event) => onChange(event.target.checked)} type="checkbox" />
    </label>
  );
}
