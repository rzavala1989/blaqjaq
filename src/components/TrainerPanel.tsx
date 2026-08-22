import styled from 'styled-components';

export interface TrainerPrefs {
  coach: boolean;
  counting: boolean;
}

export const DEFAULT_TRAINER_PREFS: TrainerPrefs = {
  coach: false,
  counting: false,
};

const PREFS_KEY = 'blaqjaq:trainer:v1';

export interface CountCheckStats {
  correct: number;
  total: number;
}

interface StoredTrainer {
  prefs: TrainerPrefs;
  countChecks: CountCheckStats;
}

export function loadTrainerState(): StoredTrainer {
  const fallback: StoredTrainer = {
    prefs: DEFAULT_TRAINER_PREFS,
    countChecks: { correct: 0, total: 0 },
  };
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<StoredTrainer>;
    return {
      prefs: {
        coach: parsed.prefs?.coach === true,
        counting: parsed.prefs?.counting === true,
      },
      countChecks: {
        correct: typeof parsed.countChecks?.correct === 'number' ? parsed.countChecks.correct : 0,
        total: typeof parsed.countChecks?.total === 'number' ? parsed.countChecks.total : 0,
      },
    };
  } catch {
    return fallback;
  }
}

export function saveTrainerState(prefs: TrainerPrefs, countChecks: CountCheckStats): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ prefs, countChecks }));
  } catch {
    // ignore
  }
}

const Wrapper = styled.div`
  position: fixed;
  bottom: 108px;
  right: 5.5rem;
  z-index: 100;
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 11px;
  pointer-events: auto;

  @media (max-width: 600px) {
    bottom: 100px;
    right: 0.75rem;
    font-size: 12px;
  }
`;

const Toggle = styled.button`
  background: rgba(0, 0, 0, 0.75);
  color: rgba(200, 185, 155, 0.7);
  border: 1px solid rgba(200, 185, 155, 0.15);
  padding: 3px 8px;
  cursor: pointer;
  font-family: inherit;
  font-size: inherit;
  display: block;
  width: 100%;
  text-align: left;

  @media (max-width: 600px) {
    min-height: 2.25rem;
    padding: 0.35rem 0.6rem;
  }

  &:hover {
    background: rgba(40, 40, 40, 0.85);
  }
`;

const Panel = styled.div`
  background: rgba(0, 0, 0, 0.8);
  border: 1px solid rgba(200, 185, 155, 0.15);
  padding: 4px 0;
  min-width: 148px;
`;

const Row = styled.label`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 8px;
  cursor: pointer;
  color: rgba(200, 185, 155, 0.7);

  &:hover {
    background: rgba(60, 60, 60, 0.4);
  }

  input {
    accent-color: #c8aa50;
  }
`;

const InfoRow = styled.div`
  padding: 3px 8px;
  color: rgba(200, 185, 155, 0.45);
`;

const ResetButton = styled.button`
  display: block;
  width: calc(100% - 16px);
  margin: 4px 8px;
  padding: 3px 6px;
  background: rgba(40, 8, 12, 0.8);
  color: rgba(200, 120, 120, 0.8);
  border: 1px solid rgba(106, 16, 32, 0.6);
  font-family: inherit;
  font-size: inherit;
  cursor: pointer;

  &:hover {
    background: rgba(70, 12, 20, 0.9);
  }
`;

interface TrainerPanelProps {
  prefs: TrainerPrefs;
  onChange: (prefs: TrainerPrefs) => void;
  countChecks: CountCheckStats;
  onResetSession: () => void;
  open: boolean;
  onToggleOpen: () => void;
}

export function TrainerPanel({
  prefs,
  onChange,
  countChecks,
  onResetSession,
  open,
  onToggleOpen,
}: TrainerPanelProps) {
  const accuracy =
    countChecks.total > 0 ? Math.round((countChecks.correct / countChecks.total) * 100) : null;

  return (
    <Wrapper>
      {open && (
        <Panel id="trainer-settings">
          <Row>
            <input
              type="checkbox"
              checked={prefs.coach}
              onChange={() => onChange({ ...prefs, coach: !prefs.coach })}
            />
            Coach hints
          </Row>
          <Row>
            <input
              type="checkbox"
              checked={prefs.counting}
              onChange={() => onChange({ ...prefs, counting: !prefs.counting })}
            />
            Count trainer
          </Row>
          {prefs.counting && (
            <InfoRow>
              count acc: {accuracy === null ? '--' : `${accuracy}%`} ({countChecks.correct}/
              {countChecks.total})
            </InfoRow>
          )}
          <ResetButton onClick={onResetSession}>reset session</ResetButton>
        </Panel>
      )}
      <Toggle type="button" aria-expanded={open} aria-controls="trainer-settings" onClick={onToggleOpen}>{open ? '▾' : '▸'} trainer</Toggle>
    </Wrapper>
  );
}
