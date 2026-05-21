import {useMemo, useState} from 'react';

import type {AppStateController} from '../hooks/useAppState';

interface SetupWizardProps {
  app: AppStateController;
}

export function SetupWizard({app}: SetupWizardProps) {
  const [step, setStep] = useState(0);
  const [setupToken, setSetupToken] = useState<string | null>(app.token);
  const [shortcutUrl, setShortcutUrl] = useState<string | null>(null);
  const canVerify = useMemo(() => Boolean(setupToken), [setupToken]);

  const steps = ['Welcome', 'Generate token', 'Install shortcut', 'Test connection'];

  async function handleGenerateToken(): Promise<void> {
    const response = await app.initSetup();
    setSetupToken(response.token);
    setShortcutUrl(response.shortcutUrl);
    setStep(1);
  }

  async function handleVerify(): Promise<void> {
    if (!setupToken) {
      return;
    }

    await app.verifySetup(setupToken);
  }

  return (
    <main className="shell shell-centered">
      <section className="hero-panel setup-panel">
        <p className="eyebrow">First-run setup</p>
        <h1>Connect your iPhone Shortcut once</h1>
        <p className="hero-copy">
          This guided flow gives the Shortcut a personal bearer token so you can send text, URLs, PDFs, and ePub files
          into the teleprompter from anywhere.
        </p>

        <ol className="step-list" start={1}>
          {steps.map((label, index) => (
            <li className={index <= step ? 'step-item step-item-active' : 'step-item'} key={label}>
              <span>{label}</span>
            </li>
          ))}
        </ol>

        <div className="card-stack">
          <article className="card">
            <h2>1. Welcome</h2>
            <p>
              The app needs a one-time Shortcut connection. After that, your dashboard keeps the saved teleprompter
              position and settings until you choose to reset them.
            </p>
            <button className="button button-primary" onClick={() => setStep(0)} type="button">
              Review intro
            </button>
          </article>

          <article className="card">
            <h2>2. Generate token</h2>
            <p>The token is shown once here, then stored only as a server-side hash.</p>
            <div className="token-box">{setupToken || 'Generate a token to continue.'}</div>
            <div className="button-row">
              <button className="button button-primary" onClick={() => void handleGenerateToken()} type="button">
                Generate token
              </button>
              <button
                className="button button-secondary"
                disabled={!setupToken}
                onClick={() => setupToken && void navigator.clipboard.writeText(setupToken)}
                type="button">
                Copy token
              </button>
            </div>
          </article>

          <article className="card">
            <h2>3. Install Shortcut</h2>
            <p>Open the prefilled Shortcut template with your token embedded, then save it on your iPhone.</p>
            <div className="button-row">
              <a className="button button-primary" href={shortcutUrl || '#'} target="_self">
                Open in Shortcuts
              </a>
              <button className="button button-secondary" onClick={() => setStep(2)} type="button">
                I saved it
              </button>
            </div>
          </article>

          <article className="card">
            <h2>4. Test connection</h2>
            <p>Run the test action from the Shortcut, then confirm here to finish setup and unlock the dashboard.</p>
            <button
              className="button button-primary"
              disabled={!canVerify}
              onClick={() => void handleVerify()}
              type="button">
              I ran the Shortcut test
            </button>
          </article>
        </div>

        {app.error ? <div className="notice notice-error">{app.error}</div> : null}
        {app.busy ? <div className="notice">{app.busy}</div> : null}
      </section>
    </main>
  );
}
