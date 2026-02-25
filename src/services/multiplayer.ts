/**
 * Online multiplayer service — Firebase Realtime Database
 *
 * Setup:
 * 1. Create a Firebase project at console.firebase.google.com
 * 2. Enable Realtime Database
 * 3. Replace the firebaseConfig object below with your project's config
 * 4. Set Realtime Database rules:
 *    {
 *      "rules": {
 *        "rooms": {
 *          "$roomId": {
 *            ".read": true,
 *            ".write": true
 *          }
 *        }
 *      }
 *    }
 *
 * Protocol:
 *   /rooms/{roomId}/host    — host player inputs  (Controls)
 *   /rooms/{roomId}/guest   — guest player inputs (Controls)
 *   /rooms/{roomId}/meta    — { hostReady, guestReady, gameMode, startedAt }
 *
 * Physics runs locally on BOTH clients using the same deterministic inputs.
 * Each client updates their own slime's controls and reads the opponent's.
 * This gives ~60fps local feel with only input sync latency (~50–100 ms).
 */

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getDatabase,
  ref,
  set,
  onValue,
  off,
  push,
  remove,
  type Database,
} from 'firebase/database';
import type { Controls, GameMode } from '../types/game';

// ─── ⚙️  Replace with your Firebase project config ────────────────────────────
const firebaseConfig = {
  apiKey:            'YOUR_API_KEY',
  authDomain:        'YOUR_PROJECT.firebaseapp.com',
  databaseURL:       'https://YOUR_PROJECT-default-rtdb.firebaseio.com',
  projectId:         'YOUR_PROJECT',
  storageBucket:     'YOUR_PROJECT.appspot.com',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId:             'YOUR_APP_ID',
};
// ─────────────────────────────────────────────────────────────────────────────

let app: FirebaseApp;
let db:  Database;

function getDb(): Database {
  if (!db) {
    app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    db  = getDatabase(app);
  }
  return db;
}

export interface RoomMeta {
  hostReady:  boolean;
  guestReady: boolean;
  gameMode:   GameMode;
  startedAt:  number | null;
}

// ─── Room management ──────────────────────────────────────────────────────────

/** Create a new room. Returns the room ID. */
export async function createRoom(gameMode: GameMode): Promise<string> {
  const database = getDb();
  const roomsRef = ref(database, 'rooms');
  const newRoom  = push(roomsRef);
  const roomId   = newRoom.key!;

  await set(ref(database, `rooms/${roomId}/meta`), {
    hostReady: false, guestReady: false, gameMode, startedAt: null,
  } satisfies RoomMeta);

  return roomId;
}

/** Join an existing room as guest. Returns false if room doesn't exist. */
export async function joinRoom(roomId: string): Promise<RoomMeta | null> {
  return new Promise(resolve => {
    const metaRef = ref(getDb(), `rooms/${roomId}/meta`);
    onValue(metaRef, snap => {
      off(metaRef);
      resolve(snap.exists() ? (snap.val() as RoomMeta) : null);
    }, { onlyOnce: true });
  });
}

/** Mark local player as ready. role = 'host' | 'guest' */
export async function setReady(roomId: string, role: 'host' | 'guest'): Promise<void> {
  const key = role === 'host' ? 'hostReady' : 'guestReady';
  await set(ref(getDb(), `rooms/${roomId}/meta/${key}`), true);
}

/** Mark game as started (host only). */
export async function startGame(roomId: string): Promise<void> {
  await set(ref(getDb(), `rooms/${roomId}/meta/startedAt`), Date.now());
}

/** Clean up room on exit. */
export async function leaveRoom(roomId: string): Promise<void> {
  await remove(ref(getDb(), `rooms/${roomId}`));
}

// ─── Real-time input sync ─────────────────────────────────────────────────────

let sendThrottle = 0;

/** Push local controls to Firebase (~20 times/sec is enough). */
export function sendControls(
  roomId: string,
  role: 'host' | 'guest',
  controls: Controls,
): void {
  const now = Date.now();
  if (now - sendThrottle < 50) return; // 20 fps max
  sendThrottle = now;

  set(ref(getDb(), `rooms/${roomId}/${role}`), controls).catch(() => {});
}

type ControlsCallback = (controls: Controls) => void;

/** Subscribe to the opponent's controls. Returns unsubscribe fn. */
export function subscribeOpponentControls(
  roomId: string,
  opponentRole: 'host' | 'guest',
  callback: ControlsCallback,
): () => void {
  const r = ref(getDb(), `rooms/${roomId}/${opponentRole}`);
  const handler = onValue(r, snap => {
    if (snap.exists()) callback(snap.val() as Controls);
  });
  return () => off(r, 'value', handler);
}

/** Subscribe to room meta (ready state, game start). Returns unsubscribe fn. */
export function subscribeRoomMeta(
  roomId: string,
  callback: (meta: RoomMeta) => void,
): () => void {
  const r = ref(getDb(), `rooms/${roomId}/meta`);
  const handler = onValue(r, snap => {
    if (snap.exists()) callback(snap.val() as RoomMeta);
  });
  return () => off(r, 'value', handler);
}
