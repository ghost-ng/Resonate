import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import type { TranscriptWithSegments, SummaryWithActions } from '../../../shared/types/ipc.types';
import type { WorkspaceCard as CardType } from '../../../shared/types/database.types';
import { useWorkspaceStore } from '../../stores/workspace.store';
import WorkspaceCard from './WorkspaceCard';
import TranscriptCardContent from './cards/TranscriptCardContent';
import SummaryCardContent from './cards/SummaryCardContent';
import ActionItemsCardContent from './cards/ActionItemsCardContent';
import CustomTaskCardContent from './cards/CustomTaskCardContent';
import Modal from '../shared/Modal';

const EMPTY_CARDS: CardType[] = [];
const EMPTY_HIGHLIGHTS: import('../../../shared/types/database.types').TranscriptHighlight[] = [];

interface Props {
  recordingId: number;
  transcript: TranscriptWithSegments | null;
  summary: SummaryWithActions | null;
}

export default function CardWorkspace({ recordingId, transcript, summary }: Props) {
  const allCards = useWorkspaceStore((s) => s.cards);
  const allHighlights = useWorkspaceStore((s) => s.highlights);
  const storeCards = useMemo(() => allCards[recordingId] ?? EMPTY_CARDS, [allCards, recordingId]);
  const highlights = useMemo(() => allHighlights[recordingId] ?? EMPTY_HIGHLIGHTS, [allHighlights, recordingId]);
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

    // Persist the new order: assign sort_order based on array position
    cards.forEach((card, i) => {
      if (card.sort_order !== i) {
        updateCard(card.id, { sort_order: i }, recordingId);
      }
    });
  }, [cards, updateCard, recordingId]);

  const addTaskToFirstCustomCard = useCallback(async (text: string) => {
    const currentCards = useWorkspaceStore.getState().cards[recordingId] ?? [];
    const customCards = currentCards.filter((c) => c.card_type === 'custom_task');
    let targetCardId: number;
    if (customCards.length > 0) {
      targetCardId = customCards[0].id;
    } else {
      await useWorkspaceStore.getState().addCustomCard(recordingId, 'Tasks');
      const updatedCards = useWorkspaceStore.getState().cards[recordingId] ?? [];
      const newCustom = updatedCards.find((c) => c.card_type === 'custom_task');
      if (!newCustom) return;
      targetCardId = newCustom.id;
    }
    await useWorkspaceStore.getState().addTask(targetCardId, text);
  }, [recordingId]);

  const handleWidthToggle = useCallback((card: CardType) => {
    const newW = card.grid_w >= 2 ? 1 : 2;
    updateCard(card.id, { grid_w: newW }, recordingId);
  }, [updateCard, recordingId]);

  const renderCardContent = (card: CardType) => {
    switch (card.card_type) {
      case 'transcript':
        return (
          <TranscriptCardContent
            transcript={transcript}
            highlights={highlights}
            recordingId={recordingId}
            onAddTask={addTaskToFirstCustomCard}
          />
        );
      case 'summary':
        return <SummaryCardContent summary={summary} onAddTask={addTaskToFirstCustomCard} />;
      case 'action_items':
        return <ActionItemsCardContent items={summary?.action_items ?? []} />;
      case 'custom_task':
        return <CustomTaskCardContent cardId={card.id} recordingId={recordingId} />;
      default:
        return null;
    }
  };

  const [dropZoneActive, setDropZoneActive] = useState(false);

  const handleDropToOwnRow = useCallback(() => {
    if (dragIndex === null) return;
    // Move the dragged card to the end and make it full width
    setCards((prev) => {
      const updated = [...prev];
      const dragged = updated.splice(dragIndex, 1)[0];
      dragged.grid_w = 2; // full width = own row
      updated.push(dragged);
      return updated;
    });
    setDragIndex(null);
    setDropZoneActive(false);

    // Persist after a tick
    setTimeout(() => {
      const currentCards = useWorkspaceStore.getState().cards[recordingId] ?? [];
      // The last card should now be full width
      const reordered = [...cards];
      if (dragIndex !== null && dragIndex < reordered.length) {
        const dragged = reordered.splice(dragIndex, 1)[0];
        reordered.push(dragged);
        reordered.forEach((card, i) => {
          const isLast = i === reordered.length - 1;
          updateCard(card.id, {
            sort_order: i,
            grid_w: isLast ? 2 : card.grid_w,
          }, recordingId);
        });
      }
    }, 50);
  }, [dragIndex, cards, updateCard, recordingId]);

  return (
    <div>
      <div className="flex flex-wrap gap-[10px]">
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
            onWidthToggle={() => handleWidthToggle(card)}
            style={{
              flex: card.grid_w >= 2 ? '0 0 100%' : '0 0 calc(50% - 5px)',
              minHeight: '120px',
            }}
          >
            {renderCardContent(card)}
          </WorkspaceCard>
        ))}

        {/* Drop zone for placing card on its own row */}
        {dragIndex !== null && (
          <div
            className={`flex w-full items-center justify-center rounded-card border-2 border-dashed p-4 transition-all ${
              dropZoneActive
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-border/50 text-text-muted/40'
            }`}
            style={{ flex: '0 0 100%', minHeight: '60px' }}
            onDragEnter={(e) => {
              e.preventDefault();
              setDropZoneActive(true);
            }}
            onDragLeave={() => setDropZoneActive(false)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleDropToOwnRow();
            }}
          >
            <span className="text-sm font-medium">
              {dropZoneActive ? '↓ Drop to place on its own row' : 'Drag here for own row'}
            </span>
          </div>
        )}
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
