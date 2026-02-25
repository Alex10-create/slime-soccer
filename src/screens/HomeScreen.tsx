import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Home'>;

export default function HomeScreen() {
  const nav = useNavigation<Nav>();

  return (
    <View style={s.root}>
      <StatusBar hidden />

      <Text style={s.title}>SLIME SOCCER</Text>
      <Text style={s.subtitle}>Built with Claude</Text>

      <View style={s.buttons}>
        <TouchableOpacity
          style={s.btn}
          onPress={() => nav.navigate('ModeSelect', { playerMode: 'single' })}
        >
          <Text style={s.btnText}>🤖  vs AI</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.btn}
          onPress={() => nav.navigate('ModeSelect', { playerMode: 'local' })}
        >
          <Text style={s.btnText}>👥  Local 2-Player</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.btn, s.btnOnline]}
          onPress={() => nav.navigate('OnlineLobby')}
        >
          <Text style={s.btnText}>🌐  Online</Text>
        </TouchableOpacity>
      </View>

      <View style={s.teamRow}>
        <Text style={[s.team, { color: '#00CED1' }]}>CYAN</Text>
        <Text style={s.vs}>VS</Text>
        <Text style={[s.team, { color: '#DC143C' }]}>RED</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
  },
  title: {
    fontSize: 42,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 4,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 32,
  },
  buttons: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
  },
  btn: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    backgroundColor: '#1E3A5F',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#2563EB',
  },
  btnOnline: {
    borderColor: '#7C3AED',
    backgroundColor: '#2D1B69',
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  team: {
    fontSize: 20,
    fontWeight: '700',
  },
  vs: {
    color: '#6B7280',
    fontSize: 14,
  },
});
