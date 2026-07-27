import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
// @ts-expect-error — react-pageflip ships loose types
import HTMLFlipBook from 'react-pageflip';
import { PrintContext } from './PrintContext';
import { SPREADS, type SpreadDef } from './spreads';
import { getStore } from '@/lib/store';
import { getTextStore } from '@/lib/text';
import { color, SPREAD_W, SPREAD_H } from '@/lib/tokens';

// Each printed spread is 16×8in (1536×768). A real bound book turns one 8×8in
// leaf at a time, so we window each spread into its left and right halves and
// feed those as square pages. Open, a spread's two halves reconstitute the 16×8.
const HALF = SPREAD_W / 2; // 768 (design px of one 8×8in leaf)

// StPageFlip switches to single-page (portrait) when the container is narrower
// than 2×minWidth. Below this we want the phone single-page layout.
const MIN_PAGE = 340;
const PORTRAIT_BELOW = MIN_PAGE * 2; // 680
const CHROME = 140; // vertical room for controls + hint

// One 8×8 leaf. Fills whatever size the flip engine gives the page and scales
// the fixed-resolution spread design to fit, windowing the left or right half.
function Half({ def, side }: { def: SpreadDef; side: 'left' | 'right' }) {
  const ref = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setK(el.clientWidth / HALF);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} style={{ width: '100%', height: '100%', overflow: 'hidden', position: 'relative', background: color.paper }}>
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: side === 'left' ? 0 : -HALF * k,
          width: SPREAD_W,
          height: SPREAD_H,
          transform: `scale(${k})`,
          transformOrigin: 'top left',
          ...def.style,
        }}
      >
        {def.render(false)}
      </div>
    </div>
  );
}

export default function FlipBook() {
  const bookRef = useRef<any>(null);
  const [page, setPage] = useState(0);
  // Container width the flip engine stretches into. Sized so the book fills the
  // viewport (square when portrait, 2:1 when open) without being clipped.
  const [cw, setCw] = useState(700);

  useEffect(() => {
    getStore().load();
    getTextStore().load();
  }, []);

  useEffect(() => {
    const fit = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const availH = Math.max(240, vh - CHROME);
      const portrait = Math.min(vw - 16, availH) < PORTRAIT_BELOW;
      const next = portrait
        ? Math.min(vw - 16, availH) // one square leaf fits width AND height
        : Math.min(vw - 32, availH * 2); // open book (2:1) fits width AND height
      setCw(Math.round(next));
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  const pages = useMemo(() => {
    const list: { key: string; node: React.ReactNode }[] = [];
    list.push({ key: 'front', node: <Half def={SPREADS[0]} side="right" /> });
    for (let i = 1; i < SPREADS.length; i++) {
      list.push({ key: `${i}L`, node: <Half def={SPREADS[i]} side="left" /> });
      list.push({ key: `${i}R`, node: <Half def={SPREADS[i]} side="right" /> });
    }
    list.push({ key: 'back', node: <Half def={SPREADS[0]} side="left" /> });
    return list;
  }, []);

  const total = pages.length;
  const flip = (dir: 1 | -1) => {
    const api = bookRef.current?.pageFlip?.();
    if (!api) return;
    dir === 1 ? api.flipNext() : api.flipPrev();
  };

  const btn: React.CSSProperties = {
    fontFamily: 'Archivo, sans-serif',
    fontSize: 10,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    background: 'transparent',
    color: color.ink,
    border: `1px solid ${color.ink}`,
    padding: '10px 16px',
    cursor: 'pointer',
  };

  return (
    <PrintContext.Provider value={true}>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: 12, boxSizing: 'border-box' }}>
        {/* The flip engine (size="stretch") fills this container and centers the
            visible page(s) within it. */}
        <div style={{ width: cw, maxWidth: '100%' }}>
          <HTMLFlipBook
            ref={bookRef}
            width={HALF}
            height={HALF}
            size="stretch"
            minWidth={MIN_PAGE}
            maxWidth={1600}
            minHeight={MIN_PAGE}
            maxHeight={1600}
            showCover={true}
            drawShadow={true}
            maxShadowOpacity={0.5}
            flippingTime={800}
            usePortrait={true}
            startPage={page}
            mobileScrollSupport={false}
            onFlip={(e: { data: number }) => setPage(e.data)}
            style={{}}
          >
            {pages.map((p) => (
              <div key={p.key} style={{ width: '100%', height: '100%', background: color.paper }}>
                {p.node}
              </div>
            ))}
          </HTMLFlipBook>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button type="button" style={btn} onClick={() => flip(-1)} disabled={page <= 0}>
            ‹ Prev
          </button>
          <span style={{ fontFamily: 'Archivo, sans-serif', fontSize: 10, letterSpacing: '0.14em', color: color.muted, minWidth: 90, textAlign: 'center' }}>
            {page <= 0 ? 'Cover' : page >= total - 1 ? 'Back cover' : `Spread ${Math.floor((page - 1) / 2) + 2}`}
          </span>
          <button type="button" style={btn} onClick={() => flip(1)} disabled={page >= total - 1}>
            Next ›
          </button>
          <a href="/album" style={{ ...btn, textDecoration: 'none' }}>
            Edit album
          </a>
        </div>
        <p style={{ fontFamily: 'Archivo, sans-serif', fontSize: 10, letterSpacing: '0.12em', color: color.faint, textTransform: 'uppercase', margin: 0, textAlign: 'center' }}>
          Drag a page corner to turn, or use the arrows
        </p>
      </div>
    </PrintContext.Provider>
  );
}
