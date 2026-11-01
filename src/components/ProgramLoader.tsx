import { useState } from 'react';
import {
  MAX_TERMS, MIN_TERMS, buildProgram, checkRange, dataBaseRange, defaultDataBase,
  parseHex, sanitizeHex, termName, type Expression, type Op,
} from '../sap1/programs';
import { hex } from '../sap1/cpu';

interface Props {
  disabled: boolean;
  onLoad: (ram: number[], labels: string[], expected: number) => void;
  /** Expected result of the loaded program, to compare with the real output. */
  loadedExpected: number | null;
  out: number;
  halted: boolean;
}

interface Row {
  text: string; // hex digits typed by the user
  op: Op; // operator in front of this value (ignored for the first row)
}

/** Start with three empty boxes; the user types every value. */
const INITIAL: Row[] = [
  { text: '', op: '+' },
  { text: '', op: '+' },
  { text: '', op: '+' },
];

export function ProgramLoader({ disabled, onLoad, loadedExpected, out, halted }: Props) {
  const [rows, setRows] = useState<Row[]>(INITIAL);
  const [dataBase, setDataBase] = useState(defaultDataBase(INITIAL.length));

  const n = rows.length;
  const range = dataBaseRange(n);
  const parsed = rows.map((r) => parseHex(r.text));
  const valuesOk = parsed.every((p) => p.ok);
  const expr: Expression = {
    values: parsed.map((p) => (p.ok ? p.value : 0)),
    ops: rows.slice(1).map((r) => r.op),
    dataBase,
  };
  const check = valuesOk ? checkRange(expr) : null;
  const canLoad = !disabled && valuesOk && check?.ok === true;

  const setRow = (i: number, patch: Partial<Row>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  /** Adding/removing a value changes the safe address range, so keep the address inside it. */
  const resize = (next: Row[]) => {
    const r = dataBaseRange(next.length);
    setRows(next);
    setDataBase((b) => Math.min(Math.max(b, r.min), r.max));
  };

  const addresses = Array.from({ length: range.max - range.min + 1 }, (_, i) => range.min + i);

  const preview = valuesOk
    ? rows.map((r, i) => `${i > 0 ? (r.op === '+' ? ' + ' : ' − ') : ''}${hex(expr.values[i])}H`).join('')
    : '';

  return (
    <section className="panel loader">
      <h2>Load Program</h2>

      <div className="terms">
        {rows.map((row, i) => (
          <div className="term" key={i}>
            {i > 0 ? (
              <select
                aria-label={`Operator before ${termName(i)}`}
                value={row.op}
                onChange={(e) => setRow(i, { op: e.target.value as Op })}
              >
                <option value="+">+</option>
                <option value="-">&minus;</option>
              </select>
            ) : (
              <span className="term__spacer" />
            )}
            <label className="input">
              <span>{termName(i)}</span>
              <input
                value={row.text} placeholder="00" inputMode="text" maxLength={2} spellCheck={false} autoComplete="off"
                onChange={(e) => setRow(i, { text: sanitizeHex(e.target.value) })}
                aria-invalid={row.text !== '' && !parsed[i].ok}
                aria-label={`Value ${termName(i)} in hex`}
              />
              <span>H</span>
            </label>
            {n > MIN_TERMS && i > 0 && (
              <button className="term__x" aria-label={`Remove ${termName(i)}`} onClick={() => resize(rows.filter((_, j) => j !== i))}>
                &times;
              </button>
            )}
          </div>
        ))}
        {n < MAX_TERMS && (
          <button className="term__add" onClick={() => resize([...rows, { text: '', op: '+' }])}>+ Add number</button>
        )}
      </div>

      <div className="loader__row">
        <label className="addr">
          <span>Data starts at</span>
          <select value={dataBase} onChange={(e) => setDataBase(Number(e.target.value))} aria-label="Data start address">
            {addresses.map((a) => (
              <option key={a} value={a}>{hex(a, 1)}H</option>
            ))}
          </select>
          <small>(allowed {hex(range.min, 1)}H&ndash;{hex(range.max, 1)}H)</small>
        </label>

        <p className="preview mono">
          {check?.ok ? `${preview} = ${hex(check.total)}H` : preview}
        </p>

        <button className="loader__go" disabled={!canLoad} onClick={() => {
          const b = buildProgram(expr);
          onLoad(b.ram, b.labels, b.expected);
        }}>
          Load Program
        </button>
      </div>

      {!valuesOk && <p className="hint">Enter a hex value (00&ndash;FF) in every box, then press Load Program.</p>}
      {check && !check.ok && <p className="err">{check.message}</p>}
      {halted && loadedExpected !== null && (
        <p className="status">
          {out === loadedExpected ? `Correct: ${hex(out)}H` : `Wrong: got ${hex(out)}H, expected ${hex(loadedExpected)}H`}
        </p>
      )}
    </section>
  );
}