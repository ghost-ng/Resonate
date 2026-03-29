import { useEffect, useState, useCallback } from 'react';
import type { TranscriptWithSegments, SummaryWithActions } from '../../../shared/types/ipc.types';
import { useWorkspaceStore } from '../../stores/workspace.store';
import WorkspaceCard from './WorkspaceCard';
import TranscriptCardContent from './cards/TranscriptCardContent';
import SummaryCardContent from './cards/SummaryCardContent';
import ActionItemsCardContent from './cards/ActionItemsCardContent';
import CustomTaskCardContent from './cards/CustomTaskCardContent';
import Modal from '../shared/Modal';

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
  const updateCard = useWorkspaceStore((s) => s.updateCard);

  // Add card modal
  const [showAddCard, setShowAddCard] = useState(false);
  const [newCardName, setNewCardName] = useState('');

  // Drag state
  const [dragSourceId, setDragSourceId] = useState<number | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);

  useEffect(() => {
    fetchCards(recordingId);
    fetchHighlights(recordingId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordingId]);

  const handleAddCard = useCallback(() => {
    const name = newCardName.trim();
    if (!name) return;
    addCustomCard(recordingId, name);
    setNewCardName('');
    setShowAddCard(false);
  }, [newCardName, recordingId, addCustomCard]);

  // When a card is dropped on another, swap their grid positions
  const handleDragEnd = useCallback(() => {
    if (dragSourceId != null && dragOverId != null && dragSourceId !== dragOverId) {
      const sourceCard = cards.find((c) => c.id === dragSourceId);
      const targetCard = cards.find((c) => c.id === dragOverId);
      if (sourceCard && targetCard) {
        // Swap grid positions
        updateCard(sourceCard.id, {
          grid_col: targetCard.grid_col,
          grid_row: targetCard.grid_row,
          grid_w: targetCard.grid_w,
          grid_h: targetCard.grid_h,
        }, recordingId);
        updateCard(targetCard.id, {
          grid_col: sourceCard.grid_col,
          grid_row: sourceCard.grid_row,
          grid_w: sourceCard.grid_w,
          grid_h: sourceCard.grid_h,
        }, recordingId);
      }
    }
    setDragSourceId(null);
    setDragOverId(null);
  }, [dragSourceId, dragOverId, cards, updateCard, recordingId]);

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
          <WorkspaceCard
            key={card.id}
            card={card}
            recordingId={recordingId}
            onDragStart={(id) => setDragSourceId(id)}
            onDragOver={(id) => setDragOverId(id)}
            onDragEnd={handleDragEnd}
          >
            {renderCardContent(card)}
          </WorkspaceCard>
        ))}
      </div>

      <div className="mt-3 flex justify-end">
        <button
          onClick={() => { setNewCardName(''); setShowAddCard(true); }}
          className="rounded-card border border-border bg-surface-2 px-3 py-1.5 text-sm text-text-muted transition-colors hover:bg-surface-3 hover:text-text"
        >
          + Add Card
        </button>
      </div>

      {/* Add Card Modal */}
      <Modal
        isOpen={showAddCard}
        title="New Card"
        onClose={() => setShowAddCard(false)}
        footer={
          <>
            <button
              className="rounded-lg px-4 py-2 text-sm text-text-muted hover:bg-surface-2"
              onClick={() => setShowAddCard(false)}
            >
              Cancel
            </button>
            <button
              className="rounded-lg bg-accent px-4 py-2 text-sm text-white hover:opacity-90"
              onClick={handleAddCard}
            >
              Create
            </button>
          </>
        }
      >
        <input
          type="text"
          value={newCardName}
          onChange={(e) => setNewCardName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddCard()}
          autoFocus
          className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text outline-none focus:border-accent"
          placeholder="Card name..."
        />
      </Modal>
    </div>
  );
}
