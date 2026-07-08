import type { Card } from './deck';
import type { GameState } from './gameEngine';

const PLUS_RANKS = new Set(['2', '3', '4', '5', '6']);
const MINUS_RANKS = new Set(['10', 'J', 'Q', 'K', 'A']);

export function hiLoValue(card: Card): number {
  if (PLUS_RANKS.has(card.rank)) return 1;
  if (MINUS_RANKS.has(card.rank)) return -1;
  return 0;
}

// Hi-Lo sum of every card visible on the table this round.
// Face-down cards are unseen and never counted; a hole card that is
// never revealed (player bust, surrender) stays out of the count.
export function roundVisibleCount(
  state: Pick<GameState, 'hands' | 'dealerHand'>
): number {
  let sum = 0;
  for (const hand of state.hands) {
    for (const card of hand.cards) {
      if (!card.faceDown) sum += hiLoValue(card);
    }
  }
  for (const card of state.dealerHand) {
    if (!card.faceDown) sum += hiLoValue(card);
  }
  return sum;
}

// countBase holds the sum from completed rounds this shoe; the live
// running count adds whatever is visible in the current round.
export function runningCount(
  state: Pick<GameState, 'hands' | 'dealerHand' | 'countBase'>
): number {
  return state.countBase + roundVisibleCount(state);
}

export function decksRemaining(shoeLength: number): number {
  return Math.max(shoeLength / 52, 0.5);
}

export function trueCount(running: number, shoeLength: number): number {
  return running / decksRemaining(shoeLength);
}