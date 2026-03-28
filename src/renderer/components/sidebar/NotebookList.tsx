import { useCallback } from 'react';
import { useNotebookStore } from '../../stores/notebook.store';
import { useRecordingStore } from '../../stores/recording.store';
import { useContextMenu } from '../../hooks/useContextMenu';
import { ALL_RECORDINGS_ID } from '../../lib/constants';
import NotebookItem from './NotebookItem';

export default function NotebookList() {
  const notebooks = useNotebookStore((s) => s.notebooks);
  const selectedId = useNotebookStore((s) => s.selectedNotebookId);
  const setSelected = useNotebookStore((s) => s.setSelectedNotebookId);
  const recordings = useRecordingStore((s) => s.recordings);
  const fetchRecordings = useRecordingStore((s) => s.fetchRecordings);
  const ctxMenu = useContextMenu();

  const totalCount = recordings.length;

  function getCount(notebookId: number): number {
    return recordings.filter((r) => r.notebook_id === notebookId).length;
  }

  const handleSelectNotebook = useCallback(
    (id: number) => {
      setSelected(id);
      if (id === ALL_RECORDINGS_ID) {
        fetchRecordings();
      } else {
        fetchRecordings(id);
      }
    },
    [setSelected, fetchRecordings]
  );

  return (
    <div className="flex flex-col gap-0.5 px-2">
      <div className="px-1 pb-1 pt-3 text-xs font-medium uppercase tracking-wider text-text-muted/60">
        Notebooks
      </div>
      <NotebookItem
        icon="📒"
        name="All Recordings"
        count={totalCount}
        active={selectedId === ALL_RECORDINGS_ID}
        onClick={() => handleSelectNotebook(ALL_RECORDINGS_ID)}
      />
      {notebooks.map((nb) => (
        <NotebookItem
          key={nb.id}
          icon={nb.icon}
          name={nb.name}
          count={getCount(nb.id)}
          active={selectedId === nb.id}
          onClick={() => handleSelectNotebook(nb.id)}
          onContextMenu={(e) => ctxMenu.show(e, { type: 'notebook', id: nb.id })}
        />
      ))}
    </div>
  );
}
