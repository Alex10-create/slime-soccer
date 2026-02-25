import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp, RouteProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { GAME_DURATIONS } from '../constants/game';
import type { GameMode } from '../types/game';

type Nav   = NativeStackNavigationProp<RootStackParamList, 'ModeSelect'>;
type Route = RouteProp<RootStackParamList, 'ModeSelect'>;

const MODES: { key: GameMode; label: string }[] = [
  { key: '1min',    label: '1 min' },
  { key: '2min',    label: '2 min' },
  { key: '4min',    label: '4 min' },
  { key: '8min',    label: '8 min' },
  { key: 'worldcup', label: '⚽ World Cup (5 min)' },
];

export default function ModeSelectScreen() {
  const nav   = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { playerMode } = route.params;

  return (
    <View style={s.root}>
      <StatusBar hidden />

      <Text style={s.title}>Select Duration</Text>

      <View style={s.teamRow}>
        <Text style={[s.team, { color: '#00CED1' }]}>CYAN</Text>
        <Text style={s.vs}>vs</Text>
        <Text style={[s.team, { color: '#DC143C' }]}>RED</Text>
      </View>

      <View style={s.grid}>
        {MODES.map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            style={s.btn}
            onPress={() => nav.navigate('Game', { playerMode, gameMode: key })}
          >
            <Text style={s.btnText}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={s.hint}>
        {playerMode === 'local'
          ? 'P1 (Cyan): left pad  |  P2 (Red): right pad'
          : 'You play Red  |  AI plays Cyan'}
      </Text>

      <TouchableOpacity onPress={() => nav.goBack()} style={s.back}>
        <Text style={s.backText}>← Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  team: {
    fontSize: 18,
    fontWeight: '700',
  },
  vs: {
    color: '#6B7280',
    fontSize: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    maxWidth: 520,
    marginBottom: 24,
  },
  btn: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: '#1E3A5F',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#2563EB',
    minWidth: 120,
    alignItems: 'center',
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  hint: {
    color: '#9CA3AF',
    fontSize: 12,
    marginBottom: 20,
  },
  back: {
    padding: 8,
  },
  backText: {
    color: '#6B7280',
    fontSize: 14,
  },
});
