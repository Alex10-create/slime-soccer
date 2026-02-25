import { Dimensions } from 'react-native';

const screen = Dimensions.get('window');
// Force landscape: longer side is width
const SCREEN_W = Math.max(screen.width, screen.height);
const SCREEN_H = Math.min(screen.width, screen.height);

// ─── Original (logical) game space ───────────────────────────────────────────
export const ORIG_W = 800;
export const ORIG_H = 400;

// Scale to fit screen while maintaining 2:1 ratio
// Leave space for HUD at the top (HUD overlays canvas, so we use full screen)
const scaleX = SCREEN_W / ORIG_W;
const scaleY = SCREEN_H / ORIG_H;
export const SCALE = Math.min(scaleX, scaleY);

export const CANVAS_W = SCREEN_W;
export const CANVAS_H = SCREEN_H;

// Offsets to center the game field if it doesn't fill screen
export const GAME_OFFSET_X = (SCREEN_W - ORIG_W * SCALE) / 2;
export const GAME_OFFSET_Y = (SCREEN_H - ORIG_H * SCALE) / 2;

// ─── Physics constants (in logical space) ────────────────────────────────────
export const GROUND_HEIGHT   = 80;
export const SLIME_RADIUS    = 40;
export const BALL_RADIUS     = 10;
export const GOAL_WIDTH      = 80;
export const GOAL_HEIGHT     = 120;
export const GRAVITY         = 0.6;
export const SLIME_SPEED     = 5;
export const SLIME_JUMP_POWER = -12;
export const BALL_DAMPING    = 0.99;
export const BALL_BOUNCE_DAMPING = 0.8;
export const MAX_BALL_SPEED  = 13;

// ─── AI tuning ────────────────────────────────────────────────────────────────
export const AI_PREDICTION_STEPS = 100;

// ─── Game durations ───────────────────────────────────────────────────────────
export const GAME_DURATIONS: Record<string, number> = {
  '1min':    60,
  '2min':    120,
  '4min':    240,
  '8min':    480,
  'worldcup': 300,
};

// ─── Colors ───────────────────────────────────────────────────────────────────
export const COLOR_BG          = '#0000FF';
export const COLOR_GROUND      = '#808080';
export const COLOR_BALL        = '#FFD700';
export const COLOR_LEFT_SLIME  = '#00CED1';
export const COLOR_LEFT_ACCENT = '#008B8B';
export const COLOR_RIGHT_SLIME = '#DC143C';
export const COLOR_RIGHT_ACCENT = '#8B0000';
export const COLOR_GOAL_LINE   = '#FFFFFF';
export const COLOR_NET         = 'rgba(255,255,255,0.8)';
