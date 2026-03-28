import type { SummaryWithActions } from '../../../shared/types/ipc.types';
import MarkdownRenderer from './MarkdownRenderer';
import ActionItemList from './ActionItemList';

interface Props {
  summary: SummaryWithActions;
}

export default function SummaryCard({ summary }: Props) {
  return (
    <div className="rounded-card border border-border bg-surface p-card">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-md font-semibold text-text">AI Summary</h3>
        <span className="text-xs text-text-muted">
          {summary.model_used ?? 'AI'}
        </span>
      </div>
      {summary.content && <MarkdownRenderer content={summary.content} />}
      <ActionItemList items={summary.action_items} />
    </div>
  );
}
