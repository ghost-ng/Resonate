import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import type { TranscriptWithSegments, SummaryWithActions } from '../../../shared/types/ipc.types';
import type { WorkspaceCard as CardType } from '../../../shared/types/database.types';
import { useWorkspaceStore } from '../../stores/workspace.store';
import { useSettingsStore } from '../../stores/settings.store';
import { useRecordingStore } from '../../stores/recording.store';
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
  const playbackTimeMs = useRecordingStore((s) => s.playbackTimeMs);
  const allCards = useWorkspaceStore((s) => s.cards);
  const allHighlights = useWorkspaceStore((s) => s.highlights);
  const cardSummaries = useWorkspaceStore((s) => s.cardSummaries);
  const storeCards = useMemo(() => allCards[recordingId] ?? EMPTY_CARDS, [allCards, recordingId]);
  const highlights = useMemo(() => allHighlights[recordingId] ?? EMPTY_HIGHLIGHTS, [allHighlights, recordingId]);
  const fetchCards = useWorkspaceStore((s) => s.fetchCards);
  const fetchHighlights = useWorkspaceStore((s) => s.fetchHighlights);
  const fetchCardSummary = useWorkspaceStore((s) => s.fetchCardSummary);
  const addCard = useWorkspaceStore((s) => s.addCard);
  const updateCard = useWorkspaceStore((s) => s.updateCard);
  const promptProfiles = useSettingsStore((s) => s.promptProfiles);
  const fetchPromptProfiles = useSettingsStore((s) => s.fetchPromptProfiles);

  // Local card order for live drag reordering
  const [cards, setCards] = useState<CardType[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const dragNodeRef = useRef<HTMLDivElement | null>(null);

  // Add card menu
  const [showAddMenu, setShowAddMenu] = useState(false);
  const addMenuRef = useRef<HTMLDivElement>(null);

  // Sync store cards to local state
  useEffect(() => {
    setCards(storeCards);
  }, [storeCards]);

  useEffect(() => {
    fetchCards(recordingId);
    fetchHighlights(recordingId);
    fetchPromptProfiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordingId]);

  // Fetch summaries for cards that have a reference_id
  useEffect(() => {
    for (const card of storeCards) {
      if (card.card_type === 'summary' && card.reference_id && !cardSummaries[card.id]) {
        fetchCardSummary(card.id, card.reference_id);
      }
    }
  }, [storeCards, cardSummaries, fetchCardSummary]);

  // Close add menu on outside click
  useEffect(() => {
    if (!showAddMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setShowAddMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showAddMenu]);

  // Duplicate card confirmation
  const [pendingAdd, setPendingAdd] = useState<{ cardType: string; title: string; profileId?: number } | null>(null);

  const executeAddCard = useCallback((cardType: string, title: string, profileId?: number) => {
    let finalTitle = title;
    if (cardType === 'summary') {
      const existing = (allCards[recordingId] ?? []).filter(c => c.card_type === 'summary');
      const baseName = title || 'Summary';
      const isCustom = baseName.toLowerCase() === 'custom';

      if (isCustom) {
        const customCount = existing.filter(c => /^Custom(\s+\d+)?$/i.test(c.title)).length;
        finalTitle = `Custom ${customCount + 1}`;
      } else {
        finalTitle = baseName;
      }
    }
    addCard(recordingId, cardType, finalTitle, profileId);
    setShowAddMenu(false);
  }, [recordingId, addCard, allCards]);

  const handleAddCard = useCallback((cardType: string, title: string, profileId?: number) => {
    const existing = allCards[recordingId] ?? [];
    // Check if a card of this type already exists
    const duplicate = cardType === 'summary'
      ? existing.find(c => c.card_type === 'summary' && c.title === title)
      : existing.find(c => c.card_type === cardType);

    if (duplicate) {
      setPendingAdd({ cardType, title, profileId });
      setShowAddMenu(false);
    } else {
      executeAddCard(cardType, title, profileId);
    }
  }, [allCards, recordingId, executeAddCard]);

  // Drag handlers — reorder cards in real-time
  const handleDragStart = useCallback((index: number, el: HTMLDivElement) => {
    setDragIndex(index);
    dragNodeRef.current = el;
    setTimeout(() => {
      if (dragNodeRef.current) dragNodeRef.current.style.opacity = '0.4';
    }, 0);
  }, []);

  const handleDragEnter = useCallback((index: number) => {
    if (dragIndex === null || dragIndex === index) return;
    setOverIndex(index);

    setCards((prev) => {
      const updated = [...prev];
      const dragged = updated.splice(dragIndex, 1)[0];
      updated.splice(index, 0, dragged);
      return updated;
    });
    setDragIndex(index);
  }, [dragIndex]);

  const handleDragEnd = useCallback(() => {
    if (dragNodeRef.current) dragNodeRef.current.style.opacity = '1';
    dragNodeRef.current = null;
    setDragIndex(null);
    setOverIndex(null);

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
      await useWorkspaceStore.getState().addCard(recordingId, 'custom_task', 'Tasks');
      const updatedCards = useWorkspaceStore.getState().cards[recordingId] ?? [];
      const newCustom = updatedCards.find((c) => c.card_type === 'custom_task');
      if (!newCustom) return;
      targetCardId = newCustom.id;
    }
    await useWorkspaceStore.getState().addTask(targetCardId, text);
  }, [recordingId]);

  const getSummaryForCard = useCallback((card: CardType): SummaryWithActions | null => {
    if (card.reference_id && cardSummaries[card.id]) {
      return cardSummaries[card.id];
    }
    return summary;
  }, [summary, cardSummaries]);

  const handleExport = useCallback((card: CardType) => {
    let text = '';
    let filename = card.title.replace(/[^a-zA-Z0-9_-]/g, '_');

    // Helper: format ms offset as MM:SS or HH:MM:SS
    const fmtTime = (ms: number): string => {
      const totalSec = Math.floor(ms / 1000);
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;
      if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    switch (card.card_type) {
      case 'transcript': {
        if (!transcript) return;
        // Parse speaker map for display names
        let speakerMap: Record<string, string> = {};
        try { speakerMap = JSON.parse(transcript.speaker_map || '{}'); } catch { /* ignore */ }
        const getSpeakerName = (raw: string | null) => {
          const key = raw ?? 'Unknown';
          return speakerMap[key] || key;
        };

        // Build participant header
        const uniqueSpeakers = [...new Set(transcript.segments.map(s => s.speaker ?? 'Unknown'))];
        const participantNames = uniqueSpeakers.map(s => getSpeakerName(s));
        const totalMs = transcript.segments.length > 0
          ? transcript.segments[transcript.segments.length - 1].end_time_ms
          : 0;

        const header = [
          `# ${card.title}`,
          ``,
          `**Participants:** ${participantNames.join(', ')}`,
          `**Speakers:** ${uniqueSpeakers.length} | **Segments:** ${transcript.segments.length} | **Duration:** ${fmtTime(totalMs)}`,
          ``,
          `---`,
          ``,
        ].join('\n');

        const body = transcript.segments
          .map((s) => `[${fmtTime(s.start_time_ms)}] ${getSpeakerName(s.speaker)}: ${s.text}`)
          .join('\n');

        text = header + body;
        filename += '.md';
        break;
      }
      case 'summary': {
        const cardSummary = getSummaryForCard(card);
        if (!cardSummary?.content) return;
        text = cardSummary.content;
        filename += '.md';
        break;
      }
      case 'action_items': {
        const actionSummary = getSummaryForCard(card);
        const items = actionSummary?.action_items ?? [];
        if (items.length === 0) return;
        text = `# Action Items\n\n` + items.map((item) => {
          const check = item.completed ? 'x' : ' ';
          const assignees = item.assignee
            ? item.assignee.split(',').map(a => a.trim()).filter(Boolean)
            : [];
          const assigneeStr = assignees.length > 0 ? ` — ${assignees.join(', ')}` : '';
          return `- [${check}] ${item.text}${assigneeStr}`;
        }).join('\n');
        filename += '.md';
        break;
      }
      case 'custom_task': {
        const tasks = useWorkspaceStore.getState().tasks[card.id] ?? [];
        if (tasks.length === 0) return;
        text = `# ${card.title}\n\n` + tasks.map((t) => {
          const check = t.completed ? 'x' : ' ';
          return `- [${check}] ${t.text}`;
        }).join('\n');
        filename += '.md';
        break;
      }
      default:
        return;
    }

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, [transcript, getSummaryForCard]);

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
            playbackTimeMs={playbackTimeMs}
            onAddTask={addTaskToFirstCustomCard}
          />
        );
      case 'summary': {
        const cardSummary = getSummaryForCard(card);
        return <SummaryCardContent summary={cardSummary} onAddTask={addTaskToFirstCustomCard} />;
      }
      case 'action_items': {
        const actionSummary = getSummaryForCard(card);
        return <ActionItemsCardContent items={actionSummary?.action_items ?? []} />;
      }
      case 'custom_task':
        return <CustomTaskCardContent cardId={card.id} recordingId={recordingId} />;
      default:
        return null;
    }
  };

  // Build rows: full-width cards get their own row, half-width cards pair up
  const rows: CardType[][] = [];
  let currentPair: CardType[] = [];
  for (const card of cards) {
    if (card.grid_w >= 2) {
      if (currentPair.length > 0) {
        rows.push([...currentPair]);
        currentPair = [];
      }
      rows.push([card]);
    } else {
      currentPair.push(card);
      if (currentPair.length === 2) {
        rows.push([...currentPair]);
        currentPair = [];
      }
    }
  }
  if (currentPair.length > 0) rows.push([...currentPair]);

  // Filter out profiles that shouldn't appear (Custom with empty prompts)
  const summaryProfiles = promptProfiles.filter((p) => p.name !== 'Custom' || p.system_prompt);

  return (
    <div data-tutorial="workspace">
      <div className="flex flex-col gap-[10px]">
        {rows.map((row, rowIdx) => (
          <div key={rowIdx} className="grid gap-[10px]" style={{ gridTemplateColumns: row.length === 1 && row[0].grid_w >= 2 ? '1fr' : 'repeat(2, 1fr)' }}>
            {row.map((card) => {
              const cardIndex = cards.indexOf(card);
              return (
                <WorkspaceCard
                  key={card.id}
                  card={card}
                  recordingId={recordingId}
                  index={cardIndex}
                  isDragOver={overIndex === cardIndex}
                  onDragStart={handleDragStart}
                  onDragEnter={handleDragEnter}
                  onDragEnd={handleDragEnd}
                  onWidthToggle={() => handleWidthToggle(card)}
                  onExport={() => handleExport(card)}
                  style={row.length === 1 && row[0].grid_w >= 2 ? { gridColumn: '1 / -1' } : undefined}
                >
                  {renderCardContent(card)}
                </WorkspaceCard>
              );
            })}
          </div>
        ))}
      </div>

      <div className="relative mt-3 flex justify-end" ref={addMenuRef}>
        <button
          onClick={() => setShowAddMenu((v) => !v)}
          className="rounded-card border border-border bg-surface-2 px-3 py-1.5 text-sm text-text-muted transition-colors hover:bg-surface-3 hover:text-text"
        >
          + Add Card
        </button>

        {showAddMenu && (
          <div className="absolute bottom-full right-0 mb-1 z-50 min-w-[200px] rounded-card border border-border bg-surface shadow-xl py-1">
            <div className="px-3 py-1.5 text-xs font-semibold text-text-muted uppercase tracking-wider">Built-in</div>
            <button
              onClick={() => handleAddCard('transcript', 'Transcript')}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-text hover:bg-surface-2 text-left"
            >
              Transcript
            </button>
            <button
              onClick={() => handleAddCard('action_items', 'Action Items')}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-text hover:bg-surface-2 text-left"
            >
              Action Items
            </button>
            <button
              onClick={() => handleAddCard('custom_task', 'Tasks')}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-text hover:bg-surface-2 text-left"
            >
              Custom Tasks
            </button>

            {summaryProfiles.length > 0 && (
              <>
                <div className="border-t border-border my-1" />
                <div className="px-3 py-1.5 text-xs font-semibold text-text-muted uppercase tracking-wider">Summaries</div>
                {summaryProfiles.map((profile) => (
                  <button
                    key={profile.id}
                    onClick={() => handleAddCard('summary', profile.name, profile.id)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-text hover:bg-surface-2 text-left"
                  >
                    {profile.name}
                  </button>
                ))}
              </>
            )}

            {summaryProfiles.length === 0 && (
              <>
                <div className="border-t border-border my-1" />
                <button
                  onClick={() => handleAddCard('summary', 'Summary')}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-text hover:bg-surface-2 text-left"
                >
                  Summary
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Duplicate card confirmation modal */}
      <Modal
        isOpen={pendingAdd !== null}
        title="Card Already Exists"
        onClose={() => setPendingAdd(null)}
        footer={
          <>
            <button
              className="rounded-lg px-4 py-2 text-sm text-text-muted hover:bg-surface-2"
              onClick={() => setPendingAdd(null)}
            >
              Cancel
            </button>
            <button
              className="rounded-lg bg-accent px-4 py-2 text-sm text-white hover:opacity-90"
              onClick={() => {
                if (pendingAdd) {
                  executeAddCard(pendingAdd.cardType, pendingAdd.title, pendingAdd.profileId);
                }
                setPendingAdd(null);
              }}
            >
              Regenerate
            </button>
          </>
        }
      >
        <p className="text-sm">
          A <strong>{pendingAdd?.cardType === 'summary' ? pendingAdd.title : pendingAdd?.cardType?.replace('_', ' ')}</strong> card already exists. Regenerating will replace its content.
        </p>
      </Modal>
    </div>
  );
}
