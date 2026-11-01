/**
 * User-built expression -> SAP-1 machine program.
 *
 * The user types 2-5 values and picks + or - between them, e.g. 25H + 05H - 23H.
 * The first value is loaded with LDA; every later value becomes ADD or SUB.
 * Layout in RAM:  [LDA/ADD/SUB ...] [OUT] [HLT] ... [data values]
 * The data start address is chosen by the user, but only from addresses that
 * cannot overlap the program or run past the 16 memory cells (see dataBaseRange).
 */
import { OPCODE, RAM_SIZE, hex } from './cpu';

export type Op = '+' | '-';

export const MIN_TERMS = 2;
export const MAX_TERMS = 5;

/** Variable letter shown next to each number: A, B, C ... */
export const termName = (i: number): string => String.fromCharCode(65 + i);

export interface Expression {
  values: number[]; // 8-bit data values, in the order typed
  ops: Op[]; // ops[i] is applied to values[i + 1]  (length = values.length - 1)
  dataBase: number; // RAM address of values[0]
}

export interface ListingRow {
  addr: number;
  asm: string;
  code: number;
  kind: 'instruction' | 'data';
}

export interface BuiltProgram {
  ram: number[];
  listing: ListingRow[];
  /** One short label per RAM address ('' when unused), for the memory viewer. */
  labels: string[];
  expected: number;
}

/**
 * Valid data start addresses for n values.
 * The program uses n instructions + OUT + HLT = n + 2 cells (addresses 0 .. n+1),
 * so data must start at n + 2 or later and still fit: base + n - 1 <= 15.
 */
export function dataBaseRange(n: number): { min: number; max: number } {
  return { min: n + 2, max: RAM_SIZE - n };
}

/** Default start address (9H, as in the Unit 2 sample), kept inside the valid range. */
export function defaultDataBase(n: number): number {
  const { min, max } = dataBaseRange(n);
  return Math.min(Math.max(0x9, min), max);
}

export function buildProgram(expr: Expression): BuiltProgram {
  const n = expr.values.length;
  const { min, max } = dataBaseRange(n);
  if (n < MIN_TERMS || n > MAX_TERMS) throw new Error(`Use ${MIN_TERMS}-${MAX_TERMS} values`);
  if (expr.ops.length !== n - 1) throw new Error('Need one operator between each pair of values');
  if (expr.dataBase < min || expr.dataBase > max) throw new Error('Data start address is out of range');

  const ram = new Array<number>(RAM_SIZE).fill(0);
  const labels = new Array<string>(RAM_SIZE).fill('');
  const listing: ListingRow[] = [];

  const put = (addr: number, code: number, asm: string, kind: ListingRow['kind']) => {
    ram[addr] = code & 0xff;
    labels[addr] = asm;
    listing.push({ addr, asm, code: code & 0xff, kind });
  };

  let addr = 0;
  expr.values.forEach((_, i) => {
    const dataAddr = expr.dataBase + i;
    const mnemonic = i === 0 ? 'LDA' : expr.ops[i - 1] === '+' ? 'ADD' : 'SUB';
    put(addr++, (OPCODE[mnemonic] << 4) | dataAddr, `${mnemonic} ${hex(dataAddr, 1)}H`, 'instruction');
  });
  put(addr++, (OPCODE.OUT << 4) | 0xf, 'OUT', 'instruction'); // operand is "don't care" -> 1111
  put(addr, (OPCODE.HLT << 4) | 0xf, 'HLT', 'instruction');

  expr.values.forEach((v, i) => put(expr.dataBase + i, v, `${hex(v)}H (${termName(i)})`, 'data'));

  return { ram, listing, labels, expected: evaluate(expr) };
}

/** Reference result in plain TypeScript (8-bit wrap-around), used to cross-check the simulator. */
export function evaluate(expr: Expression): number {
  let total = expr.values[0];
  expr.ops.forEach((op, i) => {
    total += op === '+' ? expr.values[i + 1] : -expr.values[i + 1];
  });
  return total & 0xff;
}

export type RangeCheck = { ok: true; total: number } | { ok: false; message: string };

/**
 * The accumulator is 8-bit unsigned (00H-FFH). Reject any expression where the running
 * total leaves that range after any step, so the output is never a wrapped value.
 */
export function checkRange(expr: Expression): RangeCheck {
  let total = expr.values[0];
  for (let i = 1; i < expr.values.length; i++) {
    total += expr.ops[i - 1] === '+' ? expr.values[i] : -expr.values[i];
    if (total < 0) {
      return { ok: false, message: `Result would go below 00H after ${expr.ops[i - 1]} ${termName(i)} (total ${total}). Change a value or operator.` };
    }
    if (total > 0xff) {
      return { ok: false, message: `Result would go above FFH after ${expr.ops[i - 1]} ${termName(i)} (total ${total}). Change a value or operator.` };
    }
  }
  return { ok: true, total };
}

export type ParseResult = { ok: true; value: number } | { ok: false; error: string };

/** Strict hex: 1-2 hex digits (00-FF). */
export function parseHex(text: string): ParseResult {
  const t = text.trim();
  if (t === '') return { ok: false, error: 'Required' };
  if (!/^[0-9a-f]{1,2}$/i.test(t)) return { ok: false, error: 'Hex 00-FF only' };
  return { ok: true, value: parseInt(t, 16) };
}

/** Remove anything that is not a hex digit and cap at 2 characters (used while typing). */
export const sanitizeHex = (text: string): string => text.replace(/[^0-9a-f]/gi, '').slice(0, 2).toUpperCase();
