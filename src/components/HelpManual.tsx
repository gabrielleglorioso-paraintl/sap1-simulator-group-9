import { useEffect } from 'react';

interface Props { onClose: () => void; }
export function HelpManual({ onClose }: Props) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  return (
    <div className="manual-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="manual panel" role="dialog" aria-modal="true" aria-labelledby="manual-title">
        <header className="manual__header">
          <div><p className="manual__eyebrow">SAP-1 SIMULATOR</p><h2 id="manual-title">Help manual</h2></div>
          <button type="button" className="manual__close" onClick={onClose} aria-label="Close help manual">Close &times;</button>
        </header>
        <div className="manual__body">
          <article className="manual__content">
            <section id="manual-start"><h3>Getting started</h3>
              <p>This simulator models SAP-1, an 8-bit teaching computer. Build an arithmetic formula by entering hexadecimal values and choosing <b>+</b> or <b>&minus;</b> between them, then select <b>Load Program</b>. The generated instructions and data appear in the memory table.</p>
              <ol><li>Enter two to five values from <code>00H</code> to <code>FFH</code> and pick the operators between them.</li><li>Choose where the data starts in RAM, then load the program.</li><li>Use <b>Step</b> or <b>Run</b>, then check the output LEDs and value.</li></ol>
            </section>
            <section id="manual-controls"><h3>Run controls</h3><dl>
              <dt>Step</dt><dd>Completes one instruction, advancing through its six T-states.</dd>
              <dt>Micro-Step</dt><dd>Advances one T-state so you can inspect each transfer.</dd>
              <dt>Run / Pause</dt><dd>Runs until the program halts; Pause stops execution.</dd>
              <dt>Reset</dt><dd>Clears RAM and resets the CPU registers. Load a program again to continue.</dd>
              <dt>Clock speed</dt><dd>Adjusts how quickly the simulator advances while running.</dd>
            </dl></section>
            <section id="manual-programs"><h3>Programs and values</h3>
              <p>Enter two to five hexadecimal values, with addition or subtraction between each pair. Values are stored in RAM after the instructions, starting at the address you choose from the allowed list. Each running result must stay in <code>00H&ndash;FFH</code>; the loader shows a message and stays disabled if it would not.</p>
              <p>Hexadecimal digits are <code>0&ndash;9</code> and <code>A&ndash;F</code>. For example, <code>25H + 05H - 23H</code> produces <code>07H</code>.</p>
            </section>
            <section id="manual-instructions"><h3>Instruction set</h3><dl>
              <dt><code>LDA address</code></dt><dd>Loads the value at a RAM address into the accumulator.</dd>
              <dt><code>ADD address</code></dt><dd>Adds a RAM value to the accumulator.</dd>
              <dt><code>SUB address</code></dt><dd>Subtracts a RAM value from the accumulator.</dd>
              <dt><code>OUT</code></dt><dd>Copies the accumulator value to the output register.</dd>
              <dt><code>HLT</code></dt><dd>Halts program execution.</dd>
            </dl><p>Each instruction is one byte: a four-bit opcode followed by a four-bit RAM address. SAP-1 has 16 memory addresses, from <code>0H</code> to <code>FH</code>.</p>
            </section>
            <section id="manual-display"><h3>Reading the display</h3><ul>
              <li><b>Memory</b> shows addresses and contents. The current program counter and memory access are highlighted.</li>
              <li><b>Registers &amp; W-Bus</b> shows register values and active data transfers. The step description names the current T-state.</li>
              <li><b>Output</b> shows the result as eight LEDs, binary, hexadecimal, and decimal.</li>
              <li><b>Subtraction</b> uses 8-bit two&apos;s complement inside the adder/subtractor. Because the loader blocks results below <code>00H</code> or above <code>FFH</code>, the output never wraps.</li>
            </ul></section>
          </article>
        </div>
      </section>
    </div>
  );
}
