import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp }           from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ScreenOrientation from 'expo-screen-orientation';
import { SafeAreaView }        from 'react-native-safe-area-context';

import type { RootStackParamList } from '../../App';
import { GAME_DURATIONS }          from '../constants/game';
import { useControls }             from '../hooks/useControls';
import { useGameSharedValues, useGameLoop } from '../hooks/useGameLoop';
import GameCanvas    from '../components/GameCanvas';
import VirtualControls from '../components/VirtualControls';
import HUD           from '../components/HUD';
import ResultOverlay from '../components/ResultOverlay';
import type { Score }  from '../types/game';

type Route = RouteProp<RootStackParamList, 'Game'>;
type Nav   = NativeStackNavigationProp<RootStackParamList, 'Game'>;

export default function GameScreen() {
  const route = useRoute<Route>();
  const nav   = useNavigation<Nav>();
  const { playerMode, gameMode } = route.params;

  // ── Timer state ──────────────────────────────────────────────────────────
  const totalTime  = GAME_DURATIONS[gameMode];
  const [timeLeft, setTimeLeft] = useState(totalTime);
  const [running,  setRunning]  = useState(true);
  const [score,    setScore]    = useState<Score>({ left: 0, right: 0 });
  const [winner,   setWinner]   = useState<string | null>(null);

  // ── Controls ─────────────────────────────────────────────────────────────
  const { leftControls, rightControls } = useControls();

  // ── Shared values for Skia rendering ─────────────────────────────────────
  const sv = useGameSharedValues();

  // ── Score callbacks ───────────────────────────────────────────────────────
  const handleGoal = useCallback((scorer: 'left' | 'right') => {
    setScore(prev => ({
      ...prev,
      left:  scorer === 'left'  ? prev.left  + 1 : prev.left,
      right: scorer === 'right' ? prev.right + 1 : prev.right,
    }));
  }, []);

  const handlePenalty = useCallback((camper: 'left' | 'right') => {
    // Camper's team is penalised → other team scores
    setScore(prev => ({
      ...prev,
      left:  camper === 'right' ? prev.left  + 1 : prev.left,
      right: camper === 'left'  ? prev.right + 1 : prev.right,
    }));
  }, []);

  // ── Game loop ─────────────────────────────────────────────────────────────
  const { resetState } = useGameLoop(sv, {
    playerMode,
    isRunning: running && winner === null,
    leftControls,
    rightControls,
    onGoal:    handleGoal,
    onPenalty: handlePenalty,
  });

  // ── Timer tick ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!running || winner !== null) return;
    const id = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          setRunning(false);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, winner]);

  // End of game
  useEffect(() => {
    if (timeLeft === 0 && winner === null) {
      if (score.left > score.right)       setWinner('Cyan');
      else if (score.right > score.left)  setWinner('Red');
      else                                setWinner('Draw');
    }
  }, [timeLeft, score, winner]);

  // Force landscape
  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    return () => { ScreenOrientation.unlockAsync(); };
  }, []);

  const handleRestart = useCallback(() => {
    setScore({ left: 0, right: 0 });
    setTimeLeft(totalTime);
    setWinner(null);
    setRunning(true);
    resetState();
  }, [totalTime, resetState]);

  const handleBack = useCallback(() => {
    nav.navigate('Home');
  }, [nav]);

  return (
    <SafeAreaView style={s.root} edges={['left', 'right']}>
      <StatusBar hidden />

      {/* HUD overlay */}
      <HUD score={score} timeLeft={timeLeft} />

      {/* Game canvas (full screen) */}
      <GameCanvas sv={sv} />

      {/* Touch controls */}
      <VirtualControls
        playerMode={playerMode}
        leftControls={leftControls}
        rightControls={rightControls}
      />

      {/* End-of-game overlay */}
      {winner !== null && (
        <ResultOverlay
          winner={winner}
          score={score}
          onRestart={handleRestart}
          onBack={handleBack}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
});
