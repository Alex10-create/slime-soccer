import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, StatusBar, ActivityIndicator, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../App';
import type { GameMode } from '../types/game';
import {
  createRoom, joinRoom, setReady,
  subscribeRoomMeta, leaveRoom, startGame,
  type RoomMeta,
} from '../services/multiplayer';

type Nav = NativeStackNavigationProp<RootStackParamList, 'OnlineLobby'>;

type Phase = 'menu' | 'creating' | 'waiting_host' | 'joining' | 'waiting_guest' | 'starting';

const DEFAULT_MODE: GameMode = '2min';

export default function OnlineLobbyScreen() {
  const nav = useNavigation<Nav>();

  const [phase,     setPhase]     = useState<Phase>('menu');
  const [roomId,    setRoomId]    = useState('');
  const [inputId,   setInputId]   = useState('');
  const [role,      setRole]      = useState<'host' | 'guest'>('host');

  // ── Create room ────────────────────────────────────────────────────────────
  const handleCreate = useCallback(async () => {
    setPhase('creating');
    try {
      const id = await createRoom(DEFAULT_MODE);
      setRoomId(id);
      setRole('host');
      await setReady(id, 'host');
      setPhase('waiting_host');
    } catch (e) {
      Alert.alert('Error', 'Could not create room. Check Firebase config.');
      setPhase('menu');
    }
  }, []);

  // ── Join room ──────────────────────────────────────────────────────────────
  const handleJoin = useCallback(async () => {
    if (!inputId.trim()) return;
    setPhase('joining');
    try {
      const meta = await joinRoom(inputId.trim());
      if (!meta) {
        Alert.alert('Room not found', `No room with ID "${inputId.trim()}"`);
        setPhase('menu');
        return;
      }
      setRoomId(inputId.trim());
      setRole('guest');
      await setReady(inputId.trim(), 'guest');
      setPhase('waiting_guest');
    } catch (e) {
      Alert.alert('Error', 'Could not join room.');
      setPhase('menu');
    }
  }, [inputId]);

  // ── Watch for both players ready ───────────────────────────────────────────
  useEffect(() => {
    if (!roomId || (phase !== 'waiting_host' && phase !== 'waiting_guest')) return;

    const unsub = subscribeRoomMeta(roomId, async (meta: RoomMeta) => {
      if (meta.hostReady && meta.guestReady && !meta.startedAt) {
        if (role === 'host') {
          await startGame(roomId);
        }
      }

      if (meta.startedAt) {
        setPhase('starting');
        nav.navigate('Game', {
          playerMode: 'online',
          gameMode:   meta.gameMode,
          roomId,
        });
      }
    });

    return unsub;
  }, [roomId, phase, role, nav]);

  const handleBack = useCallback(async () => {
    if (roomId) await leaveRoom(roomId).catch(() => {});
    nav.goBack();
  }, [roomId, nav]);

  // ── UI ─────────────────────────────────────────────────────────────────────
  return (
    <View style={s.root}>
      <StatusBar hidden />
      <Text style={s.title}>Online Multiplayer</Text>

      {phase === 'menu' && (
        <View style={s.content}>
          <TouchableOpacity style={s.btn} onPress={handleCreate}>
            <Text style={s.btnText}>+ Create Room</Text>
          </TouchableOpacity>

          <Text style={s.orText}>— or join —</Text>

          <View style={s.row}>
            <TextInput
              style={s.input}
              placeholder="Room ID"
              placeholderTextColor="#6B7280"
              value={inputId}
              onChangeText={setInputId}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity style={s.btn} onPress={handleJoin}>
              <Text style={s.btnText}>Join</Text>
            </TouchableOpacity>
          </View>

          <Text style={s.notice}>
            ⚠️  Requires Firebase setup — see src/services/multiplayer.ts
          </Text>
        </View>
      )}

      {(phase === 'creating' || phase === 'joining') && (
        <View style={s.content}>
          <ActivityIndicator color="#2563EB" size="large" />
          <Text style={s.waitText}>
            {phase === 'creating' ? 'Creating room…' : 'Joining room…'}
          </Text>
        </View>
      )}

      {phase === 'waiting_host' && (
        <View style={s.content}>
          <Text style={s.roomIdLabel}>Your Room ID</Text>
          <Text style={s.roomId}>{roomId}</Text>
          <Text style={s.waitText}>Share this code with your opponent.</Text>
          <ActivityIndicator color="#00CED1" style={{ marginTop: 16 }} />
          <Text style={s.waitText}>Waiting for opponent…</Text>
        </View>
      )}

      {phase === 'waiting_guest' && (
        <View style={s.content}>
          <ActivityIndicator color="#DC143C" size="large" />
          <Text style={s.waitText}>Connected! Waiting for host to start…</Text>
        </View>
      )}

      {phase === 'starting' && (
        <View style={s.content}>
          <ActivityIndicator color="#FFFFFF" size="large" />
          <Text style={s.waitText}>Starting…</Text>
        </View>
      )}

      {phase !== 'starting' && (
        <TouchableOpacity onPress={handleBack} style={s.back}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 24,
  },
  content: {
    alignItems: 'center',
    gap: 16,
  },
  btn: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    backgroundColor: '#1E3A5F',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#2563EB',
    minWidth: 140,
    alignItems: 'center',
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  orText: {
    color: '#6B7280',
    fontSize: 13,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  input: {
    backgroundColor: '#1F2937',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#374151',
    color: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    minWidth: 180,
  },
  notice: {
    color: '#F59E0B',
    fontSize: 11,
    textAlign: 'center',
    maxWidth: 320,
    marginTop: 8,
  },
  roomIdLabel: {
    color: '#9CA3AF',
    fontSize: 13,
  },
  roomId: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 4,
    backgroundColor: '#1F2937',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  waitText: {
    color: '#D1D5DB',
    fontSize: 14,
  },
  back: {
    marginTop: 24,
    padding: 8,
  },
  backText: {
    color: '#6B7280',
    fontSize: 14,
  },
});
