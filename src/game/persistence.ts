import type { GameState, Stats } from './gameEngine';
import type { HandRecord } from './analytics';

const SESSION_KEY = 'blaqjaq:session:v1';
const HISTORY_CAP = 500;

export interface SavedSession {
  version: 1;
  savedAt: number;
  chips: number;
  stats: Stats;
  handHistory: HandRecord[];
}

function isValidSession(data: unknown): data is SavedSession {
  if (typeof data !== 'object' || data === null) return false;
  const s = data as Record<string, unknown>;
  return (
    s.version === 1 &&
    typeof s.chips === 'number' &&
    Number.isFinite(s.chips) &&
    typeof s.stats === 'object' &&
    s.stats !== null &&
    Array.isArray(s.handHistory)
  );
}

export function saveSession(state: GameState): void {
  const session: SavedSession = {
    version: 1,
    savedAt: Date.now(),
    chips: state.chips,
    stats: state.stats,
    handHistory: state.handHistory.slice(-HISTORY_CAP),
  };
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // Storage full or unavailable: play on without persistence
  }
}

export function loadSession(): SavedSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isValidSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}
