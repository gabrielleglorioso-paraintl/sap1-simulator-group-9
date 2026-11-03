/**
 * Plain-language explanation of each T-state, for the "What's happening" panel.
 * Pure functions: they only read the tick info and the CPU state AFTER that tick.
 */
import { bin, decode, hex, type CpuState, type Mnemonic, type Signal, type TickInfo } from './cpu';

export const SIGNAL_MEANING: Record<Signal, string> = {
  Cp: 'PC counts up by 1',
  Ep: 'PC puts its value on the W-bus',
  Lm: 'MAR loads the value on the W-bus',
  CE: 'RAM puts the addressed byte on the W-bus',
  Li: 'IR loads the value on the W-bus',
  Ei: 'IR puts its operand on the W-bus',
  La: 'Accumulator (A) loads the value on the W-bus',
  Ea: 'Accumulator (A) puts its value on the W-bus',
  Su: 'Adder/subtractor subtracts (A - B)',
  Eu: 'Adder/subtractor puts its result on the W-bus',
  Lb: 'B register loads the value on the W-bus',
  Lo: 'Output register loads the value on the W-bus',
  HLT: 'Clock stops',
};

export interface StepExplanation {
  title: string;
  detail: string;
  /** The instruction this step belongs to, once it is known (from T3 onwards). */
  mnemonic: Mnemonic | null;
}

const NOP_DETAIL =
  'Nothing happens in this T-state. SAP-1 always spends six T-states on every instruction so the timing stays simple, even when fewer are needed.';

export function explainStep(info: TickInfo, s: CpuState): StepExplanation {
  const operand = s.ir & 0xf;
  const mnemonic = info.t >= 3 ? decode(s.ir >> 4) : null;
  const done = (title: string, detail: string): StepExplanation => ({ title, detail, mnemonic });

  if (info.t === 1) {
    return done(
      'Fetch: send the address to the MAR',
      `The program counter (PC) holds ${hex(info.bus ?? 0, 1)}H, the address of the next instruction. The PC puts it on the W-bus (Ep) and the memory address register (MAR) loads it (Lm), so the RAM knows which cell to read.`,
    );
  }
  if (info.t === 2) {
    return done(
      'Fetch: PC counts up',
      `The PC increases by 1 and now holds ${hex(s.pc, 1)}H, so it already points at the following instruction (Cp). Nothing travels on the W-bus in this step.`,
    );
  }
  if (info.t === 3) {
    const word = info.bus ?? 0;
    const use = mnemonic === 'OUT' || mnemonic === 'HLT'
      ? `${mnemonic} does not use an address, so the lower nibble is ignored.`
      : `The lower nibble ${bin(operand, 4)} (${hex(operand, 1)}H) is the operand: the RAM address of the data.`;
    return done(
      'Fetch: the instruction goes to the IR',
      `RAM cell ${hex(s.mar, 1)}H holds ${hex(word)}H (${bin(word >> 4, 4)} ${bin(word & 0xf, 4)}). RAM puts it on the W-bus (CE) and the instruction register (IR) loads it (Li). The upper nibble ${bin(word >> 4, 4)} is the opcode, which the controller decodes as ${mnemonic ?? 'an unknown instruction'}. ${use}`,
    );
  }

  // T4-T6: execute
  if (mnemonic === null) {
    return done('Execute: illegal instruction', s.error ?? 'The opcode in the IR is not part of the SAP-1 instruction set.');
  }
  const head = `Execute ${mnemonic}`;

  if (mnemonic === 'HLT') {
    return done(`${head}: stop`, `The controller recognises HLT and stops the clock. The program is finished and the output register keeps the final result ${hex(s.out)}H.`);
  }
  if (mnemonic === 'OUT') {
    if (info.t === 4) {
      return done(`${head}: A to the output register`, `The accumulator (${hex(s.a)}H) puts its value on the W-bus (Ea) and the output register loads it (Lo). The 8 LEDs now show ${bin(s.out >> 4, 4)} ${bin(s.out & 0xf, 4)}.`);
    }
    return done(`${head}: no operation`, NOP_DETAIL);
  }

  // LDA, ADD, SUB
  if (info.t === 4) {
    return done(`${head}: address to the MAR`, `The IR puts its operand ${hex(operand, 1)}H on the W-bus (Ei) and the MAR loads it (Lm). The RAM is now pointing at the data this instruction needs.`);
  }
  if (mnemonic === 'LDA') {
    if (info.t === 5) {
      return done(`${head}: data to the accumulator`, `RAM cell ${hex(s.mar, 1)}H holds ${hex(s.a)}H. RAM puts it on the W-bus (CE) and the accumulator loads it (La). A = ${hex(s.a)}H.`);
    }
    return done(`${head}: no operation`, NOP_DETAIL);
  }
  if (info.t === 5) {
    return done(`${head}: data to the B register`, `RAM cell ${hex(s.mar, 1)}H holds ${hex(s.b)}H. RAM puts it on the W-bus (CE) and the B register loads it (Lb). B = ${hex(s.b)}H.`);
  }
  const result = info.bus ?? 0;
  if (mnemonic === 'ADD') {
    const before = (result - s.b) & 0xff;
    return done(`${head}: add and store in A`, `The adder/subtractor computes A + B = ${hex(before)}H + ${hex(s.b)}H = ${hex(result)}H. It puts the result on the W-bus (Eu) and the accumulator loads it (La). A = ${hex(result)}H.`);
  }
  const before = (result + s.b) & 0xff;
  return done(
    `${head}: subtract and store in A`,
    `The controller sets Su, so the adder/subtractor adds the 2's complement of B (${hex((~s.b + 1) & 0xff)}H) instead of B itself: A - B = ${hex(before)}H - ${hex(s.b)}H = ${hex(result)}H. It puts the result on the W-bus (Eu) and the accumulator loads it (La). A = ${hex(result)}H.`,
  );
}
