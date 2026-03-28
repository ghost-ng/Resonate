import { useUiStore } from '../../stores/ui.store';
import RecordingView from '../recording/RecordingView';
import SettingsPanel from '../settings/SettingsPanel';

export default function MainContent() {
  const settingsPanelOpen = useUiStore((s) => s.settingsPanelOpen);

  return (
    <div className="flex-1 overflow-hidden bg-bg">
      {settingsPanelOpen ? <SettingsPanel /> : <RecordingView />}
    </div>
  );
}
