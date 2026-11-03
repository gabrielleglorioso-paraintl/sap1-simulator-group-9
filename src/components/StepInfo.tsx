import { useEffect, useRef } from 'react';
import type { CpuState, TickInfo } from '../sap1/cpu';
import { SIGNAL_MEANING, explainStep } from '../sap1/explain';
import type { HistoryEntry } from '../hooks/useSimulator';

interface Props {
  cpu: CpuState;
  last: TickInfo | null;
  history: HistoryEntry[];
}

const T_STATES = [1, 2, 3, 4, 5, 6];

/** Explains in plain words what the last T-state did, plus a log of every step so far. */
export function StepInfo({ cpu, last, history }: Props) {
  const logRef = useRef<HTMLOListElement>(null);
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [history]);

  const info = last ? explainStep(last, cpu) : null;
  const current = history.length ? history[history.length - 1] : null;

  return (
    <section className="panel stepinfo" aria-label="What is happening">
      <h2>What&apos;s happening</h2>

      {!last || !info ? (
        <p className="hint">
          Load a program, then press Step, Micro-Step or Run. Every instruction takes six T-states:
          T1&ndash;T3 fetch it from memory, T4&ndash;T6 execute it. Each step is explained here.
        </p>
      ) : (
        <>
          <div className="stepinfo__head">
            <span className="chip">Instruction #{current?.instruction}</span>
            <span className={`chip chip--${last.phase}`}>{last.phase === 'fetch' ? 'FETCH' : 'EXECUTE'}</span>
            {info.mnemonic && <span className="chip chip--op">{info.mnemonic}</span>}
          </div>

          <ol className="stepinfo__timeline" aria-label="T-states">
            {T_STATES.map((t) => (
              <li
                key={t}
                className={t === last.t ? 'is-now' : t < last.t ? 'is-done' : ''}
                aria-current={t === last.t ? 'step' : undefined}
              >
                T{t}
              </li>
            ))}
          </ol>

          <h3 className="stepinfo__title">T{last.t} &middot; {info.title}</h3>
          <p className="stepinfo__detail">{info.detail}</p>

          {last.signals.length > 0 && (
            <ul className="stepinfo__signals" aria-label="Active control signals">
              {last.signals.map((sig) => (
                <li key={sig}><b>{sig}</b> {SIGNAL_MEANING[sig]}</li>
              ))}
            </ul>
          )}
        </>
      )}

      {history.length > 0 && (
        <>
          <h3 className="stepinfo__logtitle">Step log</h3>
          <ol className="stepinfo__log" ref={logRef}>
            {history.map((h) => (
              <li key={h.id}><span className="log-i">#{h.instruction}</span> <span className="log-t">T{h.t}</span> {h.text}</li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}
