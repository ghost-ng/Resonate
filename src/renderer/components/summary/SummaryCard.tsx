import { useState } from 'react';
import type { SummaryWithActions } from '../../../shared/types/ipc.types';
import MarkdownRenderer from './MarkdownRenderer';
import ActionItemList from './ActionItemList';

interface Props {
  summary: SummaryWithActions;
}

export default function SummaryCard({ summary }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="rounded-card border border-border bg-surface">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center justify-between p-card text-left transition-colors hover:bg-surface-2/50"
      >
        <div className="flex items-center gap-2">
          <svg
            width="10" height="10" viewBox="0 0 10 10" fill="currentColor"
            className={`shrink-0 text-text-muted transition-transform ${collapsed ? '' : 'rotate-90'}`}
          >
            <path d="M3 1l4 4-4 4z" />
          </svg>
          <h3 className="text-md font-semibold text-text">AI Summary</h3>
        </div>
        <span className="text-xs text-text-muted">
          {summary.model_used ?? 'AI'}
        </span>
      </button>
      {!collapsed && (
        <div className="border-t border-border/50 px-card pb-card pt-2">
          {summary.content && <MarkdownRenderer content={summary.content} />}
          {summary.action_items.length > 0 && <ActionItemList items={summary.action_items} />}
        </div>
      )}
    </div>
  );
}
