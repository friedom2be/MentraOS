import type {PublicTeleprompterProfile} from '../../domain/types';
import type {AppStateController} from '../hooks/useAppState';

interface SettingsPanelProps {
  app: AppStateController;
  profile: PublicTeleprompterProfile;
}

export function SettingsPanel({app, profile}: SettingsPanelProps) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Settings</p>
          <h2>Playback defaults</h2>
        </div>
      </div>

      <div className="toggle-grid">
        <ToggleRow
          checked={profile.summarizeArticles}
          label="Summarize article URLs by default"
          onChange={(checked) => void app.saveSettings({summarizeArticles: checked})}
        />
        <ToggleRow
          checked={profile.summarizePdfs}
          label="Summarize PDFs by default"
          onChange={(checked) => void app.saveSettings({summarizePdfs: checked})}
        />
        <ToggleRow
          checked={profile.summarizeEpubs}
          label="Summarize ePub files by default"
          onChange={(checked) => void app.saveSettings({summarizeEpubs: checked})}
        />
        <ToggleRow
          checked={profile.volumeButtonMode}
          label="Use volume buttons for manual chunk stepping"
          onChange={(checked) => void app.saveSettings({volumeButtonMode: checked})}
        />
      </div>

      <div className="card card-warning">
        <h3>Re-initialize setup</h3>
        <p>This rotates the token and sends the app back through the setup wizard, which invalidates the saved Shortcut configuration.</p>
        <button
          className="button button-danger"
          onClick={() => {
            if (window.confirm('Re-initialize setup and rotate the Shortcut token?')) {
              void app.resetSetup();
            }
          }}
          type="button">
          Re-initialize setup
        </button>
      </div>
    </section>
  );
}

interface ToggleRowProps {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}

function ToggleRow({checked, label, onChange}: ToggleRowProps) {
  return (
    <label className="toggle-row">
      <span>{label}</span>
      <input checked={checked} onChange={(event) => onChange(event.target.checked)} type="checkbox" />
    </label>
  );
}
