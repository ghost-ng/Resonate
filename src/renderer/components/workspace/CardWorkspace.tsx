import { useEffect, useState, useCallback, useRef } from 'react';
import type { TranscriptWithSegments, SummaryWithActions } from '../../../shared/types/ipc.types';
import type { WorkspaceCard as CardType } from '../../../shared/types/database.types';
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
  const storeCards = useWorkspaceStore((s) => s.cards[recordingId] ?? []);
  const highlights = useWorkspaceStore((s) => s.highlights[recordingId] ?? []);
  const fetchCards = useWorkspaceStore((s) => s.fetchCards);
  const fetchHighlights = useWorkspaceStore((s) => s.fetchHighlights);
  const addCustomCard = useWorkspaceStore((s) => s.addCustomCard);
  const updateCard = useWorkspaceStore((s) => s.updateCard);

  // Local card order for live drag reordering
  const [cards, setCards] = useState<CardType[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const dragNodeRef = useRef<HTMLDivElement | null>(null);

  // Sync store cards to local state
  useEffect(() => {
    setCards(storeCards);
  }, [storeCards]);

  // Add card modal
  const [showAddCard, setShowAddCard] = useState(false);
  const [newCardName, setNewCardName] = useState('');

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

  // Drag handlers — reorder cards in real-time
  const handleDragStart = useCallback((index: number, el: HTMLDivElement) => {
    setDragIndex(index);
    dragNodeRef.current = el;
    // Slight delay so the drag image captures correctly
    setTimeout(() => {
      if (dragNodeRef.current) dragNodeRef.current.style.opacity = '0.4';
    }, 0);
  }, []);

  const handleDragEnter = useCallback((index: number) => {
    if (dragIndex === null || dragIndex === index) return;
    setOverIndex(index);

    // Reorder the local cards array
    setCards((prev) => {
      const updated = [...prev];
      const dragged = updated.splice(dragIndex, 1)[0];
      updated.splice(index, 0, dragged);
      return updated;
    });
    setDragIndex(index); // Update drag index to new position
  }, [dragIndex]);

  const handleDragEnd = useCallback(() => {
    if (dragNodeRef.current) dragNodeRef.current.style.opacity = '1';
    dragNodeRef.current = null;
    setDragIndex(null);
    setOverIndex(null);

    // Persist the new order: assign grid positions based on array order
    cards.forEach((card, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      if (card.grid_col !== col || card.grid_row !== row) {
        updateCard(card.id, { grid_col: col, grid_row: row, grid_w: 1, grid_h: 1 }, recordingId);
      }
    });
  }, [cards, updateCard, recordingId]);

  const renderCardContent = (card: CardType) => {
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
          gridAutoRows: 'minmax(120px, auto)',
        }}
      >
        {cards.map((card, index) => (
          <WorkspaceCard
            key={card.id}
            card={card}
            recordingId={recordingId}
            index={index}
            isDragOver={overIndex === index}
            onDragStart={handleDragStart}
            onDragEnter={handleDragEnter}
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
