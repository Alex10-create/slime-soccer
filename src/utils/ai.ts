import {
  ORIG_W, ORIG_H,
  GROUND_HEIGHT, SLIME_RADIUS, BALL_RADIUS,
  GOAL_WIDTH, GRAVITY, SLIME_SPEED, SLIME_JUMP_POWER,
  BALL_DAMPING, BALL_BOUNCE_DAMPING, AI_PREDICTION_STEPS,
} from '../constants/game';
import type { GameState, Controls } from '../types/game';

const GROUND_Y = ORIG_H - GROUND_HEIGHT;
const AI_GOAL_X = GOAL_WIDTH / 2;
const OPPONENT_GOAL_X = ORIG_W - GOAL_WIDTH / 2;

interface Prediction { x: number; y: number; vx: number; vy: number; time: number }

function predictBallTrajectory(
  bx: number, by: number, bvx: number, bvy: number,
): Prediction[] {
  const preds: Prediction[] = [];
  let x = bx, y = by, vx = bvx, vy = bvy;

  for (let t = 0; t < AI_PREDICTION_STEPS; t++) {
    vy += GRAVITY;
    vx *= BALL_DAMPING;
    x  += vx;
    y  += vy;

    if (x < BALL_RADIUS) { x = BALL_RADIUS; vx = -vx * BALL_BOUNCE_DAMPING; }
    if (x > ORIG_W - BALL_RADIUS) { x = ORIG_W - BALL_RADIUS; vx = -vx * BALL_BOUNCE_DAMPING; }

    preds.push({ x, y, vx, vy, time: t });

    if (y > GROUND_Y - BALL_RADIUS) {
      y = GROUND_Y - BALL_RADIUS; vy = -vy * BALL_BOUNCE_DAMPING;
      break;
    }
  }

  return preds;
}

export function updateAI(state: GameState, leftControls: Controls): void {
  const ai   = state.leftSlime;
  const ball = state.ball;

  const rand = Math.random();
  const aggr = 0.7 + rand * 0.3;

  const preds = predictBallTrajectory(ball.x, ball.y, ball.vx, ball.vy);

  const distToOppGoal = Math.abs(ball.x - OPPONENT_GOAL_X);
  const distToAIGoal  = Math.abs(ball.x - AI_GOAL_X);
  const aiDistToBall  = Math.abs(ai.x - ball.x);
  const ballHeight    = GROUND_Y - ball.y;
  const ballMovingToAIGoal = ball.vx < -1;

  if (!ai.lastBallY) ai.lastBallY = ball.y;
  if (!ai.stuckCounter) ai.stuckCounter = 0;

  const ballStuck = Math.abs(ball.y - ai.lastBallY) < 5 && Math.abs(ball.vx) < 2;
  ai.stuckCounter = ballStuck ? ai.stuckCounter + 1 : 0;
  ai.lastBallY    = ball.y;

  let targetX    = ai.x;
  let shouldJump = false;
  let shouldGrab = false;
  let speed      = SLIME_SPEED;

  // ── Offense ──────────────────────────────────────────────────────────────
  if (
    distToOppGoal < distToAIGoal * 1.5 ||
    (ball.x > ORIG_W * 0.35 && !ballMovingToAIGoal)
  ) {
    if (ballHeight > 60 && aiDistToBall < 150) {
      targetX = ball.x - 45;
    } else if (ballHeight < 30 && aiDistToBall < 100) {
      targetX = ball.x - 20;
    } else {
      targetX = ball.x - 30 + (rand - 0.5) * 20;
    }

    speed = SLIME_SPEED * 1.2;

    if (aiDistToBall < 100) {
      if (ai.stuckCounter > 30) {
        shouldJump = true;
        targetX    = ball.x - 40;
      } else if (ballHeight < 35 && aiDistToBall < 60 && !ai.hasBall && ball.vy > -2) {
        shouldGrab = true;
      } else if (ballHeight > 30 && ballHeight < 90) {
        if (ai.y >= GROUND_Y - 1) shouldJump = true;
      }
    }

    if (ai.hasBall) {
      const angleToGoal = Math.abs(Math.atan2(0, OPPONENT_GOAL_X - ai.x));
      if (angleToGoal < 0.5 || ai.x > ORIG_W * 0.7) shouldGrab = false;
    }
  }
  // ── Defense ───────────────────────────────────────────────────────────────
  else if (ball.x < ORIG_W * 0.65 || ballMovingToAIGoal) {
    let bestX = ball.x;

    for (const p of preds) {
      if (p.x < ORIG_W * 0.4) {
        const timeToReach = Math.abs(ai.x - p.x) / (SLIME_SPEED * 1.2);
        if (timeToReach <= p.time + 5) { bestX = p.x; break; }
      }
    }

    targetX = bestX;

    if (ball.x < GOAL_WIDTH * 2.5 && ballMovingToAIGoal) {
      targetX = Math.max(ball.x - 10, SLIME_RADIUS);
      speed   = SLIME_SPEED * 1.3;
      if (aiDistToBall < 120 && ballHeight < 100) shouldJump = true;
    }

    if (ai.stuckCounter > 20 && ball.x < ORIG_W * 0.3) {
      shouldJump = true;
      targetX    = ball.x + 30;
    }
  }
  // ── Midfield ──────────────────────────────────────────────────────────────
  else {
    const weights = [
      { x: ORIG_W * 0.35, w: 0.3 },
      { x: ORIG_W * 0.45, w: 0.4 },
      { x: ball.x - 60,   w: 0.3 },
    ];
    let roll = rand;
    for (const s of weights) {
      if (roll < s.w) { targetX = s.x + (Math.random() - 0.5) * 40; break; }
      roll -= s.w;
    }

    for (const p of preds) {
      if (p.y < GROUND_Y - 50 && Math.abs(p.x - ORIG_W * 0.4) < 100) {
        const timeToReach = Math.abs(ai.x - p.x) / SLIME_SPEED;
        if (timeToReach < p.time && p.time < 30) {
          targetX = p.x;
          if (p.time < 20 && ai.y >= GROUND_Y - 1) shouldJump = true;
          break;
        }
      }
    }
  }

  // ── Apply controls ────────────────────────────────────────────────────────
  if (shouldGrab && !ai.isGrabbing && ai.y >= GROUND_Y - 1) {
    ai.isGrabbing = true;
  } else if (!shouldGrab) {
    ai.isGrabbing = false;
  }

  const diff = targetX - ai.x;
  const absDiff = Math.abs(diff);
  if (absDiff > 3) {
    const mul = Math.min(absDiff / 50, 1.5);
    ai.vx = Math.sign(diff) * speed * mul * aggr;
  } else {
    ai.vx = 0;
  }

  if (shouldJump && ai.vy === 0 && !ai.isGrabbing) {
    ai.vy = SLIME_JUMP_POWER * (0.9 + rand * 0.2);
  }

  // Expose to leftControls so physics layer knows grab state
  leftControls.grab = ai.isGrabbing;
}
