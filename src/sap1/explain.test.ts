import { describe, expect, it } from 'vitest';
import { createCpu, tick, type TickInfo, type CpuState } from './cpu';
import { buildProgram } from './programs';
import { explainStep } from './explain';

describe('step explanations (sample program 25H + 05H - 23H)', () => {
  const trace: { info: TickInfo; after: CpuState; text: string; title: string; detail: string }[] = [];
  let s = createCpu(buildProgram({ values: [0x25, 0x05, 0x23], ops: ['+', '-'], dataBase: 9 }).ram);
  while (!s.halted) {
    const [next, info] = tick(s);
    const e = explainStep(info, next);
    trace.push({ info, after: next, text: info.text, title: e.title, detail: e.detail });
    s = next;
  }

  it('explains every one of the 6 T-states of every instruction with non-empty text', () => {
    expect(trace.length).toBe(6 * 4 + 4); // LDA, ADD, SUB, OUT are 6 each; HLT stops at T4
    for (const t of trace) {
      expect(t.title.length).toBeGreaterThan(5);
      expect(t.detail.length).toBeGreaterThan(20);
    }
  });

  it('T1-T3 of the first instruction mention the real values', () => {
    expect(trace[0].detail).toContain('0H'); // PC value
    expect(trace[1].detail).toContain('1H'); // PC after counting up
    expect(trace[2].detail).toContain('09H'); // fetched byte LDA 9
    expect(trace[2].detail).toContain('LDA');
  });

  it('shows the real numbers for ADD and SUB', () => {
    const add = trace.find((t) => t.title.startsWith('Execute ADD') && t.info.t === 6)!;
    expect(add.detail).toContain('25H + 05H = 2AH');
    const sub = trace.find((t) => t.title.startsWith('Execute SUB') && t.info.t === 6)!;
    expect(sub.detail).toContain('2AH - 23H = 07H');
    expect(sub.detail).toContain("2's complement of B (DDH)");
  });

  it('OUT and HLT are explained', () => {
    expect(trace.find((t) => t.title.startsWith('Execute OUT') && t.info.t === 4)!.detail).toContain('0000 0111');
    expect(trace[trace.length - 1].title).toContain('HLT');
  });
});
