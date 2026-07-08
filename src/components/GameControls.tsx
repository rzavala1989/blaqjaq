import type { useBlackjack } from '../hooks/useBlackjack';
import { Phase, Action } from '../game/constants';
import type { ActionValue } from '../game/constants';
import {
  ControlsPanel, CasinoButton,
  BarLeftSection, BarCenter, BarRightSection,
  BarBalance, BarBetLabel, BarPlayerScore,
} from '../styled/styled-components';
import { BettingPanel } from './BettingPanel';

type Game = ReturnType<typeof useBlackjack>;

type HandEval = { value: number; isSoft: boolean; isBlackjack: boolean; isBust: boolean } | null;

function formatScore(eval_: HandEval): string {
  if (!eval_ || eval_.value === 0) return '';
  if (eval_.isBlackjack) return 'BJ';
  if (eval_.isBust) return 'BUST';
  if (eval_.isSoft && eval_.value !== 21) return `${eval_.value - 10}/${eval_.value}`;
  return String(eval_.value);
}

interface GameControlsProps {
  game: Game;
  dealtReady: boolean;
  currentBet: number;
  addToBet: (n: number) => void;
  clearBet: () => void;
  onDeal: () => void;
  coachTarget?: ActionValue | null;
}

export function GameControls({ game, dealtReady, currentBet, addToBet, clearBet, onDeal, coachTarget = null }: GameControlsProps) {
  const isBetting = game.phase === Phase.BETTING;
  const isSettled = game.phase === Phase.SETTLED;
  const hasPlayerCards = (game.hands[0]?.cards.length ?? 0) > 0;

  const playerScoreStr = hasPlayerCards ? formatScore(game.playerEval) : '';

  const activeBet = isBetting ? currentBet : (game.hands[0]?.bet ?? 0);

  return (
    <ControlsPanel>
      {/* Left: balance and bet */}
      <BarLeftSection>
        <BarBalance>◆ {game.chips.toLocaleString()}</BarBalance>
        {activeBet > 0 && <BarBetLabel>BET {activeBet}</BarBetLabel>}
      </BarLeftSection>

      {/* Center: action buttons */}
      <BarCenter>
        {isBetting && (
          <BettingPanel
            game={game}
            currentBet={currentBet}
            addToBet={addToBet}
            clearBet={clearBet}
            onDeal={onDeal}
            dealtReady={dealtReady}
          />
        )}

        {game.showInsurance && (
          <>
            <CasinoButton $variant="gold" onClick={game.insurance} disabled={!dealtReady} title="I">Insurance</CasinoButton>
            <CasinoButton $variant="danger" onClick={game.declineInsurance} disabled={!dealtReady} title="N" $hint={coachTarget === Action.DECLINE_INSURANCE}>No Insurance</CasinoButton>
          </>
        )}

        {game.showEvenMoney && (
          <>
            <CasinoButton $variant="gold" onClick={game.evenMoney} disabled={!dealtReady} title="Y">Even Money</CasinoButton>
            <CasinoButton $variant="danger" onClick={game.declineEvenMoney} disabled={!dealtReady} title="N" $hint={coachTarget === Action.DECLINE_EVEN_MONEY}>Decline</CasinoButton>
          </>
        )}

        {game.canHit && (
          <CasinoButton $variant="action" onClick={game.hit} disabled={!dealtReady} title="H" $hint={coachTarget === Action.HIT}>Hit</CasinoButton>
        )}
        {game.canStand && (
          <CasinoButton $variant="action" onClick={game.stand} disabled={!dealtReady} title="S" $hint={coachTarget === Action.STAND}>Stand</CasinoButton>
        )}
        {game.canDouble && (
          <CasinoButton $variant="power" onClick={game.doubleDown} disabled={!dealtReady} title="D" $hint={coachTarget === Action.DOUBLE_DOWN}>Double</CasinoButton>
        )}
        {game.canSplitHand && (
          <CasinoButton $variant="power" onClick={game.split} disabled={!dealtReady} title="P" $hint={coachTarget === Action.SPLIT}>Split</CasinoButton>
        )}
        {game.canSurrenderHand && (
          <CasinoButton $variant="danger" onClick={game.surrender} disabled={!dealtReady} title="R" $hint={coachTarget === Action.SURRENDER}>Surrender</CasinoButton>
        )}

        {isSettled && (
          <CasinoButton $variant="deal" onClick={game.newRound} disabled={!dealtReady} title="Space">New Round</CasinoButton>
        )}
        {game.bankrupt && (
          <CasinoButton $variant="rebuy" onClick={game.rebuy} title="B">Rebuy</CasinoButton>
        )}
      </BarCenter>

      {/* Right: player hand value */}
      <BarRightSection>
        {playerScoreStr && <BarPlayerScore>YOU&nbsp;&nbsp;{playerScoreStr}</BarPlayerScore>}
      </BarRightSection>
    </ControlsPanel>
  );
}
