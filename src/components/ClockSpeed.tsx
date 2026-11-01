interface Props {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}

export function ClockSpeed({ value, min, max, onChange }: Props) {
  return (
    <section className="panel clock-speed">
      <h2>Clock Speed</h2>
      <label className="clock-speed__control">
        <span className="clock-speed__value">{value} T-states/sec</span>
        <input
          type="range"
          min={min}
          max={max}
          step="1"
          value={value}
          onChange={(event) => onChange(Number(event.currentTarget.value))}
          aria-label="Clock speed in T-states per second"
        />
        <span className="clock-speed__limits"><span>{min} slow</span><span>{max} fast</span></span>
      </label>
    </section>
  );
}
