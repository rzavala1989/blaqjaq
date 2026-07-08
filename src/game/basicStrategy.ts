import type { Card } from './deck';
import { Action, type ActionValue } from './constants';
import { evaluateHandFull } from './scoring';

export type StrategyAction = 'H' | 'S' | 'D' | 'Ds' | 'P' | 'R' | 'Rs';

// Hard totals: player total (5-21) vs dealer upcard (2-11, where 11=Ace)
export const HARD_TOTALS: Record<number, Record<number, StrategyAction>> = {
  4:  { 2: 'H', 3: 'H', 4: 'H', 5: 'H', 6: 'H', 7: 'H', 8: 'H', 9: 'H', 10: 'H', 11: 'H' },
  5:  { 2: 'H', 3: 'H', 4: 'H', 5: 'H', 6: 'H', 7: 'H', 8: 'H', 9: 'H', 10: 'H', 11: 'H' },
  6:  { 2: 'H', 3: 'H', 4: 'H', 5: 'H', 6: 'H', 7: 'H', 8: 'H', 9: 'H', 10: 'H', 11: 'H' },
  7:  { 2: 'H', 3: 'H', 4: 'H', 5: 'H', 6: 'H', 7: 'H', 8: 'H', 9: 'H', 10: 'H', 11: 'H' },
  8:  { 2: 'H', 3: 'H', 4: 'H', 5: 'H', 6: 'H', 7: 'H', 8: 'H', 9: 'H', 10: 'H', 11: 'H' },
  9:  { 2: 'H', 3: 'D', 4: 'D', 5: 'D', 6: 'D', 7: 'H', 8: 'H', 9: 'H', 10: 'H', 11: 'H' },
  10: { 2: 'D', 3: 'D', 4: 'D', 5: 'D', 6: 'D', 7: 'D', 8: 'D', 9: 'D', 10: 'H', 11: 'H' },
  11: { 2: 'D', 3: 'D', 4: 'D', 5: 'D', 6: 'D', 7: 'D', 8: 'D', 9: 'D', 10: 'D', 11: 'H' },
  12: { 2: 'H', 3: 'H', 4: 'S', 5: 'S', 6: 'S', 7: 'H', 8: 'H', 9: 'H', 10: 'H', 11: 'H' },
  13: { 2: 'S', 3: 'S', 4: 'S', 5: 'S', 6: 'S', 7: 'H', 8: 'H', 9: 'H', 10: 'H', 11: 'H' },
  14: { 2: 'S', 3: 'S', 4: 'S', 5: 'S', 6: 'S', 7: 'H', 8: 'H', 9: 'H', 10: 'H', 11: 'H' },
  15: { 2: 'S', 3: 'S', 4: 'S', 5: 'S', 6: 'S', 7: 'H', 8: 'H', 9: 'H', 10: 'R', 11: 'H' },
  16: { 2: 'S', 3: 'S', 4: 'S', 5: 'S', 6: 'S', 7: 'H', 8: 'H', 9: 'R', 10: 'R', 11: 'R' },
  17: { 2: 'S', 3: 'S', 4: 'S', 5: 'S', 6: 'S', 7: 'S', 8: 'S', 9: 'S', 10: 'S', 11: 'S' },
  18: { 2: 'S', 3: 'S', 4: 'S', 5: 'S', 6: 'S', 7: 'S', 8: 'S', 9: 'S', 10: 'S', 11: 'S' },
  19: { 2: 'S', 3: 'S', 4: 'S', 5: 'S', 6: 'S', 7: 'S', 8: 'S', 9: 'S', 10: 'S', 11: 'S' },
  20: { 2: 'S', 3: 'S', 4: 'S', 5: 'S', 6: 'S', 7: 'S', 8: 'S', 9: 'S', 10: 'S', 11: 'S' },
  21: { 2: 'S', 3: 'S', 4: 'S', 5: 'S', 6: 'S', 7: 'S', 8: 'S', 9: 'S', 10: 'S', 11: 'S' },
};

// Soft totals: player soft total (13-21) vs dealer upcard (2-11, where 11=Ace)
export const SOFT_TOTALS: Record<number, Record<number, StrategyAction>> = {
  12: { 2: 'H', 3: 'H', 4: 'H', 5: 'H', 6: 'H', 7: 'H', 8: 'H', 9: 'H', 10: 'H', 11: 'H' },
  13: { 2: 'H', 3: 'H', 4: 'H', 5: 'D', 6: 'D', 7: 'H', 8: 'H', 9: 'H', 10: 'H', 11: 'H' },
  14: { 2: 'H', 3: 'H', 4: 'H', 5: 'D', 6: 'D', 7: 'H', 8: 'H', 9: 'H', 10: 'H', 11: 'H' },
  15: { 2: 'H', 3: 'H', 4: 'D', 5: 'D', 6: 'D', 7: 'H', 8: 'H', 9: 'H', 10: 'H', 11: 'H' },
  16: { 2: 'H', 3: 'H', 4: 'D', 5: 'D', 6: 'D', 7: 'H', 8: 'H', 9: 'H', 10: 'H', 11: 'H' },
  17: { 2: 'H', 3: 'D', 4: 'D', 5: 'D', 6: 'D', 7: 'H', 8: 'H', 9: 'H', 10: 'H', 11: 'H' },
  18: { 2: 'Ds', 3: 'Ds', 4: 'Ds', 5: 'Ds', 6: 'Ds', 7: 'S', 8: 'S', 9: 'H', 10: 'H', 11: 'H' },
  19: { 2: 'S', 3: 'S', 4: 'S', 5: 'S', 6: 'Ds', 7: 'S', 8: 'S', 9: 'S', 10: 'S', 11: 'S' },
  20: { 2: 'S', 3: 'S', 4: 'S', 5: 'S', 6: 'S', 7: 'S', 8: 'S', 9: 'S', 10: 'S', 11: 'S' },
  21: { 2: 'S', 3: 'S', 4: 'S', 5: 'S', 6: 'S', 7: 'S', 8: 'S', 9: 'S', 10: 'S', 11: 'S' },
};

// Pair splits: pair card value (2-11, where 11=Ace pair) vs dealer upcard (2-11, where 11=Ace)
export const PAIR_SPLITS: Record<number, Record<number, StrategyAction>> = {
  2:  { 2: 'P', 3: 'P', 4: 'P', 5: 'P', 6: 'P', 7: 'P', 8: 'H', 9: 'H', 10: 'H', 11: 'H' },
  3:  { 2: 'P', 3: 'P', 4: 'P', 5: 'P', 6: 'P', 7: 'P', 8: 'H', 9: 'H', 10: 'H', 11: 'H' },
  4:  { 2: 'H', 3: 'H', 4: 'H', 5: 'P', 6: 'P', 7: 'H', 8: 'H', 9: 'H', 10: 'H', 11: 'H' },
  5:  { 2: 'D', 3: 'D', 4: 'D', 5: 'D', 6: 'D', 7: 'D', 8: 'D', 9: 'D', 10: 'H', 11: 'H' },
  6:  { 2: 'P', 3: 'P', 4: 'P', 5: 'P', 6: 'P', 7: 'H', 8: 'H', 9: 'H', 10: 'H', 11: 'H' },
  7:  { 2: 'P', 3: 'P', 4: 'P', 5: 'P', 6: 'P', 7: 'P', 8: 'H', 9: 'H', 10: 'H', 11: 'H' },
  8:  { 2: 'P', 3: 'P', 4: 'P', 5: 'P', 6: 'P', 7: 'P', 8: 'P', 9: 'P', 10: 'P', 11: 'P' },
  9:  { 2: 'P', 3: 'P', 4: 'P', 5: 'P', 6: 'P', 7: 'S', 8: 'P', 9: 'P', 10: 'S', 11: 'S' },
  10: { 2: 'S', 3: 'S', 4: 'S', 5: 'S', 6: 'S', 7: 'S', 8: 'S', 9: 'S', 10: 'S', 11: 'S' },
  11: { 2: 'P', 3: 'P', 4: 'P', 5: 'P', 6: 'P', 7: 'P', 8: 'P', 9: 'P', 10: 'P', 11: 'P' },
};

const FACE_CARDS = ['J', 'Q', 'K'];

/**
 * Get the blackjack numeric value of a card. Ace=11, face cards=10, else face value.
 */
export function getUpcardValue(card: Card): number {
  if (card.rank === 'A') return 11;
  if (FACE_CARDS.includes(card.rank)) return 10;
  return parseInt(card.rank, 10);
}

/**
 * Determine the hand type: pair (two cards with same blackjack value),
 * soft (hand contains an ace counted as 11), or hard.
 */
export function getHandType(cards: Card[]): 'pair' | 'soft' | 'hard' {
  if (cards.length === 2 && getUpcardValue(cards[0]) === getUpcardValue(cards[1])) {
    return 'pair';
  }
  const evaluation = evaluateHandFull(cards);
  if (evaluation.isSoft) {
    return 'soft';
  }
  return 'hard';
}

/**
 * Map a StrategyAction to the game's ActionValue constant.
 */
function strategyToAction(action: StrategyAction): ActionValue {
  switch (action) {
    case 'H': return Action.HIT;
    case 'S': return Action.STAND;
    case 'D': return Action.DOUBLE_DOWN;
    case 'Ds': return Action.DOUBLE_DOWN;
    case 'P': return Action.SPLIT;
    case 'R': return Action.SURRENDER;
    case 'Rs': return Action.SURRENDER;
  }
}

/**
 * Look up the optimal action given the player's cards and dealer upcard,
 * accounting for what actions are currently available.
 *
 * Returns the game's ActionValue (e.g. 'hit', 'stand', 'double-down', 'split', 'surrender').
 */
export function getOptimalAction(
  playerCards: Card[],
  dealerUpcard: Card,
  canDouble: boolean,
  canSplit: boolean,
  canSurrender: boolean,
): ActionValue {
  const dealerValue = getUpcardValue(dealerUpcard);
  const handType = getHandType(playerCards);
  const evaluation = evaluateHandFull(playerCards);

  let rawAction: StrategyAction;

  if (handType === 'pair' && canSplit) {
    const pairValue = getUpcardValue(playerCards[0]);
    rawAction = PAIR_SPLITS[pairValue][dealerValue];

    // If the pair table says something other than P (like 5,5 = D or 10,10 = S),
    // we still need to check if that action is available
    if (rawAction === 'P') {
      return strategyToAction('P');
    }
    // For non-P actions from pair table (e.g. 5,5 -> D, 10,10 -> S),
    // fall through to downgrade logic below
  } else if (handType === 'pair' && !canSplit) {
    // Can't split, fall through to hard/soft lookup
    const pairValue = getUpcardValue(playerCards[0]);
    const pairAction = PAIR_SPLITS[pairValue][dealerValue];

    if (pairAction === 'P') {
      // Fall through to hard/soft lookup since we can't split
      if (evaluation.isSoft && SOFT_TOTALS[evaluation.value]) {
        rawAction = SOFT_TOTALS[evaluation.value][dealerValue];
      } else {
        rawAction = HARD_TOTALS[evaluation.value][dealerValue];
      }
    } else {
      // Pair table gave a non-split action (e.g. 5,5 -> D, 10,10 -> S)
      rawAction = pairAction;
    }
  } else if (handType === 'soft') {
    rawAction = SOFT_TOTALS[evaluation.value][dealerValue];
  } else {
    rawAction = HARD_TOTALS[evaluation.value][dealerValue];
  }

  // Downgrade logic
  if (rawAction === 'D' && !canDouble) {
    return strategyToAction('H');
  }
  if (rawAction === 'Ds' && !canDouble) {
    return strategyToAction('S');
  }
  if (rawAction === 'R' && !canSurrender) {
    return strategyToAction('H');
  }
  if (rawAction === 'Rs' && !canSurrender) {
    return strategyToAction('S');
  }

  return strategyToAction(rawAction);
}

/**
 * Check whether the player's actual action matches the basic strategy optimal play.
 */
export function isOptimalPlay(
  playerCards: Card[],
  dealerUpcard: Card,
  actualAction: ActionValue,
  canDouble: boolean,
  canSplit: boolean,
  canSurrender: boolean,
): boolean {
  const optimalAction = getOptimalAction(playerCards, dealerUpcard, canDouble, canSplit, canSurrender);
  return actualAction === optimalAction;
}
