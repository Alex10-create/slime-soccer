/**
 * VirtualControls — on-screen touch buttons overlaid on the game.
 *
 * Single-player:   right side controls only (player plays Red/right).
 * Local 2-player:  left side for P1 (Cyan), right side for P2 (Red).
 */
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';

import {
  makeTouchHandlers, LEFT_LAYOUT, RIGHT_LAYOUT,
} from '../hooks/useControls';
import type { Controls, PlayerMode } from '../types/game';

interface Props {
  playerMode: PlayerMode;
  leftControls:  React.MutableRefObject<Controls>;
  rightControls: React.MutableRefObject<Controls>;
}

// ─── Button visual ─────────────────────────────────────────────────────────

interface BtnProps {
  label: string;
  x: number; y: number; w: number; h: number;
  color?: string;
}

function Btn({ label, x, y, w, h, color = '#1E3A5F' }: BtnProps) {
  return (
    <View
      pointerEvents="none"
      style={[
        s.btn,
        { left: x, top: y, width: w, height: h, backgroundColor: color },
      ]}
    >
      <Text style={s.btnLabel}>{label}</Text>
    </View>
  );
}

// ─── Gamepad (single player side) ─────────────────────────────────────────

interface GamepadProps {
  controlsRef: React.MutableRefObject<Controls>;
  layout: typeof LEFT_LAYOUT;
  side: 'left' | 'right';
  tint: string;
}

function Gamepad({ controlsRef, layout, side, tint }: GamepadProps) {
  const handlers = useMemo(
    () => makeTouchHandlers(controlsRef, layout),
    [controlsRef, layout],
  );

  const W = layout.grab.x + layout.grab.w + 8;
  const H = Math.max(
    layout.left.y + layout.left.h,
    layout.jump.y + layout.jump.h,
  ) + 8;

  return (
    <View
      style={[
        s.pad,
        side === 'left' ? { left: 16 } : { right: 16 },
      ]}
      {...handlers}
    >
      {/* Invisible hit area */}
      <View style={{ width: W, height: H }}>
        <Btn label="←"    {...layout.left}  color={tint} />
        <Btn label="→"    {...layout.right} color={tint} />
        <Btn label="↑"    {...layout.jump}  color={tint} />
        <Btn label="GRAB" {...layout.grab}  color={tint} />
      </View>
    </View>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────

export default function VirtualControls({ playerMode, leftControls, rightControls }: Props) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* P1 (Cyan / left) only in local multiplayer */}
      {playerMode === 'local' && (
        <Gamepad
          controlsRef={leftControls}
          layout={LEFT_LAYOUT}
          side="left"
          tint="#0E5C6B"
        />
      )}

      {/* P2 (Red / right) — always shown for human player */}
      {(playerMode === 'single' || playerMode === 'local') && (
        <Gamepad
          controlsRef={rightControls}
          layout={RIGHT_LAYOUT}
          side="right"
          tint="#6B1A1A"
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  pad: {
    position: 'absolute',
    bottom: 20,
  },
  btn: {
    position: 'absolute',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.8,
  },
  btnLabel: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});
