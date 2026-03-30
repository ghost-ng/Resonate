import { useMemo } from 'react';

interface Props {
  text: string;
  query: string;
  activeIndex?: number;
  className?: string;
}

/**
 * Renders text with search query matches highlighted.
 * activeIndex highlights a specific match with a stronger style.
 */
export default function HighlightText({ text, query, activeIndex, className = '' }: Props) {
  const parts = useMemo(() => {
    if (!query || !text) return [{ text, highlight: false, index: -1 }];
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    const result: { text: string; highlight: boolean; index: number }[] = [];
    let lastIndex = 0;
    let matchCount = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        result.push({ text: text.slice(lastIndex, match.index), highlight: false, index: -1 });
      }
      result.push({ text: match[0], highlight: true, index: matchCount });
      matchCount++;
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      result.push({ text: text.slice(lastIndex), highlight: false, index: -1 });
    }

    return result;
  }, [text, query]);

  if (!query) return <span className={className}>{text}</span>;

  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (!part.highlight) return <span key={i}>{part.text}</span>;
        const isActive = activeIndex !== undefined && part.index === activeIndex;
        return (
          <mark
            key={i}
            data-match-index={part.index}
            className={isActive ? 'bg-accent/40 text-text rounded-sm px-0.5' : 'bg-accent/20 text-text rounded-sm px-0.5'}
          >
            {part.text}
          </mark>
        );
      })}
    </span>
  );
}
