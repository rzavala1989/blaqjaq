import { describe, it, expect, beforeEach } from 'vitest';
import { saveSession, loadSession, clearSession } from './persistence';
import { createInitialState } from './gameEngine';
import type { HandRecord } from './analytics';

function stateWith(overrides: Partial<ReturnType<typeof createInitialState>>) {
  return { ...createInitialState(), ...overrides };
}

describe('persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('round-trips chips, stats, and hand history', () => {
    const state = stateWith({
      chips: 1450,
      stats: { wins: 3, losses: 1, pushes: 0, blackjacks: 1 },
    });
    saveSession(state);

    const loaded = loadSession();
    expect(loaded).not.toBeNull();
    expect(loaded!.chips).toBe(1450);
    expect(loaded!.stats.wins).toBe(3);
    expect(loaded!.handHistory).toEqual([]);
  });

  it('returns null when nothing is saved', () => {
    expect(loadSession()).toBeNull();
  });

  it('returns null on corrupt JSON', () => {
    localStorage.setItem('blaqjaq:session:v1', '{not json');
    expect(loadSession()).toBeNull();
  });

  it('returns null on a valid-JSON blob with the wrong shape', () => {
    localStorage.setItem('blaqjaq:session:v1', JSON.stringify({ version: 1, chips: 'lots' }));
    expect(loadSession()).toBeNull();
  });

  it('clearSession removes the saved session', () => {
    saveSession(createInitialState());
    expect(loadSession()).not.toBeNull();
    clearSession();
    expect(loadSession()).toBeNull();
  });

  it('caps stored hand history at 500 records', () => {
    const record = { id: 1, bet: 10 } as HandRecord;
    const history = Array.from({ length: 620 }, (_, i) => ({ ...record, id: i + 1 }));
    const state = stateWith({ handHistory: history });
    saveSession(state);

    const loaded = loadSession();
    expect(loaded!.handHistory).toHaveLength(500);
    expect(loaded!.handHistory[0].id).toBe(121);
    expect(loaded!.handHistory[499].id).toBe(620);
  });
});
