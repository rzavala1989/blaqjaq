import { Phase, Result, Action, DEFAULT_CONFIG } from './constants';
import type { PhaseValue, ResultValue, ActionValue, GameConfig } from './constants';
import { evaluateHandFull } from './scoring';
import { createShoe, drawCard, needsReshuffle } from './deck';
import type { Card } from './deck';
import { createEmptySessionStats } from './analytics';
import type { HandRecord, SessionStats } from './analytics';

export interface Hand {
  cards: Card[];
  bet: number;
  result: ResultValue | null;
  isDoubled: boolean;
  isSurrendered: boolean;
  fromSplit: boolean;
}

export interface Stats {
  wins: number;
  losses: number;
  pushes: number;
  blackjacks: number;
}

export interface GameState {
  shoe: Card[];
  config: GameConfig;
  phase: PhaseValue;
  hands: Hand[];
  activeHandIndex: number;
  dealerHand: Card[];
  insuranceBet: number;
  insuranceOffered: boolean;
  insuranceDecided: boolean;
  evenMoneyOffered: boolean;
  evenMoneyDecided: boolean;
  chips: number;
  stats: Stats;
  handHistory: HandRecord[];
  sessionStats: SessionStats;
  currentHandActions: ActionValue[];
  chipsBefore: number;
  // Hi-Lo count carried over from completed rounds this shoe;
  // maintained by instrumentedReducer, reset on reshuffle
  countBase: number;
}

export type GameAction =
  | { type: typeof Action.PLACE_BET; payload: number }
  | { type: typeof Action.DEAL }
  | { type: typeof Action.PEEK }
  | { type: typeof Action.HIT }
  | { type: typeof Action.STAND }
  | { type: typeof Action.DOUBLE_DOWN }
  | { type: typeof Action.SPLIT }
  | { type: typeof Action.INSURANCE }
  | { type: typeof Action.DECLINE_INSURANCE }
  | { type: typeof Action.EVEN_MONEY }
  | { type: typeof Action.DECLINE_EVEN_MONEY }
  | { type: typeof Action.SURRENDER }
  | { type: typeof Action.DEALER_HIT }
  | { type: typeof Action.SETTLE }
  | { type: typeof Action.NEW_ROUND }
  | { type: typeof Action.REBUY };

function createEmptyHand(): Hand {
  return {
    cards: [],
    bet: 0,
    result: null,
    isDoubled: false,
    isSurrendered: false,
    fromSplit: false,
  };
}

export function createInitialState(config: Partial<GameConfig> = {}): GameState {
  const mergedConfig: GameConfig = { ...DEFAULT_CONFIG, ...config };
  return {
    shoe: createShoe(mergedConfig.deckCount),
    config: mergedConfig,
    phase: Phase.BETTING,
    hands: [createEmptyHand()],
    activeHandIndex: 0,
    dealerHand: [],
    insuranceBet: 0,
    insuranceOffered: false,
    insuranceDecided: false,
    evenMoneyOffered: false,
    evenMoneyDecided: false,
    chips: mergedConfig.startingChips,
    stats: { wins: 0, losses: 0, pushes: 0, blackjacks: 0 },
    handHistory: [],
    sessionStats: createEmptySessionStats(mergedConfig),
    currentHandActions: [],
    chipsBefore: mergedConfig.startingChips,
    countBase: 0,
  };
}

// --- Internal helpers ---

function draw(shoe: Card[]): [Card, Card[]] {
  const [card, remaining] = drawCard(shoe);
  return [card, remaining];
}

function drawFaceDown(shoe: Card[]): [Card, Card[]] {
  const [card, remaining] = drawCard(shoe);
  return [{ ...card, faceDown: true }, remaining];
}

function dealerMustHit(dealerHand: Card[], config: GameConfig): boolean {
  const { value, isSoft } = evaluateHandFull(dealerHand);
  if (value < 17) return true;
  if (value === 17 && isSoft && config.dealerHitsSoft17) return true;
  return false;
}

function revealDealerHand(dealerHand: Card[]): Card[] {
  return dealerHand.map((card) => ({ ...card, faceDown: false }));
}

function advanceHand(state: GameState): GameState {
  const nextIndex = state.activeHandIndex + 1;

  if (nextIndex < state.hands.length) {
    const nextHand = state.hands[nextIndex];
    if (nextHand.result === null) {
      return { ...state, activeHandIndex: nextIndex };
    }
    return advanceHand({ ...state, activeHandIndex: nextIndex });
  }

  const allHandsDone = state.hands.every(
    (h) => h.result === Result.PLAYER_BUST || h.result === Result.SURRENDER
  );

  if (allHandsDone) {
    return { ...state, phase: Phase.RESOLVING };
  }

  return {
    ...state,
    dealerHand: revealDealerHand(state.dealerHand),
    phase: Phase.DEALER_TURN,
  };
}

// --- Action handlers ---

function handlePlaceBet(state: GameState, amount: number): GameState {
  if (state.phase !== Phase.BETTING) {
    throw new Error(`Cannot place bet during ${state.phase}`);
  }
  if (amount < state.config.minimumBet) {
    throw new Error(`Bet must be at least ${state.config.minimumBet}`);
  }
  if (amount > state.config.maximumBet) {
    throw new Error(`Bet cannot exceed ${state.config.maximumBet}`);
  }
  if (amount > state.chips) {
    throw new Error('Insufficient chips');
  }

  const hands: Hand[] = [{ ...createEmptyHand(), bet: amount }];
  return {
    ...state,
    chips: state.chips - amount,
    hands,
    phase: Phase.DEALING,
  };
}

const TEN_VALUE_RANKS = new Set(['10', 'J', 'Q', 'K']);

function handleDeal(state: GameState): GameState {
  if (state.phase !== Phase.DEALING) {
    throw new Error(`Cannot deal during ${state.phase}`);
  }

  let shoe = state.shoe;

  let playerCard1: Card, playerCard2: Card, dealerCard1: Card, dealerCard2: Card;
  [playerCard1, shoe] = draw(shoe);
  [dealerCard1, shoe] = draw(shoe);
  [playerCard2, shoe] = draw(shoe);
  [dealerCard2, shoe] = drawFaceDown(shoe);

  const playerCards = [playerCard1, playerCard2];
  const dealerCards = [dealerCard1, dealerCard2];

  const playerEval = evaluateHandFull(playerCards);
  const hands: Hand[] = [{ ...state.hands[0], cards: playerCards }];

  let newState: GameState = {
    ...state,
    shoe,
    hands,
    dealerHand: dealerCards,
    activeHandIndex: 0,
  };

  const dealerUpRank = dealerCard1.rank;
  const dealerShowsTenValue = TEN_VALUE_RANKS.has(dealerUpRank);

  if (playerEval.isBlackjack) {
    if (dealerUpRank === 'A') {
      // Even money offered; hole card revealed via PEEK after decision
      newState.evenMoneyOffered = true;
      newState.evenMoneyDecided = false;
      newState.phase = Phase.PEEKING;
      return newState;
    }
    if (dealerShowsTenValue) {
      // Dealer could have BJ; PEEK resolves after delay
      newState.phase = Phase.PEEKING;
      return newState;
    }
    // Dealer shows 2-9: BJ impossible, pay immediately
    const payout = hands[0].bet + hands[0].bet * state.config.blackjackPayout;
    newState.hands = [{ ...hands[0], result: Result.PLAYER_BLACKJACK }];
    newState.chips = newState.chips + payout;
    newState.stats = {
      ...newState.stats,
      blackjacks: newState.stats.blackjacks + 1,
      wins: newState.stats.wins + 1,
    };
    newState.phase = Phase.SETTLED;
    return newState;
  }

  if (dealerUpRank === 'A') {
    newState.insuranceOffered = true;
    newState.insuranceDecided = false;
    newState.phase = Phase.PEEKING;
    return newState;
  }

  if (dealerShowsTenValue) {
    newState.phase = Phase.PEEKING;
    return newState;
  }

  newState.phase = Phase.PLAYER_TURN;
  return newState;
}

function handlePeek(state: GameState): GameState {
  if (state.phase !== Phase.PEEKING) {
    throw new Error(`Cannot peek during ${state.phase}`);
  }

  const dealerEval = evaluateHandFull(state.dealerHand);
  const playerEval = evaluateHandFull(state.hands[0].cards);

  if (dealerEval.isBlackjack) {
    if (playerEval.isBlackjack) {
      return {
        ...state,
        hands: [{ ...state.hands[0], result: Result.PUSH }],
        dealerHand: revealDealerHand(state.dealerHand),
        chips: state.chips + state.hands[0].bet,
        stats: { ...state.stats, pushes: state.stats.pushes + 1 },
        phase: Phase.SETTLED,
      };
    }
    return {
      ...state,
      hands: [{ ...state.hands[0], result: Result.DEALER_WIN }],
      dealerHand: revealDealerHand(state.dealerHand),
      stats: { ...state.stats, losses: state.stats.losses + 1 },
      phase: Phase.SETTLED,
    };
  }

  if (playerEval.isBlackjack) {
    const payout = state.hands[0].bet + state.hands[0].bet * state.config.blackjackPayout;
    return {
      ...state,
      hands: [{ ...state.hands[0], result: Result.PLAYER_BLACKJACK }],
      dealerHand: revealDealerHand(state.dealerHand),
      chips: state.chips + payout,
      stats: {
        ...state.stats,
        blackjacks: state.stats.blackjacks + 1,
        wins: state.stats.wins + 1,
      },
      phase: Phase.SETTLED,
    };
  }

  // Neither has BJ: hole card stays face-down, player plays on
  return { ...state, phase: Phase.PLAYER_TURN };
}

function handleHit(state: GameState): GameState {
  if (state.phase !== Phase.PLAYER_TURN) {
    throw new Error(`Cannot hit during ${state.phase}`);
  }

  const hand = state.hands[state.activeHandIndex];
  if (hand.result !== null) {
    throw new Error('Hand already has a result');
  }

  let shoe = state.shoe;
  let card: Card;
  [card, shoe] = draw(shoe);

  const newCards = [...hand.cards, card];
  const eval_ = evaluateHandFull(newCards);

  const updatedHand: Hand = { ...hand, cards: newCards };
  const newHands = [...state.hands];
  newHands[state.activeHandIndex] = updatedHand;

  let newState: GameState = { ...state, shoe, hands: newHands };

  if (eval_.isBust) {
    newHands[state.activeHandIndex] = { ...updatedHand, result: Result.PLAYER_BUST };
    newState.hands = newHands;
    newState.stats = { ...newState.stats, losses: newState.stats.losses + 1 };
    return advanceHand(newState);
  }

  if (eval_.value === 21) {
    return advanceHand(newState);
  }

  return newState;
}

function handleStand(state: GameState): GameState {
  if (state.phase !== Phase.PLAYER_TURN) {
    throw new Error(`Cannot stand during ${state.phase}`);
  }
  return advanceHand(state);
}

function handleDoubleDown(state: GameState): GameState {
  if (state.phase !== Phase.PLAYER_TURN) {
    throw new Error(`Cannot double down during ${state.phase}`);
  }

  const hand = state.hands[state.activeHandIndex];
  if (hand.cards.length !== 2) {
    throw new Error('Can only double down on initial two cards');
  }
  if (state.chips < hand.bet) {
    throw new Error('Insufficient chips to double down');
  }

  let shoe = state.shoe;
  let card: Card;
  [card, shoe] = draw(shoe);

  const newCards = [...hand.cards, card];
  const eval_ = evaluateHandFull(newCards);

  const updatedHand: Hand = {
    ...hand,
    cards: newCards,
    bet: hand.bet * 2,
    isDoubled: true,
  };

  const newHands = [...state.hands];
  newHands[state.activeHandIndex] = updatedHand;

  let newState: GameState = {
    ...state,
    shoe,
    hands: newHands,
    chips: state.chips - hand.bet,
  };

  if (eval_.isBust) {
    newHands[state.activeHandIndex] = { ...updatedHand, result: Result.PLAYER_BUST };
    newState.hands = newHands;
    newState.stats = { ...newState.stats, losses: newState.stats.losses + 1 };
  }

  return advanceHand(newState);
}

function handleSplit(state: GameState): GameState {
  if (state.phase !== Phase.PLAYER_TURN) {
    throw new Error(`Cannot split during ${state.phase}`);
  }

  const hand = state.hands[state.activeHandIndex];
  if (!canSplit(hand, state.chips, state.hands.length, state.config.maxSplitHands)) {
    throw new Error('Cannot split this hand');
  }

  let shoe = state.shoe;
  let card1: Card, card2: Card;
  [card1, shoe] = draw(shoe);
  [card2, shoe] = draw(shoe);

  const isAces = hand.cards[0].rank === 'A';

  const hand1: Hand = {
    ...createEmptyHand(),
    cards: [hand.cards[0], card1],
    bet: hand.bet,
    fromSplit: true,
  };

  const hand2: Hand = {
    ...createEmptyHand(),
    cards: [hand.cards[1], card2],
    bet: hand.bet,
    fromSplit: true,
  };

  if (isAces) {
    const eval1 = evaluateHandFull(hand1.cards);
    const eval2 = evaluateHandFull(hand2.cards);

    if (eval1.isBust) hand1.result = Result.PLAYER_BUST;
    if (eval2.isBust) hand2.result = Result.PLAYER_BUST;
  }

  const newHands = [...state.hands];
  newHands.splice(state.activeHandIndex, 1, hand1, hand2);

  let newState: GameState = {
    ...state,
    shoe,
    hands: newHands,
    chips: state.chips - hand.bet,
  };

  if (isAces) {
    const allDone = newState.hands.every(
      (h) => h.result === Result.PLAYER_BUST || h.result === Result.SURRENDER || h.fromSplit
    );
    if (allDone && newState.hands.some((h) => h.result === null)) {
      return {
        ...newState,
        dealerHand: revealDealerHand(newState.dealerHand),
        phase: Phase.DEALER_TURN,
      };
    }
    return { ...newState, phase: Phase.RESOLVING };
  }

  return newState;
}

function handleInsurance(state: GameState): GameState {
  if (!state.insuranceOffered || state.insuranceDecided) {
    throw new Error('Insurance not available');
  }

  const insuranceBet = Math.floor(state.hands[0].bet / 2);
  if (state.chips < insuranceBet) {
    throw new Error('Insufficient chips for insurance');
  }

  const dealerEval = evaluateHandFull(state.dealerHand);

  let newState: GameState = {
    ...state,
    insuranceBet,
    insuranceDecided: true,
    chips: state.chips - insuranceBet,
  };

  if (dealerEval.isBlackjack) {
    const insurancePayout = insuranceBet + insuranceBet * state.config.insurancePayout;
    newState.chips += insurancePayout;

    const playerEval = evaluateHandFull(state.hands[0].cards);
    if (playerEval.isBlackjack) {
      newState.hands = [{ ...state.hands[0], result: Result.PUSH }];
      newState.chips += state.hands[0].bet;
      newState.stats = { ...newState.stats, pushes: newState.stats.pushes + 1 };
    } else {
      newState.hands = [{ ...state.hands[0], result: Result.DEALER_WIN }];
      newState.stats = { ...newState.stats, losses: newState.stats.losses + 1 };
    }
    newState.dealerHand = revealDealerHand(state.dealerHand);
    newState.phase = Phase.SETTLED;
    return newState;
  }

  return { ...newState, phase: Phase.PLAYER_TURN };
}

function handleDeclineInsurance(state: GameState): GameState {
  if (!state.insuranceOffered || state.insuranceDecided) {
    throw new Error('Insurance not available');
  }

  const dealerEval = evaluateHandFull(state.dealerHand);

  let newState: GameState = {
    ...state,
    insuranceDecided: true,
  };

  if (dealerEval.isBlackjack) {
    const playerEval = evaluateHandFull(state.hands[0].cards);
    if (playerEval.isBlackjack) {
      newState.hands = [{ ...state.hands[0], result: Result.PUSH }];
      newState.chips += state.hands[0].bet;
      newState.stats = { ...newState.stats, pushes: newState.stats.pushes + 1 };
    } else {
      newState.hands = [{ ...state.hands[0], result: Result.DEALER_WIN }];
      newState.stats = { ...newState.stats, losses: newState.stats.losses + 1 };
    }
    newState.dealerHand = revealDealerHand(state.dealerHand);
    newState.phase = Phase.SETTLED;
    return newState;
  }

  return { ...newState, phase: Phase.PLAYER_TURN };
}

function handleEvenMoney(state: GameState): GameState {
  if (!state.evenMoneyOffered || state.evenMoneyDecided) {
    throw new Error('Even money not available');
  }

  const bet = state.hands[0].bet;
  return {
    ...state,
    evenMoneyDecided: true,
    hands: [{ ...state.hands[0], result: Result.PLAYER_BLACKJACK }],
    dealerHand: revealDealerHand(state.dealerHand),
    chips: state.chips + bet * 2,
    stats: {
      ...state.stats,
      blackjacks: state.stats.blackjacks + 1,
      wins: state.stats.wins + 1,
    },
    phase: Phase.SETTLED,
  };
}

function handleDeclineEvenMoney(state: GameState): GameState {
  if (!state.evenMoneyOffered || state.evenMoneyDecided) {
    throw new Error('Even money not available');
  }

  const dealerEval = evaluateHandFull(state.dealerHand);

  let newState: GameState = {
    ...state,
    evenMoneyDecided: true,
  };

  if (dealerEval.isBlackjack) {
    newState.hands = [{ ...state.hands[0], result: Result.PUSH }];
    newState.dealerHand = revealDealerHand(state.dealerHand);
    newState.chips = newState.chips + state.hands[0].bet;
    newState.stats = { ...newState.stats, pushes: newState.stats.pushes + 1 };
    newState.phase = Phase.SETTLED;
    return newState;
  }

  const payout = state.hands[0].bet + state.hands[0].bet * state.config.blackjackPayout;
  newState.hands = [{ ...state.hands[0], result: Result.PLAYER_BLACKJACK }];
  newState.dealerHand = revealDealerHand(state.dealerHand);
  newState.chips = newState.chips + payout;
  newState.stats = {
    ...newState.stats,
    blackjacks: newState.stats.blackjacks + 1,
    wins: newState.stats.wins + 1,
  };
  newState.phase = Phase.SETTLED;
  return newState;
}

function handleSurrender(state: GameState): GameState {
  if (state.phase !== Phase.PLAYER_TURN) {
    throw new Error(`Cannot surrender during ${state.phase}`);
  }

  const hand = state.hands[state.activeHandIndex];
  if (hand.cards.length !== 2) {
    throw new Error('Can only surrender on initial two cards');
  }
  if (hand.fromSplit) {
    throw new Error('Cannot surrender a split hand');
  }

  const halfBet = Math.floor(hand.bet / 2);
  const updatedHand: Hand = { ...hand, result: Result.SURRENDER, isSurrendered: true };

  const newHands = [...state.hands];
  newHands[state.activeHandIndex] = updatedHand;

  return {
    ...state,
    hands: newHands,
    chips: state.chips + halfBet,
    stats: { ...state.stats, losses: state.stats.losses + 1 },
    phase: Phase.SETTLED,
  };
}

function handleDealerHit(state: GameState): GameState {
  if (state.phase !== Phase.DEALER_TURN) {
    throw new Error(`Dealer cannot hit during ${state.phase}`);
  }

  const dealerEval = evaluateHandFull(state.dealerHand);

  if (!dealerMustHit(state.dealerHand, state.config) || dealerEval.isBust) {
    return { ...state, phase: Phase.RESOLVING };
  }

  let shoe = state.shoe;
  let card: Card;
  [card, shoe] = draw(shoe);

  const newDealerHand = [...state.dealerHand, card];
  const newEval = evaluateHandFull(newDealerHand);

  let newState: GameState = {
    ...state,
    shoe,
    dealerHand: newDealerHand,
  };

  if (newEval.isBust || !dealerMustHit(newDealerHand, state.config)) {
    newState.phase = Phase.RESOLVING;
  }

  return newState;
}

function handleSettle(state: GameState): GameState {
  if (state.phase !== Phase.RESOLVING) {
    throw new Error(`Cannot settle during ${state.phase}`);
  }

  const dealerEval = evaluateHandFull(state.dealerHand);
  const dealerBust = dealerEval.isBust;

  let chips = state.chips;
  let stats = { ...state.stats };
  const settledHands: Hand[] = state.hands.map((hand) => {
    if (hand.result !== null) return hand;

    const playerEval = evaluateHandFull(hand.cards);

    if (dealerBust) {
      chips += hand.bet * 2;
      stats.wins++;
      return { ...hand, result: Result.DEALER_BUST };
    }

    if (playerEval.value > dealerEval.value) {
      chips += hand.bet * 2;
      stats.wins++;
      return { ...hand, result: Result.PLAYER_WIN };
    }

    if (playerEval.value < dealerEval.value) {
      stats.losses++;
      return { ...hand, result: Result.DEALER_WIN };
    }

    chips += hand.bet;
    stats.pushes++;
    return { ...hand, result: Result.PUSH };
  });

  return {
    ...state,
    hands: settledHands,
    chips,
    stats,
    phase: Phase.SETTLED,
  };
}

function handleNewRound(state: GameState): GameState {
  if (state.phase !== Phase.SETTLED) {
    throw new Error(`Cannot start new round during ${state.phase}`);
  }

  let shoe = state.shoe;
  if (needsReshuffle(shoe, state.config.deckCount, state.config.reshuffleThreshold)) {
    shoe = createShoe(state.config.deckCount);
  }

  return {
    ...state,
    shoe,
    phase: Phase.BETTING,
    hands: [createEmptyHand()],
    activeHandIndex: 0,
    dealerHand: [],
    insuranceBet: 0,
    insuranceOffered: false,
    insuranceDecided: false,
    evenMoneyOffered: false,
    evenMoneyDecided: false,
  };
}

function handleRebuy(state: GameState): GameState {
  if (state.phase !== Phase.SETTLED) {
    throw new Error(`Cannot rebuy during ${state.phase}`);
  }
  if (state.chips >= state.config.minimumBet) {
    throw new Error('Cannot rebuy when you still have chips to play');
  }

  return {
    ...state,
    chips: state.config.startingChips,
  };
}

// --- Main reducer ---

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case Action.PLACE_BET:
      return handlePlaceBet(state, action.payload);
    case Action.DEAL:
      return handleDeal(state);
    case Action.PEEK:
      return handlePeek(state);
    case Action.HIT:
      return handleHit(state);
    case Action.STAND:
      return handleStand(state);
    case Action.DOUBLE_DOWN:
      return handleDoubleDown(state);
    case Action.SPLIT:
      return handleSplit(state);
    case Action.INSURANCE:
      return handleInsurance(state);
    case Action.DECLINE_INSURANCE:
      return handleDeclineInsurance(state);
    case Action.EVEN_MONEY:
      return handleEvenMoney(state);
    case Action.DECLINE_EVEN_MONEY:
      return handleDeclineEvenMoney(state);
    case Action.SURRENDER:
      return handleSurrender(state);
    case Action.DEALER_HIT:
      return handleDealerHit(state);
    case Action.SETTLE:
      return handleSettle(state);
    case Action.NEW_ROUND:
      return handleNewRound(state);
    case Action.REBUY:
      return handleRebuy(state);
    default:
      throw new Error(`Unknown action: ${(action as GameAction).type}`);
  }
}

// --- Exported helpers for UI ---

export function canSplit(hand: Hand, chips: number, totalHands = 1, maxSplitHands = 4): boolean {
  if (hand.cards.length !== 2) return false;
  if (totalHands >= maxSplitHands) return false;
  const rank1 = hand.cards[0].rank;
  const rank2 = hand.cards[1].rank;
  const val1 = ['10', 'J', 'Q', 'K'].includes(rank1) ? '10' : rank1;
  const val2 = ['10', 'J', 'Q', 'K'].includes(rank2) ? '10' : rank2;
  return val1 === val2 && chips >= hand.bet;
}

export function canDoubleDown(hand: Hand, chips: number): boolean {
  return hand.cards.length === 2 && chips >= hand.bet;
}

export function canSurrender(hand: Hand): boolean {
  return hand.cards.length === 2 && !hand.fromSplit;
}

export function isBankrupt(chips: number, minimumBet: number): boolean {
  return chips < minimumBet;
}
