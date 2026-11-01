import type { Mode } from '../hooks/useSimulator';

interface Props {
  mode: Mode;
  loaded: boolean;
  halted: boolean;
  status: string;
  notice: string | null;
  onStep: () => void;
  onTState: () => void;
  onRun: () => void;
  onPause: () => void;
  onReset: () => void;
}

export function Controls(p: Props) {
  const canAct = p.loaded && !p.halted && p.mode === 'idle';
  return (
    <section className="panel">
      <h2>Controls</h2>
      <div className="btnrow">
        <button onClick={p.onStep} disabled={!canAct} title="Execute one instruction">Step</button>
        <button onClick={p.onTState} disabled={!canAct} title="Advance one T-state">Micro-Step</button>
        {p.mode === 'run' ? (
          <button onClick={p.onPause}>Pause</button>
        ) : (
          <button onClick={p.onRun} disabled={!canAct} title="Run until HLT">Run</button>
        )}
        <button onClick={p.onReset} title="Clear all registers and memory">Reset</button>
      </div>
      <p className="status" role="status">{p.status}</p>
      {p.notice && <p className="status">{p.notice}</p>}
    </section>
  );
}
