import { useRef, useCallback, useEffect } from 'react';
import { useSharedValue }                 from 'react-native-reanimated';
import { updatePhysics, makeInitialState, resetPositions } from '../utils/physics';
import { updateAI }   from '../utils/ai';
import type { Controls, PlayerMode, Score } from '../types/game';

export interface GameSharedValues {
  // Ball
  ballX: ReturnType<typeof useSharedValue<number>>;
  ballY: ReturnType<typeof useSharedValue<number>>;
  // Left slime
  leftX:       ReturnType<typeof useSharedValue<number>>;
  leftY:       ReturnType<typeof useSharedValue<number>>;
  leftGrabbed: ReturnType<typeof useSharedValue<number>>;  // 0 | 1
  leftTimer:   ReturnType<typeof useSharedValue<number>>;  // 0..1
  // Right slime
  rightX:       ReturnType<typeof useSharedValue<number>>;
  rightY:       ReturnType<typeof useSharedValue<number>>;
  rightGrabbed: ReturnType<typeof useSharedValue<number>>; // 0 | 1
  rightTimer:   ReturnType<typeof useSharedValue<number>>; // 0..1
}

interface UseGameLoopOptions {
  playerMode: PlayerMode;
  isRunning: boolean;
  leftControls:  React.MutableRefObject<Controls>;
  rightControls: React.MutableRefObject<Controls>;
  onGoal:   (scorer: 'left' | 'right') => void;
  onPenalty:(camper: 'left' | 'right') => void; // other team scores
}

export function useGameSharedValues(): GameSharedValues {
  return {
    ballX:        useSharedValue(400),
    ballY:        useSharedValue(150),
    leftX:        useSharedValue(200),
    leftY:        useSharedValue(320),
    leftGrabbed:  useSharedValue(0),
    leftTimer:    useSharedValue(0),
    rightX:       useSharedValue(600),
    rightY:       useSharedValue(320),
    rightGrabbed: useSharedValue(0),
    rightTimer:   useSharedValue(0),
  };
}

export function useGameLoop(
  sv: GameSharedValues,
  opts: UseGameLoopOptions,
) {
  const { playerMode, isRunning, leftControls, rightControls, onGoal, onPenalty } = opts;

  const stateRef = useRef(makeInitialState());
  const rafRef   = useRef<number>(0);
  // Stable callback refs to avoid stale closures
  const onGoalRef   = useRef(onGoal);
  const onPenaltyRef = useRef(onPenalty);
  useEffect(() => { onGoalRef.current   = onGoal; },   [onGoal]);
  useEffect(() => { onPenaltyRef.current = onPenalty; }, [onPenalty]);

  const syncSharedValues = useCallback(() => {
    const s = stateRef.current;
    sv.ballX.value        = s.ball.x;
    sv.ballY.value        = s.ball.y;
    sv.leftX.value        = s.leftSlime.x;
    sv.leftY.value        = s.leftSlime.y;
    sv.leftGrabbed.value  = s.leftSlime.hasBall ? 1 : 0;
    sv.leftTimer.value    = s.leftSlime.goalLineTime;
    sv.rightX.value       = s.rightSlime.x;
    sv.rightY.value       = s.rightSlime.y;
    sv.rightGrabbed.value = s.rightSlime.hasBall ? 1 : 0;
    sv.rightTimer.value   = s.rightSlime.goalLineTime;
  }, [sv]);

  const resetState = useCallback(() => {
    resetPositions(stateRef.current);
    syncSharedValues();
  }, [syncSharedValues]);

  const tick = useCallback(() => {
    const state = stateRef.current;

    // AI overrides left controls in single-player mode
    const leftCtrl  = { ...leftControls.current };
    const rightCtrl = { ...rightControls.current };

    if (playerMode === 'single') {
      updateAI(state, leftCtrl);
    }

    const result = updatePhysics(state, leftCtrl, rightCtrl);

    if (result.goal) {
      onGoalRef.current(result.goal);
      resetPositions(state);
    }

    if (result.penalty) {
      // penalty: slime.penalty means THAT slime camped → other team scores
      onPenaltyRef.current(result.penalty);
      resetPositions(state);
    }

    syncSharedValues();
  }, [playerMode, leftControls, rightControls, syncSharedValues]);

  useEffect(() => {
    if (!isRunning) {
      cancelAnimationFrame(rafRef.current);
      return;
    }

    let last = 0;
    function loop(ts: number) {
      // Cap dt to avoid physics explosions on tab-switch resume
      const dt = Math.min(ts - last, 50);
      last = ts;

      tick();
      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isRunning, tick]);

  return { resetState, gameState: stateRef };
}
