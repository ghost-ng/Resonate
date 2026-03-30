import { useEffect, useRef, useState } from 'react';

export interface SplitButtonItem {
  label: string;
  action: () => void;
}

interface Props {
  label: string;
  onPrimaryClick: () => void;
  items: SplitButtonItem[];
  disabled?: boolean;
  className?: string;
}

export default function SplitButton({ label, onPrimaryClick, items, disabled, className = '' }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    const t = setTimeout(() => document.addEventListener('mousedown', handleClick), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  return (
    <div ref={containerRef} className={`relative inline-flex ${className}`}>
      <button
        onClick={onPrimaryClick}
        disabled={disabled}
        className="rounded-l-card border border-r-0 border-border bg-surface-2 px-3 py-1.5 text-xs font-medium text-text transition-colors hover:bg-surface-3 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {label}
      </button>
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        className="rounded-r-card border border-border bg-surface-2 px-1.5 py-1.5 text-xs text-text-muted transition-colors hover:bg-surface-3 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
          <path d="M2 3.5l3 3 3-3z" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[160px] rounded-lg border border-border bg-surface py-1 shadow-xl">
          {items.map((item) => (
            <button
              key={item.label}
              className="w-full px-3 py-1.5 text-left text-sm text-text transition-colors hover:bg-surface-2"
              onClick={() => {
                item.action();
                setOpen(false);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
