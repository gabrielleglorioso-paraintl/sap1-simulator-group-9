/**
 * Formula -> SAP-1 machine program generator.
 *
 * The three formulas come from the Unit 2 slides:
 *   1. A + B - C      (sample program: 25H + 05H - 23H, data at 9H..BH)
 *   2. A - B + C      (Example 1:      21H - 02H + 0AH, data at 8H..AH)
 *   3. A + B + C - D  (Example 2:      01H + 02H + 03H - 0AH, data at 8H..BH)
 *
 * The values are NEVER hard-coded into the program: they are supplied by the user
 * and written into the data cells at load time. The numbers in `defaults` are
 * only pre-filled suggestions in the input boxes.
 */
import { OPCODE, RAM_SIZE, hex, bin } from './cpu';

export interface Term {
  name: string; // variable name shown in the UI (A, B, ...)
  sign: '+' | '-';
}

export interface Formula {
  id: string;
  expression: string;
  origin: string;
  terms: Term[];
  dataBase: number; // address of the first data value
  defaults: number[];
}

export const FORMULAS: Formula[] = [
  {
    id: 'f1',
    expression: 'A + B − C',
    origin: 'Sample program',
    terms: [{ name: 'A', sign: '+' }, { name: 'B', sign: '+' }, { name: 'C', sign: '-' }],
    dataBase: 0x9,
    defaults: [0x25, 0x05, 0x23],
  },
  {
    id: 'f2',
    expression: 'A − B + C',
    origin: 'Example 1',
    terms: [{ name: 'A', sign: '+' }, { name: 'B', sign: '-' }, { name: 'C', sign: '+' }],
    dataBase: 0x8,
    defaults: [0x21, 0x02, 0x0a],
  },
  {
    id: 'f3',
    expression: 'A + B + C − D',
    origin: 'Example 2',
    terms: [
      { name: 'A', sign: '+' }, { name: 'B', sign: '+' }, { name: 'C', sign: '+' }, { name: 'D', sign: '-' },
    ],
    dataBase: 0x8,
    defaults: [0x01, 0x02, 0x03, 0x0a],
  },
];

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

export function buildProgram(formula: Formula, values: number[]): BuiltProgram {
  const ram = new Array<number>(RAM_SIZE).fill(0);
  const labels = new Array<string>(RAM_SIZE).fill('');
  const listing: ListingRow[] = [];

  const put = (addr: number, code: number, asm: string, kind: ListingRow['kind']) => {
    ram[addr] = code & 0xff;
    labels[addr] = asm;
    listing.push({ addr, asm, code: code & 0xff, kind });
  };

  let addr = 0;
  formula.terms.forEach((term, i) => {
    const dataAddr = formula.dataBase + i;
    const mnemonic = i === 0 ? 'LDA' : term.sign === '+' ? 'ADD' : 'SUB';
    put(addr++, (OPCODE[mnemonic] << 4) | dataAddr, `${mnemonic} ${hex(dataAddr, 1)}H`, 'instruction');
  });
  put(addr++, (OPCODE.OUT << 4) | 0xf, 'OUT', 'instruction'); // operand is "don't care" -> 1111
  put(addr++, (OPCODE.HLT << 4) | 0xf, 'HLT', 'instruction');

  if (addr > formula.dataBase) throw new Error('Program overlaps the data area');

  formula.terms.forEach((term, i) => {
    put(formula.dataBase + i, values[i], `${hex(values[i])}H (${term.name})`, 'data');
  });

  return { ram, listing, labels, expected: evaluate(formula, values) };
}

/** Reference result computed in plain TypeScript (8-bit wrap-around), used to cross-check the simulator. */
export function evaluate(formula: Formula, values: number[]): number {
  let total = 0;
  formula.terms.forEach((term, i) => {
    total += term.sign === '+' ? values[i] : -values[i];
  });
  return total & 0xff;
}

export type Radix = 'hex' | 'dec';

export type ParseResult = { ok: true; value: number } | { ok: false; error: string };

/** Parse a user-entered 8-bit value in hex (25, 25H, 0x25) or decimal (0-255). */
export function parseValue(text: string, radix: Radix): ParseResult {
  const t = text.trim();
  if (t === '') return { ok: false, error: 'Required' };
  if (radix === 'hex') {
    const m = /^(?:0x)?([0-9a-f]{1,2})h?$/i.exec(t);
    if (!m) return { ok: false, error: 'Use 1-2 hex digits (00-FF)' };
    return { ok: true, value: parseInt(m[1], 16) };
  }
  if (!/^\d{1,3}$/.test(t)) return { ok: false, error: 'Use a whole number 0-255' };
  const v = parseInt(t, 10);
  return v > 255 ? { ok: false, error: 'Max is 255' } : { ok: true, value: v };
}

export const formatValue = (v: number, radix: Radix): string => (radix === 'hex' ? hex(v) : String(v));

export const toSigned = (v: number): number => (v & 0x80 ? v - 256 : v);

export const describeBinary = (v: number): string => `${bin(v >> 4, 4)} ${bin(v & 0xf, 4)}`;
