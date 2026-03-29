import { Component, useEffect, type ReactNode } from 'react';
import AppShell from './components/layout/AppShell';
import { useNotebookStore } from './stores/notebook.store';
import { useRecordingStore } from './stores/recording.store';
import { useSettingsStore } from './stores/settings.store';

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, color: '#ff5252', fontFamily: 'monospace', fontSize: 13, background: '#0f1117', height: '100vh', overflow: 'auto' }}>
          <h1 style={{ color: '#e4e6ef', marginBottom: 16 }}>UI Error</h1>
          <pre style={{ whiteSpace: 'pre-wrap', marginBottom: 16 }}>{this.state.error.message}</pre>
          <pre style={{ whiteSpace: 'pre-wrap', color: '#8b90a5', fontSize: 11 }}>{this.state.error.stack}</pre>
          <button
            onClick={() => this.setState({ error: null })}
            style={{ marginTop: 16, padding: '8px 16px', background: '#5b8def', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
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
  useEffect(() => {
    // Load all persistent data on app start
    useNotebookStore.getState().fetchNotebooks();
    useRecordingStore.getState().fetchRecordings();
    useSettingsStore.getState().fetchSettings();
    useSettingsStore.getState().fetchPromptProfiles();
  }, []);

  return <AppShell />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppInitializer />
    </ErrorBoundary>
  );
}
