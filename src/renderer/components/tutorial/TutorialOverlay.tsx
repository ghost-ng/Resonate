import { useEffect, useState, useCallback } from 'react';
import { useTutorialStore, TUTORIAL_STEPS } from '../../stores/tutorial.store';

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export default function TutorialOverlay() {
  const active = useTutorialStore((s) => s.active);
  const currentStep = useTutorialStore((s) => s.currentStep);
  const next = useTutorialStore((s) => s.next);
  const prev = useTutorialStore((s) => s.prev);
  const stop = useTutorialStore((s) => s.stop);

  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);

  const step = TUTORIAL_STEPS[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === TUTORIAL_STEPS.length - 1;

  // Find and measure target element
  const measureTarget = useCallback(() => {
    if (!step?.target) {
      setTargetRect(null);
      return;
    }
    const el = document.querySelector(step.target);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
    } else {
      setTargetRect(null);
    }
  }, [step]);

  useEffect(() => {
    if (!active) return;
    measureTarget();
    // Re-measure on resize and after a short delay (for animations)
    const timer = setTimeout(measureTarget, 100);
    window.addEventListener('resize', measureTarget);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', measureTarget);
    };
  }, [active, currentStep, measureTarget]);

  // Keyboard navigation
  useEffect(() => {
    if (!active) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') stop();
      if (e.key === 'ArrowRight' || e.key === 'Enter') next();
      if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [active, next, prev, stop]);

  if (!active || !step) return null;

  const isCentered = !step.target || !targetRect;
  const padding = 8;

  // Calculate tooltip position
  const getTooltipStyle = (): React.CSSProperties => {
    if (isCentered) {
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    const r = targetRect!;
    const tooltipW = 360;
    const gap = 12;

    switch (step.placement) {
      case 'right':
        return {
          position: 'fixed',
          top: Math.max(16, r.top + r.height / 2 - 80),
          left: r.left + r.width + gap,
          maxWidth: tooltipW,
        };
      case 'left':
        return {
          position: 'fixed',
          top: Math.max(16, r.top + r.height / 2 - 80),
          left: Math.max(16, r.left - tooltipW - gap),
          maxWidth: tooltipW,
        };
      case 'bottom':
        return {
          position: 'fixed',
          top: r.top + r.height + gap,
          left: Math.max(16, Math.min(r.left + r.width / 2 - tooltipW / 2, window.innerWidth - tooltipW - 16)),
          maxWidth: tooltipW,
        };
      case 'top':
        return {
          position: 'fixed',
          top: Math.max(16, r.top - gap - 200),
          left: Math.max(16, Math.min(r.left + r.width / 2 - tooltipW / 2, window.innerWidth - tooltipW - 16)),
          maxWidth: tooltipW,
        };
      default:
        return {
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        };
    }
  };

  // Build the spotlight clip path (inverted rectangle)
  const getOverlayClipPath = (): string => {
    if (!targetRect) return '';
    const { top, left, width, height } = targetRect;
    const t = top - padding;
    const l = left - padding;
    const w = width + padding * 2;
    const h = height + padding * 2;
    const r = 8; // border radius

    // Outer rect (full screen) with inner rounded-rect cutout
    return `polygon(
      0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%,
      ${l + r}px ${t}px,
      ${l + w - r}px ${t}px,
      ${l + w}px ${t + r}px,
      ${l + w}px ${t + h - r}px,
      ${l + w - r}px ${t + h}px,
      ${l + r}px ${t + h}px,
      ${l}px ${t + h - r}px,
      ${l}px ${t + r}px,
      ${l + r}px ${t}px
    )`;
  };

  return (
    <div className="fixed inset-0 z-[9999]">
      {/* Dark overlay with spotlight cutout */}
      {targetRect ? (
        <>
          <div
            className="absolute inset-0 bg-black/60 transition-all duration-300"
            style={{ clipPath: getOverlayClipPath() }}
            onClick={stop}
          />
          {/* Spotlight border glow */}
          <div
            className="absolute rounded-lg border-2 border-accent shadow-[0_0_20px_rgba(91,61,245,0.4)] pointer-events-none transition-all duration-300"
            style={{
              top: targetRect.top - padding,
              left: targetRect.left - padding,
              width: targetRect.width + padding * 2,
              height: targetRect.height + padding * 2,
            }}
          />
        </>
      ) : (
        <div className="absolute inset-0 bg-black/60" onClick={stop} />
      )}

      {/* Tooltip card */}
      <div
        className="z-[10000] rounded-xl border border-accent/30 bg-surface p-5 shadow-2xl"
        style={getTooltipStyle()}
      >
        {/* Step indicator */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">
              {currentStep + 1}
            </div>
            <span className="text-xs text-text-muted">
              of {TUTORIAL_STEPS.length}
            </span>
          </div>
          <button
            onClick={stop}
            className="rounded p-1 text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
            aria-label="Close tutorial"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M2 2l10 10M12 2L2 12" />
            </svg>
          </button>
        </div>

        {/* Title */}
        <h3 className="mb-2 text-base font-semibold text-text">{step.title}</h3>

        {/* Description — render newlines as line breaks */}
        <div className="mb-4 text-sm leading-relaxed text-text-muted whitespace-pre-line">
          {step.description}
        </div>

        {/* Progress dots */}
        <div className="mb-4 flex justify-center gap-1.5">
          {TUTORIAL_STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === currentStep
                  ? 'w-4 bg-accent'
                  : i < currentStep
                    ? 'w-1.5 bg-accent/40'
                    : 'w-1.5 bg-border'
              }`}
            />
          ))}
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between">
          <button
            onClick={stop}
            className="rounded-lg px-3 py-1.5 text-sm text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
          >
            Skip tour
          </button>
          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                onClick={prev}
                className="rounded-lg border border-border px-3 py-1.5 text-sm text-text transition-colors hover:bg-surface-2"
              >
                Previous
              </button>
            )}
            <button
              onClick={next}
              className="rounded-lg bg-accent px-4 py-1.5 text-sm font-medium text-white transition-colors hover:opacity-90"
            >
              {isLast ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
