import { aluOutput, bin, currentInstruction, hex, subtractMode, type BusNode, type CpuState, type TickInfo } from '../sap1/cpu';
import { RegisterBox, type Role } from './RegisterBox';

interface Props {
  cpu: CpuState;
  last: TickInfo | null;
}

/** SAP-1 block diagram: registers on both sides of the central W-bus. */
export function BlockDiagram({ cpu, last }: Props) {
  const roleOf = (node: BusNode): Role =>
    last?.source === node ? 'src' : last?.destinations.includes(node) ? 'dst' : 'none';

  const sub = subtractMode(cpu);
  const mnemonic = currentInstruction(cpu);
  const busActive = last?.bus !== null && last?.bus !== undefined;

  return (
    <section className="panel">
      <h2>Registers &amp; W-Bus</h2>

      <div className={`busbanner ${busActive ? 'busbanner--on' : ''}`} role="status">
        <span className="busbanner__label">W-BUS</span>
        <span className="busbanner__value">
          {busActive ? `${bin(last!.bus! >> 4, 4)} ${bin(last!.bus! & 0xf, 4)}` : '---- ----'}
        </span>
        <span className="busbanner__hex">{busActive ? `${hex(last!.bus!)}H` : ''}</span>
        <span className="busbanner__move">
          {busActive && last?.source ? `${last.source} → ${last.destinations.join(', ')}` : 'idle'}
        </span>
      </div>

      <p className="step-text">{last ? `T${last.t} (${last.phase}): ${last.text}` : 'Load a program, then press Step or Run.'}</p>

      <div className="diagram">
        <div className={`diagram__bus ${busActive ? 'diagram__bus--on' : ''}`} aria-hidden="true" />

        <div className="diagram__cell diagram__cell--l1">
          <RegisterBox name="PC" caption="Program Counter · 4-bit" value={cpu.pc} bits={4} role={roleOf('PC')} side="left" />
        </div>
        <div className="diagram__cell diagram__cell--l2">
          <RegisterBox name="MAR" caption="Memory Address Reg · 4-bit" value={cpu.mar} bits={4} role={roleOf('MAR')} side="left" />
        </div>
        <div className="diagram__cell diagram__cell--l3">
          <RegisterBox name="RAM" caption={`16 × 8 · [${hex(cpu.mar, 1)}H]`} value={cpu.ram[cpu.mar]} bits={8} role={roleOf('RAM')} side="left" />
        </div>
        <div className="diagram__cell diagram__cell--l4">
          <RegisterBox name="IR" caption="Instruction Register" value={cpu.ir} bits={8} role={roleOf('IR')} side="left">
            <div className="reg__bin">
              <span className="nib nib--op" title="Opcode (upper nibble)">{bin(cpu.ir >> 4, 4)}</span>{' '}
              <span className="nib nib--arg" title="Operand (lower nibble)">{bin(cpu.ir & 0xf, 4)}</span>
            </div>
            <div className="reg__hex">
              {hex(cpu.ir)}H <span className="reg__mnem">{mnemonic ?? '—'}</span>
            </div>
          </RegisterBox>
        </div>

        <div className="diagram__cell diagram__cell--r1">
          <RegisterBox name="A" caption="Accumulator · 8-bit" value={cpu.a} bits={8} role={roleOf('A')} side="right" />
        </div>
        <div className="diagram__cell diagram__cell--r2">
          <RegisterBox name={'Σ'} caption="Adder / Subtractor" value={aluOutput(cpu)} bits={8} role={roleOf('ALU')} side="right">
            <div className="reg__bin">{`${bin(aluOutput(cpu) >> 4, 4)} ${bin(aluOutput(cpu) & 0xf, 4)}`}</div>
            <div className="reg__hex">
              {hex(aluOutput(cpu))}H <span className="reg__mnem">{sub ? 'A − B (Su=1)' : 'A + B (Su=0)'}</span>
            </div>
          </RegisterBox>
        </div>
        <div className="diagram__cell diagram__cell--r3">
          <RegisterBox name="B" caption="B Register · 8-bit" value={cpu.b} bits={8} role={roleOf('B')} side="right" />
        </div>
        <div className="diagram__cell diagram__cell--r4">
          <RegisterBox name="OUT" caption="Output Register" value={cpu.out} bits={8} role={roleOf('OUT')} side="right" />
        </div>
      </div>
    </section>
  );
}
