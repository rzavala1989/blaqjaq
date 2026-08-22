import styled from 'styled-components';
import { playChipClick } from '../utils/sounds';
import type { useBlackjack } from '../hooks/useBlackjack';
import { ChipButton, CasinoButton } from '../styled/styled-components';
import { PLAYER_DENOMS, DENOMINATIONS } from '../game/constants';

type Game = ReturnType<typeof useBlackjack>;

const CHIP_COLORS: Record<number, string> = Object.fromEntries(
  PLAYER_DENOMS.map(d => [d.value, d.uiColor])
);

const BettingRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;

  @media (max-width: 600px) {
    gap: 0.3rem;
  }
`;

interface BettingPanelProps {
  game: Game;
  currentBet: number;
  addToBet: (n: number) => void;
  clearBet: () => void;
  onDeal: () => void;
  dealtReady: boolean;
}

export function BettingPanel({ game, currentBet, addToBet, clearBet, onDeal, dealtReady }: BettingPanelProps) {
  const minBet = game.config.minimumBet;
  const maxBet = game.config.maximumBet;

  return (
    <BettingRow>
      {DENOMINATIONS.map(denom => {
        const disabled = currentBet + denom > maxBet || currentBet + denom > game.chips;
        const keyHint = [...DENOMINATIONS].sort((a, b) => a - b).indexOf(denom) + 1;
        return (
          <ChipButton
            key={denom}
            $color={CHIP_COLORS[denom]}
            disabled={disabled}
            onClick={() => { addToBet(denom); playChipClick(); }}
            aria-label={`Add ${denom} to wager`}
            title={String(keyHint)}
          >
            {denom}
          </ChipButton>
        );
      })}
      <CasinoButton $variant="danger" onClick={clearBet} disabled={currentBet === 0} title="C">
        Clear
      </CasinoButton>
      <CasinoButton $variant="deal" onClick={onDeal} disabled={!dealtReady || currentBet < minBet || game.chips < currentBet || game.bankrupt} title="Space">
        Deal
      </CasinoButton>
    </BettingRow>
  );
}
