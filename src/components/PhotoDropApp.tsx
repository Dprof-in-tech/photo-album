import ImageSlot from './ImageSlot';
import Celebration from './Celebration';
import { SLOT_GROUPS } from '@/lib/slots';
import { useProgress } from '@/lib/useProgress';
import { color, font } from '@/lib/tokens';

const label: React.CSSProperties = {
  fontFamily: font.sans,
  textTransform: 'uppercase',
};

export default function PhotoDropApp() {
  const { filled, total, pct } = useProgress();

  return (
    <>
      <Celebration />
    <div
      style={{
        maxWidth: 430,
        margin: '0 auto',
        minHeight: '100vh',
        background: color.paper,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Sticky header */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: color.paper,
          borderBottom: `1px solid ${color.hairline}`,
          padding: '18px 20px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div>
            <div style={{ ...label, fontSize: 9, letterSpacing: '0.26em', color: color.muted }}>Photo drop</div>
            <div style={{ fontSize: 22, fontWeight: 500, marginTop: 2 }}>
              3 Idiots <span style={{ fontStyle: 'italic', fontWeight: 400 }}>&amp;</span> the Stooges
            </div>
          </div>
          <a
            href="/album"
            style={{
              ...label,
              fontSize: 10,
              letterSpacing: '0.14em',
              textDecoration: 'none',
              border: `1px solid ${color.ink}`,
              padding: '10px 14px',
            }}
          >
            Open book
          </a>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontFamily: font.sans,
              fontSize: 10,
              letterSpacing: '0.12em',
              color: color.muted,
            }}
          >
            <span>
              {filled} of {total} photos in the book
            </span>
            <span>{pct}%</span>
          </div>
          <div style={{ height: 3, background: color.hairline }}>
            <div style={{ height: 3, background: color.ink, width: `${pct}%`, transition: 'width 0.4s' }} />
          </div>
        </div>
      </header>

      {/* Info bar */}
      <p
        style={{
          margin: 0,
          padding: '14px 20px',
          fontSize: 14,
          fontStyle: 'italic',
          color: color.body,
          borderBottom: `1px solid ${color.hairline}`,
          background: color.paperTinted,
        }}
      >
        Tap any box to add a photo from your camera roll. It lands straight in the printed album — same box, same page.
      </p>

      {/* Sections */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingBottom: 60 }}>
        {SLOT_GROUPS.map((g) => (
          <section key={g.name} style={{ padding: '20px 20px 6px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                borderBottom: `1px solid ${color.hairline}`,
                paddingBottom: 8,
              }}
            >
              <div style={{ ...label, fontSize: 10, letterSpacing: '0.22em', color: color.muted }}>{g.name}</div>
              <div style={{ fontSize: 12, fontStyle: 'italic', color: color.faint }}>{g.pages}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 10 }}>
              {g.slots.map((s) => (
                <div key={s.id} style={{ gridColumn: `span ${s.span}`, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <div style={{ height: 112 }}>
                    <ImageSlot id={s.id} shape="rounded" radius={4} placeholder={s.hint} compact />
                  </div>
                  <div
                    style={{
                      ...label,
                      fontSize: 9,
                      letterSpacing: '0.08em',
                      color: color.muted,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: `1px solid ${color.hairline}`,
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          background: color.paperTinted,
        }}
      >
        <div style={{ ...label, fontSize: 9, letterSpacing: '0.22em', color: color.muted }}>When you're done</div>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: color.body }}>
          Open the book to check your spreads, then ask for the print-ready PDF. Every photo you dropped here is already in place.
        </p>
      </footer>
    </div>
    </>
  );
}
