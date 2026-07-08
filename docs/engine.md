# Game Engine

## Files

- `gameEngine.ts` - Pure reducer: `(state, action) => state`
- `constants.ts` - Phases, actions, results, default config
- `deck.ts` - Card type, shoe creation, draw logic
- `scoring.ts` - Hand evaluation (value, soft, blackjack, bust)

## Phase State Machine

```
BETTING → DEALING → PEEKING → PLAYER_TURN → DEALER_TURN → RESOLVING → SETTLED → BETTING
```

- **BETTING**: Player places bet via PLACE_BET action
- **DEALING**: Initial 4-card deal (P, D, P, D)
- **PEEKING**: Check for dealer blackjack (dealer's hole card stays face-down)
- **PLAYER_TURN**: Hit, Stand, Double Down, Split, Surrender
- **DEALER_TURN**: Dealer auto-plays (hits soft 17 by default, 800ms delays)
- **RESOLVING**: Compare hands, calculate payouts
- **SETTLED**: Display results, wait for NEW_ROUND

## Config (`DEFAULT_CONFIG`)

| Key | Default | Description |
|---|---|---|
| deckCount | 6 | Cards in shoe (6 * 52 = 312) |
| reshuffleThreshold | 0.75 | Reshuffle when 75% dealt |
| startingChips | 1000 | Initial balance |
| minimumBet | 10 | Floor for bets |
| maximumBet | 500 | Ceiling for bets |
| blackjackPayout | 1.5 | 3:2 blackjack |
| dealerHitsSoft17 | true | H17 rule |

## Analytics Layer

Two additional modules extend the engine without touching its logic:

- `basicStrategy.ts` - Vegas Strip 6-deck H17 DAS late-surrender lookup tables. `getOptimalAction(playerCards, dealerUpcard, canDouble, canSplit, canSurrender)` returns the correct `ActionValue` with full downgrade logic (D to H if no double available, R to H if no surrender, P to hard/soft fallback if no split). Tables include hard 4 and soft 12 rows so unsplittable low pairs (2,2 and A,A) resolve without falling off the chart.
- `analytics.ts` - `HandRecord` and `SessionStats` types plus `buildHandRecord` and `deriveSessionStats` pure functions.
- `counting.ts` - Hi-Lo card counting. `hiLoValue(card)`, `roundVisibleCount(state)` (face-up cards only; an unrevealed hole card is never counted), `runningCount(state)`, `trueCount(running, shoeLength)`. `GameState.countBase` carries the count across rounds; `instrumentedReducer` banks each round's visible cards into it on NEW_ROUND and resets it on reshuffle.
- `persistence.ts` - localStorage session save/load. Chips, W/L stats, and hand history (capped at 500 records) survive reloads; the shoe is always fresh on load so the count starts clean. Versioned blob with shape validation, corrupt data falls back to a new session.
- `instrumentedReducer.ts` - Wraps `gameReducer`. Detects every `prevPhase !== SETTLED, nextPhase === SETTLED` transition and appends records to `handHistory`, recomputing `sessionStats`. Also tracks `currentHandActions`, `chipsBefore`, and `countBase` per round.

## Testing

158 engine tests via Vitest. Deterministic shoes built with reversed arrays so the first card drawn is predictable. Tests cover: scoring edge cases, bust detection, blackjack detection, split/double logic, payout calculations, shoe reshuffling, basic strategy known hands and downgrade logic, analytics record building and session stat derivation, Hi-Lo count values and cross-round banking, persistence round-trips and corrupt-data handling.
