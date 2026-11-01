import { describe, expect, it } from 'vitest';
import { createCpu, tick, hex, type CpuState, type TickInfo } from './cpu';
import {
  buildProgram, checkRange, dataBaseRange, defaultDataBase, evaluate, parseHex, sanitizeHex, type Expression,
} from './programs';

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

const sample: Expression = { values: [0x25, 0x05, 0x23], ops: ['+', '-'], dataBase: 0x9 };

describe('SAP-1 instruction cycle', () => {
  it('runs the Unit 2 sample program: 25H + 05H - 23H = 07H', () => {
    const { ram } = buildProgram(sample);
    expect(ram.slice(0, 5).map((b) => hex(b))).toEqual(['09', '1A', '2B', 'EF', 'FF']);
    const { cpu } = runToHalt(createCpu(ram));
    expect(cpu.out).toBe(0x07);
    expect(cpu.halted).toBe(true);
  });

  it('uses six T-states per instruction and increments the PC after each fetch', () => {
    let s = createCpu(buildProgram(sample).ram);
    const seen: number[] = [];
    for (let i = 0; i < 6; i++) {
      const [next, info] = tick(s);
      seen.push(info.t);
      s = next;
    }
    expect(seen).toEqual([1, 2, 3, 4, 5, 6]);
    expect(s.pc).toBe(1);
    expect(s.a).toBe(0x25);
    expect(s.t).toBe(1);
  });

  it('follows the fetch micro-operations T1-T3', () => {
    const { ram } = buildProgram(sample);
    const [s1, i1] = tick(createCpu(ram));
    expect(i1.signals).toEqual(['Ep', 'Lm']);
    expect(i1.source).toBe('PC');
    const [s2, i2] = tick(s1);
    expect(i2.signals).toEqual(['Cp']);
    expect(s2.pc).toBe(1);
    const [s3, i3] = tick(s2);
    expect(i3.signals).toEqual(['CE', 'Li']);
    expect(s3.ir).toBe(ram[0]);
  });

  it('subtracts with 2\'s complement and wraps to 8 bits (hardware behaviour)', () => {
    const e: Expression = { values: [1, 2, 3, 0xa], ops: ['+', '+', '-'], dataBase: 8 };
    expect(runToHalt(createCpu(buildProgram(e).ram)).cpu.out).toBe(0xfc);
  });

  it('stays halted after HLT', () => {
    const { cpu } = runToHalt(createCpu(buildProgram(sample).ram));
    const [again] = tick(cpu);
    expect(again).toBe(cpu);
  });

  it('flags an illegal opcode instead of looping', () => {
    const ram = new Array(16).fill(0);
    ram[0] = 0x30;
    const { cpu } = runToHalt(createCpu(ram));
    expect(cpu.halted).toBe(true);
    expect(cpu.error).toMatch(/Illegal opcode/);
  });
});

describe('user-built expressions', () => {
  it('matches the reference for every length (2-5), operator mix and data address', () => {
    const vals = [0x10, 0x07, 0x03, 0x22, 0x05];
    for (let n = 2; n <= 5; n++) {
      const { min, max } = dataBaseRange(n);
      for (let base = min; base <= max; base++) {
        for (let mask = 0; mask < 1 << (n - 1); mask++) {
          const ops = Array.from({ length: n - 1 }, (_, i) => ((mask >> i) & 1 ? '-' : '+') as '+' | '-');
          const e: Expression = { values: vals.slice(0, n), ops, dataBase: base };
          const { cpu } = runToHalt(createCpu(buildProgram(e).ram));
          expect(cpu.out).toBe(evaluate(e));
          expect(cpu.error).toBeNull();
        }
      }
    }
  });

  it('never lets the data overlap the program', () => {
    for (let n = 2; n <= 5; n++) {
      const { min, max } = dataBaseRange(n);
      expect(min).toBe(n + 2);
      expect(max + n - 1).toBe(15);
      expect(() => buildProgram({ values: Array(n).fill(1), ops: Array(n - 1).fill('+'), dataBase: min - 1 })).toThrow();
      expect(() => buildProgram({ values: Array(n).fill(1), ops: Array(n - 1).fill('+'), dataBase: max + 1 })).toThrow();
      const d = defaultDataBase(n);
      expect(d >= min && d <= max).toBe(true);
    }
  });

  it('blocks results that go below 00H or above FFH at any step', () => {
    expect(checkRange(sample)).toEqual({ ok: true, total: 7 });
    expect(checkRange({ values: [1, 2, 3, 0xa], ops: ['+', '+', '-'], dataBase: 8 }).ok).toBe(false);
    expect(checkRange({ values: [0xf0, 0x20], ops: ['+'], dataBase: 4 }).ok).toBe(false);
    expect(checkRange({ values: [0x00, 0x01], ops: ['-'], dataBase: 4 }).ok).toBe(false); // -1
    expect(checkRange({ values: [0xff, 0xff, 0xff], ops: ['-', '+'], dataBase: 5 })).toEqual({ ok: true, total: 0xff }); // 00 then FF is fine
  });
});

describe('hex input rules', () => {
  it('accepts only 1-2 hex digits', () => {
    expect(parseHex('25')).toEqual({ ok: true, value: 0x25 });
    expect(parseHex('a')).toEqual({ ok: true, value: 0x0a });
    expect(parseHex('FF')).toEqual({ ok: true, value: 255 });
    expect(parseHex('').ok).toBe(false);
    expect(parseHex('1FF').ok).toBe(false);
    expect(parseHex('0x1').ok).toBe(false);
    expect(parseHex('G1').ok).toBe(false);
  });
  it('strips invalid characters while typing', () => {
    expect(sanitizeHex('zz2g5!')).toBe('25');
    expect(sanitizeHex('abc')).toBe('AB');
  });
});
