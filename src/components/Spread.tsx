import { useContext, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { SPREAD_W, SPREAD_H } from '@/lib/tokens';
import { PrintContext } from './PrintContext';

/**
 * One album spread: a fixed 1536x768 (16x8in @96dpi) page box with
 * overflow:hidden, scaled down uniformly to fit the available width so the
 * on-screen preview matches the print geometry exactly. In production the same
 * fixed box prints one-per-sheet, full-bleed.
 */
export default function Spread({
  children,
  style,
}: {
  children: ReactNode;
  style?: React.CSSProperties;
}) {
  // Print mode (from context): render at physical 16×8in, one per sheet.
  const print = useContext(PrintContext);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    if (print) return;
    const wrap = wrapRef.current;
    if (!wrap) return;
    const measure = () => {
      const w = wrap.clientWidth;
      setScale(Math.min(1, w / SPREAD_W));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [print]);

  if (print) {
    // Physical inch sizing so it maps 1:1 to the @page{size:16in 8in} sheet;
    // break after each spread so one spread = one printed sheet.
    return (
      <div
        style={{
          width: '16in',
          height: '8in',
          overflow: 'hidden',
          position: 'relative',
          breakAfter: 'page',
          breakInside: 'avoid',
          ...style,
        }}
      >
        {children}
      </div>
    );
  }

  return (
    <div ref={wrapRef} style={{ width: '100%', height: SPREAD_H * scale }}>
      <div
        style={{
          width: SPREAD_W,
          height: SPREAD_H,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          overflow: 'hidden',
          position: 'relative',
          boxShadow: '0 6px 24px rgba(26,24,22,0.10)',
          ...style,
        }}
      >
        {children}
      </div>
    </div>
  );
}
