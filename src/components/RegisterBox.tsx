import type { ReactNode } from 'react';
import { bin, hex } from '../sap1/cpu';

export type Role = 'src' | 'dst' | 'none';

interface Props {
  name: string;
  caption?: string;
  value: number;
  bits: 4 | 8;
  role?: Role;
  side?: 'left' | 'right';
  children?: ReactNode;
}

/** Binary string grouped in nibbles, e.g. "0010 0101". */
const grouped = (v: number, bits: number) =>
  bits === 8 ? `${bin(v >> 4, 4)} ${bin(v & 0xf, 4)}` : bin(v, 4);

export function RegisterBox({ name, caption, value, bits, role = 'none', side = 'left', children }: Props) {
  return (
    <div className={`reg reg--${side} ${role !== 'none' ? `reg--${role}` : ''}`} aria-label={`${name} register`}>
      <div className="reg__head">
        <span className="reg__name">{name}</span>
        {caption && <span className="reg__cap">{caption}</span>}
        {role === 'src' && <span className="tag tag--src">&rarr; BUS</span>}
        {role === 'dst' && <span className="tag tag--dst">&larr; BUS</span>}
      </div>
      {children ?? (
        <>
          <div className="reg__bin">{grouped(value, bits)}</div>
          <div className="reg__hex">{hex(value, bits === 8 ? 2 : 1)}H</div>
        </>
      )}
    </div>
  );
}
