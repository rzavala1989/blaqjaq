import { useEffect, useRef } from 'react';
import { Phase, DENOMINATIONS } from '../game/constants';
import { playChipClick } from '../utils/sounds';
import type { useBlackjack } from './useBlackjack';

type Game = ReturnType<typeof useBlackjack>;

export interface ShortcutDeps {
  game: Game;
  dealtReady: boolean;
  currentBet: number;
  addToBet: (n: number) => void;
  clearBet: () => void;
  onDeal: () => void;
  onToggleTendencies: () => void;
}

// Low denomination first, so 1 = smallest chip
const KEY_DENOMS = [...DENOMINATIONS].sort((a, b) => a - b);

export function useKeyboardShortcuts(deps: ShortcutDeps): void {
  const depsRef = useRef(deps);
  depsRef.current = deps;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const target = e.target as HTMLElement | null;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable
      ) {
        return;
      }

      const { game, dealtReady, currentBet, addToBet, clearBet, onDeal, onToggleTendencies } =
        depsRef.current;
      const key = e.key.toLowerCase();
      const isBetting = game.phase === Phase.BETTING;

      if (key === 't') {
        onToggleTendencies();
        return;
      }

      if (game.showInsurance && dealtReady) {
        if (key === 'i') game.insurance();
        if (key === 'n') game.declineInsurance();
        return;
      }

      if (game.showEvenMoney && dealtReady) {
        if (key === 'y') game.evenMoney();
        if (key === 'n') game.declineEvenMoney();
        return;
      }

      if (key === ' ') {
        e.preventDefault();
        if (isBetting && dealtReady && !game.bankrupt && game.chips >= currentBet) {
          onDeal();
        } else if (game.phase === Phase.SETTLED && dealtReady && !game.bankrupt) {
          game.newRound();
        }
        return;
      }

      if (isBetting) {
        const denomIndex = ['1', '2', '3', '4'].indexOf(key);
        if (denomIndex !== -1) {
          const denom = KEY_DENOMS[denomIndex];
          if (currentBet + denom <= game.config.maximumBet && currentBet + denom <= game.chips) {
            addToBet(denom);
            playChipClick();
          }
          return;
        }
        if (key === 'c') {
          clearBet();
          return;
        }
      }

      if (!dealtReady) return;

      switch (key) {
        case 'h':
          if (game.canHit) game.hit();
          break;
        case 's':
          if (game.canStand) game.stand();
          break;
        case 'd':
          if (game.canDouble) game.doubleDown();
          break;
        case 'p':
          if (game.canSplitHand) game.split();
          break;
        case 'r':
          if (game.canSurrenderHand) game.surrender();
          break;
        case 'b':
          if (game.bankrupt) game.rebuy();
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
