import { useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { ReferenceLine, YAxis, Area, AreaChart, Dot } from 'recharts';
import type { SessionStats, HandRecord } from '../game/analytics';
import type { GameConfig } from '../game/constants';
import { HandHistoryPanel } from './HandHistoryPanel';

/* ------------------------------------------------------------------ */
/*  Styled components                                                  */
/* ------------------------------------------------------------------ */

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 49;
  background: rgba(0, 0, 0, 0.25);
`;

const Panel = styled.div`
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 300px;
  z-index: 50;
  background: rgba(0, 0, 0, 0.92);
  border-left: 1px solid rgba(200, 185, 155, 0.18);
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.6), 0 0 1px rgba(200, 185, 155, 0.1);
  font-family: 'Special Elite', 'Courier New', monospace;
  font-size: 0.75rem;
  overflow-y: auto;
  overflow-x: hidden;
  @media (max-width: 600px) {
    width: min(100vw, 360px);
  }

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.2);
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(200, 185, 155, 0.15);
    border-radius: 2px;
  }
`;

const PanelContent = styled.div`
  padding: 1rem 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  color: rgba(228, 220, 200, 0.9);
  font-size: 0.8rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
`;

const CloseButton = styled.button`
  min-width: 2.25rem;
  min-height: 2.25rem;
  background: transparent;
  color: rgba(228, 220, 200, 0.8);
  border: 1px solid rgba(200, 185, 155, 0.26);
  cursor: pointer;
  font: inherit;
  font-size: 1rem;

  &:hover {
    color: #fff;
    border-color: rgba(200, 185, 155, 0.6);
  }
`;

const Section = styled.div``;

const SectionHeader = styled.div`
  color: rgba(200, 185, 155, 0.7);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-size: 0.65rem;
  margin-bottom: 0.5rem;
`;

const Row = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.15rem 0;
`;

const Label = styled.span`
  color: rgba(200, 185, 155, 0.55);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  text-shadow: 0 0 8px rgba(200, 185, 155, 0.08);
`;

const Value = styled.span`
  color: rgba(228, 220, 200, 0.85);
  font-variant-numeric: tabular-nums;
  text-shadow: 0 0 6px rgba(228, 220, 200, 0.1);
`;

const SideBySide = styled.span`
  display: flex;
  gap: 0.6rem;
  align-items: center;
`;

const SideLabel = styled.span`
  color: rgba(200, 185, 155, 0.45);
  font-size: 0.62rem;
  letter-spacing: 0.05em;
`;

const SideValue = styled.span`
  color: rgba(228, 220, 200, 0.85);
  font-variant-numeric: tabular-nums;
`;

const Divider = styled.hr`
  border: none;
  border-top: 1px solid rgba(200, 185, 155, 0.08);
  margin: 0.5rem 0 0.4rem;
`;

const ChartPlaceholder = styled.div`
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(200, 185, 155, 0.35);
  font-size: 0.72rem;
`;

const ChartWrapper = styled.div`
  height: 120px;
  width: 100%;
`;

/* Decision bar row */

const BarRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.12rem 0;
`;

const BarLabel = styled.span`
  color: rgba(200, 185, 155, 0.55);
  font-size: 0.65rem;
  width: 16px;
  text-align: right;
  flex-shrink: 0;
`;

const BarTrack = styled.div`
  flex: 1;
  height: 8px;
  background: rgba(200, 185, 155, 0.06);
  border-radius: 2px;
  overflow: hidden;
`;

const BarFill = styled.div<{ $pct: number }>`
  width: ${({ $pct }) => $pct}%;
  height: 100%;
  background: rgba(201, 168, 76, 0.7);
  border-radius: 2px;
  transition: width 0.3s ease;
`;

const BarPct = styled.span`
  color: rgba(228, 220, 200, 0.65);
  font-size: 0.6rem;
  font-variant-numeric: tabular-nums;
  width: 30px;
  text-align: right;
  flex-shrink: 0;
`;

const StreakRow = styled.div`
  display: flex;
  gap: 1.2rem;
  padding: 0.15rem 0;
`;

const StreakItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.3rem;
`;

const StreakLabel = styled.span`
  color: rgba(200, 185, 155, 0.5);
  font-size: 0.65rem;
`;

const StreakValue = styled.span`
  color: rgba(228, 220, 200, 0.85);
  font-variant-numeric: tabular-nums;
`;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

interface NemesisResult {
  rank: string;
  winRate: number;
  losses: number;
  total: number;
}

function computeNemesis(
  upcardWinRates: SessionStats['upcardWinRates'],
): NemesisResult | null {
  let worst: NemesisResult | null = null;

  for (const [rank, data] of Object.entries(upcardWinRates)) {
    if (data.total < 2) continue;
    const rate = data.wins / data.total;
    if (worst === null || rate < worst.winRate) {
      worst = { rank, winRate: rate, losses: data.losses, total: data.total };
    }
  }

  return worst;
}

/* Custom dot: only render on the last data point */
function LastDot(props: Record<string, unknown>) {
  const { cx, cy, index, dataLength } = props as {
    cx: number;
    cy: number;
    index: number;
    dataLength: number;
  };
  if (index !== dataLength - 1) return null;
  return <Dot cx={cx} cy={cy} r={3} fill="#c9a84c" stroke="none" />;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export interface TendenciesPanelProps {
  sessionStats: SessionStats;
  handHistory: HandRecord[];
  config: GameConfig;
  onToggle: () => void;
}

export function TendenciesPanel({
  sessionStats,
  handHistory,
  config,
  onToggle,
}: TendenciesPanelProps) {
  const stats = sessionStats;
  const chartWrapperRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState(0);

  // Measure the fixed panel directly. This avoids ResponsiveContainer's
  // transient -1 × -1 measurement when a lazily opened dialog first mounts.
  useEffect(() => {
    const wrapper = chartWrapperRef.current;
    if (!wrapper) return;
    const updateWidth = () => setChartWidth(Math.floor(wrapper.getBoundingClientRect().width));
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, []);

  /* Chart data */
  const chartData = useMemo(() => {
    return stats.chipHistory.map((chips, i) => ({ hand: i + 1, chips }));
  }, [stats.chipHistory]);

  /* Decision breakdown */
  const decisionTotals = useMemo(() => {
    const h = stats.hitCount;
    const s = stats.standCount;
    const d = stats.doubleCount;
    const p = stats.splitCount;
    const r = stats.surrenderCount;
    const total = h + s + d + p + r;
    return { h, s, d, p, r, total };
  }, [stats.hitCount, stats.standCount, stats.doubleCount, stats.splitCount, stats.surrenderCount]);

  /* Nemesis */
  const nemesis = useMemo(() => computeNemesis(stats.upcardWinRates), [stats.upcardWinRates]);

  /* BJ rate */
  const bjRate = stats.totalHands > 0 ? stats.blackjacks / stats.totalHands : 0;

  return (
    <>
      <Overlay aria-hidden="true" onClick={onToggle} />

      <Panel id="session-statistics" role="dialog" aria-modal="true" aria-label="Session statistics">
        <PanelContent>
          <PanelHeader>
            <span>Session Stats</span>
            <CloseButton type="button" aria-label="Close session statistics" onClick={onToggle}>×</CloseButton>
          </PanelHeader>
          {/* ---- Session Shape ---- */}
          <Section>
            <SectionHeader>Session Shape</SectionHeader>
            <ChartWrapper ref={chartWrapperRef}>
              {chartData.length === 0 ? (
                <ChartPlaceholder>Play a hand to see your session chart</ChartPlaceholder>
              ) : chartWidth > 0 ? (
                  <AreaChart width={chartWidth} height={120} data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                    <defs>
                      <linearGradient id="chipFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#c9a84c" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="#c9a84c" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <YAxis hide domain={['dataMin - 50', 'dataMax + 50']} />
                    <ReferenceLine
                      y={config.startingChips}
                      stroke="rgba(200,185,155,0.15)"
                      strokeDasharray="4 4"
                    />
                    <Area
                      type="monotone"
                      dataKey="chips"
                      stroke="#c9a84c"
                      strokeWidth={1.5}
                      fill="url(#chipFill)"
                      dot={(dotProps: Record<string, unknown>) => (
                        <LastDot
                          key={`dot-${dotProps.index}`}
                          {...dotProps}
                          dataLength={chartData.length}
                        />
                      )}
                      isAnimationActive={false}
                    />
                  </AreaChart>
              ) : (
                <ChartPlaceholder>Preparing session chart</ChartPlaceholder>
              )}
            </ChartWrapper>
          </Section>

          <Divider />

          {/* ---- Performance ---- */}
          <Section>
            <SectionHeader>Performance</SectionHeader>
            <Row>
              <Label>Win Rate</Label>
              <Value>{pct(stats.winRate)}</Value>
            </Row>
            <Row>
              <Label>Optimal Play</Label>
              <Value>{pct(stats.optimalPlayRate)}</Value>
            </Row>
            <Row>
              <Label>Bust Rate</Label>
              <SideBySide>
                <span>
                  <SideLabel>You </SideLabel>
                  <SideValue>{pct(stats.playerBustRate)}</SideValue>
                </span>
                <span>
                  <SideLabel>Dlr </SideLabel>
                  <SideValue>{pct(stats.dealerBustRate)}</SideValue>
                </span>
              </SideBySide>
            </Row>
            <Row>
              <Label>BJ Rate</Label>
              <Value>{pct(bjRate)}</Value>
            </Row>
          </Section>

          <Divider />

          {/* ---- Tendencies ---- */}
          <Section>
            <SectionHeader>Tendencies</SectionHeader>

            {decisionTotals.total === 0 ? (
              <ChartPlaceholder style={{ height: 'auto', padding: '0.5rem 0' }}>
                No decisions recorded yet
              </ChartPlaceholder>
            ) : (
              <>
                {([
                  ['H', decisionTotals.h],
                  ['S', decisionTotals.s],
                  ['D', decisionTotals.d],
                  ['P', decisionTotals.p],
                  ['R', decisionTotals.r],
                ] as [string, number][]).map(([label, count]) => {
                  const barPct = decisionTotals.total > 0 ? (count / decisionTotals.total) * 100 : 0;
                  return (
                    <BarRow key={label}>
                      <BarLabel>{label}</BarLabel>
                      <BarTrack>
                        <BarFill $pct={barPct} />
                      </BarTrack>
                      <BarPct>{Math.round(barPct)}%</BarPct>
                    </BarRow>
                  );
                })}
              </>
            )}

            <Divider />

            <Row>
              <Label>Nemesis</Label>
              <Value>
                {nemesis ? `${nemesis.rank} (${Math.round(nemesis.winRate * 100)}% wr)` : '--'}
              </Value>
            </Row>

            <StreakRow>
              <StreakItem>
                <StreakLabel>Best W:</StreakLabel>
                <StreakValue>{stats.longestWinStreak || '--'}</StreakValue>
              </StreakItem>
              <StreakItem>
                <StreakLabel>Worst L:</StreakLabel>
                <StreakValue>{stats.longestLossStreak || '--'}</StreakValue>
              </StreakItem>
            </StreakRow>
          </Section>

          <Divider />

          {/* ---- Hand History ---- */}
          <Section>
            <HandHistoryPanel handHistory={handHistory} />
          </Section>
        </PanelContent>
      </Panel>
    </>
  );
}
