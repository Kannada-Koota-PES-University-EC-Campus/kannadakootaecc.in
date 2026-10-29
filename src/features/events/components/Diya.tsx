import { useId } from "react";

/** A brass diya (ಹಣತೆ). Unlit it is dark metal; lit, its flame flickers and casts a warm halo. */
export default function Diya({ lit, delay = 0, className = "" }: { lit: boolean; delay?: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <span className={`diya${lit ? " is-lit" : ""} ${className}`} style={{ "--flicker-delay": `${delay}s` } as React.CSSProperties} aria-hidden="true">
      <span className="diya-halo" />
      <svg viewBox="0 0 120 120" className="diya-svg">
        <defs>
          <linearGradient id={`brass-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f7d98a" />
            <stop offset=".45" stopColor="#c48a2c" />
            <stop offset="1" stopColor="#5e340b" />
          </linearGradient>
          <radialGradient id={`flame-${id}`} cx=".5" cy=".72" r=".62">
            <stop offset="0" stopColor="#fffbe8" />
            <stop offset=".28" stopColor="#ffe08a" />
            <stop offset=".62" stopColor="#ff9a2a" />
            <stop offset="1" stopColor="#e2521a" stopOpacity="0" />
          </radialGradient>
        </defs>
        <g className="diya-flame">
          <path d="M60 14C69 31 77 44 70 58C66 65 54 65 50 58C43 44 51 31 60 14Z" fill={`url(#flame-${id})`} />
          <path d="M60 36C64 45 66 51 62 57C60 60 59 60 57 57C54 51 56 45 60 36Z" fill="#fffdf2" opacity=".9" />
        </g>
        <path className="diya-wick" d="M59 62h3v9h-3z" fill="#2a1406" />
        <path d="M10 70C30 66 90 66 110 70L112 72C107 92 86 101 60 101C34 101 13 92 8 72Z" fill={`url(#brass-${id})`} />
        <path d="M104 70l14-7-6 12z" fill={`url(#brass-${id})`} />
        <ellipse cx="60" cy="71" rx="48" ry="5.5" fill="#2b1605" />
        <ellipse className="diya-oil" cx="60" cy="71" rx="40" ry="3.6" fill="#7a4a12" />
        <path d="M22 82C40 90 80 90 98 82" stroke="#ffe7a6" strokeOpacity=".35" strokeWidth="2" fill="none" />
        <path d="M44 101h32l-4 9H48z" fill={`url(#brass-${id})`} />
      </svg>
    </span>
  );
}
