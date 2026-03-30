import { useSessionStore } from '../../stores/session.store';

export default function AutoDetectBanner() {
  const detectedApp = useSessionStore((s) => s.detectedApp);
  const showBanner = useSessionStore((s) => s.showAutoDetectBanner);
  const dismissBanner = useSessionStore((s) => s.dismissBanner);
  const startRecording = useSessionStore((s) => s.startRecording);

  if (!showBanner || !detectedApp) return null;

  return (
    <div className="mx-4 mt-3 flex items-center gap-3 rounded-card border border-accent/30 bg-accent/10 px-4 py-2.5 animate-slide-down animate-[banner-pulse_2s_ease-in-out_infinite]">
      <span className="text-lg animate-[beacon_1.5s_ease-in-out_infinite]">📡</span>
      <div className="flex-1">
        <div className="text-sm font-medium text-text">
          {detectedApp} call detected
        </div>
        <div className="text-xs text-text-muted">
          Audio activity from {detectedApp.replace(/\s/g, '')}.exe
        </div>
      </div>
      <button
        onClick={dismissBanner}
        className="rounded-card px-3 py-1 text-sm text-text-muted transition-colors hover:bg-surface-3 hover:text-text"
      >
        Dismiss
      </button>
      <button
        onClick={() => {
          startRecording();
          dismissBanner();
        }}
        className="rounded-card bg-accent px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
      >
        Start Recording
      </button>
    </div>
  );
}
