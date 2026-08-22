import styled, { css, keyframes } from 'styled-components';
import { animated } from '@react-spring/web';

// === Game Board ===

export const GameBoard = styled.div`
  text-align: center;
  background: #1a4a32;
  color: white;
  font-size: 1rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  font-family: 'DM Sans', sans-serif;
  align-items: center;
  height: 100vh;
  width: 100vw;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.12'/%3E%3C/svg%3E");
    background-size: 256px 256px;
    pointer-events: none;
    z-index: 0;
  }

  > * {
    position: relative;
    z-index: 1;
  }
`;

// === Stats ===

export const PlayerInfo = styled.div`
  position: absolute;
  font-size: 1.8rem;
  left: 0.7rem;
  top: 0.3rem;
  color: rgba(180, 180, 180, 0.8);
  font-family: 'Playfair Display', serif;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
`;
export const PlayerScore = styled.div`
  font-size: 2.1rem;
  color: rgba(180, 180, 180, 0.6);
`;

export const DealerInfo = styled.div`
  position: absolute;
  font-size: 1.8rem;
  right: 0.7rem;
  top: 0.3rem;
  color: rgba(255, 255, 255, 0.85);
  font-family: 'Playfair Display', serif;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
`;
export const DealerScore = styled.div`
  font-size: 2.1rem;
  color: rgba(255, 255, 255, 0.6);
`;

// === Hit and Stand ===

export const HitButton = styled.button`
  height: 27%;
  font-size: 3rem;
  padding: 5.7rem;
  background: linear-gradient(
    to right,
    rgba(212, 211, 210, 0.86),
    rgba(96, 96, 96, 0.86),
    rgba(96, 96, 96, 0.86),
    rgba(56, 56, 56, 0.94),
    rgba(36, 36, 36, 0.94),
    rgba(29, 77, 65, 0.56),
    rgba(29, 77, 65, 0.46),
    rgba(29, 77, 65, 0.36)
  );
  color: white;
  font-family: 'Playfair Display', serif;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  width: 61%;
  position: absolute;
  bottom: 0;
  left: 0;
  cursor: pointer;
  display: flex;
  justify-content: flex-start;
  border: none;
  transition: all 0.25s ease;

  -webkit-clip-path: polygon(0 0%, 0 100%, 100% 100%);
  clip-path: polygon(0 0%, 0 100%, 100% 100%);

  &:hover:not(:disabled) {
    filter: brightness(1.15);
    text-shadow: 0 0 20px rgba(255, 255, 255, 0.5);
  }

  &:active:not(:disabled) {
    filter: brightness(0.9);
    transition-duration: 0.05s;
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
    filter: grayscale(0.5) brightness(0.6);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export const StandButton = styled.button`
  height: 27%;
  font-size: 3rem;
  padding: 5.7rem;
  padding-right: 7.7rem !important;
  background: linear-gradient(
    to right,
    rgba(29, 77, 65, 0.31),
    rgba(29, 77, 65, 0.51),
    rgba(29, 77, 65, 0.61),
    rgba(29, 77, 65, 0.81),
    rgba(212, 211, 210, 0.66),
    rgba(212, 211, 210, 0.6),
    rgba(212, 211, 210, 0.6),
    rgba(212, 211, 210, 0.55),
    rgba(44, 48, 112, 0.45),
    rgb(220, 20, 60, 0.69)
  );
  color: white;
  font-family: 'Playfair Display', serif;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  width: 61%;
  position: absolute;
  bottom: 0;
  right: 0;
  cursor: pointer;
  display: flex;
  justify-content: flex-end;
  border: none;
  transition: all 0.25s ease;

  -webkit-clip-path: polygon(100% 0%, 0 100%, 100% 100%);
  clip-path: polygon(100% 0%, 0 100%, 100% 100%);

  &:hover:not(:disabled) {
    filter: brightness(1.15);
    text-shadow: 0 0 20px rgba(255, 255, 255, 0.5);
  }

  &:active:not(:disabled) {
    filter: brightness(0.9);
    transition-duration: 0.05s;
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
    filter: grayscale(0.5) brightness(0.6);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

// === Card ===

export const CardInHand = styled.div`
  position: relative;
  width: 100px;
  height: 150px;
  line-height: 30px;
  margin-left: -30px;
  text-align: left;
  font-size: 1.4rem;
  border-radius: 5px;
  transform-style: preserve-3d;
`;

export const CardFront = styled(animated.div)<{ $blackSuit: boolean }>(
  ({ $blackSuit }) => `
  border-radius: 5px;
  position: absolute;
  width: 100%;
  height: 100%;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5), 0 1px 4px rgba(0, 0, 0, 0.3);
  background-color: white;
  color: ${$blackSuit ? 'black' : 'crimson'};
`
);

export const CardBack = styled(animated.div)`
  border-radius: 5px;
  position: absolute;
  width: 100%;
  height: 100%;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5), 0 1px 4px rgba(0, 0, 0, 0.3);
  background-image: linear-gradient(
      rgba(0, 0, 0, 0.77),
      rgba(0, 0, 0, 0.25),
      rgba(0, 0, 0, 0)
    ),
    url('/back-of-card.jpg');
  background-size: cover;
  background-position: -3px 0px;
`;

export const CardLabel = styled.div`
  margin: 5px;
  font-family: 'DM Sans', sans-serif;
  font-weight: 600;
`;

// === Hand ===

export const Container = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  margin: 1rem 0;
`;

export const ActiveContainer = styled(Container)`
  outline: 2px solid gold;
  border-radius: 8px;
`;

export const ResultOverlay = styled.h2<{ $color?: string }>`
  position: absolute;
  font-size: 3rem;
  z-index: 2;
  color: ${({ $color }) => $color || 'white'};
  font-family: 'Playfair Display', serif;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  text-shadow: 0 0 30px rgba(0, 0, 0, 0.5), 0 2px 8px rgba(0, 0, 0, 0.8);
  pointer-events: none;
`;

export const AnimatedResultOverlay = styled(animated.h2)<{ $color?: string }>`
  position: absolute;
  font-size: 3rem;
  z-index: 2;
  color: ${({ $color }) => $color || 'white'};
  font-family: 'Playfair Display', serif;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  text-shadow: 0 0 30px rgba(0, 0, 0, 0.5), 0 2px 8px rgba(0, 0, 0, 0.8);
  pointer-events: none;
`;

// === Chip Count ===

export const ChipCount = styled.div`
  position: absolute;
  top: 3.5rem;
  left: 0.7rem;
  color: gold;
  font-size: 1.4rem;
  font-family: 'Playfair Display', serif;
  font-weight: 900;
  letter-spacing: 0.02em;
`;

// === Action Buttons ===

export const ActionRow = styled.div<{ $compact?: boolean }>`
  display: flex;
  gap: 0.5rem;
  margin-top: ${({ $compact }) => ($compact ? '0.5rem' : '1rem')};
  z-index: 10;
`;

export const ActionButton = styled.button<{ $large?: boolean; $muted?: boolean }>`
  padding: ${({ $large }) => ($large ? '0.7rem 1.2rem' : '0.5rem 1rem')};
  font-size: ${({ $large }) => ($large ? '1.2rem' : '1rem')};
  font-family: 'DM Sans', sans-serif;
  font-weight: 600;
  cursor: pointer;
  background: ${({ $muted }) =>
    $muted ? 'rgba(96, 96, 96, 0.8)' : 'rgba(29, 77, 65, 0.8)'};
  color: white;
  border: 2px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  backdrop-filter: blur(8px);
  transition: all 0.2s cubic-bezier(0.25, 1, 0.5, 1);

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 20px rgba(29, 77, 65, 0.4), 0 0 15px rgba(29, 77, 65, 0.2);
    border-color: rgba(255, 255, 255, 0.4);
    background: ${({ $muted }) =>
      $muted ? 'rgba(120, 120, 120, 0.85)' : 'rgba(35, 100, 80, 0.9)'};
  }

  &:active:not(:disabled) {
    transform: translateY(1px) scale(0.97);
    box-shadow: 0 1px 8px rgba(29, 77, 65, 0.3);
    transition-duration: 0.05s;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.35;
    filter: grayscale(0.3);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:hover:not(:disabled) { transform: none; }
    &:active:not(:disabled) { transform: none; }
  }
`;

const pulseGlow = keyframes`
  0%, 100% { box-shadow: 0 0 10px rgba(29, 77, 65, 0.3); }
  50% { box-shadow: 0 0 25px rgba(29, 77, 65, 0.6), 0 0 50px rgba(29, 77, 65, 0.15); }
`;

export const NewRoundButton = styled.button`
  padding: 0.7rem 1.5rem;
  font-size: 1.2rem;
  font-family: 'DM Sans', sans-serif;
  font-weight: 600;
  cursor: pointer;
  background: rgba(29, 77, 65, 0.9);
  color: white;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-radius: 8px;
  margin-top: 1rem;
  z-index: 10;
  transition: all 0.2s ease;
  animation: ${pulseGlow} 2s ease-in-out infinite;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 25px rgba(29, 77, 65, 0.5);
  }

  &:active {
    transform: translateY(1px);
    transition-duration: 0.05s;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    transition: none;
    &:hover { transform: none; }
    &:active { transform: none; }
  }
`;

// === Scoreboard ===

export const ValuesContainer = styled.div`
  font-size: 2rem;
  width: 12rem;
  font-family: 'Playfair Display', serif;
  font-weight: 700;
`;
export const DealerValue = styled.div`
  margin: 0 1rem;
  text-align: left;
`;
export const PlayerValue = styled.div`
  margin: 0 1rem;
  text-align: right;
`;
export const ScoreDivider = styled.hr`
  transform: rotate(-35deg);
  margin: 1rem;
  border-color: rgba(255, 255, 255, 0.2);
`;

// === Screen Flash ===

export const ScreenFlash = styled(animated.div)`
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 50;
`;

// === Bottom Bar Sections ===

export const BarLeftSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 10rem;

  @media (max-width: 600px) {
    min-width: 3.6rem;
    gap: 0.1rem;
  }
`;

export const BarCenter = styled.div`
  flex: 1;
  display: flex;
  gap: 0.85rem;
  justify-content: center;
  align-items: center;

  @media (max-width: 600px) {
    gap: 0.35rem;
    justify-content: flex-end;
    min-width: 0;
  }
`;

export const BarRightSection = styled.div`
  display: flex;
  align-items: center;
  min-width: 10rem;
  justify-content: flex-end;

  @media (max-width: 600px) {
    display: none;
  }
`;

export const BarBalance = styled.div`
  font-size: 1rem;
  font-family: 'Special Elite', 'Courier New', monospace;
  color: rgba(58, 104, 152, 0.85);
  letter-spacing: 0.08em;
  font-variant-numeric: tabular-nums;

  @media (max-width: 600px) {
    font-size: 0.67rem;
    letter-spacing: 0.04em;
  }
`;

export const BarBetLabel = styled.div`
  font-size: 0.8rem;
  font-family: 'Special Elite', 'Courier New', monospace;
  color: rgba(200, 185, 155, 0.45);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  font-variant-numeric: tabular-nums;

  @media (max-width: 600px) {
    font-size: 0.58rem;
    letter-spacing: 0.05em;
  }
`;

export const BarPlayerScore = styled.div`
  font-size: 1rem;
  font-family: 'Playfair Display', serif;
  color: rgba(200, 185, 155, 0.55);
  letter-spacing: 0.18em;
  text-transform: uppercase;
  font-variant-numeric: tabular-nums;
`;

// === Chip Betting ===

export const ChipButton = styled.button<{ $color: string }>`
  width: 54px;
  height: 54px;
  border-radius: 50%;
  border: 2px solid ${({ $color }) => $color};
  background: #06060a;
  color: ${({ $color }) => $color};
  font-size: 0.78rem;
  font-weight: 700;
  font-family: 'Special Elite', 'Courier New', monospace;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: box-shadow 0.2s ease;
  flex-shrink: 0;
  letter-spacing: 0.04em;

  @media (max-width: 600px) {
    width: 38px;
    height: 38px;
    font-size: 0.64rem;
    border-width: 1px;
  }

  &:hover:not(:disabled) {
    box-shadow:
      0 0 8px ${({ $color }) => $color},
      0 0 20px ${({ $color }) => $color},
      inset 0 0 6px ${({ $color }) => $color}22;
  }

  &:active:not(:disabled) {
    filter: brightness(0.8);
    transition-duration: 0.05s;
  }

  &:disabled {
    opacity: 0.2;
    cursor: not-allowed;
  }
`;

export const BetDisplay = styled.div`
  font-size: 1.5rem;
  font-family: 'Special Elite', 'Courier New', monospace;
  color: #e4dcc8;
  letter-spacing: 0.06em;
  min-width: 6rem;
  text-align: center;
`;

// === Film Grain ===

const grain = keyframes`
  0%   { transform: translate(0, 0); }
  10%  { transform: translate(-2%, -3%); }
  20%  { transform: translate(4%, 2%); }
  30%  { transform: translate(-1%, 4%); }
  40%  { transform: translate(3%, -2%); }
  50%  { transform: translate(-3%, 1%); }
  60%  { transform: translate(2%, 3%); }
  70%  { transform: translate(-4%, -1%); }
  80%  { transform: translate(1%, -4%); }
  90%  { transform: translate(-2%, 2%); }
  100% { transform: translate(0, 0); }
`;

// === 3D Scene Overlay ===

export const SceneWrapper = styled.div<{ $enableGrain?: boolean }>`
  position: relative;
  width: 100%;
  height: 100dvh;
  min-height: 100svh;
  overflow: hidden;

  /* Film grain overlay */
  &::after {
    content: '';
    position: absolute;
    inset: -10%;
    width: 120%;
    height: 120%;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E");
    background-size: 180px 180px;
    opacity: ${({ $enableGrain = true }) => $enableGrain ? 0.038 : 0};
    pointer-events: none;
    z-index: 999;
    animation: ${({ $enableGrain = true }) => $enableGrain ? grain : 'none'} 0.35s steps(1) infinite;
  }
`;

export const SceneNotification = styled.div`
  position: absolute;
  top: 2rem;
  left: 50%;
  transform: translateX(-50%);
  background: #06060a;
  color: #e4dcc8;
  padding: 0.55rem 1.75rem;
  border-radius: 0;
  font-family: 'Playfair Display', serif;
  font-size: 0.8rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  border: 1px solid rgba(200, 20, 42, 0.45);
  box-shadow: 0 0 18px rgba(200, 20, 42, 0.08), 0 4px 24px rgba(0, 0, 0, 0.8);
  pointer-events: none;
  white-space: nowrap;
`;

export const SceneHeader = styled.div`
  position: fixed;
  top: 1.65rem;
  left: 50%;
  z-index: 20;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  color: rgba(228, 220, 200, 0.86);
  font-family: 'Playfair Display', Georgia, serif;
  pointer-events: none;
  text-align: center;
  text-transform: uppercase;

  strong {
    font-size: clamp(1.35rem, 2.2vw, 2rem);
    font-weight: 700;
    letter-spacing: 0.36em;
    padding-left: 0.36em;
    text-shadow: 0 0 24px rgba(200, 185, 155, 0.15);
  }

  span {
    color: rgba(200, 185, 155, 0.52);
    font-family: 'Special Elite', 'Courier New', monospace;
    font-size: 0.62rem;
    letter-spacing: 0.12em;
  }

  @media (max-width: 600px) {
    top: 7.5rem;
    gap: 0;

    strong {
      font-size: 1rem;
      letter-spacing: 0.26em;
      padding-left: 0.26em;
    }

    span {
      display: none;
    }
  }
`;

export const ControlsPanel = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 96px;
  background: #06060a;
  border-top: 1px solid rgba(200, 20, 42, 0.6);
  box-shadow:
    0 -6px 48px rgba(0, 0, 0, 0.98),
    0 -1px 12px rgba(200, 20, 42, 0.12),
    inset 0 1px 0 rgba(200, 20, 42, 0.1);
  display: flex;
  align-items: center;
  padding: 0 1.75rem;

  @media (max-width: 600px) {
    height: 88px;
    padding: 0 0.65rem;
  }
`;

type CasinoVariant = 'deal' | 'action' | 'power' | 'danger' | 'gold' | 'rebuy';

const variantBg: Record<CasinoVariant, string> = {
  deal:   '#0e0608',
  action: '#06080e',
  power:  '#080608',
  danger: '#0c0406',
  gold:   '#0c0a04',
  rebuy:  '#0a0604',
};

const variantBorder: Record<CasinoVariant, string> = {
  deal:   '#c8142a',
  action: '#3a6898',
  power:  '#8868a8',
  danger: '#6a1020',
  gold:   '#907830',
  rebuy:  '#704820',
};

const variantGlow: Record<CasinoVariant, string> = {
  deal:   'rgba(200, 20, 42, 0.35)',
  action: 'rgba(58, 104, 152, 0.35)',
  power:  'rgba(136, 104, 168, 0.35)',
  danger: 'rgba(106, 16, 32, 0.4)',
  gold:   'rgba(144, 120, 48, 0.35)',
  rebuy:  'rgba(112, 72, 32, 0.35)',
};

const coachPulse = keyframes`
  0%, 100% {
    box-shadow: 0 0 6px rgba(200, 170, 80, 0.45), inset 0 0 4px rgba(200, 170, 80, 0.2);
  }
  50% {
    box-shadow: 0 0 16px rgba(200, 170, 80, 0.75), 0 0 32px rgba(200, 170, 80, 0.25),
      inset 0 0 8px rgba(200, 170, 80, 0.35);
  }
`;

export const CasinoButton = styled.button<{ $variant?: CasinoVariant; $hint?: boolean }>`
  padding: 0.85rem 2.4rem;
  color: #e4dcc8;
  border-radius: 2px;
  font-size: 1.1rem;
  font-family: 'Playfair Display', serif;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  cursor: pointer;
  transition: box-shadow 0.2s ease, filter 0.15s ease;
  background: ${({ $variant = 'action' }) => variantBg[$variant]};
  border: 1px solid ${({ $variant = 'action' }) => variantBorder[$variant]};
  box-shadow: 0 0 0 rgba(0, 0, 0, 0);

  @media (max-width: 600px) {
    min-height: 2.5rem;
    padding: 0.55rem 0.6rem;
    font-size: 0.68rem;
    letter-spacing: 0.06em;
  }

  &:hover:not(:disabled) {
    box-shadow:
      0 0 10px ${({ $variant = 'action' }) => variantGlow[$variant]},
      0 0 28px ${({ $variant = 'action' }) => variantGlow[$variant]},
      inset 0 0 8px ${({ $variant = 'action' }) => variantGlow[$variant]};
    filter: brightness(1.2);
  }

  &:active:not(:disabled) {
    filter: brightness(0.8);
    transition-duration: 0.05s;
  }

  &:disabled {
    background: #0e0e0e;
    border-color: rgba(180, 165, 135, 0.12);
    color: rgba(200, 185, 155, 0.22);
    cursor: not-allowed;
    filter: none;
  }

  ${({ $hint }) =>
    $hint &&
    css`
      border-color: #c8aa50;
      animation: ${coachPulse} 1.6s ease-in-out infinite;
    `}

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    animation: none;
    ${({ $hint }) => $hint && 'box-shadow: 0 0 10px rgba(200, 170, 80, 0.6);'}
  }
`;

// === Slide-out Panel Toggle (Tendencies) ===

export const PanelToggleButton = styled.button<{ $open: boolean }>`
  position: fixed;
  top: 1.25rem;
  right: ${({ $open }) => ($open ? '308px' : '0.75rem')};
  z-index: 51;
  background: rgba(0, 0, 0, 0.85);
  border: 1px solid rgba(200, 185, 155, 0.18);
  box-shadow: 0 0 12px rgba(0, 0, 0, 0.5), 0 0 1px rgba(200, 185, 155, 0.1);
  color: rgba(200, 185, 155, 0.7);
  font-family: 'Special Elite', 'Courier New', monospace;
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  padding: 0.35rem 0.6rem;
  cursor: pointer;
  transition: right 0.3s ease, color 0.15s, border-color 0.15s;

  @media (max-width: 600px) {
    top: 0.6rem;
    right: 0.6rem;
    min-height: 2.25rem;
    padding: 0.35rem 0.5rem;
  }

  &:hover {
    color: rgba(228, 220, 200, 0.85);
    border-color: rgba(200, 185, 155, 0.3);
  }
`;
