import { useEffect } from 'react';
import type { TranscriptWithSegments, SummaryWithActions } from '../../../shared/types/ipc.types';
import { useWorkspaceStore } from '../../stores/workspace.store';
import WorkspaceCard from './WorkspaceCard';
import TranscriptCardContent from './cards/TranscriptCardContent';
import SummaryCardContent from './cards/SummaryCardContent';
import ActionItemsCardContent from './cards/ActionItemsCardContent';
import CustomTaskCardContent from './cards/CustomTaskCardContent';

interface Props {
  recordingId: number;
  transcript: TranscriptWithSegments | null;
  summary: SummaryWithActions | null;
}

export default function CardWorkspace({ recordingId, transcript, summary }: Props) {
  const cards = useWorkspaceStore((s) => s.cards[recordingId] ?? []);
  const highlights = useWorkspaceStore((s) => s.highlights[recordingId] ?? []);
  const fetchCards = useWorkspaceStore((s) => s.fetchCards);
  const fetchHighlights = useWorkspaceStore((s) => s.fetchHighlights);
  const addCustomCard = useWorkspaceStore((s) => s.addCustomCard);

  useEffect(() => {
    fetchCards(recordingId);
    fetchHighlights(recordingId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordingId]);

  const handleAddCard = () => {
    const name = window.prompt('Card name:');
    if (name?.trim()) {
      addCustomCard(recordingId, name.trim());
    }
  };

  const renderCardContent = (card: (typeof cards)[0]) => {
    switch (card.card_type) {
      case 'transcript':
        return (
          <TranscriptCardContent
            transcript={transcript}
            highlights={highlights}
            recordingId={recordingId}
          />
        );
      case 'summary':
        return <SummaryCardContent summary={summary} />;
      case 'action_items':
        return <ActionItemsCardContent items={summary?.action_items ?? []} />;
      case 'custom_task':
        return <CustomTaskCardContent cardId={card.id} recordingId={recordingId} />;
      default:
        return null;
    }
  };

  return (
    <div>
      <div
        className="grid gap-[10px]"
        style={{
          gridTemplateColumns: 'repeat(2, 1fr)',
          gridAutoRows: 'minmax(150px, auto)',
        }}
      >
        {cards.map((card) => (
          <WorkspaceCard key={card.id} card={card} recordingId={recordingId}>
            {renderCardContent(card)}
          </WorkspaceCard>
        ))}
      </div>

      <div className="mt-3 flex justify-end">
        <button
          onClick={handleAddCard}
          className="rounded-card border border-border bg-surface-2 px-3 py-1.5 text-sm text-text-muted transition-colors hover:bg-surface-3"
        >
          + Add Card
        </button>
      </div>
    </div>
  );
}
