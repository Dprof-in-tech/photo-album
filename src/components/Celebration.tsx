import { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { useProgress } from '@/lib/useProgress';
import { color, font } from '@/lib/tokens';

// Fires once, tastefully, at the moment the book becomes full (the photo that
// takes you to 51 of 51). Ignores the initial load so reloading a full book
// doesn't re-fire — it celebrates the completing action, not the state.
export default function Celebration() {
  const { filled, total } = useProgress();
  const prev = useRef<number | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (prev.current === null) {
      prev.current = filled; // establish baseline on first render, don't fire
      return;
    }
    const crossedToFull = prev.current < total && filled >= total;
    prev.current = filled;
    if (!crossedToFull) return;

    setShow(true);
    const palette = ['#1A1816', '#4A453E', '#8A837A', '#B5AEA3', '#C9C1B4'];
    const burst = (x: number) =>
      confetti({ particleCount: 70, spread: 68, startVelocity: 42, origin: { x, y: 0.62 }, colors: palette, scalar: 0.9, ticks: 220 });
    burst(0.5);
    setTimeout(() => burst(0.15), 140);
    setTimeout(() => burst(0.85), 260);
    const t = setTimeout(() => setShow(false), 4500);
    return () => clearTimeout(t);
  }, [filled, total]);

  if (!show) return null;
  return (
    <div
      style={{
        position: 'fixed',
        left: '50%',
        bottom: 40,
        transform: 'translateX(-50%)',
        zIndex: 9999,
        background: color.ink,
        color: color.paper,
        padding: '14px 22px',
        textAlign: 'center',
        boxShadow: '0 10px 30px rgba(26,24,22,0.28)',
        pointerEvents: 'none',
      }}
    >
      <div style={{ fontFamily: font.sans, fontSize: 9, letterSpacing: '0.26em', textTransform: 'uppercase', color: color.faint }}>The book is full</div>
      <div style={{ fontSize: 20, fontStyle: 'italic', marginTop: 4 }}>
        {total} of {total} — every page has a memory.
      </div>
    </div>
  );
}
