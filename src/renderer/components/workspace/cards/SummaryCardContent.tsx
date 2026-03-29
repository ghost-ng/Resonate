import type { SummaryWithActions } from '../../../../shared/types/ipc.types';
import MarkdownRenderer from '../../summary/MarkdownRenderer';

interface Props {
  summary: SummaryWithActions | null;
}

export default function SummaryCardContent({ summary }: Props) {
  if (!summary?.content) {
    return <p className="py-3 text-sm text-text-muted">No summary available.</p>;
  }

  return (
    <div className="pt-2">
      <MarkdownRenderer content={summary.content} />
    </div>
  );
}
