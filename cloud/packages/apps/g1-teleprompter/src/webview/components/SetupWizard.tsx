import {useEffect, useState} from 'react';

interface SetupWizardProps {
  busy: boolean;
  error: string | null;
  generatedToken: string | null;
  savedToken: string | null;
  shortcutUrl: string | null;
  onCreateToken: () => Promise<void>;
  onRefreshState: () => Promise<void>;
  onVerifyToken: (token?: string) => Promise<void>;
}

export function SetupWizard({
  busy,
  error,
  generatedToken,
  savedToken,
  shortcutUrl,
  onCreateToken,
  onRefreshState,
  onVerifyToken,
}: SetupWizardProps) {
  const [tokenInput, setTokenInput] = useState(savedToken || '');

  useEffect(() => {
    setTokenInput(generatedToken || savedToken || '');
  }, [generatedToken, savedToken]);

  return (
    <section className="setup-shell">
      <div className="panel panel--hero">
        <p className="eyebrow">Task 6 Webview</p>
        <h1>Set up your G1 teleprompter dashboard</h1>
        <p className="lede">
          This screen mints a one-time setup token, hands it off to your shortcut, and unlocks the authenticated
          dashboard for loading and controlling scripts.
        </p>
      </div>

      <div className="setup-grid">
        <article className="panel">
          <h2>1. Generate or recover a token</h2>
          <p className="muted">
            The first setup token is shown once. If you already have it, paste it below. If not, mint it here and keep
            this tab open.
          </p>

          <div className="stack">
            <button className="button button--primary" disabled={busy} onClick={() => void onCreateToken()}>
              Show setup token
            </button>

            <label className="field">
              <span className="field__label">Setup token</span>
              <input
                className="input"
                onChange={(event) => setTokenInput(event.target.value)}
                placeholder="Paste or confirm your one-time token"
                value={tokenInput}
              />
            </label>

            {(generatedToken || savedToken) && (
              <div className="token-card">
                <span className="token-card__label">Active token</span>
                <code>{generatedToken || savedToken}</code>
              </div>
            )}
          </div>
        </article>

        <article className="panel">
          <h2>2. Install the setup shortcut</h2>
          <p className="muted">
            The shortcut can receive the token automatically, but you can also continue by verifying the same token
            directly from this dashboard.
          </p>

          {shortcutUrl ? (
            <a className="button button--ghost" href={shortcutUrl}>
              Open setup shortcut
            </a>
          ) : (
            <div className="empty-inline">Generate a token to get the shortcut handoff link.</div>
          )}

          <div className="callout">
            <strong>Shown-once behavior:</strong> if you refresh after `/setup/init`, the server will not mint a second
            token until you reset setup from an authenticated session.
          </div>
        </article>
      </div>

      <div className="setup-actions">
        <button
          className="button button--primary"
          disabled={busy}
          onClick={() => void onVerifyToken(tokenInput || generatedToken || savedToken || undefined)}
        >
          Verify token and continue
        </button>
        <button className="button button--ghost" disabled={busy} onClick={() => void onRefreshState()}>
          Retry current state
        </button>
      </div>

      {error ? <p className="banner banner--error">{error}</p> : null}
    </section>
  );
}
