export type GameMode = '1min' | '2min' | '4min' | '8min' | 'worldcup';
export type PlayerMode = 'single' | 'local' | 'online';

export interface SlimeState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  isGrabbing: boolean;
  hasBall: boolean;
  goalLineTime: number;
  // AI-only tracking fields
  lastBallY?: number;
  stuckCounter?: number;
}

export interface BallState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  grabbedBy: 'left' | 'right' | null;
  grabAngle: number;
  grabAngularVelocity: number;
}

export interface GameState {
  leftSlime: SlimeState;
  rightSlime: SlimeState;
  ball: BallState;
}

export interface Controls {
  left: boolean;
  right: boolean;
  jump: boolean;
  grab: boolean;
}

export interface Score {
  left: number;
  right: number;
}

export type NavigationScreen = 'Home' | 'ModeSelect' | 'Game' | 'OnlineLobby';

export interface GameScreenParams {
  playerMode: PlayerMode;
  gameMode: GameMode;
  roomId?: string; // для онлайн-игры
}
