import { useEffect, useRef, useCallback } from 'react';

const BUFFER_SIZE = 100;
const BAR_WIDTH = 3;
const BAR_GAP = 1;
const MIC_COLOR = '#5b8def';
const SYSTEM_COLOR = '#4ade80';

export default function WaveformVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const micBufferRef = useRef<number[]>(new Array(BUFFER_SIZE).fill(0));
  const systemBufferRef = useRef<number[]>(new Array(BUFFER_SIZE).fill(0));
  const animFrameRef = useRef<number>(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    const halfHeight = height / 2;
    const micBuffer = micBufferRef.current;
    const systemBuffer = systemBufferRef.current;

    ctx.clearRect(0, 0, width, height);

    // Draw mic waveform (top half)
    for (let i = 0; i < BUFFER_SIZE; i++) {
      const x = i * (BAR_WIDTH + BAR_GAP);
      const barHeight = micBuffer[i] * (halfHeight - 4);
      ctx.fillStyle = MIC_COLOR;
      ctx.fillRect(x, halfHeight - barHeight - 2, BAR_WIDTH, Math.max(barHeight, 1));
    }

    // Draw divider line
    ctx.fillStyle = 'rgba(139, 144, 165, 0.2)';
    ctx.fillRect(0, halfHeight - 0.5, width, 1);

    // Draw system waveform (bottom half)
    for (let i = 0; i < BUFFER_SIZE; i++) {
      const x = i * (BAR_WIDTH + BAR_GAP);
      const barHeight = systemBuffer[i] * (halfHeight - 4);
      ctx.fillStyle = SYSTEM_COLOR;
      ctx.fillRect(x, halfHeight + 2, BAR_WIDTH, Math.max(barHeight, 1));
    }

    animFrameRef.current = requestAnimationFrame(draw);
  }, []);

  useEffect(() => {
    const cleanup = window.electronAPI.on('recording:audio-levels', (data: { mic: number; system: number }) => {
      micBufferRef.current.push(data.mic);
      micBufferRef.current.shift();
      systemBufferRef.current.push(data.system);
      systemBufferRef.current.shift();
    });

    animFrameRef.current = requestAnimationFrame(draw);

    return () => {
      cleanup();
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [draw]);

  // Handle canvas sizing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        canvas.width = width * window.devicePixelRatio;
        canvas.height = height * window.devicePixelRatio;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        }
        // Update logical size attributes for drawing math
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
      }
    });

    resizeObserver.observe(canvas);
    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div className="rounded-card border border-border bg-surface p-3">
      <div className="mb-2 flex items-center gap-4 text-xs text-text-muted">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: MIC_COLOR }} />
          Mic
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: SYSTEM_COLOR }} />
          System
        </span>
      </div>
      <canvas
        ref={canvasRef}
        className="h-24 w-full rounded"
        style={{ background: 'hsl(228, 20%, 9%)' }}
      />
    </div>
  );
}
