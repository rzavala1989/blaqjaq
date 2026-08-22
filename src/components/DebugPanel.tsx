import styled from 'styled-components';

export interface DebugFlags {
  stats: boolean;
  postProcessing: boolean;
  shadows: boolean;
  filmGrain: boolean;
}

export const DEFAULT_DEBUG: DebugFlags = {
  stats: false,
  postProcessing: true,
  shadows: true,
  filmGrain: true,
};

const Wrapper = styled.div`
  position: fixed;
  bottom: 108px;
  right: 1rem;
  z-index: 100;
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 11px;
  pointer-events: auto;

  @media (max-width: 600px) {
    display: none;
  }
`;

const Toggle = styled.button`
  background: rgba(0, 0, 0, 0.75);
  color: rgba(200, 200, 200, 0.7);
  border: 1px solid rgba(200, 200, 200, 0.15);
  padding: 3px 8px;
  cursor: pointer;
  font-family: inherit;
  font-size: inherit;
  display: block;
  width: 100%;
  text-align: left;

  &:hover {
    background: rgba(40, 40, 40, 0.85);
  }
`;

const Panel = styled.div`
  background: rgba(0, 0, 0, 0.8);
  border: 1px solid rgba(200, 200, 200, 0.15);
  padding: 4px 0;
`;

const Row = styled.label`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 8px;
  cursor: pointer;
  color: rgba(200, 200, 200, 0.7);

  &:hover {
    background: rgba(60, 60, 60, 0.4);
  }

  input {
    accent-color: #c8142a;
  }
`;

interface DebugPanelProps {
  flags: DebugFlags;
  onChange: (flags: DebugFlags) => void;
  open: boolean;
  onToggleOpen: () => void;
}

export function DebugPanel({ flags, onChange, open, onToggleOpen }: DebugPanelProps) {
  const toggle = (key: keyof DebugFlags) => {
    onChange({ ...flags, [key]: !flags[key] });
  };

  const labels: Record<keyof DebugFlags, string> = {
    stats: 'FPS Stats',
    postProcessing: 'PostProcessing',
    shadows: 'ContactShadows',
    filmGrain: 'Film Grain',
  };

  return (
    <Wrapper>
      {open && (
        <Panel id="performance-settings">
          {(Object.keys(labels) as (keyof DebugFlags)[]).map(key => (
            <Row key={key}>
              <input
                type="checkbox"
                checked={flags[key]}
                onChange={() => toggle(key)}
              />
              {labels[key]}
            </Row>
          ))}
        </Panel>
      )}
      <Toggle type="button" aria-expanded={open} aria-controls="performance-settings" onClick={onToggleOpen}>
        {open ? '▾' : '▸'} perf
      </Toggle>
    </Wrapper>
  );
}
