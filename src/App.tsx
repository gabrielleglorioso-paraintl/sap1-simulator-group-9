import { useState } from 'react';
import { HelpManual } from './components/HelpManual';
import { useSimulator } from './hooks/useSimulator';
import { BlockDiagram } from './components/BlockDiagram';
import { MemoryTable } from './components/MemoryTable';
import { LedRow } from './components/LedRow';
import { Controls } from './components/Controls';
import { ProgramLoader } from './components/ProgramLoader';
import { ClockSpeed } from './components/ClockSpeed';

export default function App() {
  const sim = useSimulator();
  const [expected, setExpected] = useState<number | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <div className="app">
      <header className="app__header">
        <h1>SAP-1 Simulator</h1>
        <span className="app__group">Group 9</span>
        <button type="button" className="help-button" onClick={() => setHelpOpen(true)} aria-haspopup="dialog">Help</button>
      </header>

      {helpOpen && <HelpManual onClose={() => setHelpOpen(false)} />}

      <section className="topbar">
        <ProgramLoader
          disabled={sim.mode !== 'idle'}
          onLoad={(ram, labels, exp) => {
            sim.loadProgram(ram, labels);
            setExpected(exp);
          }}
          loadedExpected={sim.loaded ? expected : null}
          out={sim.cpu.out}
          halted={sim.cpu.halted && !sim.cpu.error}
        />
        <Controls
          mode={sim.mode}
          loaded={sim.loaded}
          halted={sim.cpu.halted}
          status={sim.status}
          notice={sim.notice}
          onStep={sim.step}
          onTState={sim.tState}
          onRun={sim.run}
          onPause={sim.pause}
          onReset={() => {
            sim.reset();
            setExpected(null);
          }}
        />
      </section>

      <main className="layout">
        <div className="memory-col">
          <MemoryTable cpu={sim.cpu} last={sim.last} labels={sim.labels} />
          <ClockSpeed
            value={sim.clockSpeed}
            min={sim.minClockSpeed}
            max={sim.maxClockSpeed}
            onChange={sim.setClockSpeed}
          />
        </div>
        <div className="col">
          <BlockDiagram cpu={sim.cpu} last={sim.last} />
          <LedRow value={sim.cpu.out} />
        </div>
      </main>
    </div>
  );
}

