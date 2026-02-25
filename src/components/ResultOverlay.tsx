import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { Score } from '../types/game';

interface Props {
  winner:    string;
  score:     Score;
  onRestart: () => void;
  onBack:    () => void;
}

export default function ResultOverlay({ winner, score, onRestart, onBack }: Props) {
  const isDraw = winner === 'Draw';
  const winnerColor = winner === 'Cyan' ? '#00CED1' : winner === 'Red' ? '#DC143C' : '#FFFFFF';

  return (
    <View style={s.overlay}>
      <View style={s.card}>
        <Text style={[s.winnerText, { color: winnerColor }]}>
          {isDraw ? "It's a Draw!" : `${winner} Wins!`}
        </Text>
        <Text style={s.scoreText}>
          <Text style={{ color: '#00CED1' }}>{score.left}</Text>
          <Text style={s.dash}> — </Text>
          <Text style={{ color: '#DC143C' }}>{score.right}</Text>
        </Text>

        <View style={s.buttons}>
          <TouchableOpacity style={s.btn} onPress={onRestart}>
            <Text style={s.btnText}>▶  Play Again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btn, s.btnBack]} onPress={onBack}>
            <Text style={s.btnText}>⌂  Menu</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  card: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#374151',
    paddingHorizontal: 48,
    paddingVertical: 32,
    alignItems: 'center',
    gap: 12,
  },
  winnerText: {
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 1,
  },
  scoreText: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  dash: {
    color: '#6B7280',
  },
  buttons: {
    flexDirection: 'row',
    gap: 16,
  },
  btn: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    backgroundColor: '#2563EB',
    borderRadius: 10,
  },
  btnBack: {
    backgroundColor: '#374151',
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
