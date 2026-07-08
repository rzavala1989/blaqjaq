import { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';

const Panel = styled.div`
  position: absolute;
  bottom: 116px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 30;
  background: #06060a;
  border: 1px solid rgba(200, 170, 80, 0.4);
  box-shadow: 0 0 18px rgba(200, 170, 80, 0.08), 0 4px 24px rgba(0, 0, 0, 0.8);
  padding: 0.75rem 1.25rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-family: 'Special Elite', 'Courier New', monospace;
  font-size: 0.8rem;
  color: rgba(228, 220, 200, 0.85);
`;

const Prompt = styled.span`
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(200, 170, 80, 0.8);
`;

const CountInput = styled.input`
  width: 4rem;
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(200, 185, 155, 0.3);
  color: #e4dcc8;
  font-family: inherit;
  font-size: 0.9rem;
  padding: 0.3rem 0.5rem;
  text-align: center;

  &:focus {
    outline: none;
    border-color: rgba(200, 170, 80, 0.6);
  }
`;

const SubmitButton = styled.button`
  background: #0c0a04;
  border: 1px solid #907830;
  color: #e4dcc8;
  font-family: inherit;
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 0.35rem 0.9rem;
  cursor: pointer;

  &:hover {
    filter: brightness(1.3);
  }
`;

const Verdict = styled.span<{ $correct: boolean }>`
  color: ${({ $correct }) => ($correct ? 'rgba(120, 200, 120, 0.9)' : 'rgba(220, 100, 100, 0.9)')};
  letter-spacing: 0.06em;
`;

const Detail = styled.span`
  color: rgba(200, 185, 155, 0.55);
  font-variant-numeric: tabular-nums;
`;

export interface CountCheckProps {
  actualCount: number;
  trueCountValue: number;
  onAnswer: (correct: boolean) => void;
  onDismiss: () => void;
}

export function CountCheck({ actualCount, trueCountValue, onAnswer, onDismiss }: CountCheckProps) {
  const [guess, setGuess] = useState('');
  const [answered, setAnswered] = useState<null | boolean>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = () => {
    if (answered !== null) return;
    const parsed = parseInt(guess, 10);
    if (Number.isNaN(parsed)) return;
    const correct = parsed === actualCount;
    setAnswered(correct);
    onAnswer(correct);
  };

  const fmt = (n: number) => (n > 0 ? `+${n}` : String(n));

  if (answered !== null) {
    return (
      <Panel>
        <Verdict $correct={answered}>{answered ? 'Correct' : 'Off'}</Verdict>
        <Detail>
          running {fmt(actualCount)} · true {fmt(Math.round(trueCountValue * 10) / 10)}
        </Detail>
        <SubmitButton onClick={onDismiss}>Continue</SubmitButton>
      </Panel>
    );
  }

  return (
    <Panel>
      <Prompt>Count check</Prompt>
      <CountInput
        ref={inputRef}
        value={guess}
        onChange={e => setGuess(e.target.value.replace(/[^0-9+-]/g, ''))}
        onKeyDown={e => {
          if (e.key === 'Enter') submit();
          e.stopPropagation();
        }}
        placeholder="+0"
        inputMode="numeric"
      />
      <SubmitButton onClick={submit}>Check</SubmitButton>
    </Panel>
  );
}
