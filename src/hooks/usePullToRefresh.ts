import { useEffect, useRef, useState } from "react";

interface Options {
  threshold?: number;
  onRefresh: () => Promise<void> | void;
}

/**
 * Lightweight touch-based pull-to-refresh.
 * Returns ref to attach to the scroll container and the current pull distance + refreshing flag.
 */
export function usePullToRefresh({ threshold = 70, onRefresh }: Options) {
  const ref = useRef<HTMLDivElement | null>(null);
  const startY = useRef<number | null>(null);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      if (window.scrollY > 0) return;
      startY.current = e.touches[0].clientY;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (startY.current == null || refreshing) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy > 0 && window.scrollY === 0) {
        setPull(Math.min(dy * 0.5, threshold * 1.5));
      }
    };

    const onTouchEnd = async () => {
      if (startY.current == null) return;
      startY.current = null;
      if (pull >= threshold && !refreshing) {
        setRefreshing(true);
        try {
          await onRefresh();
        } finally {
          setRefreshing(false);
          setPull(0);
        }
      } else {
        setPull(0);
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("touchend", onTouchEnd);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [pull, refreshing, threshold, onRefresh]);

  return { ref, pull, refreshing };
}
