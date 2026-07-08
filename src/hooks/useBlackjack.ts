import { useState, useCallback, useEffect, useMemo } from 'react';
import { createInitialState, canSplit, canDoubleDown, canSurrender, isBankrupt } from '../game/gameEngine';
import { instrumentedReducer } from '../game/instrumentedReducer';
import type { GameState, GameAction } from '../game/gameEngine';
import { Phase, Action } from '../game/constants';
import type { GameConfig } from '../game/constants';
import { evaluateHand, evaluateHandFull } from '../game/scoring';
import { saveSession, loadSession, clearSession } from '../game/persistence';
import { deriveSessionStats } from '../game/analytics';

// Restore chips, stats, and history from a prior sitting; the shoe is
// always fresh, so the count starts clean
function hydratedInitialState(config: Partial<GameConfig>): GameState {
  const initial = createInitialState(config);
  const saved = loadSession();
  if (!saved) return initial;
  return {
    ...initial,
    chips: saved.chips,
    chipsBefore: saved.chips,
    stats: saved.stats,
    handHistory: saved.handHistory,
    sessionStats: deriveSessionStats(saved.handHistory, initial.config),
  };
}

export function useBlackjack(config: Partial<GameConfig> = {}) {
  const [state, setState] = useState<GameState>(() => hydratedInitialState(config));

  const dispatch = useCallback((action: GameAction) => {
    setState(prev => instrumentedReducer(prev, action));
  }, []);

  const resetGame = useCallback(() => {
    setState(createInitialState(config));
  }, [config]);

  const resetSession = useCallback(() => {
    clearSession();
    setState(createInitialState(config));
  }, [config]);

  // Persist at settlement (covers rebuy too, which only happens while settled)
  useEffect(() => {
    if (state.phase === Phase.SETTLED) {
      saveSession(state);
    }
  }, [state.phase, state.chips]);

  // Atomic bet + deal in a single state update — avoids two-step setState in UI
  const dealRound = useCallback((amount: number) => {
    setState(prev => {
      const afterBet = instrumentedReducer(prev, { type: Action.PLACE_BET, payload: amount });
      return instrumentedReducer(afterBet, { type: Action.DEAL });
    });
  }, []);

  const activeHand = state.hands[state.activeHandIndex] || null;

  const playerEval = useMemo(
    () => (activeHand && activeHand.cards.length > 0 ? evaluateHandFull(activeHand.cards) : null),
    [activeHand]
  );

  const dealerEval = useMemo(
    () => (state.dealerHand.length > 0 ? evaluateHand(state.dealerHand) : null),
    [state.dealerHand]
  );

  const dealerFullEval = useMemo(
    () => (state.dealerHand.length > 0 ? evaluateHandFull(state.dealerHand) : null),
    [state.dealerHand]
  );

  useEffect(() => {
    if (state.phase !== Phase.PEEKING) return;
    if (state.insuranceOffered && !state.insuranceDecided) return;
    if (state.evenMoneyOffered && !state.evenMoneyDecided) return;
    const timer = setTimeout(() => {
      dispatch({ type: Action.PEEK });
    }, 1500);
    return () => clearTimeout(timer);
  }, [state.phase, state.insuranceDecided, state.evenMoneyDecided]);

  useEffect(() => {
    if (state.phase === Phase.DEALER_TURN) {
      const timer = setTimeout(() => {
        dispatch({ type: Action.DEALER_HIT });
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [state.phase, state.dealerHand.length]);

  useEffect(() => {
    if (state.phase === Phase.RESOLVING) {
      const timer = setTimeout(() => {
        dispatch({ type: Action.SETTLE });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [state.phase]);

  const placeBet = useCallback((amount: number) => {
    dispatch({ type: Action.PLACE_BET, payload: amount });
  }, []);

  const deal = useCallback(() => {
    dispatch({ type: Action.DEAL });
  }, []);

  const hit = useCallback(() => {
    dispatch({ type: Action.HIT });
  }, []);

  const stand = useCallback(() => {
    dispatch({ type: Action.STAND });
  }, []);

  const doubleDown = useCallback(() => {
    dispatch({ type: Action.DOUBLE_DOWN });
  }, []);

  const split = useCallback(() => {
    dispatch({ type: Action.SPLIT });
  }, []);

  const insurance = useCallback(() => {
    dispatch({ type: Action.INSURANCE });
  }, []);

  const declineInsurance = useCallback(() => {
    dispatch({ type: Action.DECLINE_INSURANCE });
  }, []);

  const evenMoney = useCallback(() => {
    dispatch({ type: Action.EVEN_MONEY });
  }, []);

  const declineEvenMoney = useCallback(() => {
    dispatch({ type: Action.DECLINE_EVEN_MONEY });
  }, []);

  const surrender = useCallback(() => {
    dispatch({ type: Action.SURRENDER });
  }, []);

  const newRound = useCallback(() => {
    dispatch({ type: Action.NEW_ROUND });
  }, []);

  const rebuy = useCallback(() => {
    dispatch({ type: Action.REBUY });
  }, []);

  const isPlayerTurn = state.phase === Phase.PLAYER_TURN;
  const handActive = isPlayerTurn && activeHand && activeHand.result === null;
  const showInsurance = state.insuranceOffered && !state.insuranceDecided;
  const showEvenMoney = state.evenMoneyOffered && !state.evenMoneyDecided;
  const bankrupt = state.phase === Phase.BETTING && isBankrupt(state.chips, state.config.minimumBet);

  return {
    ...state,
    activeHand,
    playerEval,
    dealerEval,
    dealerFullEval,

    resetGame,
    resetSession,
    dealRound,
    placeBet,
    deal,
    hit,
    stand,
    doubleDown,
    split,
    insurance,
    declineInsurance,
    evenMoney,
    declineEvenMoney,
    surrender,
    newRound,
    rebuy,

    canHit: handActive && !showInsurance && !showEvenMoney,
    canStand: handActive && !showInsurance && !showEvenMoney,
    canDouble: handActive && !showInsurance && !showEvenMoney && activeHand && canDoubleDown(activeHand, state.chips),
    canSplitHand: handActive && !showInsurance && !showEvenMoney && activeHand && canSplit(activeHand, state.chips, state.hands.length, state.config.maxSplitHands),
    canSurrenderHand: handActive && !showInsurance && !showEvenMoney && activeHand && canSurrender(activeHand),
    showInsurance,
    showEvenMoney,
    bankrupt,
  };
}
