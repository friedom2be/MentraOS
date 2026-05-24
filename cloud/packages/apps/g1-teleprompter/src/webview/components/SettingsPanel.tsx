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

interface SettingsPayloadResult {
  error: string | null;
  payload: {
    scrollSpeed: number;
    summarizeArticles: boolean;
    summarizeEpubs: boolean;
    summarizePdfs: boolean;
  } | null;
}

export function SettingsPanel({busy, profile, onUpdateSettings}: SettingsPanelProps) {
  const [scrollSpeed, setScrollSpeed] = useState(String(profile.scrollSpeed));
  const [summarizeArticles, setSummarizeArticles] = useState(profile.summarizeArticles);
  const [summarizeEpubs, setSummarizeEpubs] = useState(profile.summarizeEpubs);
  const [summarizePdfs, setSummarizePdfs] = useState(profile.summarizePdfs);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const syncKey = getSettingsSyncKey(profile);
  const settingsPayload = buildSettingsPayload({
    scrollSpeed,
    summarizeArticles,
    summarizeEpubs,
    summarizePdfs,
  });
  const normalizedScrollSpeed = settingsPayload.payload?.scrollSpeed ?? null;

  useEffect(() => {
    if (isEditing) {
      return;
    }

    setScrollSpeed(String(profile.scrollSpeed));
    setSummarizeArticles(profile.summarizeArticles);
    setSummarizeEpubs(profile.summarizeEpubs);
    setSummarizePdfs(profile.summarizePdfs);
    setSaveMessage(null);
  }, [isEditing, profile.scrollSpeed, profile.summarizeArticles, profile.summarizeEpubs, profile.summarizePdfs, syncKey]);

  const hasUnsavedChanges =
    normalizedScrollSpeed !== profile.scrollSpeed ||
    summarizeArticles !== profile.summarizeArticles ||
    summarizeEpubs !== profile.summarizeEpubs ||
    summarizePdfs !== profile.summarizePdfs;

  const canSubmit = normalizedScrollSpeed !== null && hasUnsavedChanges;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!settingsPayload.payload) {
      setSaveMessage(settingsPayload.error);
      return;
    }

    setSaveMessage('Saving...');

    await onUpdateSettings(settingsPayload.payload);

    setIsEditing(false);
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
            pattern="[0-9]*"
            onChange={(event) => {
              setIsEditing(true);
              setSaveMessage(null);
              setScrollSpeed(event.target.value);
            }}
            type="text"
            value={scrollSpeed}
          />
        </label>

        <div className="toggle-list">
          <Toggle
            checked={summarizeArticles}
            label="Summarize URL articles"
            onChange={(checked) => {
              setIsEditing(true);
              setSaveMessage(null);
              setSummarizeArticles(checked);
            }}
          />
          <Toggle
            checked={summarizeEpubs}
            label="Summarize EPUBs"
            onChange={(checked) => {
              setIsEditing(true);
              setSaveMessage(null);
              setSummarizeEpubs(checked);
            }}
          />
          <Toggle
            checked={summarizePdfs}
            label="Summarize PDFs"
            onChange={(checked) => {
              setIsEditing(true);
              setSaveMessage(null);
              setSummarizePdfs(checked);
            }}
          />
        </div>

        <div className="stack stack--inline">
          <button className="button button--primary" disabled={busy || !canSubmit} type="submit">
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

export function normalizeScrollSpeed(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (!/^\d+$/.test(trimmed)) {
    return null;
  }

  const nextValue = Number(trimmed);
  if (!Number.isFinite(nextValue)) {
    return null;
  }

  return Math.min(MAX_SCROLL_SPEED, Math.max(MIN_SCROLL_SPEED, Math.round(nextValue)));
}

export function buildSettingsPayload(input: {
  scrollSpeed: string;
  summarizeArticles: boolean;
  summarizeEpubs: boolean;
  summarizePdfs: boolean;
}): SettingsPayloadResult {
  const normalizedScrollSpeed = normalizeScrollSpeed(input.scrollSpeed);
  if (normalizedScrollSpeed === null) {
    return {
      error: 'Enter a WPM between 60 and 600.',
      payload: null,
    };
  }

  return {
    error: null,
    payload: {
      scrollSpeed: normalizedScrollSpeed,
      summarizeArticles: input.summarizeArticles,
      summarizeEpubs: input.summarizeEpubs,
      summarizePdfs: input.summarizePdfs,
    },
  };
}
