// src/hooks/useVerticalSwipeFeed.js
import { useCallback, useRef } from "react";

const isInteractiveTarget = (el) => {
  if (!el) return false;

  const tag = (el.tagName || "").toLowerCase();

  if (tag === "input" || tag === "textarea" || tag === "select" || tag === "button") {
    return true;
  }

  if (el.isContentEditable) return true;

  return Boolean(
    el.closest?.(
      "button,a,input,textarea,select,[data-swipe-feed-disabled='true'],[data-feed-view-mode]"
    )
  );
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function useVerticalSwipeFeed({
  activeIndex,
  itemCount,
  onChange,
  swipeMinPx = 48,
  tapMovePx = 10,
}) {
  const swipeRef = useRef({
    down: false,
    x0: 0,
    y0: 0,
    dx: 0,
    dy: 0,
    pointerId: null,
    cancel: false,
  });

  const goDelta = useCallback(
    (delta) => {
      if (!itemCount || itemCount < 1) return;

      const nextIndex = clamp(activeIndex + delta, 0, itemCount - 1);
      if (nextIndex === activeIndex) return;

      onChange(nextIndex);
    },
    [activeIndex, itemCount, onChange]
  );

  const onPointerDown = useCallback((event) => {
    if (event.pointerType === "mouse") return;

    swipeRef.current = {
      down: true,
      x0: event.clientX,
      y0: event.clientY,
      dx: 0,
      dy: 0,
      pointerId: event.pointerId,
      cancel: isInteractiveTarget(event.target),
    };
  }, []);

  const onPointerMove = useCallback((event) => {
    const state = swipeRef.current;
    if (!state.down) return;
    if (state.pointerId !== null && event.pointerId !== state.pointerId) return;

    state.dx = event.clientX - state.x0;
    state.dy = event.clientY - state.y0;
  }, []);

  const onPointerUp = useCallback(() => {
    const state = swipeRef.current;
    if (!state.down) return;

    state.down = false;

    if (state.cancel) return;

    const absX = Math.abs(state.dx);
    const absY = Math.abs(state.dy);

    if (absX < tapMovePx && absY < tapMovePx) return;
    if (absY < swipeMinPx) return;
    if (absX > absY * 0.72) return;

    goDelta(state.dy < 0 ? 1 : -1);
  }, [goDelta, swipeMinPx, tapMovePx]);

  const onPointerCancel = useCallback(() => {
    swipeRef.current.down = false;
  }, []);

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel };
}
