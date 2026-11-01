import { bin, hex, type CpuState, type TickInfo } from '../sap1/cpu';

interface Props {
  cpu: CpuState;
  last: TickInfo | null;
  labels: string[];
}

export function MemoryTable({ cpu, last, labels }: Props) {
  const reading = last?.source === 'RAM';
  return (
    <section className="panel">
      <h2>Memory (RAM 16 &times; 8)</h2>
      <table className="mem">
        <thead>
          <tr>
            <th>ADDR</th>
            <th>MEANING</th>
            <th>BINARY</th>
            <th>HEX</th>
          </tr>
        </thead>
        <tbody>
          {cpu.ram.map((word, addr) => {
            const accessed = addr === cpu.mar;
            const isPc = addr === cpu.pc;
            return (
              <tr key={addr} className={`${accessed ? (reading ? 'mem__row--read' : 'mem__row--mar') : ''}`}>
                <td className="mem__addr">
                  {hex(addr, 1)}H
                  {isPc && <span className="mem__pc" title="Program counter points here">PC</span>}
                </td>
                <td className="mem__label">{labels[addr]}</td>
                <td className="mono">{`${bin(word >> 4, 4)} ${bin(word & 0xf, 4)}`}</td>
                <td className="mono">{hex(word)}H</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="hint">Highlighted row = address in MAR. PC tag = next instruction to fetch.</p>
    </section>
  );
}