import { useState, useRef, useCallback, useEffect } from "react";

interface Props {
  beforeUrl: string;
  afterUrl: string;
}

/** Split-screen draggable comparison slider. */
export function WelkomStudioBeforeAfter({ beforeUrl, afterUrl }: Props) {
  const [pos, setPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const updateFromClientX = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const p = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.max(0, Math.min(100, p)));
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => dragging.current && updateFromClientX(e.clientX);
    const onTouch = (e: TouchEvent) => dragging.current && e.touches[0] && updateFromClientX(e.touches[0].clientX);
    const onUp = () => (dragging.current = false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onTouch);
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onTouch);
      window.removeEventListener("touchend", onUp);
    };
  }, [updateFromClientX]);

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video rounded-xl overflow-hidden border border-border select-none bg-muted"
    >
      {/* After (full) */}
      <img src={afterUrl} alt="Après Welkom Studio" className="absolute inset-0 w-full h-full object-cover" />
      {/* Before (clipped) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
      >
        <img src={beforeUrl} alt="Avant" className="absolute inset-0 w-full h-full object-cover" />
      </div>

      {/* Labels */}
      <span className="absolute top-3 left-3 px-2 py-1 rounded-md bg-background/85 backdrop-blur text-[10px] font-semibold uppercase tracking-wider text-foreground border border-border">
        Avant
      </span>
      <span className="absolute top-3 right-3 px-2 py-1 rounded-md bg-accent text-primary text-[10px] font-semibold uppercase tracking-wider">
        Après
      </span>

      {/* Divider + handle */}
      <div
        className="absolute top-0 bottom-0 w-[2px] bg-accent shadow-[0_0_12px_hsl(var(--accent)/0.6)] cursor-ew-resize"
        style={{ left: `${pos}%`, transform: "translateX(-1px)" }}
        onMouseDown={() => (dragging.current = true)}
        onTouchStart={() => (dragging.current = true)}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-accent text-primary border-2 border-background flex items-center justify-center text-xs font-bold shadow-lg">
          ⇆
        </div>
      </div>
    </div>
  );
}
