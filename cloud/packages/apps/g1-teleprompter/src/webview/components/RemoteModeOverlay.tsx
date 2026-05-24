import {useEffect, useRef, useState} from 'react';

import type {PreviewState} from '../../domain/types';
import {requestRemoteWakeLock, triggerRemoteHaptic, type RemoteWakeLockSentinel} from '../remote-device';

interface RemoteModeOverlayProps {
  busy: boolean;
  isPlaying: boolean;
  preview: PreviewState | null;
  title: string;
  onClose: () => void;
  onNextChunk: () => Promise<void>;
  onPause: () => Promise<void>;
  onPreviousChunk: () => Promise<void>;
  onResume: () => Promise<void>;
}

export function RemoteModeOverlay({
  busy,
  isPlaying,
  preview,
  title,
  onClose,
  onNextChunk,
  onPause,
  onPreviousChunk,
  onResume,
}: RemoteModeOverlayProps) {
  const wakeLockRef = useRef<RemoteWakeLockSentinel | null>(null);
  const [wakeLockStatus, setWakeLockStatus] = useState<'acquired' | 'unavailable' | 'retrying'>('unavailable');

  useEffect(() => {
    let canceled = false;

    async function acquireWakeLock() {
      const nextWakeLock = await requestRemoteWakeLock();
      if (canceled) {
        await releaseWakeLock(nextWakeLock);
        return;
      }

      wakeLockRef.current = nextWakeLock;
      setWakeLockStatus(nextWakeLock ? 'acquired' : 'unavailable');
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !wakeLockRef.current) {
        setWakeLockStatus('retrying');
        void acquireWakeLock();
      }
    };

    void acquireWakeLock();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      canceled = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      const currentWakeLock = wakeLockRef.current;
      wakeLockRef.current = null;
      void releaseWakeLock(currentWakeLock);
    };
  }, []);

  async function handleSuccessfulTap(action: () => Promise<void>) {
    await action();
    triggerRemoteHaptic();
  }

  const statusLabel = isPlaying ? 'Playing' : 'Paused';
  const positionLabel = preview ? `${preview.globalChunkIndex + 1} / ${preview.totalChunks}` : '0 / 0';
  const percentageLabel = `${preview?.percentageComplete ?? 0}%`;
  const wakeLockLabel =
    wakeLockStatus === 'acquired'
      ? 'Screen awake'
      : wakeLockStatus === 'retrying'
        ? 'Reconnecting screen awake...'
        : 'Keep screen on';

  return (
    <section aria-label="Remote Mode" className="remote-mode" role="dialog">
      <div className="remote-mode__chrome">
        <p className="eyebrow">Remote Mode</p>
        <button className="button button--ghost remote-mode__close" onClick={onClose} type="button">
          Exit
        </button>
      </div>

      <div className="remote-mode__status" data-testid="remote-status">
        <h2>{title}</h2>
        <div className="remote-mode__helper">
          <strong data-testid="remote-wake-lock-status">{wakeLockLabel}</strong>
          <p>Keep phone screen on for continuous playback.</p>
        </div>
        <div className="remote-mode__metrics">
          <div>
            <span>Chunk</span>
            <strong>{positionLabel}</strong>
          </div>
          <div>
            <span>Progress</span>
            <strong>{percentageLabel}</strong>
          </div>
          <div>
            <span>Status</span>
            <strong>{statusLabel}</strong>
          </div>
        </div>
      </div>

      <div className="remote-mode__surface">
        <button
          aria-label="Previous chunk remote control"
          className="remote-mode__zone remote-mode__zone--previous"
          disabled={busy || !preview}
          onClick={() => void handleSuccessfulTap(onPreviousChunk)}
          type="button"
        />
        <button
          aria-label="Play or pause remote control"
          className="remote-mode__zone remote-mode__zone--toggle"
          disabled={busy || !preview}
          onClick={() => void handleSuccessfulTap(isPlaying ? onPause : onResume)}
          type="button"
        />
        <button
          aria-label="Next chunk remote control"
          className="remote-mode__zone remote-mode__zone--next"
          disabled={busy || !preview}
          onClick={() => void handleSuccessfulTap(onNextChunk)}
          type="button"
        />
      </div>

      <div className="remote-mode__legend" aria-hidden="true">
        <span>Previous</span>
        <span>{isPlaying ? 'Pause' : 'Play'}</span>
        <span>Next</span>
      </div>
    </section>
  );
}

async function releaseWakeLock(wakeLock: RemoteWakeLockSentinel | null) {
  try {
    await wakeLock?.release?.();
  } catch {}
}
