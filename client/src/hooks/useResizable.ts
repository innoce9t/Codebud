import { useCallback, useEffect, useRef, useState } from 'react';

interface Options {
  defaultWidth: number;
  min: number;
  max: number;
  storageKey?: string;
  direction?: 'right' | 'left'; // 'right' = drag right edge (explorer), 'left' = drag left edge (chat)
}

export function useResizable({ defaultWidth, min, max, storageKey, direction = 'right' }: Options) {
  const [width, setWidth] = useState(() => {
    if (storageKey) {
      const stored = parseInt(localStorage.getItem(storageKey) ?? '', 10);
      if (!isNaN(stored)) return Math.max(min, Math.min(max, stored));
    }
    return defaultWidth;
  });

  const dragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const persist = useCallback(
    (w: number) => {
      if (storageKey) localStorage.setItem(storageKey, String(w));
    },
    [storageKey],
  );

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragging.current) return;
      const delta = direction === 'right' ? e.clientX - startX.current : startX.current - e.clientX;
      const next = Math.max(min, Math.min(max, startWidth.current + delta));
      setWidth(next);
    },
    [direction, min, max],
  );

  const onMouseUp = useCallback(
    (e: MouseEvent) => {
      if (!dragging.current) return;
      dragging.current = false;
      const delta = direction === 'right' ? e.clientX - startX.current : startX.current - e.clientX;
      const next = Math.max(min, Math.min(max, startWidth.current + delta));
      persist(next);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    },
    [direction, min, max, persist],
  );

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [onMouseMove, onMouseUp]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragging.current = true;
      startX.current = e.clientX;
      startWidth.current = width;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [width],
  );

  return { width, handleMouseDown };
}
