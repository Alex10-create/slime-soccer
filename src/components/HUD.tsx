import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { Score } from '../types/game';

interface Props {
  score:    Score;
  timeLeft: number;
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function HUD({ score, timeLeft }: Props) {
  return (
    <View style={s.hud} pointerEvents="none">
      <Text style={[s.score, { color: '#00CED1' }]}>{score.left}</Text>
      <Text style={s.timer}>{formatTime(timeLeft)}</Text>
      <Text style={[s.score, { color: '#DC143C' }]}>{score.right}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  hud: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 6,
    paddingBottom: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  score: {
    fontSize: 26,
    fontWeight: '900',
    minWidth: 40,
    textAlign: 'center',
  },
  timer: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: 2,
  },
});
