import { useUiStore } from '../../stores/ui.store';
import Sidebar from './Sidebar';
import TabBar from './TabBar';
import MainContent from './MainContent';
import StatusBar from './StatusBar';

export default function AppShell() {
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);

  return (
    <div className="flex h-full flex-col bg-bg">
      <div className="flex flex-1 overflow-hidden">
        {!sidebarCollapsed && <Sidebar />}
        <div className="flex flex-1 flex-col overflow-hidden">
          <TabBar />
          <MainContent />
        </div>
      </div>
      <StatusBar />
    </div>
  );
}
