import {useEffect, useState} from 'react';

import type {AppStateResponse} from '../../domain/types';

interface SettingsPanelProps {
  busy: boolean;
  profile: AppStateResponse['profile'];
  onResetSetup: () => Promise<void>;
  onUpdateSettings: (settings: {
    scrollSpeed?: number;
    summarizeArticles?: boolean;
    summarizeEpubs?: boolean;
    summarizePdfs?: boolean;
    volumeButtonMode?: boolean;
  }) => Promise<void>;
}

export function SettingsPanel({busy, profile, onResetSetup, onUpdateSettings}: SettingsPanelProps) {
  const [scrollSpeed, setScrollSpeed] = useState(String(profile.scrollSpeed));
  const [summarizeArticles, setSummarizeArticles] = useState(profile.summarizeArticles);
  const [summarizeEpubs, setSummarizeEpubs] = useState(profile.summarizeEpubs);
  const [summarizePdfs, setSummarizePdfs] = useState(profile.summarizePdfs);
  const [volumeButtonMode, setVolumeButtonMode] = useState(profile.volumeButtonMode);

  useEffect(() => {
    setScrollSpeed(String(profile.scrollSpeed));
    setSummarizeArticles(profile.summarizeArticles);
    setSummarizeEpubs(profile.summarizeEpubs);
    setSummarizePdfs(profile.summarizePdfs);
    setVolumeButtonMode(profile.volumeButtonMode);
  }, [profile]);

  return (
    <aside className="panel panel--settings">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Settings</p>
          <h2>Reading defaults</h2>
        </div>
      </div>

      <label className="field">
        <span className="field__label">Scroll speed (WPM)</span>
        <input
          className="input"
          inputMode="numeric"
          max={220}
          min={60}
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
        <Toggle checked={summarizeEpubs} label="Summarize EPUBs" onChange={(checked) => setSummarizeEpubs(checked)} />
        <Toggle checked={summarizePdfs} label="Summarize PDFs" onChange={(checked) => setSummarizePdfs(checked)} />
        <Toggle
          checked={volumeButtonMode}
          label="Volume buttons step chunks"
          onChange={(checked) => setVolumeButtonMode(checked)}
        />
      </div>

      <div className="stack stack--inline">
        <button
          className="button button--primary"
          disabled={busy}
          onClick={() =>
            void onUpdateSettings({
              scrollSpeed: Number(scrollSpeed),
              summarizeArticles,
              summarizeEpubs,
              summarizePdfs,
              volumeButtonMode,
            })
          }
        >
          Save settings
        </button>
        <button className="button button--ghost" disabled={busy} onClick={() => void onResetSetup()}>
          Reset setup
        </button>
      </div>
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
