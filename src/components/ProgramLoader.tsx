import { useState } from 'react';
import { FORMULAS, buildProgram, formatValue, parseValue, type Formula } from '../sap1/programs';
import { hex } from '../sap1/cpu';

interface Props {
  disabled: boolean;
  onLoad: (ram: number[], labels: string[], expected: number) => void;
  loadedExpected: number | null;
  out: number;
  halted: boolean;
}

const defaultsFor = (f: Formula) => f.defaults.map((v) => formatValue(v, 'hex'));

export function ProgramLoader({ disabled, onLoad, loadedExpected, out, halted }: Props) {
  const [formula, setFormula] = useState<Formula>(FORMULAS[0]);
  const [inputs, setInputs] = useState<string[]>(() => defaultsFor(FORMULAS[0]));

  const parsed = inputs.map((t) => parseValue(t, 'hex'));
  const allValid = parsed.every((p) => p.ok);
  const values = parsed.map((p) => (p.ok ? p.value : 0));

  return (
    <section className="panel loader">
      <h2>Load Program</h2>

      <div className="loader__row">
        <div className="loader__group">
          <p className="label">Formula</p>
          {FORMULAS.map((f) => (
            <label key={f.id} className="formula">
              <input
                type="radio" name="formula" checked={f.id === formula.id}
                onChange={() => { setFormula(f); setInputs(defaultsFor(f)); }}
              />
              {f.expression}
            </label>
          ))}
        </div>

        <div className="loader__group">
          <p className="label">Values (hex, 00&ndash;FF)</p>
          <div className="loader__inputs">
            {formula.terms.map((term, i) => {
              const p = parsed[i];
              return (
                <label key={term.name} className="input">
                  <span>{term.name}</span>
                  <input
                    value={inputs[i]} maxLength={4} spellCheck={false}
                    onChange={(e) => setInputs(inputs.map((t, j) => (j === i ? e.target.value : t)))}
                    aria-invalid={!p.ok}
                  />
                  <span>H</span>
                  {!p.ok && <em className="err">{p.error}</em>}
                </label>
              );
            })}
          </div>
        </div>

        <div className="loader__group loader__go">
          <button
            disabled={disabled || !allValid}
            onClick={() => { const b = buildProgram(formula, values); onLoad(b.ram, b.labels, b.expected); }}
          >
            Load Program
          </button>
          {halted && loadedExpected !== null && (
            <p className="status">
              {out === loadedExpected ? `Correct: ${hex(out)}H` : `Wrong: got ${hex(out)}H, expected ${hex(loadedExpected)}H`}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
