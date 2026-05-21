import type {ActiveScript, PreviewState} from '../../domain/types';

interface PreviewCardProps {
  activeScript: ActiveScript | null;
  preview: PreviewState;
}

export function PreviewCard({activeScript, preview}: PreviewCardProps) {
  return (
    <section className="panel panel-preview">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Preview before playback</p>
          <h2>{activeScript?.sourceTitle || 'Ready to review'}</h2>
        </div>
        <div className="stat-pill">{preview.percentageComplete}% completed</div>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-label">Current chapter</span>
          <strong>{preview.currentChapterTitle || 'Full Script'}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">Chunk position</span>
          <strong>
            {preview.globalChunkIndex + 1} / {preview.totalChunks}
          </strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">Source type</span>
          <strong>{activeScript?.sourceType.toUpperCase() || 'TEXT'}</strong>
        </div>
      </div>

      <div className="preview-copy">{preview.currentChunk || 'Load content from the Shortcut to see a preview here.'}</div>
    </section>
  );
}
