/**
 * GameCanvas — renders the game using @shopify/react-native-skia.
 *
 * All animated values are SharedValue<number> so Skia can read them
 * from the UI thread without causing JS reconciliation overhead.
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import {
  Canvas,
  Circle,
  Fill,
  Group,
  Line,
  Path,
  Rect,
  Skia,
  useDerivedValue,
  vec,
} from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';

import {
  ORIG_W, ORIG_H,
  CANVAS_W, CANVAS_H,
  SCALE, GAME_OFFSET_X, GAME_OFFSET_Y,
  GROUND_HEIGHT, SLIME_RADIUS, BALL_RADIUS,
  GOAL_WIDTH, GOAL_HEIGHT,
  COLOR_BG, COLOR_GROUND, COLOR_BALL,
  COLOR_LEFT_SLIME, COLOR_LEFT_ACCENT,
  COLOR_RIGHT_SLIME, COLOR_RIGHT_ACCENT,
  COLOR_GOAL_LINE, COLOR_NET,
} from '../constants/game';
import type { GameSharedValues } from '../hooks/useGameLoop';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function s(v: number)  { return v * SCALE; }            // scale value
function sx(v: number) { return GAME_OFFSET_X + v * SCALE; } // scale + offset X
function sy(v: number) { return GAME_OFFSET_Y + v * SCALE; } // scale + offset Y

const GROUND_Y    = ORIG_H - GROUND_HEIGHT;
const GND_TOP_S   = sy(GROUND_Y);
const GOAL_W_S    = s(GOAL_WIDTH);
const GOAL_H_S    = s(GOAL_HEIGHT);
const SR          = s(SLIME_RADIUS);
const BR          = s(BALL_RADIUS);
const GAME_W_S    = s(ORIG_W);
const GAME_H_S    = s(ORIG_H);

// Pre-build a unit semicircle path (flat side down, radius 1, centred at 0,0)
// We'll apply a matrix transform per frame.
// For simplicity we build a unique path per slime each render, since Skia
// re-layout is cheap for a few paths.
function makeSlimePath(cx: number, cy: number, r: number): ReturnType<typeof Skia.Path.Make> {
  const p = Skia.Path.Make();
  p.addArc({ x: cx - r, y: cy - r, width: 2 * r, height: 2 * r }, 180, -180);
  p.close();
  return p;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface SlimeProps {
  x: SharedValue<number>;
  y: SharedValue<number>;
  grabbed: SharedValue<number>;
  color: string;
  accentColor: string;
  isLeft: boolean;
}

function Slime({ x, y, grabbed, color, accentColor, isLeft }: SlimeProps) {
  const bodyPath = useDerivedValue(() => {
    const cx = sx(x.value);
    const cy = sy(y.value);
    return makeSlimePath(cx, cy, SR);
  });

  const accentPath = useDerivedValue(() => {
    const cx = sx(x.value);
    const cy = sy(y.value);
    const p = Skia.Path.Make();
    p.addArc({ x: cx - SR, y: cy - SR, width: 2 * SR, height: 2 * SR }, 180 + 17, 23);
    p.addArc({ x: cx - SR + s(10), y: cy - SR + s(10), width: 2 * (SR - s(10)), height: 2 * (SR - s(10)) }, 180 + 17 + 23, -23);
    p.close();
    return p;
  });

  const eyeX = useDerivedValue(() => {
    const ex = isLeft ? SR * 0.3 : -SR * 0.3;
    return sx(x.value) + ex;
  });
  const eyeY = useDerivedValue(() => sy(y.value) - SR * 0.3);

  const pupilX = useDerivedValue(() => {
    const px = isLeft ? SR * 0.35 : -SR * 0.35;
    return sx(x.value) + px;
  });

  return (
    <Group>
      <Path path={bodyPath}   color={color} />
      <Path path={accentPath} color={accentColor} />
      <Circle cx={eyeX}   cy={eyeY} r={s(5)}  color="#FFFFFF" />
      <Circle cx={pupilX} cy={eyeY} r={s(2)}  color="#000000" />
    </Group>
  );
}

interface BallProps {
  x: SharedValue<number>;
  y: SharedValue<number>;
}

function Ball({ x, y }: BallProps) {
  const cx = useDerivedValue(() => sx(x.value));
  const cy = useDerivedValue(() => sy(y.value));
  return <Circle cx={cx} cy={cy} r={BR} color={COLOR_BALL} />;
}

// ─── Goal net (static) ────────────────────────────────────────────────────────

function GoalNet({ side }: { side: 'left' | 'right' }) {
  const lines: React.ReactElement[] = [];
  const baseX = side === 'left' ? GAME_OFFSET_X : GAME_OFFSET_X + GAME_W_S - GOAL_W_S / 2;
  const netW   = GOAL_W_S / 2;
  const topY   = GND_TOP_S - GOAL_H_S;
  const botY   = GND_TOP_S;

  // vertical lines
  for (let i = 0; i <= netW; i += s(10)) {
    lines.push(
      <Line key={`v${i}`}
        p1={vec(baseX + i, topY)} p2={vec(baseX + i, botY)}
        color={COLOR_NET} strokeWidth={s(1.5)}
      />
    );
  }
  // horizontal lines
  for (let j = topY; j <= botY; j += s(10)) {
    lines.push(
      <Line key={`h${j}`}
        p1={vec(baseX, j)} p2={vec(baseX + netW, j)}
        color={COLOR_NET} strokeWidth={s(1.5)}
      />
    );
  }
  return <Group>{lines}</Group>;
}

// ─── Goal-line camping timer bar ──────────────────────────────────────────────

interface TimerBarProps {
  timer: SharedValue<number>;
  side: 'left' | 'right';
}

function TimerBar({ timer, side }: TimerBarProps) {
  const barW = useDerivedValue(() => {
    const pct = Math.min(timer.value, 1);
    return GOAL_W_S * pct;
  });
  const barX = useDerivedValue(() => {
    if (side === 'right') {
      return GAME_OFFSET_X + GAME_W_S - GOAL_W_S * Math.min(timer.value, 1);
    }
    return GAME_OFFSET_X;
  });
  const barColor = useDerivedValue(() =>
    timer.value > 0.7 ? '#FF0000' : '#FFFF00'
  );
  const barY = GND_TOP_S + s(10);

  return (
    <Rect
      x={barX}
      y={barY}
      width={barW}
      height={s(4)}
      color={barColor}
    />
  );
}

// ─── Main GameCanvas ──────────────────────────────────────────────────────────

interface Props {
  sv: GameSharedValues;
}

export default function GameCanvas({ sv }: Props) {
  return (
    <Canvas style={StyleSheet.absoluteFill}>
      {/* Background */}
      <Rect x={0} y={0} width={CANVAS_W} height={CANVAS_H} color="#000" />
      <Rect x={GAME_OFFSET_X} y={GAME_OFFSET_Y} width={GAME_W_S} height={GAME_H_S} color={COLOR_BG} />

      {/* Ground */}
      <Rect
        x={GAME_OFFSET_X}
        y={GND_TOP_S}
        width={GAME_W_S}
        height={GAME_H_S - GND_TOP_S + GAME_OFFSET_Y}
        color={COLOR_GROUND}
      />

      {/* Goal nets */}
      <GoalNet side="left"  />
      <GoalNet side="right" />

      {/* Goal outlines */}
      {/* Left goal vertical post */}
      <Line
        p1={vec(GAME_OFFSET_X + GOAL_W_S / 2, GND_TOP_S)}
        p2={vec(GAME_OFFSET_X + GOAL_W_S / 2, GND_TOP_S - GOAL_H_S)}
        color={COLOR_GOAL_LINE} strokeWidth={s(3)}
      />
      {/* Right goal vertical post */}
      <Line
        p1={vec(GAME_OFFSET_X + GAME_W_S - GOAL_W_S / 2, GND_TOP_S)}
        p2={vec(GAME_OFFSET_X + GAME_W_S - GOAL_W_S / 2, GND_TOP_S - GOAL_H_S)}
        color={COLOR_GOAL_LINE} strokeWidth={s(3)}
      />

      {/* Camping timer bars */}
      <TimerBar timer={sv.leftTimer}  side="left"  />
      <TimerBar timer={sv.rightTimer} side="right" />

      {/* Slimes */}
      <Slime
        x={sv.leftX} y={sv.leftY} grabbed={sv.leftGrabbed}
        color={COLOR_LEFT_SLIME} accentColor={COLOR_LEFT_ACCENT}
        isLeft
      />
      <Slime
        x={sv.rightX} y={sv.rightY} grabbed={sv.rightGrabbed}
        color={COLOR_RIGHT_SLIME} accentColor={COLOR_RIGHT_ACCENT}
        isLeft={false}
      />

      {/* Ball */}
      <Ball x={sv.ballX} y={sv.ballY} />
    </Canvas>
  );
}
