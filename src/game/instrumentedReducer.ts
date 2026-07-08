import { Phase, Action } from './constants';
import type { ActionValue } from './constants';
import { gameReducer } from './gameEngine';
import type { GameState, GameAction } from './gameEngine';
import { buildHandRecord, deriveSessionStats } from './analytics';
import { roundVisibleCount } from './counting';

const PLAYER_ACTIONS = new Set<string>([
  Action.HIT,
  Action.STAND,
  Action.DOUBLE_DOWN,
  Action.SPLIT,
  Action.SURRENDER,
]);

export function instrumentedReducer(state: GameState, action: GameAction): GameState {
  const prevPhase = state.phase;

  // 1. Track player actions before dispatch
  let currentHandActions: ActionValue[] = state.currentHandActions;
  if (PLAYER_ACTIONS.has(action.type)) {
    currentHandActions = [...currentHandActions, action.type as ActionValue];
  }

  // 2. Capture chipsBefore at PLACE_BET (before deduction)
  let chipsBefore = state.chipsBefore;
  if (action.type === Action.PLACE_BET) {
    chipsBefore = state.chips;
  }

  // 3. Run the real reducer with updated tracking fields
  let next = gameReducer({ ...state, currentHandActions, chipsBefore }, action);

  // 4. Detect transition to SETTLED: build hand records
  if (next.phase === Phase.SETTLED && prevPhase !== Phase.SETTLED) {
    const newRecords = next.hands.map((_, i) =>
      buildHandRecord(
        next,
        i,
        next.handHistory.length + i + 1,
        next.currentHandActions,
        next.chipsBefore,
      )
    );
    const handHistory = [...next.handHistory, ...newRecords];
    next = {
      ...next,
      handHistory,
      sessionStats: deriveSessionStats(handHistory, next.config),
    };
  }

  // 5. On NEW_ROUND: bank the round's visible cards into the running
  // count (prev state still holds them), reset on reshuffle, clear actions
  if (action.type === Action.NEW_ROUND) {
    const reshuffled = next.shoe.length > state.shoe.length;
    const countBase = reshuffled ? 0 : state.countBase + roundVisibleCount(state);
    next = { ...next, currentHandActions: [], countBase };
  }

  return next;
}
