import { Component, useEffect, type ReactNode } from 'react';
import AppShell from './components/layout/AppShell';
import MiniRecordingWindow from './components/recording/MiniRecordingWindow';
import { useNotebookStore } from './stores/notebook.store';
import { useRecordingStore } from './stores/recording.store';
import { useSessionStore } from './stores/session.store';
import { useSettingsStore } from './stores/settings.store';
import { useUiStore } from './stores/ui.store';

const isMiniWindow = new URLSearchParams(window.location.search).get('mini') === 'true';

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, color: '#FF5A5F', fontFamily: 'monospace', fontSize: 13, background: '#0B0F2A', height: '100vh', overflow: 'auto' }}>
          <h1 style={{ color: '#E4E6F0', marginBottom: 16 }}>UI Error</h1>
          <pre style={{ whiteSpace: 'pre-wrap', marginBottom: 16 }}>{this.state.error.message}</pre>
          <pre style={{ whiteSpace: 'pre-wrap', color: '#8B90A5', fontSize: 11 }}>{this.state.error.stack}</pre>
          <button
            onClick={() => this.setState({ error: null })}
            style={{ marginTop: 16, padding: '8px 16px', background: '#5B3DF5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppInitializer() {
  const theme = useUiStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    // Load all persistent data on app start
    useNotebookStore.getState().fetchNotebooks();
    useRecordingStore.getState().fetchRecordings();
    useSettingsStore.getState().fetchSettings();
    useSettingsStore.getState().fetchPromptProfiles();
  }, []);

  useEffect(() => {
    const cleanup = window.electronAPI.on('auto-detect:app-found', (data: { appName: string; processName: string }) => {
      useSessionStore.getState().setDetectedApp(data.appName);
    });
    return cleanup;
  }, []);

  if (isMiniWindow) {
    return <MiniRecordingWindow />;
  }

  return <AppShell />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppInitializer />
    </ErrorBoundary>
  );
}
