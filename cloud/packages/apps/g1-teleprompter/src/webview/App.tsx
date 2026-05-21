import './globals.css';

import {Dashboard} from './components/Dashboard';
import {PreviewCard} from './components/PreviewCard';
import {SettingsPanel} from './components/SettingsPanel';
import {SetupWizard} from './components/SetupWizard';
import {useAppState} from './hooks/useAppState';

export function App() {
  const app = useAppState();

  if (!app.token) {
    return <SetupWizard app={app} />;
  }

  if (!app.state) {
    return (
      <main className="shell">
        <section className="hero-panel">
          <p className="eyebrow">G1 Teleprompter</p>
          <h1>Loading your teleprompter workspace</h1>
          <p className="hero-copy">{app.error || 'Fetching your saved script, playback position, and settings.'}</p>
        </section>
      </main>
    );
  }

  if (!app.state.profile.setupComplete) {
    return <SetupWizard app={app} />;
  }

  return (
    <main className="shell">
      <section className="hero-panel">
        <p className="eyebrow">MentraOS Mini-App</p>
        <h1>G1 Teleprompter</h1>
        <p className="hero-copy">
          Resume from your saved chunk position, verify the next section before playback, and keep your default HUD
          behavior steady until you choose to reposition it.
        </p>
      </section>

      {app.error ? <div className="notice notice-error">{app.error}</div> : null}
      {app.state.preview ? <PreviewCard activeScript={app.state.activeScript} preview={app.state.preview} /> : null}
      <Dashboard app={app} state={app.state} />
      <SettingsPanel app={app} profile={app.state.profile} />
    </main>
  );
}
