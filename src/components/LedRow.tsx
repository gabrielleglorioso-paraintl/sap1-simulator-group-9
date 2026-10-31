import { bin, hex } from '../sap1/cpu';

export function LedRow({ value }: { value: number }) {
  return (
    <section className="panel">
      <h2>Output (8 LEDs)</h2>
      <div className="leds" role="img" aria-label={`Output ${bin(value, 8)}`}>
        {bin(value, 8).split('').map((b, i) => (
          <div className="led-cell" key={i}>
            <div className={`led ${b === '1' ? 'led--on' : ''}`} />
            <span>{b}</span>
          </div>
        ))}
      </div>
      <p className="mono center">{bin(value >> 4, 4)} {bin(value & 0xf, 4)} = {hex(value)}H</p>
    </section>
  );
}
