import {
  ORIG_W, ORIG_H,
  GROUND_HEIGHT, SLIME_RADIUS, BALL_RADIUS,
  GOAL_WIDTH, GOAL_HEIGHT,
  GRAVITY, SLIME_SPEED, SLIME_JUMP_POWER,
  BALL_DAMPING, BALL_BOUNCE_DAMPING, MAX_BALL_SPEED,
} from '../constants/game';
import type { GameState, Controls } from '../types/game';

export type GoalEvent = 'left' | 'right' | null;
export type PenaltyEvent = 'left' | 'right' | null;

export interface PhysicsResult {
  goal: GoalEvent;
  penalty: PenaltyEvent;
}

const GROUND_Y = ORIG_H - GROUND_HEIGHT;

// ─── Human control helpers ────────────────────────────────────────────────────

function applySlimeControls(
  slime: GameState['leftSlime'],
  controls: Controls,
): void {
  if (controls.left)       slime.vx = -SLIME_SPEED;
  else if (controls.right) slime.vx =  SLIME_SPEED;
  else                     slime.vx = 0;

  if (controls.jump && slime.y >= GROUND_Y - 1 && !slime.isGrabbing) {
    slime.vy = SLIME_JUMP_POWER;
  }

  slime.isGrabbing = controls.grab;
}

// ─── Slime physics ────────────────────────────────────────────────────────────

function integrateSlime(
  slime: GameState['leftSlime'],
  isLeft: boolean,
): PenaltyEvent {
  slime.vy += GRAVITY;
  slime.x  += slime.vx;
  slime.y  += slime.vy;

  // Walls
  if (slime.x < SLIME_RADIUS)             slime.x = SLIME_RADIUS;
  if (slime.x > ORIG_W - SLIME_RADIUS)    slime.x = ORIG_W - SLIME_RADIUS;

  // Ground
  if (slime.y > GROUND_Y) {
    slime.y  = GROUND_Y;
    slime.vy = 0;
  }

  // Camping-in-own-goal penalty (1 second at 60 fps = 60 frames)
  const inOwnGoal = isLeft
    ? slime.x < GOAL_WIDTH
    : slime.x > ORIG_W - GOAL_WIDTH;

  if (inOwnGoal) {
    slime.goalLineTime += 1 / 60;
    if (slime.goalLineTime >= 1) {
      slime.goalLineTime = 0;
      return isLeft ? 'left' : 'right'; // slime that camped gets penalty → other team scores
    }
  } else {
    slime.goalLineTime = 0;
  }

  return null;
}

// ─── Ball physics ─────────────────────────────────────────────────────────────

function integrateBall(state: GameState): GoalEvent {
  const { ball, leftSlime, rightSlime } = state;

  if (ball.grabbedBy) {
    const grabber = ball.grabbedBy === 'left' ? leftSlime : rightSlime;
    const dir = ball.grabbedBy === 'left' ? 1 : -1;

    // Angular momentum from slime movement
    ball.grabAngularVelocity += -grabber.vx * 0.008 * dir;
    ball.grabAngularVelocity *= 0.85;
    ball.grabAngle += ball.grabAngularVelocity;

    // Constrain angle based on which slime is holding
    if (ball.grabbedBy === 'left') {
      if (ball.grabAngle < -Math.PI / 2) { ball.grabAngle = -Math.PI / 2; ball.grabAngularVelocity = 0; }
      if (ball.grabAngle >  Math.PI / 2) { ball.grabAngle =  Math.PI / 2; ball.grabAngularVelocity = 0; }
    } else {
      while (ball.grabAngle < 0)           ball.grabAngle += Math.PI * 2;
      while (ball.grabAngle > Math.PI * 2) ball.grabAngle -= Math.PI * 2;
      if (ball.grabAngle < Math.PI / 2 && ball.grabAngle >= 0) {
        ball.grabAngle = Math.PI / 2; ball.grabAngularVelocity = 0;
      } else if (ball.grabAngle > 3 * Math.PI / 2) {
        ball.grabAngle = 3 * Math.PI / 2; ball.grabAngularVelocity = 0;
      }
    }

    const holdDist = SLIME_RADIUS + BALL_RADIUS - 5;
    ball.x  = grabber.x + Math.cos(ball.grabAngle) * holdDist;
    ball.y  = grabber.y + Math.sin(ball.grabAngle) * holdDist;
    ball.vx = grabber.vx;
    ball.vy = grabber.vy;

    if (!grabber.isGrabbing) {
      const releaseSpeed = Math.abs(ball.grabAngularVelocity) * 20;
      ball.vx = grabber.vx * 1.5 + Math.cos(ball.grabAngle) * (3 + releaseSpeed);
      ball.vy = grabber.vy - 2   + Math.sin(ball.grabAngle) * releaseSpeed * 0.3;
      ball.grabbedBy            = null;
      ball.grabAngle            = 0;
      ball.grabAngularVelocity  = 0;
      grabber.hasBall           = false;
    }
  } else {
    ball.vy += GRAVITY;
    ball.vx *= BALL_DAMPING;
    ball.x  += ball.vx;
    ball.y  += ball.vy;
  }

  // Walls
  if (ball.x < BALL_RADIUS) {
    ball.x  = BALL_RADIUS;
    ball.vx = -ball.vx * BALL_BOUNCE_DAMPING;
  }
  if (ball.x > ORIG_W - BALL_RADIUS) {
    ball.x  = ORIG_W - BALL_RADIUS;
    ball.vx = -ball.vx * BALL_BOUNCE_DAMPING;
  }

  // Ceiling
  if (ball.y < BALL_RADIUS) {
    ball.y  = BALL_RADIUS;
    ball.vy = -ball.vy * BALL_BOUNCE_DAMPING;
  }

  // Ground
  if (ball.y > GROUND_Y - BALL_RADIUS) {
    ball.y  = GROUND_Y - BALL_RADIUS;
    ball.vy = -ball.vy * BALL_BOUNCE_DAMPING;
  }

  // Goal detection
  if (ball.x <= BALL_RADIUS && ball.y > GROUND_Y - GOAL_HEIGHT) {
    return 'right'; // right scores
  }
  if (ball.x >= ORIG_W - BALL_RADIUS && ball.y > GROUND_Y - GOAL_HEIGHT) {
    return 'left'; // left scores
  }

  return null;
}

// ─── Ball–slime collisions ────────────────────────────────────────────────────

function resolveSlimeBallCollisions(state: GameState): void {
  const { ball, leftSlime, rightSlime } = state;

  const slimes: [GameState['leftSlime'], 'left' | 'right', GameState['leftSlime']][] = [
    [leftSlime,  'left',  rightSlime],
    [rightSlime, 'right', leftSlime],
  ];

  for (const [slime, name, other] of slimes) {
    const dx = ball.x - slime.x;
    const dy = ball.y - slime.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist >= SLIME_RADIUS + BALL_RADIUS) continue;

    // Knock ball from opponent
    if (ball.grabbedBy && ball.grabbedBy !== name) {
      const speed = Math.sqrt(slime.vx ** 2 + slime.vy ** 2);
      if (speed > 2 || Math.abs(slime.vy) > 5) {
        const angle = Math.atan2(dy, dx);
        ball.grabbedBy            = null;
        ball.grabAngle            = 0;
        ball.grabAngularVelocity  = 0;
        other.hasBall             = false;
        ball.vx = Math.cos(angle) * 8 + slime.vx;
        ball.vy = Math.sin(angle) * 8 + slime.vy;
      }
      continue;
    }

    // Grab
    if (slime.isGrabbing && !ball.grabbedBy) {
      ball.grabbedBy           = name;
      ball.grabAngle           = Math.atan2(dy, dx);
      ball.grabAngularVelocity = 0;
      slime.hasBall            = true;
      continue;
    }

    // Regular bounce (only above slime centre)
    if (!ball.grabbedBy) {
      const angle = Math.atan2(dy, dx);
      if (ball.y < slime.y || Math.abs(angle) < Math.PI * 0.5) {
        ball.x = slime.x + Math.cos(angle) * (SLIME_RADIUS + BALL_RADIUS);
        ball.y = slime.y + Math.sin(angle) * (SLIME_RADIUS + BALL_RADIUS);

        const speed = Math.sqrt(ball.vx ** 2 + ball.vy ** 2);
        ball.vx = Math.cos(angle) * speed * 1.5 + slime.vx * 0.5;
        ball.vy = Math.sin(angle) * speed * 1.5 + slime.vy * 0.5;

        const newSpeed = Math.sqrt(ball.vx ** 2 + ball.vy ** 2);
        if (newSpeed > MAX_BALL_SPEED) {
          ball.vx *= MAX_BALL_SPEED / newSpeed;
          ball.vy *= MAX_BALL_SPEED / newSpeed;
        }
      }
    }
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function updatePhysics(
  state: GameState,
  leftControls: Controls,
  rightControls: Controls,
): PhysicsResult {
  applySlimeControls(state.leftSlime,  leftControls);
  applySlimeControls(state.rightSlime, rightControls);

  const leftPenalty  = integrateSlime(state.leftSlime,  true);
  const rightPenalty = integrateSlime(state.rightSlime, false);

  const goal         = integrateBall(state);
  resolveSlimeBallCollisions(state);

  // Determine scoring events
  // Penalty: the slime that camped loses → other team gets point
  let penalty: PenaltyEvent = null;
  if (leftPenalty  === 'left')  penalty = 'left';   // left camped → right scores
  if (rightPenalty === 'right') penalty = 'right';  // right camped → left scores

  return { goal, penalty };
}

export function makeInitialState(): GameState {
  return {
    leftSlime: {
      x: 200, y: GROUND_Y, vx: 0, vy: 0,
      isGrabbing: false, hasBall: false, goalLineTime: 0,
    },
    rightSlime: {
      x: 600, y: GROUND_Y, vx: 0, vy: 0,
      isGrabbing: false, hasBall: false, goalLineTime: 0,
    },
    ball: {
      x: ORIG_W / 2, y: 150, vx: 0, vy: 0,
      grabbedBy: null, grabAngle: 0, grabAngularVelocity: 0,
    },
  };
}

export function resetPositions(state: GameState): void {
  state.leftSlime.x  = 200; state.leftSlime.y  = GROUND_Y;
  state.leftSlime.vx = 0;   state.leftSlime.vy = 0;
  state.leftSlime.isGrabbing = false; state.leftSlime.hasBall = false;
  state.leftSlime.goalLineTime = 0;

  state.rightSlime.x  = 600; state.rightSlime.y  = GROUND_Y;
  state.rightSlime.vx = 0;   state.rightSlime.vy = 0;
  state.rightSlime.isGrabbing = false; state.rightSlime.hasBall = false;
  state.rightSlime.goalLineTime = 0;

  state.ball.x  = ORIG_W / 2; state.ball.y  = 150;
  state.ball.vx = 0;           state.ball.vy = 0;
  state.ball.grabbedBy = null; state.ball.grabAngle = 0;
  state.ball.grabAngularVelocity = 0;
}
