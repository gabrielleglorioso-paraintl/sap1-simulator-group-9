import { useCallback, useEffect, useRef, useState } from 'react';
import { createCpu, hex, tick, type CpuState, type TickInfo } from '../sap1/cpu';

export type Mode = 'idle' | 'step' | 'run';

/** One executed T-state, kept for the step log. */
export interface HistoryEntry {
  id: number;
  instruction: number; // 1-based instruction number
  t: number;
  text: string;
}

const MAX_HISTORY = 120;

/** Safety net so a program without HLT cannot run forever. */
const MAX_INSTRUCTIONS = 256;
/** Clock speed range in T-states per second. */
const MIN_CLOCK_SPEED = 1;
const MAX_CLOCK_SPEED = 10;
const DEFAULT_CLOCK_SPEED = 3;

export function useSimulator() {
  const cpuRef = useRef<CpuState>(createCpu());
  const historyId = useRef(0);

  const [cpu, setCpu] = useState<CpuState>(cpuRef.current);
  const [last, setLast] = useState<TickInfo | null>(null);
  const [mode, setMode] = useState<Mode>('idle');
  const [loaded, setLoaded] = useState(false);
  const [labels, setLabels] = useState<string[]>(() => Array(16).fill(''));
  const [notice, setNotice] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [clockSpeed, setClockSpeed] = useState(DEFAULT_CLOCK_SPEED);

  /** Execute one T-state. Returns true when the current mode should stop afterwards. */
  const advance = useCallback((m: Mode): boolean => {
    const before = cpuRef.current;
    if (before.halted) return true;

    const [next, info] = tick(before);
    cpuRef.current = next;
    setCpu(next);
    setLast(info);
    setHistory((h) => [
      ...h.slice(-(MAX_HISTORY - 1)),
      { id: historyId.current++, instruction: before.instructionCount + 1, t: info.t, text: info.text },
    ]);

    if (next.halted) return true;
    if (m === 'step' && next.t === 1) return true; // instruction finished
    if (m === 'run' && next.instructionCount >= MAX_INSTRUCTIONS) {
      setNotice(`Stopped after ${MAX_INSTRUCTIONS} instructions without HLT.`);
      return true;
    }
    return false;
  }, []);

  // Clock: one T-state per interval while stepping/running.
  useEffect(() => {
    if (mode === 'idle') return;
    const id = setInterval(() => {
      if (advance(mode)) setMode('idle');
    }, 1000 / clockSpeed);
    return () => clearInterval(id);
  }, [mode, advance, clockSpeed]);

  const start = useCallback(
    (m: Mode) => {
      setNotice(null);
      if (advance(m)) return;
      setMode(m);
    },
    [advance],
  );

  const loadProgram = useCallback((ram: number[], programLabels: string[]) => {
    const fresh = createCpu(ram);
    cpuRef.current = fresh;
    setCpu(fresh);
    setLast(null);
    setHistory([]);
    setMode('idle');
    setNotice(null);
    setLabels(programLabels);
    setLoaded(true);
  }, []);

  /** Clears every register and the RAM, and returns the simulator to power-on state. */
  const reset = useCallback(() => {
    const fresh = createCpu();
    cpuRef.current = fresh;
    setCpu(fresh);
    setLast(null);
    setHistory([]);
    setMode('idle');
    setNotice(null);
    setLabels(Array(16).fill(''));
    setLoaded(false);
  }, []);

  const pause = useCallback(() => setMode('idle'), []);

  const status = !loaded
    ? 'No program loaded'
    : cpu.error
      ? cpu.error
      : cpu.halted
        ? `Halted — output ${hex(cpu.out)}H`
        : mode === 'run'
          ? 'Running…'
          : mode === 'step'
            ? 'Stepping…'
            : 'Ready';

  return {
    cpu, last, history, mode, loaded, labels, notice, status,
    clockSpeed, setClockSpeed,
    minClockSpeed: MIN_CLOCK_SPEED, maxClockSpeed: MAX_CLOCK_SPEED,
    step: () => start('step'),
    tState: () => {
      setNotice(null);
      advance('idle');
    },
    run: () => start('run'),
    pause, reset, loadProgram,
  };
}
