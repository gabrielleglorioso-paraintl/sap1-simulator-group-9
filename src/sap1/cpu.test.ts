import { describe, expect, it } from 'vitest';
import { createCpu, tick, hex, type CpuState, type TickInfo } from './cpu';
import { FORMULAS, buildProgram, evaluate, parseValue } from './programs';

function runToHalt(cpu: CpuState, limit = 1000): { cpu: CpuState; ticks: TickInfo[] } {
  const ticks: TickInfo[] = [];
  let s = cpu;
  while (!s.halted && ticks.length < limit) {
    const [next, info] = tick(s);
    s = next;
    ticks.push(info);
  }
  return { cpu: s, ticks };
}

describe('SAP-1 instruction cycle', () => {
  it('runs the Unit 2 sample program: 25H + 05H - 23H = 07H', () => {
    const { ram } = buildProgram(FORMULAS[0], [0x25, 0x05, 0x23]);
    expect(ram.slice(0, 5).map((b) => hex(b))).toEqual(['09', '1A', '2B', 'EF', 'FF']);
    const { cpu } = runToHalt(createCpu(ram));
    expect(cpu.out).toBe(0x07);
    expect(cpu.halted).toBe(true);
  });

  it('uses six T-states per instruction and increments the PC after each fetch', () => {
    const { ram } = buildProgram(FORMULAS[0], [1, 2, 3]);
    let s = createCpu(ram);
    const seen: number[] = [];
    for (let i = 0; i < 6; i++) {
      const [next, info] = tick(s);
      seen.push(info.t);
      s = next;
    }
    expect(seen).toEqual([1, 2, 3, 4, 5, 6]);
    expect(s.pc).toBe(1);
    expect(s.a).toBe(1); // LDA completed
    expect(s.t).toBe(1);
  });

  it('follows the fetch micro-operations T1-T3', () => {
    const { ram } = buildProgram(FORMULAS[0], [1, 2, 3]);
    const [s1, i1] = tick(createCpu(ram));
    expect(i1.signals).toEqual(['Ep', 'Lm']);
    expect(i1.source).toBe('PC');
    expect(s1.mar).toBe(0);
    const [s2, i2] = tick(s1);
    expect(i2.signals).toEqual(['Cp']);
    expect(s2.pc).toBe(1);
    const [s3, i3] = tick(s2);
    expect(i3.signals).toEqual(['CE', 'Li']);
    expect(s3.ir).toBe(ram[0]);
  });

  it('subtracts with 2\'s complement and wraps to 8 bits', () => {
    // 01H + 02H + 03H - 0AH = -4 = FCH
    const { cpu } = runToHalt(createCpu(buildProgram(FORMULAS[2], [1, 2, 3, 0xa]).ram));
    expect(cpu.out).toBe(0xfc);
  });

  it('wraps on overflow: FFH + 02H - 00H = 01H', () => {
    const { cpu } = runToHalt(createCpu(buildProgram(FORMULAS[0], [0xff, 0x02, 0x00]).ram));
    expect(cpu.out).toBe(0x01);
  });

  it('stays halted after HLT', () => {
    const { cpu } = runToHalt(createCpu(buildProgram(FORMULAS[0], [1, 1, 1]).ram));
    const [again] = tick(cpu);
    expect(again).toBe(cpu);
  });

  it('flags an illegal opcode instead of looping', () => {
    const ram = new Array(16).fill(0);
    ram[0] = 0x30; // opcode 0011 is not in the instruction set
    const { cpu } = runToHalt(createCpu(ram));
    expect(cpu.halted).toBe(true);
    expect(cpu.error).toMatch(/Illegal opcode/);
  });

  it.each(FORMULAS.map((f) => [f.expression, f] as const))('%s matches the reference for many inputs', (_n, f) => {
    const samples = [0, 1, 0x7f, 0x80, 0xff, 0x25, 0x0a];
    for (const a of samples) {
      for (const b of samples) {
        const values = f.terms.map((_, i) => [a, b, a ^ b, (a + b) & 0xff][i]);
        const { cpu } = runToHalt(createCpu(buildProgram(f, values).ram));
        expect(cpu.out).toBe(evaluate(f, values));
      }
    }
  });
});

describe('value parsing', () => {
  it('accepts hex forms and rejects bad input', () => {
    expect(parseValue('25', 'hex')).toEqual({ ok: true, value: 0x25 });
    expect(parseValue('0Ah', 'hex')).toEqual({ ok: true, value: 0x0a });
    expect(parseValue('0xFF', 'hex')).toEqual({ ok: true, value: 255 });
    expect(parseValue('1FF', 'hex').ok).toBe(false);
    expect(parseValue('', 'hex').ok).toBe(false);
  });
  it('accepts decimal 0-255', () => {
    expect(parseValue('37', 'dec')).toEqual({ ok: true, value: 37 });
    expect(parseValue('256', 'dec').ok).toBe(false);
    expect(parseValue('-1', 'dec').ok).toBe(false);
  });
});
