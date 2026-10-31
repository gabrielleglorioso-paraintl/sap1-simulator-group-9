/**
 * SAP-1 CPU core (pure logic, no UI).
 *
 * The machine is modelled as an immutable state object plus a `tick()` function
 * that advances the controller-sequencer by ONE T-state. Every instruction takes
 * six T-states (T1-T6): T1-T3 fetch, T4-T6 execute.
 *
 *   T1  Ep, Lm      PC  -> W-bus -> MAR
 *   T2  Cp          PC increments
 *   T3  CE, Li      RAM[MAR] -> W-bus -> IR
 *   T4-T6           execute (depends on opcode, see `execute`)
 */

export const OPCODE = {
  LDA: 0b0000,
  ADD: 0b0001,
  SUB: 0b0010,
  OUT: 0b1110,
  HLT: 0b1111,
} as const;

export type Mnemonic = keyof typeof OPCODE;

/** Control signals of the SAP-1 control word (active = asserted this T-state). */
export type Signal =
  | 'Cp' // PC count enable
  | 'Ep' // PC -> bus
  | 'Lm' // load MAR
  | 'CE' // RAM -> bus (chip enable)
  | 'Li' // load IR
  | 'Ei' // IR operand -> bus
  | 'La' // load accumulator
  | 'Ea' // accumulator -> bus
  | 'Su' // subtract
  | 'Eu' // adder/subtractor -> bus
  | 'Lb' // load B register
  | 'Lo' // load output register
  | 'HLT';

export const SIGNALS: Signal[] = [
  'Cp', 'Ep', 'Lm', 'CE', 'Li', 'Ei', 'La', 'Ea', 'Su', 'Eu', 'Lb', 'Lo',
];

/** Components that can drive or listen to the W-bus. */
export type BusNode = 'PC' | 'MAR' | 'RAM' | 'IR' | 'A' | 'ALU' | 'B' | 'OUT';

export interface CpuState {
  ram: number[]; // 16 x 8-bit
  pc: number; // 4-bit
  mar: number; // 4-bit
  ir: number; // 8-bit (opcode = upper nibble, operand = lower nibble)
  a: number; // 8-bit accumulator
  b: number; // 8-bit B register
  out: number; // 8-bit output register
  t: number; // next T-state to execute (1..6)
  halted: boolean;
  error: string | null;
  instructionCount: number;
}

/** What happened during one T-state; drives the bus visualisation and log. */
export interface TickInfo {
  t: number;
  phase: 'fetch' | 'execute';
  signals: Signal[];
  source: BusNode | null;
  destinations: BusNode[];
  bus: number | null;
  text: string;
}

export const RAM_SIZE = 16;

export const hex = (n: number, digits = 2): string =>
  n.toString(16).toUpperCase().padStart(digits, '0');

export const bin = (n: number, bits: number): string =>
  n.toString(2).padStart(bits, '0');

export function createCpu(ram?: number[]): CpuState {
  const memory = Array.from({ length: RAM_SIZE }, (_, i) => (ram?.[i] ?? 0) & 0xff);
  return {
    ram: memory,
    pc: 0,
    mar: 0,
    ir: 0,
    a: 0,
    b: 0,
    out: 0,
    t: 1,
    halted: false,
    error: null,
    instructionCount: 0,
  };
}

export function decode(opcode: number): Mnemonic | null {
  for (const name of Object.keys(OPCODE) as Mnemonic[]) {
    if (OPCODE[name] === opcode) return name;
  }
  return null;
}

/** The instruction currently held in the IR (null if the IR is empty/illegal). */
export const currentInstruction = (s: CpuState): Mnemonic | null => decode(s.ir >> 4);

/** Su is driven by the controller while a SUB instruction sits in the IR. */
export const subtractMode = (s: CpuState): boolean => currentInstruction(s) === 'SUB';

/** Adder/subtractor output. Asynchronous: always reflects A and B. 2's complement subtraction. */
export function aluOutput(s: CpuState): number {
  return subtractMode(s) ? (s.a + ((~s.b + 1) & 0xff)) & 0xff : (s.a + s.b) & 0xff;
}

/** Advance the machine by one T-state. Returns the new state and a description of the tick. */
export function tick(s: CpuState): [CpuState, TickInfo] {
  if (s.halted) {
    return [s, { t: s.t, phase: 'execute', signals: [], source: null, destinations: [], bus: null, text: 'Machine is halted.' }];
  }

  const n: CpuState = { ...s };
  let info: TickInfo;

  if (s.t <= 3) {
    info = fetch(s, n);
  } else {
    info = execute(s, n);
  }

  if (!n.halted) {
    n.t = s.t === 6 ? 1 : s.t + 1;
    if (s.t === 6) n.instructionCount = s.instructionCount + 1;
  } else {
    n.t = 1;
    n.instructionCount = s.instructionCount + 1;
  }
  return [n, info];
}

function fetch(s: CpuState, n: CpuState): TickInfo {
  switch (s.t) {
    case 1:
      n.mar = s.pc;
      return {
        t: 1, phase: 'fetch', signals: ['Ep', 'Lm'], source: 'PC', destinations: ['MAR'], bus: s.pc,
        text: `PC (${hex(s.pc, 1)}H) -> W-bus -> MAR`,
      };
    case 2:
      n.pc = (s.pc + 1) & 0xf;
      return {
        t: 2, phase: 'fetch', signals: ['Cp'], source: null, destinations: [], bus: null,
        text: `PC increments: ${hex(s.pc, 1)}H -> ${hex(n.pc, 1)}H`,
      };
    default: {
      const word = s.ram[s.mar] & 0xff;
      n.ir = word;
      return {
        t: 3, phase: 'fetch', signals: ['CE', 'Li'], source: 'RAM', destinations: ['IR'], bus: word,
        text: `RAM[${hex(s.mar, 1)}H] = ${hex(word)}H -> W-bus -> IR`,
      };
    }
  }
}

function execute(s: CpuState, n: CpuState): TickInfo {
  const op = decode(s.ir >> 4);
  const operand = s.ir & 0xf;
  const nop = (t: number): TickInfo => ({
    t, phase: 'execute', signals: [], source: null, destinations: [], bus: null, text: 'No operation (NOP)',
  });

  if (op === null) {
    n.halted = true;
    n.error = `Illegal opcode ${bin(s.ir >> 4, 4)} in IR (${hex(s.ir)}H)`;
    return { ...nop(s.t), signals: ['HLT'], text: n.error };
  }

  // T4 for LDA/ADD/SUB: operand address from IR -> MAR
  if ((op === 'LDA' || op === 'ADD' || op === 'SUB') && s.t === 4) {
    n.mar = operand;
    return {
      t: 4, phase: 'execute', signals: ['Ei', 'Lm'], source: 'IR', destinations: ['MAR'], bus: operand,
      text: `${op}: IR operand (${hex(operand, 1)}H) -> W-bus -> MAR`,
    };
  }

  switch (op) {
    case 'LDA':
      if (s.t === 5) {
        const v = s.ram[s.mar] & 0xff;
        n.a = v;
        return {
          t: 5, phase: 'execute', signals: ['CE', 'La'], source: 'RAM', destinations: ['A'], bus: v,
          text: `LDA: RAM[${hex(s.mar, 1)}H] = ${hex(v)}H -> W-bus -> A`,
        };
      }
      return nop(s.t);

    case 'ADD':
    case 'SUB':
      if (s.t === 5) {
        const v = s.ram[s.mar] & 0xff;
        n.b = v;
        return {
          t: 5, phase: 'execute', signals: ['CE', 'Lb'], source: 'RAM', destinations: ['B'], bus: v,
          text: `${op}: RAM[${hex(s.mar, 1)}H] = ${hex(v)}H -> W-bus -> B`,
        };
      }
      {
        const sub = op === 'SUB';
        const r = aluOutput(s);
        n.a = r;
        return {
          t: 6, phase: 'execute', signals: sub ? ['Su', 'Eu', 'La'] : ['Eu', 'La'], source: 'ALU', destinations: ['A'], bus: r,
          text: sub
            ? `SUB: A - B = ${hex(s.a)}H - ${hex(s.b)}H = ${hex(r)}H (2's complement) -> A`
            : `ADD: A + B = ${hex(s.a)}H + ${hex(s.b)}H = ${hex(r)}H -> A`,
        };
      }

    case 'OUT':
      if (s.t === 4) {
        n.out = s.a;
        return {
          t: 4, phase: 'execute', signals: ['Ea', 'Lo'], source: 'A', destinations: ['OUT'], bus: s.a,
          text: `OUT: A (${hex(s.a)}H) -> W-bus -> Output register`,
        };
      }
      return nop(s.t);

    case 'HLT':
      n.halted = true;
      return { ...nop(4), signals: ['HLT'], text: 'HLT: clock stopped, program finished.' };
  }
}
