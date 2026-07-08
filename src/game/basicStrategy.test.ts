import { describe, it, expect } from 'vitest';
import type { Card } from './deck';
import { Action } from './constants';
import {
  getUpcardValue,
  getHandType,
  getOptimalAction,
  isOptimalPlay,
  HARD_TOTALS,
  SOFT_TOTALS,
  PAIR_SPLITS,
} from './basicStrategy';

// Helper to make cards concise
function card(rank: string, suit = 'H'): Card {
  return { rank, suit };
}

describe('getUpcardValue', () => {
  it('returns 11 for Ace', () => {
    expect(getUpcardValue(card('A'))).toBe(11);
  });

  it('returns 10 for face cards', () => {
    expect(getUpcardValue(card('J'))).toBe(10);
    expect(getUpcardValue(card('Q'))).toBe(10);
    expect(getUpcardValue(card('K'))).toBe(10);
  });

  it('returns 10 for a ten', () => {
    expect(getUpcardValue(card('10'))).toBe(10);
  });

  it('returns numeric value for number cards', () => {
    expect(getUpcardValue(card('2'))).toBe(2);
    expect(getUpcardValue(card('5'))).toBe(5);
    expect(getUpcardValue(card('9'))).toBe(9);
  });
});

describe('getHandType', () => {
  it('identifies a pair of same-value cards', () => {
    expect(getHandType([card('8', 'H'), card('8', 'S')])).toBe('pair');
  });

  it('identifies a pair of different face cards as a pair (both are 10)', () => {
    expect(getHandType([card('J', 'H'), card('Q', 'S')])).toBe('pair');
  });

  it('identifies a pair of Aces', () => {
    expect(getHandType([card('A', 'H'), card('A', 'S')])).toBe('pair');
  });

  it('identifies a soft hand (Ace counted as 11)', () => {
    expect(getHandType([card('A'), card('6')])).toBe('soft');
  });

  it('identifies a hard hand', () => {
    expect(getHandType([card('10'), card('6')])).toBe('hard');
  });

  it('identifies a 3-card hand with ace as soft when ace is 11', () => {
    expect(getHandType([card('A'), card('2'), card('3')])).toBe('soft');
  });

  it('identifies a 3-card hand with ace as hard when ace must be 1', () => {
    expect(getHandType([card('A'), card('9'), card('5')])).toBe('hard');
  });

  it('does not treat 3 cards with same value as a pair', () => {
    expect(getHandType([card('7'), card('7'), card('7')])).toBe('hard');
  });
});

describe('strategy tables', () => {
  it('HARD_TOTALS covers rows 5 through 21', () => {
    for (let total = 5; total <= 21; total++) {
      expect(HARD_TOTALS[total]).toBeDefined();
      for (let dealer = 2; dealer <= 11; dealer++) {
        expect(HARD_TOTALS[total][dealer]).toBeDefined();
      }
    }
  });

  it('SOFT_TOTALS covers rows 13 through 21', () => {
    for (let total = 13; total <= 21; total++) {
      expect(SOFT_TOTALS[total]).toBeDefined();
      for (let dealer = 2; dealer <= 11; dealer++) {
        expect(SOFT_TOTALS[total][dealer]).toBeDefined();
      }
    }
  });

  it('PAIR_SPLITS covers rows 2 through 11', () => {
    for (let pairVal = 2; pairVal <= 11; pairVal++) {
      expect(PAIR_SPLITS[pairVal]).toBeDefined();
      for (let dealer = 2; dealer <= 11; dealer++) {
        expect(PAIR_SPLITS[pairVal][dealer]).toBeDefined();
      }
    }
  });
});

describe('getOptimalAction - known hands', () => {
  it('hard 16 vs dealer 10 = surrender', () => {
    const result = getOptimalAction(
      [card('10'), card('6')],
      card('10'),
      true, true, true,
    );
    expect(result).toBe(Action.SURRENDER);
  });

  it('soft 18 (A+7) vs dealer 9 = hit', () => {
    const result = getOptimalAction(
      [card('A'), card('7')],
      card('9'),
      true, true, true,
    );
    expect(result).toBe(Action.HIT);
  });

  it('pair of 8s vs dealer 10 = split', () => {
    const result = getOptimalAction(
      [card('8', 'H'), card('8', 'S')],
      card('10'),
      true, true, true,
    );
    expect(result).toBe(Action.SPLIT);
  });

  it('pair of 10s vs dealer 5 = stand (never split tens)', () => {
    const result = getOptimalAction(
      [card('10', 'H'), card('K', 'S')],
      card('5'),
      true, true, true,
    );
    expect(result).toBe(Action.STAND);
  });

  it('hard 11 vs dealer 6 = double down', () => {
    const result = getOptimalAction(
      [card('6'), card('5')],
      card('6'),
      true, true, true,
    );
    expect(result).toBe(Action.DOUBLE_DOWN);
  });

  it('hard 12 vs dealer 4 = stand', () => {
    const result = getOptimalAction(
      [card('10'), card('2')],
      card('4'),
      true, true, true,
    );
    expect(result).toBe(Action.STAND);
  });

  it('hard 12 vs dealer 2 = hit', () => {
    const result = getOptimalAction(
      [card('10'), card('2')],
      card('2'),
      true, true, true,
    );
    expect(result).toBe(Action.HIT);
  });

  it('soft 18 (A+7) vs dealer 3 = double down', () => {
    const result = getOptimalAction(
      [card('A'), card('7')],
      card('3'),
      true, true, true,
    );
    expect(result).toBe(Action.DOUBLE_DOWN);
  });

  it('soft 19 (A+8) vs dealer 6 = double down', () => {
    const result = getOptimalAction(
      [card('A'), card('8')],
      card('6'),
      true, true, true,
    );
    expect(result).toBe(Action.DOUBLE_DOWN);
  });

  it('soft 19 (A+8) vs dealer 7 = stand', () => {
    const result = getOptimalAction(
      [card('A'), card('8')],
      card('7'),
      true, true, true,
    );
    expect(result).toBe(Action.STAND);
  });

  it('pair of Aces vs dealer 10 = split', () => {
    const result = getOptimalAction(
      [card('A', 'H'), card('A', 'S')],
      card('10'),
      true, true, true,
    );
    expect(result).toBe(Action.SPLIT);
  });

  it('pair of 9s vs dealer 7 = stand', () => {
    const result = getOptimalAction(
      [card('9', 'H'), card('9', 'S')],
      card('7'),
      true, true, true,
    );
    expect(result).toBe(Action.STAND);
  });

  it('pair of 5s vs dealer 8 = double down (treat as hard 10)', () => {
    const result = getOptimalAction(
      [card('5', 'H'), card('5', 'S')],
      card('8'),
      true, true, true,
    );
    expect(result).toBe(Action.DOUBLE_DOWN);
  });

  it('hard 15 vs dealer 10 = surrender', () => {
    const result = getOptimalAction(
      [card('9'), card('6')],
      card('10'),
      true, true, true,
    );
    expect(result).toBe(Action.SURRENDER);
  });

  it('hard 16 vs dealer Ace = surrender', () => {
    const result = getOptimalAction(
      [card('10'), card('6')],
      card('A'),
      true, true, true,
    );
    expect(result).toBe(Action.SURRENDER);
  });

  it('dealer Ace (value 11) is handled correctly for hard 17', () => {
    const result = getOptimalAction(
      [card('10'), card('7')],
      card('A'),
      true, true, true,
    );
    expect(result).toBe(Action.STAND);
  });
});

describe('getOptimalAction - downgrade logic', () => {
  it('D downgrades to hit when canDouble is false', () => {
    // Hard 9 vs dealer 4 should be D, but without doubling it becomes hit
    const result = getOptimalAction(
      [card('5'), card('4')],
      card('4'),
      false, true, true,
    );
    expect(result).toBe(Action.HIT);
  });

  it('Ds downgrades to stand when canDouble is false', () => {
    // Soft 18 vs dealer 2 should be Ds, without doubling it becomes stand
    const result = getOptimalAction(
      [card('A'), card('7')],
      card('2'),
      false, true, true,
    );
    expect(result).toBe(Action.STAND);
  });

  it('R downgrades to hit when canSurrender is false', () => {
    // Hard 16 vs dealer 10 should be R, without surrender it becomes hit
    const result = getOptimalAction(
      [card('10'), card('6')],
      card('10'),
      true, true, false,
    );
    expect(result).toBe(Action.HIT);
  });

  it('D still works when canDouble is true', () => {
    // Hard 10 vs dealer 5 = D
    const result = getOptimalAction(
      [card('6'), card('4')],
      card('5'),
      true, true, true,
    );
    expect(result).toBe(Action.DOUBLE_DOWN);
  });
});

describe('getOptimalAction - pair fallback when canSplit is false', () => {
  it('pair of 8s falls through to hard 16 lookup when cannot split', () => {
    // 8+8 = hard 16 vs dealer 10 = R (surrender)
    const result = getOptimalAction(
      [card('8', 'H'), card('8', 'S')],
      card('10'),
      true, false, true,
    );
    expect(result).toBe(Action.SURRENDER);
  });

  it('pair of 8s falls through to hard 16 vs dealer 10 = hit when cannot split or surrender', () => {
    const result = getOptimalAction(
      [card('8', 'H'), card('8', 'S')],
      card('10'),
      true, false, false,
    );
    expect(result).toBe(Action.HIT);
  });

  it('pair of 3s falls through to hard 6 (hit) when cannot split', () => {
    // 3+3 = hard 6 vs dealer 5 = H
    const result = getOptimalAction(
      [card('3', 'H'), card('3', 'S')],
      card('5'),
      true, false, true,
    );
    expect(result).toBe(Action.HIT);
  });

  it('pair of Aces falls through to soft 12 (hit) when cannot split', () => {
    // A+A = soft 12: cannot bust, so hitting always beats standing
    const result = getOptimalAction(
      [card('A', 'H'), card('A', 'S')],
      card('6'),
      true, false, true,
    );
    expect(result).toBe(Action.HIT);
  });

  it('pair of 2s falls through to hard 4 (hit) when cannot split', () => {
    const result = getOptimalAction(
      [card('2', 'H'), card('2', 'S')],
      card('6'),
      true, false, true,
    );
    expect(result).toBe(Action.HIT);
  });

  it('pair of 9s falls through to hard 18 vs dealer 7 = stand when cannot split', () => {
    // 9+9 pair table vs 7 = S (not P), so even with canSplit=true it stands
    // But let's test canSplit=false: hard 18 vs 7 = S
    const result = getOptimalAction(
      [card('9', 'H'), card('9', 'S')],
      card('7'),
      true, false, true,
    );
    expect(result).toBe(Action.STAND);
  });
});

describe('isOptimalPlay', () => {
  it('returns true when the player makes the optimal play', () => {
    // Hard 16 vs 10 = surrender
    expect(isOptimalPlay(
      [card('10'), card('6')],
      card('10'),
      Action.SURRENDER,
      true, true, true,
    )).toBe(true);
  });

  it('returns false when the player makes a suboptimal play', () => {
    // Hard 16 vs 10 = surrender, but player hits
    expect(isOptimalPlay(
      [card('10'), card('6')],
      card('10'),
      Action.HIT,
      true, true, true,
    )).toBe(false);
  });

  it('accounts for downgrade when checking optimality', () => {
    // Hard 16 vs 10 without surrender available = hit
    expect(isOptimalPlay(
      [card('10'), card('6')],
      card('10'),
      Action.HIT,
      true, true, false,
    )).toBe(true);
  });

  it('returns true for correct soft hand play', () => {
    // Soft 18 vs 9 = hit
    expect(isOptimalPlay(
      [card('A'), card('7')],
      card('9'),
      Action.HIT,
      true, true, true,
    )).toBe(true);
  });

  it('returns true for correct split play', () => {
    // 8,8 vs 10 = split
    expect(isOptimalPlay(
      [card('8', 'H'), card('8', 'S')],
      card('10'),
      Action.SPLIT,
      true, true, true,
    )).toBe(true);
  });
});
