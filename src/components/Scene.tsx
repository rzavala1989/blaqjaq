import { useState, useEffect, useRef, useCallback, useMemo, lazy, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';

import { useBlackjack } from '../hooks/useBlackjack';
import { useSounds } from '../hooks/useSounds';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { GameTable } from './GameTable';
import { GameControls } from './GameControls';
import { ResultFlash } from './ResultFlash';
import { StatsPanel } from './StatsPanel';
import { TableStatePanel } from './TableStatePanel';
import { DebugPanel, DEFAULT_DEBUG } from './DebugPanel';
import type { DebugFlags } from './DebugPanel';
import {
  TrainerPanel,
  loadTrainerState,
  saveTrainerState,
} from './TrainerPanel';
import type { TrainerPrefs, CountCheckStats } from './TrainerPanel';
import { CountCheck } from './CountCheck';
import { Phase, Action } from '../game/constants';
import type { ActionValue } from '../game/constants';
import { getOptimalAction } from '../game/basicStrategy';
import { runningCount, trueCount } from '../game/counting';
import { SceneWrapper, SceneNotification, SceneHeader, PanelToggleButton } from '../styled/styled-components';

const TendenciesPanelLazy = lazy(() =>
  import('./TendenciesPanel').then(m => ({ default: m.TendenciesPanel }))
);

const NOTIFICATION_DURATION_MS = 3000;
const DEAL_READY_MS = 1250;
const HIT_READY_MS = 600;
const SHUFFLE_ANIM_MS = 1500;
const COUNT_CHECK_EVERY_N_HANDS = 5;

type HandEval = { value: number; isSoft: boolean; isBlackjack: boolean; isBust: boolean } | null;

function formatScore(eval_: HandEval): string {
  if (!eval_ || eval_.value === 0) return '';
  if (eval_.isBlackjack) return 'BJ';
  if (eval_.isBust) return 'BUST';
  if (eval_.isSoft && eval_.value !== 21) return `${eval_.value - 10}/${eval_.value}`;
  return String(eval_.value);
}

// Keeps the flag true for holdMs after the source goes false, so
// trailing animation frames render before the loop drops to demand
function useHeldFlag(active: boolean, holdMs: number): boolean {
  const [held, setHeld] = useState(active);
  useEffect(() => {
    if (active) {
      setHeld(true);
      return;
    }
    const timer = setTimeout(() => setHeld(false), holdMs);
    return () => clearTimeout(timer);
  }, [active, holdMs]);
  return held;
}

export default function Scene() {
  const game = useBlackjack();

  const [controlsReady, setControlsReady] = useState(false);
  const [shuffleKey, setShuffleKey] = useState(0);
  const [roundKey, setRoundKey] = useState(0);
  const [notification, setNotification] = useState<string | null>(null);
  const [dealtReady, setDealtReady] = useState(true);
  const [shuffleAnimating, setShuffleAnimating] = useState(false);

  // Debug panel
  const [debugFlags, setDebugFlags] = useState<DebugFlags>(DEFAULT_DEBUG);
  const [debugOpen, setDebugOpen] = useState(false);

  // Tendencies panel: chunk loads on first open (recharts stays out of the
  // main bundle until then)
  const [showTendencies, setShowTendencies] = useState(false);

  const toggleTendencies = useCallback(() => {
    setShowTendencies(o => !o);
  }, []);

  // Trainer: coach hints and count trainer
  const [trainerOpen, setTrainerOpen] = useState(false);
  const [trainerPrefs, setTrainerPrefs] = useState<TrainerPrefs>(() => loadTrainerState().prefs);
  const [countChecks, setCountChecks] = useState<CountCheckStats>(
    () => loadTrainerState().countChecks
  );
  const [countQuiz, setCountQuiz] = useState<{ actual: number; trueC: number } | null>(null);

  useEffect(() => {
    saveTrainerState(trainerPrefs, countChecks);
  }, [trainerPrefs, countChecks]);

  // Betting state
  // A wager starts empty. Previously the minimum bet was preloaded, which
  // made a tap on the 100 chip read as a surprising $110 wager.
  const [currentBet, setCurrentBet] = useState(0);

  const addToBet = useCallback((n: number) => {
    setCurrentBet(prev => Math.min(prev + n, game.config.maximumBet, game.chips));
  }, [game.config.maximumBet, game.chips]);

  const clearBet = useCallback(() => {
    setCurrentBet(0);
  }, []);

  const handleDeal = useCallback(() => {
    if (currentBet < game.config.minimumBet) return;
    game.dealRound(currentBet);
    clearBet();
  }, [currentBet, game, clearBet, game.config.minimumBet]);

  // Result flash state
  const [flashResult, setFlashResult] = useState<string | null>(null);
  const [flashKey, setFlashKey] = useState(0);

  // Stats tracking
  const streakRef = useRef<{ type: 'W' | 'L' | null; count: number }>({ type: null, count: 0 });
  const [streakDisplay, setStreakDisplay] = useState<{ type: 'W' | 'L' | null; count: number }>({ type: null, count: 0 });

  const notifTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const dealtReadyTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const shuffleTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const prevShoeLengthRef = useRef(game.shoe.length);
  const prevCardCountRef = useRef(0);
  const prevPhaseRef = useRef(game.phase);

  const totalCardCount = useMemo(
    () => game.hands.reduce((s, h) => s + h.cards.length, 0) + game.dealerHand.length,
    [game.hands, game.dealerHand]
  );

  // Compute formatted scores for 3D pills and panels
  const hasDealerCards = game.dealerHand.length > 0;
  const hasPlayerCards = (game.hands[0]?.cards.length ?? 0) > 0;

  const dealerScoreStr = useMemo(() => {
    if (!hasDealerCards) return '';
    if (game.phase === Phase.PEEKING && game.dealerHand.some(c => c.faceDown)) return '?';
    return formatScore(game.dealerEval);
  }, [hasDealerCards, game.phase, game.dealerHand, game.dealerEval]);

  const playerScoreStr = useMemo(() => {
    if (!hasPlayerCards) return '';
    return formatScore(game.playerEval);
  }, [hasPlayerCards, game.playerEval]);

  // Coach: the optimal action for the current decision, or null
  const coachTarget = useMemo((): ActionValue | null => {
    if (!trainerPrefs.coach) return null;
    if (game.showEvenMoney) return Action.DECLINE_EVEN_MONEY;
    if (game.showInsurance) return Action.DECLINE_INSURANCE;
    if (game.phase !== Phase.PLAYER_TURN) return null;
    const hand = game.activeHand;
    if (!hand || hand.cards.length < 2 || !game.dealerHand[0]) return null;
    try {
      return getOptimalAction(
        hand.cards,
        game.dealerHand[0],
        !!game.canDouble,
        !!game.canSplitHand,
        !!game.canSurrenderHand
      );
    } catch {
      return null;
    }
  }, [
    trainerPrefs.coach,
    game.showEvenMoney,
    game.showInsurance,
    game.phase,
    game.activeHand,
    game.dealerHand,
    game.canDouble,
    game.canSplitHand,
    game.canSurrenderHand,
  ]);

  // Watch phase for result flash, streak tracking, and count checks
  useEffect(() => {
    const prevPhase = prevPhaseRef.current;
    prevPhaseRef.current = game.phase;

    if (game.phase === Phase.SETTLED && prevPhase !== Phase.SETTLED) {
      const result = game.hands[0]?.result;
      if (result) {
        setFlashResult(result);
        setFlashKey(k => k + 1);

        const isWin = result === 'player-win' || result === 'dealer-bust' || result === 'player-blackjack';
        const isLoss = result === 'dealer-win' || result === 'player-bust';

        if (isWin) {
          streakRef.current = streakRef.current.type === 'W'
            ? { type: 'W', count: streakRef.current.count + 1 }
            : { type: 'W', count: 1 };
        } else if (isLoss) {
          streakRef.current = streakRef.current.type === 'L'
            ? { type: 'L', count: streakRef.current.count + 1 }
            : { type: 'L', count: 1 };
        } else {
          streakRef.current = { type: null, count: 0 };
        }
        setStreakDisplay({ ...streakRef.current });
      }

      if (
        trainerPrefs.counting &&
        game.handHistory.length > 0 &&
        game.handHistory.length % COUNT_CHECK_EVERY_N_HANDS === 0
      ) {
        const actual = runningCount(game);
        setCountQuiz({ actual, trueC: trueCount(actual, game.shoe.length) });
      }
    }

    if (game.phase !== Phase.SETTLED && prevPhase === Phase.SETTLED) {
      setCountQuiz(null);
    }
  }, [game.phase, game.hands, game.handHistory.length, trainerPrefs.counting]);

  // Track card count changes to gate interaction until animations settle
  useEffect(() => {
    if (totalCardCount === 0) {
      prevCardCountRef.current = 0;
      setDealtReady(true);
      return;
    }
    if (totalCardCount > prevCardCountRef.current) {
      const wasEmpty = prevCardCountRef.current === 0;
      prevCardCountRef.current = totalCardCount;
      setDealtReady(false);
      clearTimeout(dealtReadyTimerRef.current);
      dealtReadyTimerRef.current = setTimeout(
        () => setDealtReady(true),
        wasEmpty ? DEAL_READY_MS : HIT_READY_MS
      );
    }
  }, [totalCardCount]);

  const showNotification = useCallback((msg: string) => {
    setNotification(msg);
    clearTimeout(notifTimerRef.current);
    notifTimerRef.current = setTimeout(() => setNotification(null), NOTIFICATION_DURATION_MS);
  }, []);

  // Detect auto-reshuffle: shoe jumped back up in size
  useEffect(() => {
    if (game.shoe.length > prevShoeLengthRef.current) {
      setShuffleKey(k => k + 1);
      showNotification('New shoe in play');
      setShuffleAnimating(true);
      clearTimeout(shuffleTimerRef.current);
      shuffleTimerRef.current = setTimeout(() => setShuffleAnimating(false), SHUFFLE_ANIM_MS);
    }
    prevShoeLengthRef.current = game.shoe.length;
  }, [game.shoe.length, showNotification]);

  // New deal: dealer gets 2 cards
  useEffect(() => {
    if (game.dealerHand.length === 2) setRoundKey(k => k + 1);
  }, [game.dealerHand.length]);

  const handleIntroComplete = useCallback(() => setControlsReady(true), []);

  const handleCountAnswer = useCallback((correct: boolean) => {
    setCountChecks(prev => ({
      correct: prev.correct + (correct ? 1 : 0),
      total: prev.total + 1,
    }));
  }, []);

  const handleResetSession = useCallback(() => {
    game.resetSession();
    setCurrentBet(0);
    streakRef.current = { type: null, count: 0 };
    setStreakDisplay({ type: null, count: 0 });
    setFlashResult(null);
    setCountQuiz(null);
    setCountChecks({ correct: 0, total: 0 });
    showNotification('Session reset');
  }, [game, showNotification]);

  useSounds(game);

  useKeyboardShortcuts({
    game,
    dealtReady,
    currentBet,
    addToBet,
    clearBet,
    onDeal: handleDeal,
    onToggleTendencies: toggleTendencies,
  });

  // Idle scenes render on demand; animation windows force the full loop
  const sceneAnimating =
    !controlsReady || !dealtReady || shuffleAnimating || debugFlags.stats;
  const renderAlways = useHeldFlag(sceneAnimating, 500);

  const sessionPnL = game.chips - game.config.startingChips;

  return (
    <SceneWrapper $enableGrain={debugFlags.filmGrain}>
      <Canvas
        shadows={{ type: THREE.PCFShadowMap }}
        dpr={[1, 2]}
        frameloop={renderAlways ? 'always' : 'demand'}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2,
        }}
        camera={{
          fov: 60,
          near: 0.1,
          far: 100,
          position: [0, 16, 20],
        }}
        style={{ width: '100%', height: '100%' }}
      >
        <GameTable
          dealerCards={game.dealerHand}
          playerCards={game.hands[0]?.cards ?? []}
          shoeLength={game.shoe.length}
          shuffleKey={shuffleKey}
          roundKey={roundKey}
          controlsReady={controlsReady}
          onCameraIntroComplete={handleIntroComplete}
          chips={game.chips}
          activeBet={game.hands[0]?.bet ?? 0}
          enablePostProcessing={debugFlags.postProcessing}
          enableShadows={debugFlags.shadows}
          enableStats={debugFlags.stats}
        />
      </Canvas>

      <SceneHeader aria-label="Blaqjaq table rules">
        <strong>Blaqjaq</strong>
        <span>6 decks · dealer hits soft 17 · blackjack pays 3:2</span>
      </SceneHeader>

      <GameControls
        game={game}
        dealtReady={dealtReady}
        currentBet={currentBet}
        addToBet={addToBet}
        clearBet={clearBet}
        onDeal={handleDeal}
        coachTarget={coachTarget}
      />

      <ResultFlash result={flashResult} triggerKey={flashKey} />

      <StatsPanel
        game={game}
        sessionPnL={sessionPnL}
        streak={streakDisplay}
        dealerScore={dealerScoreStr}
        playerScore={playerScoreStr}
      />

      <TableStatePanel
        dealerScore={dealerScoreStr}
        shoeRemaining={game.shoe.length}
        decksInPlay={game.config.deckCount}
      />

      {notification && <SceneNotification>{notification}</SceneNotification>}

      {countQuiz && game.phase === Phase.SETTLED && (
        <CountCheck
          actualCount={countQuiz.actual}
          trueCountValue={countQuiz.trueC}
          onAnswer={handleCountAnswer}
          onDismiss={() => setCountQuiz(null)}
        />
      )}

      <PanelToggleButton
        $open={showTendencies}
        type="button"
        aria-expanded={showTendencies}
        aria-controls="session-statistics"
        aria-haspopup="dialog"
        onClick={toggleTendencies}
      >
        {showTendencies ? '✕' : '≡ Stats'}
      </PanelToggleButton>

      {showTendencies && (
        <Suspense fallback={null}>
          <TendenciesPanelLazy
            sessionStats={game.sessionStats}
            handHistory={game.handHistory}
            config={game.config}
            onToggle={toggleTendencies}
          />
        </Suspense>
      )}

      <TrainerPanel
        prefs={trainerPrefs}
        onChange={setTrainerPrefs}
        countChecks={countChecks}
        onResetSession={handleResetSession}
        open={trainerOpen}
        onToggleOpen={() => setTrainerOpen(o => !o)}
      />

      <DebugPanel
        flags={debugFlags}
        onChange={setDebugFlags}
        open={debugOpen}
        onToggleOpen={() => setDebugOpen(o => !o)}
      />
    </SceneWrapper>
  );
}
