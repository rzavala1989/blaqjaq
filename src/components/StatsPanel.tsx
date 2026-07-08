import styled from 'styled-components';
import type { useBlackjack } from '../hooks/useBlackjack';
import type { Card } from '../game/deck';

type Game = ReturnType<typeof useBlackjack>;

const SUIT_SIGNS: Record<string, string> = { S: '\u2660', H: '\u2665', D: '\u2666', C: '\u2663' };
const RED_SUITS = new Set(['H', 'D']);

const Wrapper = styled.div`
  position: fixed;
  top: 1.25rem;
  left: 1.25rem;
  z-index: 20;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  pointer-events: none;
`;

const Box = styled.div`
  background: rgba(0, 0, 0, 0.85);
  border: 1px solid rgba(200, 185, 155, 0.18);
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.6), 0 0 1px rgba(200, 185, 155, 0.1);
  padding: 1rem 1.35rem;
  font-family: 'Special Elite', 'Courier New', monospace;
  font-size: 1rem;
`;

const StatsBox = styled(Box)`
  width: 240px;
`;

const Row = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 2rem;
  padding: 0.28rem 0;
`;

const Label = styled.span`
  color: rgba(200, 185, 155, 0.55);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  text-shadow: 0 0 8px rgba(200, 185, 155, 0.08);
`;

const Value = styled.span`
  color: rgba(228, 220, 200, 0.92);
  font-variant-numeric: tabular-nums;
  font-weight: bold;
  text-shadow: 0 0 6px rgba(228, 220, 200, 0.1);
`;

const Divider = styled.hr`
  border: none;
  border-top: 1px solid rgba(200, 185, 155, 0.08);
  margin: 0.5rem 0 0.4rem;
`;

const HandSection = styled.div`
  padding: 0.1rem 0;
`;

const HandLabel = styled.div`
  color: rgba(200, 185, 155, 0.5);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-size: 0.82rem;
  margin-bottom: 0.4rem;
`;

const HandRow = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
`;

const MiniCard = styled.div<{ $red?: boolean; $faceDown?: boolean }>`
  width: 54px;
  height: 76px;
  border-radius: 3px;
  background: ${({ $faceDown }) => $faceDown ? '#1a1a8c' : '#ffffff'};
  border: 1px solid ${({ $faceDown }) => $faceDown ? 'rgba(240, 230, 200, 0.35)' : '#bbb'};
  color: ${({ $red, $faceDown }) => $faceDown ? 'rgba(240, 230, 200, 0.5)' : $red ? '#cc2222' : '#111'};
  font-family: serif;
  font-weight: bold;
  display: flex;
  flex-direction: column;
  padding: 3px 4px;
  line-height: 1;
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
`;

const MiniRank = styled.span`
  font-size: 17px;
  line-height: 1;
`;

const MiniSuit = styled.span`
  font-size: 13px;
  line-height: 1;
  margin-top: 1px;
`;

const MiniCenterSuit = styled.span<{ $red?: boolean }>`
  position: absolute;
  top: 52%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 32px;
  opacity: 0.15;
  color: ${({ $red }) => $red ? '#cc2222' : '#111'};
`;

const MiniBackPattern = styled.div`
  position: absolute;
  inset: 3px;
  border: 1px solid rgba(240, 230, 200, 0.3);
  border-radius: 2px;
`;

const MiniBackQ = styled.span`
  margin: auto;
  font-size: 24px;
  font-family: serif;
  color: rgba(240, 230, 200, 0.4);
  z-index: 1;
`;

const HandScore = styled.span`
  color: rgba(228, 220, 200, 0.92);
  font-family: 'Special Elite', 'Courier New', monospace;
  font-size: 1.3rem;
  font-weight: bold;
  margin-left: 0.6rem;
  font-variant-numeric: tabular-nums;
`;

function MiniCardEl({ card }: { card: Card }) {
  if (card.faceDown) {
    return (
      <MiniCard $faceDown>
        <MiniBackPattern />
        <MiniBackQ>?</MiniBackQ>
      </MiniCard>
    );
  }
  const red = RED_SUITS.has(card.suit);
  const sign = SUIT_SIGNS[card.suit] ?? card.suit;
  return (
    <MiniCard $red={red}>
      <MiniRank>{card.rank}</MiniRank>
      <MiniSuit>{sign}</MiniSuit>
      <MiniCenterSuit $red={red}>{sign}</MiniCenterSuit>
    </MiniCard>
  );
}

interface StatsPanelProps {
  game: Game;
  sessionPnL: number;
  streak: { type: 'W' | 'L' | null; count: number };
  dealerScore: string;
  playerScore: string;
}

export function StatsPanel({ game, sessionPnL, streak, dealerScore, playerScore }: StatsPanelProps) {
  const { wins, losses, pushes, blackjacks } = game.stats;
  const handsPlayed = wins + losses + pushes;
  const winRate = handsPlayed > 0 ? Math.round((wins / handsPlayed) * 100) : null;

  const pnlStr = sessionPnL >= 0 ? `+${sessionPnL}` : String(sessionPnL);
  const winRateStr = winRate !== null ? `${winRate}%` : '--';
  const streakStr = streak.type && streak.count > 0 ? `${streak.type}${streak.count}` : '--';

  const hasDealerCards = game.dealerHand.length > 0;
  const hasPlayerCards = (game.hands[0]?.cards.length ?? 0) > 0;

  const showHands = hasDealerCards || hasPlayerCards;

  return (
    <Wrapper>
      <StatsBox >
        <Row>
          <Label>W Rate</Label>
          <Value>{winRateStr}</Value>
        </Row>
        <Row>
          <Label>P/L</Label>
          <Value>{pnlStr}</Value>
        </Row>
        <Row>
          <Label>Hands</Label>
          <Value>{handsPlayed}</Value>
        </Row>
        <Row>
          <Label>Streak</Label>
          <Value>{streakStr}</Value>
        </Row>
        <Row>
          <Label>BJ</Label>
          <Value>{blackjacks}</Value>
        </Row>
      </StatsBox>

      {showHands && (
        <Box >
          {hasDealerCards && (
            <HandSection>
              <HandLabel>Dealer</HandLabel>
              <HandRow>
                {game.dealerHand.map((card, i) => (
                  <MiniCardEl key={i} card={card} />
                ))}
                {dealerScore && <HandScore>{dealerScore}</HandScore>}
              </HandRow>
            </HandSection>
          )}

          {hasDealerCards && hasPlayerCards && <Divider />}

          {hasPlayerCards && (
            <HandSection>
              <HandLabel>You</HandLabel>
              <HandRow>
                {game.hands[0].cards.map((card, i) => (
                  <MiniCardEl key={i} card={card} />
                ))}
                {playerScore && <HandScore>{playerScore}</HandScore>}
              </HandRow>
            </HandSection>
          )}
        </Box>
      )}
    </Wrapper>
  );
}
