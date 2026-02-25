/**
 * useControls — multi-touch virtual gamepad
 *
 * Returns a ref to the current control state + a handler factory.
 * The handler factory returns React-native onTouch* props that can
 * be spread onto a <View> representing a control zone.
 */
import { useRef, useCallback } from 'react';
import type { GestureResponderEvent } from 'react-native';
import type { Controls } from '../types/game';

export type ButtonKey = keyof Controls;

interface ButtonRect { x: number; y: number; w: number; h: number }

function makeDefaultControls(): Controls {
  return { left: false, right: false, jump: false, grab: false };
}

export function useControls() {
  const leftControls  = useRef<Controls>(makeDefaultControls());
  const rightControls = useRef<Controls>(makeDefaultControls());

  return { leftControls, rightControls };
}

/**
 * Creates touch-responder props for a control zone.
 *
 * @param controlsRef  ref that will be mutated with pressed-button state
 * @param layout       map of button name → bounding rect (relative to the View)
 */
export function makeTouchHandlers(
  controlsRef: React.MutableRefObject<Controls>,
  layout: Record<ButtonKey, ButtonRect>,
) {
  // Maps touch identifier → which button it pressed
  const activeMap = new Map<number, ButtonKey>();

  function hitTest(lx: number, ly: number): ButtonKey | null {
    for (const [key, rect] of Object.entries(layout) as [ButtonKey, ButtonRect][]) {
      if (lx >= rect.x && lx < rect.x + rect.w && ly >= rect.y && ly < rect.y + rect.h) {
        return key;
      }
    }
    return null;
  }

  function onStart(e: GestureResponderEvent) {
    for (const t of e.nativeEvent.changedTouches) {
      const key = hitTest(t.locationX, t.locationY);
      if (key) {
        activeMap.set(t.identifier, key);
        controlsRef.current[key] = true;
      }
    }
  }

  function onMove(e: GestureResponderEvent) {
    for (const t of e.nativeEvent.changedTouches) {
      const prevKey = activeMap.get(t.identifier);
      const newKey  = hitTest(t.locationX, t.locationY);

      if (prevKey !== newKey) {
        // Release old button
        if (prevKey) {
          const stillHeld = [...activeMap.values()].filter((v, _, arr) =>
            v === prevKey && arr.indexOf(v) !== arr.lastIndexOf(v)
          ).length > 0;
          if (!stillHeld) controlsRef.current[prevKey] = false;
          activeMap.delete(t.identifier);
        }
        // Press new button
        if (newKey) {
          activeMap.set(t.identifier, newKey);
          controlsRef.current[newKey] = true;
        }
      }
    }
  }

  function onEnd(e: GestureResponderEvent) {
    for (const t of e.nativeEvent.changedTouches) {
      const key = activeMap.get(t.identifier);
      if (key) {
        activeMap.delete(t.identifier);
        const stillHeld = [...activeMap.values()].some(v => v === key);
        if (!stillHeld) controlsRef.current[key] = false;
      }
    }
  }

  return {
    onStartShouldSetResponder: () => true,
    onMoveShouldSetResponder:  () => true,
    onResponderGrant:      onStart,
    onResponderMove:       onMove,
    onResponderRelease:    onEnd,
    onResponderTerminate:  onEnd,
  };
}

// ─── Standard button layouts ──────────────────────────────────────────────────

/** Single-player / right-side layout (landscape) */
export const RIGHT_LAYOUT: Record<ButtonKey, ButtonRect> = {
  left:  { x: 0,   y: 10, w: 60, h: 60 },
  right: { x: 70,  y: 10, w: 60, h: 60 },
  jump:  { x: 160, y: 0,  w: 60, h: 60 },
  grab:  { x: 160, y: 70, w: 60, h: 60 },
};

/** Left-side layout for local multiplayer P1 */
export const LEFT_LAYOUT: Record<ButtonKey, ButtonRect> = {
  left:  { x: 0,   y: 10, w: 60, h: 60 },
  right: { x: 70,  y: 10, w: 60, h: 60 },
  jump:  { x: 160, y: 0,  w: 60, h: 60 },
  grab:  { x: 160, y: 70, w: 60, h: 60 },
};
