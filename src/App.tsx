import { useState } from 'react';
import { useSimulator } from './hooks/useSimulator';
import { BlockDiagram } from './components/BlockDiagram';
import { MemoryTable } from './components/MemoryTable';
import { LedRow } from './components/LedRow';
import { Controls } from './components/Controls';
import { ProgramLoader } from './components/ProgramLoader';

export default function App() {
  const sim = useSimulator();
  const [expected, setExpected] = useState<number | null>(null);

  return (
    <div className="app">
      <header className="app__header">
        <h1>SAP-1 Simulator</h1>
        <span className="app__group">Group 9</span>
      </header>

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
          onRun={sim.run}
          onPause={sim.pause}
          onReset={() => {
            sim.reset();
            setExpected(null);
          }}
        />
      </section>

      <main className="layout">
        <MemoryTable cpu={sim.cpu} last={sim.last} labels={sim.labels} />
        <div className="col">
          <BlockDiagram cpu={sim.cpu} last={sim.last} />
          <LedRow value={sim.cpu.out} />
        </div>
      </main>
    </div>
  );
}
