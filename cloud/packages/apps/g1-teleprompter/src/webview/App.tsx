import {Dashboard} from './components/Dashboard';
import {SetupWizard} from './components/SetupWizard';
import {useAppState} from './hooks/useAppState';

export function App() {
  const app = useAppState();
  const setupComplete = app.appState?.profile.setupComplete ?? false;

  return (
    <main className="app-shell">
      <div className="app-shell__backdrop" />
      <section className="app-shell__frame">
        {!setupComplete ? (
          <SetupWizard
            busy={app.busy}
            error={app.error}
            generatedToken={app.generatedToken}
            savedToken={app.token}
            shortcutUrl={app.shortcutUrl}
            onCreateToken={app.initializeSetup}
            onRefreshState={app.refreshState}
            onVerifyToken={app.verifySetup}
          />
        ) : app.appState ? (
          <Dashboard
            appState={app.appState}
            busy={app.busy}
            error={app.error}
            onLoadScript={app.loadScript}
            onRefreshState={app.refreshState}
            onResetSetup={app.resetSetup}
            onSendControl={app.sendControl}
            onUpdateSettings={app.updateSettings}
          />
        ) : (
          <section className="empty-state">
            <p className="eyebrow">Connecting</p>
            <h1>Loading Mentra HUD Reader</h1>
            <p>{app.error || 'Checking your current setup and playback state.'}</p>
            <button className="button button--primary" disabled={app.busy} onClick={() => void app.refreshState()}>
              Retry
            </button>
          </section>
        )}
      </section>
    </main>
  );
}
