import AppLogo from '../sidebar/AppLogo';
import SearchBar from '../sidebar/SearchBar';
import NotebookList from '../sidebar/NotebookList';
import RecentRecordings from '../sidebar/RecentRecordings';
import SidebarFooter from '../sidebar/SidebarFooter';

export default function Sidebar() {
  return (
    <aside className="flex h-full w-sidebar flex-col border-r border-border bg-surface">
      <AppLogo />
      <SearchBar />
      <div className="flex-1 overflow-y-auto">
        <NotebookList />
        <RecentRecordings />
      </div>
      <SidebarFooter />
    </aside>
  );
}
