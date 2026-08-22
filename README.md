# Blaqjaq

**3D blackjack with a 1951 Flamingo-era aesthetic.** A pure reducer game engine with full basic strategy analysis, session analytics, procedural audio, and a film noir Three.js scene built with React Three Fiber.

**[Play Live](https://blaqjaq.vercel.app)** &nbsp;|&nbsp; **Built with:** React 19, TypeScript, Three.js, React Three Fiber, Vite 8, Vitest

<br/>

## Why This Exists

Most browser blackjack games are DOM-based card flippers with minimal game logic. Blaqjaq is a complete blackjack simulation: multi-deck shoes with configurable penetration, insurance/even money/surrender/split mechanics, a full basic strategy engine that evaluates every decision you make, and session analytics that track your tendencies across hard/soft/pair hands. The 3D scene exists because the game deserved better than a green rectangle.

<br/>

## Architecture

The codebase enforces a strict separation between the game engine and everything else. The engine has zero React or DOM dependencies. You could rip `src/game/` out and run it in a terminal.

```
┌──────────────────────────────────────────────────────────────┐
│  3D Scene Layer (React Three Fiber)                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐   │
│  │ Table    │ │ Cards    │ │ Chip     │ │ Set Dressing  │   │
│  │ (GLTF)  │ │ (dealt,  │ │ Tray     │ │ (whiskey,     │   │
│  │         │ │  spring  │ │ (dynamic │ │  fedora,      │   │
│  │         │ │  anims)  │ │  stacks) │ │  Colt 1911)   │   │
│  └──────────┘ └──────────┘ └──────────┘ └───────────────┘   │
│  Lighting: ACESFilmic tonemapping, PCF shadows, volumetric  │
│  Post-processing: bloom, vignette, film grain               │
├──────────────────────────────────────────────────────────────┤
│  UI Layer (styled-components, react-spring)                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐   │
│  │ Betting  │ │ Stats    │ │ Result   │ │ Tendencies    │   │
│  │ Panel    │ │ Panel    │ │ Flash    │ │ Panel (slide  │   │
│  │          │ │ + streak │ │ overlay  │ │ out analytics)│   │
│  └──────────┘ └──────────┘ └──────────┘ └───────────────┘   │
├──────────────────────────────────────────────────────────────┤
│  Orchestrator: Scene.tsx                                     │
│  Owns: betting state, animation gating, streak tracking,     │
│  score formatting, shuffle detection, debug flags             │
├──────────────────────────────────────────────────────────────┤
│  React Binding: useBlackjack hook                            │
│  Wraps reducer in useReducer, auto-plays dealer via          │
│  useEffect with 800ms delays between dealer hits              │
├──────────────────────────────────────────────────────────────┤
│  Analytics Wrapper: instrumentedReducer                      │
│  Intercepts SETTLED transitions, appends HandRecord,          │
│  recomputes SessionStats. Zero game logic changes.            │
├──────────────────────────────────────────────────────────────┤
│  Pure Game Engine (src/game/)                                │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  gameEngine.ts    782 lines, 14 action types         │    │
│  │  basicStrategy.ts  Full hard/soft/pair lookup tables │    │
│  │  analytics.ts      Session stats, hand records,      │    │
│  │                    optimal play tracking              │    │
│  │  counting.ts       Hi-Lo running/true count           │    │
│  │  persistence.ts    localStorage session save/load     │    │
│  │  scoring.ts        Hand evaluation (soft/hard/bust)  │    │
│  │  deck.ts           Multi-deck shoe, Fisher-Yates     │    │
│  │  constants.ts      Config, denominations, phases     │    │
│  └──────────────────────────────────────────────────────┘    │
│  158 unit tests across 7 test files                          │
│  Zero React. Zero DOM. Pure (state, action) => state.        │
└──────────────────────────────────────────────────────────────┘
```

<br/>

## Technical Highlights

### Pure Reducer Game Engine
The entire game state machine is a single `(state, action) => state` reducer. 14 action types cover the full blackjack action space: `PLACE_BET`, `DEAL`, `PEEK`, `HIT`, `STAND`, `DOUBLE_DOWN`, `SPLIT`, `INSURANCE`, `DECLINE_INSURANCE`, `EVEN_MONEY`, `DECLINE_EVEN_MONEY`, `SURRENDER`, `DEALER_HIT`, `SETTLE`, `NEW_ROUND`. Each action is guarded by phase checks. The reducer never throws; invalid actions return the current state unchanged.

The engine handles edge cases that most implementations skip: insurance offered only on dealer ace showing, even money offered only on player blackjack against dealer ace, surrender available only as first action, split hands that can be re-split, double-down-after-split, and auto-reshuffle when shoe penetration drops below threshold.

### Basic Strategy Engine
Complete lookup tables for hard totals (5-21), soft totals (13-21), and pair splits (2-A) against every dealer upcard (2-A). The engine accounts for action availability: if the table says "double" but doubling isn't available (post-split, 3+ cards), it downgrades to the correct fallback (hit or stand depending on `D` vs `Ds`). Same for surrender fallbacks (`R` to hit, `Rs` to stand).

Every hand played is evaluated against the optimal action. The analytics system tracks your optimal play rate broken down by hand type (hard/soft/pair), giving you a real measure of how well you're playing basic strategy.

### Session Analytics
The `SessionStats` system tracks 15+ metrics per session: win rate, player/dealer bust rates, net P&L, peak/valley chip counts, average bet, chip history for charting, and optimal play rate by hand type. Each hand is recorded as a `HandRecord` with full context: cards, scores, actions taken, optimal action, shoe depth, whether it was a split/double/surrender/insurance hand.

The Tendencies Panel surfaces these analytics visually with recharts: P&L curves, action frequency breakdowns, and hard/soft/pair optimal play percentages. It's designed to answer "where am I leaking money?"

### 3D Scene
Built with React Three Fiber and drei. Five GLTF models (blackjack table, chip tray, whiskey glass, fedora hat, Colt 1911) compose the table scene. Cards are procedurally rendered with dynamic face textures. The camera runs an intro animation on load. Lighting uses ACES filmic tone mapping with PCF shadows. Post-processing adds optional bloom, vignette, and film grain, all toggleable from the debug panel for performance profiling.

### Procedural Audio
Sound effects are generated with the Web Audio API, not pre-recorded samples. Card dealing, chip stacking, and shuffle sounds are synthesized at runtime.

### Trainer
Two opt-in training layers, both persisted across sessions. Coach mode highlights the basic-strategy-optimal button on every decision, including decline-insurance and decline-even-money. The count trainer maintains a Hi-Lo running count in the engine (face-up cards only, banked across rounds, reset on reshuffle) and quizzes you on it every fifth hand, tracking your accuracy alongside your optimal play rate. Chips, stats, and hand history survive reloads via localStorage; the shoe is always fresh so the count starts clean.

<br/>

## Key Engineering Decisions

| Decision | Rationale |
|----------|-----------|
| **Pure reducer over state machine library** | 782 lines of explicit transitions are easier to test and reason about than XState config for a game with 14 actions. Every state transition is a function call with no subscriptions or side effects |
| **Instrumented reducer pattern** | Analytics capture wraps the game reducer without touching game logic. Adding new metrics requires zero changes to the engine |
| **React Three Fiber over raw Three.js** | Declarative scene graph matches React mental model. GLTF models load via drei hooks. Camera animation uses useFrame |
| **styled-components over Tailwind** | UI panels overlay a 3D canvas. CSS-in-JS scoping prevents style leaks between the DOM overlay and the WebGL layer |
| **Vitest over Jest** | Native ESM, Vite-aligned config, faster test execution for the 159-test suite |
| **GLTF models over procedural geometry** | Authentic set dressing (whiskey glass, fedora, 1911) sells the aesthetic in ways that boxes and cylinders can't |

<br/>

## Testing

158 tests across 7 test files covering the entire game engine:

| File | Tests | Coverage |
|------|-------|----------|
| `gameEngine.test.ts` | 57 | Full game lifecycle: deal, hit, stand, double, split, surrender, insurance, even money, settlement, edge cases |
| `basicStrategy.test.ts` | 46 | Lookup table correctness for hard/soft/pair decisions, fallback downgrades when actions unavailable |
| `analytics.test.ts` | 13 | Session stat computation, hand record creation, optimal play detection |
| `counting.test.ts` | 13 | Hi-Lo values, face-down exclusion, true count conversion, cross-round count banking, reshuffle reset |
| `deck.test.ts` | 10 | Shoe creation, draw mechanics, reshuffle threshold |
| `scoring.test.ts` | 13 | Hand evaluation: soft/hard detection, ace revaluation, bust, blackjack |
| `persistence.test.ts` | 6 | Session round-trips, corrupt data handling, history cap |

```bash
npm test        # run all tests
npm run dev     # development server
npm run build   # production build
```

<br/>

## Stack

| Layer | Tech |
|-------|------|
| UI Framework | React 19 |
| 3D | Three.js via @react-three/fiber + drei |
| Post-processing | @react-three/postprocessing (bloom, vignette) |
| Animation | react-spring, GSAP |
| Styling | styled-components v6 |
| Charts | recharts v3 |
| Build | Vite 6 |
| Testing | Vitest |
| Language | TypeScript (strict) |
| Deployment | Vercel |

<br/>

## Project Structure

```
src/
  game/                  Pure game engine (zero React dependencies)
    gameEngine.ts        State reducer: 14 actions, phase guards, settlement
    basicStrategy.ts     Hard/soft/pair lookup tables, optimal action resolution
    analytics.ts         Session stats, hand records, optimal play tracking
    counting.ts          Hi-Lo card counting (running count, true count)
    persistence.ts       localStorage session save/load with validation
    scoring.ts           Hand evaluation (soft, hard, bust, blackjack)
    deck.ts              Multi-deck shoe, Fisher-Yates shuffle
    constants.ts         Phases, actions, results, chip denominations, config
    instrumentedReducer  Analytics and count wrapper around game reducer
    *.test.ts            158 unit tests

  components/
    Scene.tsx            Orchestrator (betting, animations, streaks, trainer, debug)
    GameTable.tsx        R3F Canvas wrapper (models, cards, lighting)
    GameControls.tsx     Hit/Stand/Double/Split/Surrender buttons, coach hints
    BettingPanel.tsx     Chip denomination selector
    StatsPanel.tsx       Session stats overlay
    TendenciesPanel.tsx  Analytics slide-out with charts (lazy-loaded)
    TrainerPanel.tsx     Coach and count trainer toggles, session reset
    CountCheck.tsx       Running count quiz prompt
    ResultFlash.tsx      Win/lose/push animated overlay
    DebugPanel.tsx       Performance toggles (shadows, grain, post-fx)
    Hand.tsx             Card fan layout
    models/              GLTF model components (table, cards, chips, props)

  hooks/
    useBlackjack.ts      React binding for game reducer, dealer auto-play, persistence
    useKeyboardShortcuts.ts  Full keyboard control (H/S/D/P/R, chips, deal)
    useSounds.ts         Web Audio API procedural sound effects

  styled/                styled-components definitions
  utils/                 Audio synthesis helpers
```

<br/>

## License

ISC
