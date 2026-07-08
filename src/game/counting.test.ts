import { describe, it, expect } from 'vitest';
import { hiLoValue, roundVisibleCount, runningCount, decksRemaining, trueCount } from './counting';
import { createInitialState } from './gameEngine';
import type { GameState } from './gameEngine';
import { instrumentedReducer } from './instrumentedReducer';
import { Action, Phase } from './constants';
import type { Card } from './deck';

function card(rank: string, suit = 'H'): Card {
  return { rank, suit };
}

function stateWithShoe(cards: Card[], overrides: Partial<GameState> = {}): GameState {
  const base = createInitialState({ deckCount: 1 });
  return {
    ...base,
    shoe: [...cards].reverse(),
    ...overrides,
  };
}

// Filler keeps the shoe above the reshuffle threshold so NEW_ROUND
// does not reset the count mid-test
function pad(cards: Card[], count = 30): Card[] {
  return [...cards, ...Array.from({ length: count }, () => card('7'))];
}

describe('hiLoValue', () => {
  it('counts 2-6 as +1', () => {
    for (const rank of ['2', '3', '4', '5', '6']) {
      expect(hiLoValue(card(rank))).toBe(1);
    }
  });

  it('counts 7-9 as 0', () => {
    for (const rank of ['7', '8', '9']) {
      expect(hiLoValue(card(rank))).toBe(0);
    }
  });

  it('counts tens and aces as -1', () => {
    for (const rank of ['10', 'J', 'Q', 'K', 'A']) {
      expect(hiLoValue(card(rank))).toBe(-1);
    }
  });
});

describe('roundVisibleCount', () => {
  it('sums player and dealer face-up cards', () => {
    const state = {
      hands: [{ cards: [card('5'), card('K')] }],
      dealerHand: [card('3'), card('9')],
    } as unknown as GameState;
    // +1 -1 +1 0
    expect(roundVisibleCount(state)).toBe(1);
  });

  it('excludes face-down cards', () => {
    const state = {
      hands: [{ cards: [card('5'), card('6')] }],
      dealerHand: [card('2'), { ...card('K'), faceDown: true }],
    } as unknown as GameState;
    // +1 +1 +1, hole card K unseen
    expect(roundVisibleCount(state)).toBe(3);
  });

  it('sums across split hands', () => {
    const state = {
      hands: [
        { cards: [card('8'), card('5')] },
        { cards: [card('8'), card('6')] },
      ],
      dealerHand: [card('4')],
    } as unknown as GameState;
    // 0 +1 0 +1 +1
    expect(roundVisibleCount(state)).toBe(3);
  });
});

describe('runningCount', () => {
  it('adds countBase from prior rounds to the current round', () => {
    const state = {
      countBase: 4,
      hands: [{ cards: [card('K')] }],
      dealerHand: [],
    } as unknown as GameState;
    expect(runningCount(state)).toBe(3);
  });
});

describe('decksRemaining and trueCount', () => {
  it('converts shoe length to decks', () => {
    expect(decksRemaining(312)).toBe(6);
    expect(decksRemaining(52)).toBe(1);
  });

  it('floors decks remaining at half a deck', () => {
    expect(decksRemaining(10)).toBe(0.5);
    expect(decksRemaining(0)).toBe(0.5);
  });

  it('divides running count by decks remaining', () => {
    expect(trueCount(6, 156)).toBe(2);
    expect(trueCount(-4, 104)).toBe(-2);
    expect(trueCount(0, 260)).toBe(0);
  });
});

describe('instrumentedReducer count integration', () => {
  it('banks the round count into countBase on NEW_ROUND', () => {
    // Deal order: P1, D1, P2, D2(hole). Player 5+6=11 hits K, stands? K busts nothing: 21.
    const shoe = pad([
      card('5'), card('9'), card('6'), card('K'), // deal: player 5,6 dealer 9,K(hole)
      card('7'),                                   // player hit -> 18
      card('8'),                                   // dealer hit if needed
    ]);
    let s = stateWithShoe(shoe);
    s = instrumentedReducer(s, { type: Action.PLACE_BET, payload: 100 });
    s = instrumentedReducer(s, { type: Action.DEAL });
    expect(s.countBase).toBe(0);

    s = instrumentedReducer(s, { type: Action.HIT });    // 7 -> 18
    s = instrumentedReducer(s, { type: Action.STAND });  // dealer reveals K -> 19, stands
    while (s.phase === Phase.DEALER_TURN) {
      s = instrumentedReducer(s, { type: Action.DEALER_HIT });
    }
    s = instrumentedReducer(s, { type: Action.SETTLE });
    expect(s.phase).toBe(Phase.SETTLED);

    // Visible at settle: 5,6,7 (player) = +2; 9,K (dealer revealed) = -1
    expect(runningCount(s)).toBe(1);

    s = instrumentedReducer(s, { type: Action.NEW_ROUND });
    expect(s.countBase).toBe(1);
    expect(runningCount(s)).toBe(1);
  });

  it('leaves an unrevealed hole card out of the banked count', () => {
    // Player busts; dealer hole card never flips
    const shoe = pad([
      card('10'), card('9'), card('6'), card('K'), // player 10,6 dealer 9,K(hole)
      card('J'),                                    // player hit -> bust
    ]);
    let s = stateWithShoe(shoe);
    s = instrumentedReducer(s, { type: Action.PLACE_BET, payload: 100 });
    s = instrumentedReducer(s, { type: Action.DEAL });
    s = instrumentedReducer(s, { type: Action.HIT }); // bust
    if (s.phase === Phase.RESOLVING) {
      s = instrumentedReducer(s, { type: Action.SETTLE });
    }
    expect(s.phase).toBe(Phase.SETTLED);

    // Visible: 10,6,J (player) = -1, dealer 9 = 0. Hole K unseen.
    expect(runningCount(s)).toBe(-1);

    s = instrumentedReducer(s, { type: Action.NEW_ROUND });
    expect(s.countBase).toBe(-1);
  });

  it('resets countBase to zero on reshuffle', () => {
    const shoe = [
      card('5'), card('9'), card('6'), card('K'),
      card('J'), // player hit -> 21? 5+6+J = 21, auto-advance
      card('8'),
    ];
    // Force reshuffle: tiny shoe means penetration threshold is crossed
    let s = stateWithShoe(shoe, { countBase: 7 });
    s = instrumentedReducer(s, { type: Action.PLACE_BET, payload: 100 });
    s = instrumentedReducer(s, { type: Action.DEAL });
    s = instrumentedReducer(s, { type: Action.HIT });
    while (s.phase === Phase.DEALER_TURN) {
      s = instrumentedReducer(s, { type: Action.DEALER_HIT });
    }
    if (s.phase === Phase.RESOLVING) {
      s = instrumentedReducer(s, { type: Action.SETTLE });
    }
    expect(s.phase).toBe(Phase.SETTLED);

    const beforeShoeLen = s.shoe.length;
    s = instrumentedReducer(s, { type: Action.NEW_ROUND });
    expect(s.shoe.length).toBeGreaterThan(beforeShoeLen); // reshuffled to full deck
    expect(s.countBase).toBe(0);
  });
});
