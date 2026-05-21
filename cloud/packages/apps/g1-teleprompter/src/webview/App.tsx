import type {CSSProperties} from 'react';

const styles = {
  page: {
    minHeight: '100vh',
    margin: 0,
    background:
      'radial-gradient(circle at top, rgba(50, 184, 198, 0.18), transparent 35%), linear-gradient(180deg, #07131a 0%, #0d1f28 45%, #132f33 100%)',
    color: '#f4fbfb',
    fontFamily:
      '"SF Pro Display", "Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px 20px',
  },
  card: {
    width: 'min(720px, 100%)',
    borderRadius: '28px',
    border: '1px solid rgba(148, 219, 224, 0.22)',
    background: 'rgba(7, 19, 26, 0.7)',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    padding: '32px',
    backdropFilter: 'blur(16px)',
  },
  eyebrow: {
    display: 'inline-block',
    padding: '6px 12px',
    borderRadius: '999px',
    background: 'rgba(87, 223, 210, 0.12)',
    color: '#8ef0e2',
    fontSize: '12px',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
  },
  title: {
    margin: '18px 0 12px',
    fontSize: 'clamp(32px, 7vw, 56px)',
    lineHeight: 1,
    letterSpacing: '-0.04em',
  },
  body: {
    margin: 0,
    maxWidth: '56ch',
    color: 'rgba(244, 251, 251, 0.82)',
    fontSize: '16px',
    lineHeight: 1.6,
  },
  panelRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px',
    marginTop: '28px',
  },
  panel: {
    borderRadius: '20px',
    border: '1px solid rgba(148, 219, 224, 0.12)',
    background: 'rgba(255, 255, 255, 0.04)',
    padding: '18px',
  },
  panelLabel: {
    margin: '0 0 8px',
    color: '#8ef0e2',
    fontSize: '13px',
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase' as const,
  },
  panelText: {
    margin: 0,
    color: 'rgba(244, 251, 251, 0.74)',
    fontSize: '14px',
    lineHeight: 1.5,
  },
} satisfies Record<string, CSSProperties>;

export function App() {
  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <span style={styles.eyebrow}>Scaffold Ready</span>
        <h1 style={styles.title}>G1 Teleprompter</h1>
        <p style={styles.body}>
          The package wiring is live. Later tasks will add setup flow, ingestion, persistent state, and playback
          controls on top of this shell.
        </p>

        <div style={styles.panelRow}>
          <article style={styles.panel}>
            <p style={styles.panelLabel}>Runtime</p>
            <p style={styles.panelText}>Bun webview server and MentraOS AppServer boot from the same entrypoint.</p>
          </article>

          <article style={styles.panel}>
            <p style={styles.panelLabel}>API</p>
            <p style={styles.panelText}>A health route is available now so the package can be smoke-tested quickly.</p>
          </article>

          <article style={styles.panel}>
            <p style={styles.panelLabel}>Next Up</p>
            <p style={styles.panelText}>SQLite state, setup wizard, and teleprompter playback will land in later tasks.</p>
          </article>
        </div>
      </section>
    </main>
  );
}
