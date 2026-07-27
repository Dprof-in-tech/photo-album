import type { ReactNode } from 'react';
import ImageSlot from './ImageSlot';
import EditableText from './EditableText';
import { color, font } from '@/lib/tokens';

// Shared across the album editor (/album), the print sheet (/print), and the 3D
// flip book (/book). Each spread is defined as { style, render } so the same
// content can be wrapped in a scaled box (screen), a physical 16×8in sheet
// (print), or windowed into 8×8in flip leaves (book).

export const sansLabel: React.CSSProperties = { fontFamily: font.sans, textTransform: 'uppercase' };

export interface SpreadDef {
  /** applied to the 1536×768 spread box */
  style: React.CSSProperties;
  render: (sp: boolean) => ReactNode;
}

function Folio({ show, n, style }: { show: boolean; n: string; style?: React.CSSProperties }) {
  if (!show) return null;
  return <div style={{ fontFamily: font.sans, fontSize: 9, letterSpacing: '0.2em', color: color.faint, ...style }}>{n}</div>;
}

// Folio placed over a photo: white with blend + shadow so it reads on any image.
function OverFolio({ show, n, side }: { show: boolean; n: string; side: 'left' | 'right' }) {
  if (!show) return null;
  return (
    <div
      style={{
        position: 'absolute',
        [side]: '0.4in',
        bottom: '0.35in',
        fontFamily: font.sans,
        fontSize: 9,
        letterSpacing: '0.2em',
        color: color.paper,
        pointerEvents: 'none',
        textShadow: '0 0 6px rgba(0,0,0,0.55)',
        mixBlendMode: 'difference',
      }}
    >
      {n}
    </div>
  );
}

function Quote({ id, text, who }: { id: string; text: string; who: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <EditableText id={id} as="p" multiline defaultText={text} style={{ margin: 0, fontSize: 22, fontStyle: 'italic', lineHeight: 1.4, textWrap: 'pretty' } as React.CSSProperties} />
      <EditableText id={`${id}-a`} defaultText={who} style={{ fontFamily: font.sans, fontSize: 10, letterSpacing: '0.2em', color: color.muted, textTransform: 'uppercase' }} />
    </div>
  );
}

// Caption plate over a full-bleed photo — click-through except on the text lines.
function CaptionPlate({ pos, labelId, label, capId, cap }: { pos: React.CSSProperties; labelId: string; label: string; capId: string; cap: string }) {
  return (
    <div style={{ position: 'absolute', ...pos, background: color.paper, padding: '14px 18px', maxWidth: '3in', pointerEvents: 'none' }}>
      <EditableText id={labelId} as="div" defaultText={label} style={{ ...sansLabel, fontSize: 9, letterSpacing: '0.24em', color: color.muted, pointerEvents: 'auto' }} />
      <EditableText id={capId} as="div" defaultText={cap} style={{ fontSize: 15, fontStyle: 'italic', marginTop: 6, lineHeight: 1.4, pointerEvents: 'auto' }} />
    </div>
  );
}

// 2x2 grid + hero photo + one-liner (spreads 6, 13). Returns content only.
function quietGrid(
  cfg: { eyebrow: string; sub: string; grid: { id: string; ph: string }[]; mainId: string; mainPh: string; oneId: string; oneLines: string; folioL: string; folioR: string },
  sp: boolean
): ReactNode {
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.24in', padding: '0.6in' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', ...sansLabel, fontSize: 9, letterSpacing: '0.22em', color: color.muted }}>
          <span>{cfg.eyebrow}</span>
          <span>{cfg.sub}</span>
        </div>
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gridTemplateRows: 'minmax(0,1fr) minmax(0,1fr)', gap: '0.2in' }}>
          {cfg.grid.map((g) => (
            <ImageSlot key={g.id} id={g.id} shape="rect" placeholder={g.ph} />
          ))}
        </div>
        <Folio show={sp} n={cfg.folioL} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '4in minmax(0,1fr)', borderLeft: `1px solid ${color.hairline}` }}>
        <div style={{ height: '100%' }}>
          <ImageSlot id={cfg.mainId} shape="rect" placeholder={cfg.mainPh} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '0.6in 0.45in' }}>
          <div style={{ ...sansLabel, fontSize: 9, letterSpacing: '0.22em', color: color.muted, textAlign: 'right' }}>Date · Place</div>
          <EditableText id={cfg.oneId} as="p" multiline defaultText={cfg.oneLines} style={{ margin: 0, fontSize: 16, fontStyle: 'italic', lineHeight: 1.6, textAlign: 'right', textWrap: 'pretty', whiteSpace: 'pre-line' } as React.CSSProperties} />
          <Folio show={sp} n={cfg.folioR} style={{ textAlign: 'right' }} />
        </div>
      </div>
    </>
  );
}

const footerRow = (a: string, b: string) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: font.sans, fontSize: 9, letterSpacing: '0.2em', color: color.faint }}>
    <span>{a}</span>
    <span>{b}</span>
  </div>
);

export const SPREADS: SpreadDef[] = [
  // 1 · COVER WRAP
  {
    style: { display: 'grid', gridTemplateColumns: '1fr 1fr' },
    render: () => (
      <>
        <div style={{ background: color.ink, color: color.paper, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, padding: '0.8in', textAlign: 'center' }}>
          <div style={{ fontSize: 34, fontStyle: 'italic', lineHeight: 1.3, textWrap: 'balance' } as React.CSSProperties}>
            the end
            <br />
            <span style={{ fontSize: 18, fontStyle: 'normal', color: color.faint }}>(for now)</span>
          </div>
          <div style={{ width: '0.4in', borderTop: `1px solid ${color.darkHairline}` }} />
          <div style={{ ...sansLabel, fontSize: 9, letterSpacing: '0.26em', color: color.muted }}>3 Idiots &amp; the Stooges · 2026</div>
        </div>
        <div style={{ background: color.paper, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0.7in 0.6in' }}>
          <div style={{ ...sansLabel, fontSize: 10, letterSpacing: '0.28em', color: color.muted }}>A highly unofficial record</div>
          <div style={{ width: '1.5in', height: '1.5in', marginTop: '0.5in' }}>
            <ImageSlot id="cover-circle" shape="circle" placeholder="the crew" />
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', gap: 14 }}>
            <div style={{ ...sansLabel, fontSize: 10, letterSpacing: '0.3em', color: color.muted }}>The last days of</div>
            <h1 style={{ margin: 0, fontSize: 54, fontWeight: 500, lineHeight: 1.08, textWrap: 'balance' } as React.CSSProperties}>
              3 Idiots
              <br />
              <span style={{ fontStyle: 'italic', fontWeight: 400 }}>&amp;</span> the Stooges
            </h1>
          </div>
          <div style={{ width: '100%', borderTop: `1px solid ${color.hairline}`, paddingTop: 14, display: 'flex', justifyContent: 'space-between', ...sansLabel, fontSize: 9, letterSpacing: '0.22em', color: color.muted }}>
            <span>Memories, mostly true</span>
            <span>2026</span>
          </div>
        </div>
      </>
    ),
  },
  // 2 · INTRO | OPENING PHOTO
  {
    style: { display: 'grid', gridTemplateColumns: '1fr 1fr', background: color.paper },
    render: (sp) => (
      <>
        <div style={{ display: 'flex', flexDirection: 'column', padding: '0.75in 0.8in' }}>
          <div style={{ ...sansLabel, fontSize: 10, letterSpacing: '0.28em', color: color.muted, borderBottom: `1px solid ${color.hairline}`, paddingBottom: 12 }}>An honest warning</div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 22, maxWidth: '5in' }}>
            <EditableText id="s2-lede" as="p" multiline defaultText="Nothing in this book is in order. Some captions are exaggerated. All of it happened." style={{ margin: 0, fontSize: 24, lineHeight: 1.5, fontStyle: 'italic', textWrap: 'pretty' } as React.CSSProperties} />
            <EditableText id="s2-body" as="p" multiline defaultText="These are the last few weeks — collected as they happened, one random picture at a time. If you're in here and you look bad, that's the memory's fault, not the photographer's." style={{ margin: 0, fontSize: 15, lineHeight: 1.7, color: color.body, textWrap: 'pretty' } as React.CSSProperties} />
          </div>
          <Folio show={sp} n="02" />
        </div>
        <div style={{ position: 'relative' }}>
          <ImageSlot id="s2-photo" shape="rect" placeholder="Where it all started — or ended. Your call." />
          <OverFolio show={sp} n="03" side="right" />
        </div>
      </>
    ),
  },
  // 3 · FULL BLEED
  {
    style: { position: 'relative', background: color.photoWell },
    render: () => (
      <>
        <ImageSlot id="s3-full" shape="rect" placeholder="The big one — a wide shot that earns both pages. The whole gang, the field, the hallway." />
        <CaptionPlate pos={{ right: '0.5in', bottom: '0.5in' }} labelId="s3-cap-label" label="Day one of the countdown" capId="s3-cap" cap="Write where this was and why it mattered." />
      </>
    ),
  },
  // 4 · TWO PHOTOS | JOURNAL
  {
    style: { display: 'grid', gridTemplateColumns: '1fr 1fr', background: color.paper },
    render: (sp) => (
      <>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 1.9in', gridTemplateRows: 'minmax(0,1fr) minmax(0,1fr) auto', gap: '0.28in', padding: '0.6in' }}>
          <div style={{ gridRow: 1 }}>
            <ImageSlot id="s4-a" shape="rect" placeholder="Something ordinary that won't be ordinary later" />
          </div>
          <div style={{ gridRow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 6 }}>
            <div style={{ ...sansLabel, fontSize: 9, letterSpacing: '0.22em', color: color.muted }}>Date · Place</div>
            <EditableText id="s4-cap-a" as="p" defaultText="Short caption here — one line is plenty." style={{ margin: 0, fontSize: 14, fontStyle: 'italic', lineHeight: 1.5 }} />
          </div>
          <div style={{ gridRow: 2 }}>
            <ImageSlot id="s4-b" shape="rect" placeholder="The one nobody posed for" />
          </div>
          <div style={{ gridRow: 2, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 6 }}>
            <div style={{ ...sansLabel, fontSize: 9, letterSpacing: '0.22em', color: color.muted }}>Date · Place</div>
            <EditableText id="s4-cap-b" as="p" defaultText="Another caption. Or leave it blank — silence is also a caption." style={{ margin: 0, fontSize: 14, fontStyle: 'italic', lineHeight: 1.5 }} />
          </div>
          <Folio show={sp} n="06" style={{ gridColumn: '1 / -1' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.28in', padding: '0.6in 0.7in', borderLeft: `1px solid ${color.hairline}` }}>
          <div style={{ height: '3.3in' }}>
            <ImageSlot id="s4-main" shape="rect" placeholder="A day that deserves a full write-up" />
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${color.hairline}`, paddingBottom: 8, ...sansLabel, fontSize: 9, letterSpacing: '0.22em', color: color.muted }}>
              <span>Journal entry</span>
              <span>Date goes here</span>
            </div>
            <EditableText id="s4-journal" as="p" multiline defaultText="Write the long version here — what happened, who said the dumb thing, why everyone laughed for ten minutes. Future you will want the details." style={{ margin: 0, fontSize: 14, lineHeight: 1.75, color: color.body, textWrap: 'pretty' } as React.CSSProperties} />
          </div>
          <Folio show={sp} n="07" style={{ textAlign: 'right' }} />
        </div>
      </>
    ),
  },
  // 5 · QUOTES | ONE PHOTO
  {
    style: { display: 'grid', gridTemplateColumns: '1fr 1fr', background: color.paperTinted },
    render: (sp) => (
      <>
        <div style={{ display: 'flex', flexDirection: 'column', padding: '0.75in 0.8in' }}>
          <div style={{ ...sansLabel, fontSize: 10, letterSpacing: '0.28em', color: color.muted, borderBottom: `1px solid ${color.hairlineTinted}`, paddingBottom: 12 }}>Things people actually said</div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 30 }}>
            <Quote id="q5-1" text={'“Put the quote here. The dumber, the better.”'} who="— Who said it" />
            <Quote id="q5-2" text={'“Another one for the record.”'} who="— Who said it" />
            <Quote id="q5-3" text={"“And the one you'll deny saying in five years.”"} who="— Who said it" />
          </div>
          <Folio show={sp} n="08" />
        </div>
        <div style={{ padding: '0.6in', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <ImageSlot id="s5-photo" shape="rect" placeholder="The face that matches the quotes" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <EditableText id="s5-cap" as="p" defaultText="Exhibit A." style={{ margin: 0, fontSize: 14, fontStyle: 'italic', color: color.body }} />
            <Folio show={sp} n="09" />
          </div>
        </div>
      </>
    ),
  },
  // 6 · GRID | QUIET
  {
    style: { display: 'grid', gridTemplateColumns: '1fr 1fr', background: color.paper },
    render: (sp) =>
      quietGrid(
        {
          eyebrow: 'Little moments',
          sub: 'No particular order',
          grid: [
            { id: 's6-a', ph: 'Lunch table' },
            { id: 's6-b', ph: 'Someone mid-laugh' },
            { id: 's6-c', ph: 'A blurry one, keep it' },
            { id: 's6-d', ph: 'The classroom, empty' },
          ],
          mainId: 's6-main',
          mainPh: 'One photo that needs no explanation',
          oneId: 's6-oneliner',
          oneLines: 'Some pages just get one line.\nThis is that line.',
          folioL: '10',
          folioR: '11',
        },
        sp
      ),
  },
  // 7 · FIELD NOTES | SIGNATURES
  {
    style: { display: 'grid', gridTemplateColumns: '1fr 1fr' },
    render: (sp) => (
      <>
        <div style={{ background: color.paper, display: 'flex', flexDirection: 'column', padding: '0.7in 0.8in', gap: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: `1px solid ${color.hairline}`, paddingBottom: 12 }}>
            <div style={{ ...sansLabel, fontSize: 10, letterSpacing: '0.28em', color: color.muted }}>Field notes</div>
            <div style={{ width: '1.1in', height: '1.1in' }}>
              <ImageSlot id="s7-tiny" shape="rect" placeholder="tiny pic" />
            </div>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 18 }}>
            {[
              { d: 'Mon —', t: 'Short dated entry. What happened today, in a sentence or two.' },
              { d: 'Tue —', t: 'Another entry. Doesn’t have to be deep. “We did nothing, it was great” counts.' },
              { d: 'Wed —', t: 'Keep going. Add or delete lines as the weeks fill up.' },
              { d: 'Thu —', t: '…' },
            ].map((e, i) => (
              <div key={i} style={{ display: 'flex', gap: 16 }}>
                <div style={{ ...sansLabel, fontSize: 10, letterSpacing: '0.15em', color: color.muted, minWidth: '0.9in' }}>{e.d}</div>
                <EditableText id={`s7-${i}`} as="p" multiline defaultText={e.t} style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: color.body }} />
              </div>
            ))}
          </div>
          <Folio show={sp} n="12" />
        </div>
        <div style={{ background: color.paperTinted, display: 'flex', flexDirection: 'column', padding: '0.7in 0.8in', gap: 8 }}>
          <div style={{ ...sansLabel, fontSize: 10, letterSpacing: '0.28em', color: color.muted }}>Sign here, idiots</div>
          <EditableText id="s7-note" as="p" defaultText="Leave a note. Be nice. Or don't — it's going in print either way." style={{ margin: '0 0 10px', fontSize: 15, fontStyle: 'italic', color: color.body }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly' }}>
            {Array.from({ length: 7 }).map((_, i) => (
              <EditableText key={i} id={`sig-${i}`} as="div" defaultText="" style={{ borderBottom: `1px solid ${color.rule}`, minHeight: '1.5em', fontSize: 15, fontStyle: 'italic', color: color.body, paddingBottom: 4 }} />
            ))}
          </div>
          <Folio show={sp} n="13" style={{ textAlign: 'right' }} />
        </div>
      </>
    ),
  },
  // 8 · THE CAST
  {
    style: { background: color.paper, display: 'flex', flexDirection: 'column', padding: '0.7in 0.8in', gap: '0.4in' },
    render: (sp) => (
      <>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: `1px solid ${color.hairline}`, paddingBottom: 12 }}>
          <div style={{ ...sansLabel, fontSize: 10, letterSpacing: '0.28em', color: color.muted }}>The cast</div>
          <div style={{ fontSize: 14, fontStyle: 'italic', color: color.muted }}>in order of appearance, allegedly</div>
        </div>
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(6,minmax(0,1fr))', gap: '0.45in', alignItems: 'start' }}>
          {[
            { id: 'cast-1', ph: 'idiot #1', role: 'The ringleader' },
            { id: 'cast-2', ph: 'idiot #2', role: 'The quiet menace' },
            { id: 'cast-3', ph: 'idiot #3', role: 'The bad influence' },
            { id: 'cast-4', ph: 'stooge #1', role: 'The snack supplier' },
            { id: 'cast-5', ph: 'stooge #2', role: 'The one with the car' },
            { id: 'cast-6', ph: 'stooge #3', role: 'Chronically late' },
          ].map((c) => (
            <div key={c.id} style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
              <div style={{ width: '100%', aspectRatio: '1' }}>
                <ImageSlot id={c.id} shape="circle" placeholder={c.ph} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <EditableText id={`${c.id}-name`} as="div" defaultText="Name" style={{ fontSize: 16, fontWeight: 500 }} />
                <EditableText id={`${c.id}-role`} as="div" defaultText={c.role} style={{ fontFamily: font.sans, fontSize: 9, letterSpacing: '0.18em', color: color.muted, textTransform: 'uppercase', marginTop: 4 }} />
              </div>
            </div>
          ))}
        </div>
        {sp && footerRow('14', '15')}
      </>
    ),
  },
  // 9 · FULL BLEED II
  {
    style: { position: 'relative', background: color.photoWell },
    render: () => (
      <>
        <ImageSlot id="s10-full" shape="rect" placeholder="Another wide one — golden hour on the school steps, maybe." />
        <CaptionPlate pos={{ left: '0.5in', top: '0.5in' }} labelId="s10-cap-label" label="Somewhere in the middle" capId="s10-cap" cap="Caption for the second big one." />
      </>
    ),
  },
  // 10 · FILMSTRIP
  {
    style: { background: color.paper, display: 'flex', flexDirection: 'column', padding: '0.65in 0.7in', gap: '0.3in' },
    render: (sp) => (
      <>
        <div style={{ display: 'flex', justifyContent: 'space-between', ...sansLabel, fontSize: 9, letterSpacing: '0.22em', color: color.muted }}>
          <span>Caught on camera</span>
          <span>Six frames, zero context</span>
        </div>
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(6,minmax(0,1fr))', gap: '0.22in' }}>
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <ImageSlot id={`strip-${n}`} shape="rect" placeholder={`frame ${n}`} />
              </div>
              <EditableText id={`strip-${n}-cap`} as="div" defaultText="caption" style={{ fontSize: 12, fontStyle: 'italic', color: color.muted, textAlign: 'center' }} />
            </div>
          ))}
        </div>
        {sp && footerRow('18', '19')}
      </>
    ),
  },
  // 11 · PHOTO | JOURNAL II
  {
    style: { display: 'grid', gridTemplateColumns: '1fr 1fr', background: color.paper },
    render: (sp) => (
      <>
        <div style={{ position: 'relative' }}>
          <ImageSlot id="s12-photo" shape="rect" placeholder="The day something actually happened" />
          <OverFolio show={sp} n="20" side="left" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', padding: '0.75in 0.8in', gap: 16, borderLeft: `1px solid ${color.hairline}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${color.hairline}`, paddingBottom: 10, ...sansLabel, fontSize: 9, letterSpacing: '0.22em', color: color.muted }}>
            <span>Journal entry</span>
            <span>Date goes here</span>
          </div>
          <EditableText id="s12-title" as="p" defaultText="Give this one a title." style={{ margin: 0, fontSize: 20, fontStyle: 'italic', lineHeight: 1.5 }} />
          <EditableText id="s12-body" as="p" multiline defaultText={'A full page for the story. Start in the middle of it — “So there we were,” always works. Include who panicked first.'} style={{ margin: 0, fontSize: 14, lineHeight: 1.8, color: color.body, flex: 1, textWrap: 'pretty' } as React.CSSProperties} />
          <Folio show={sp} n="21" style={{ textAlign: 'right' }} />
        </div>
      </>
    ),
  },
  // 12 · SUPERLATIVES
  {
    style: { display: 'grid', gridTemplateColumns: '1fr 1fr', background: color.paperTinted },
    render: (sp) => (
      <>
        <div style={{ display: 'flex', flexDirection: 'column', padding: '0.75in 0.8in' }}>
          <div style={{ ...sansLabel, fontSize: 10, letterSpacing: '0.28em', color: color.muted, borderBottom: `1px solid ${color.hairlineTinted}`, paddingBottom: 12 }}>The awards nobody asked for</div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly' }}>
            {['Most likely to be famous', 'Most likely to be late to their own wedding', 'Best laugh heard three classrooms away', 'Most detentions survived', 'Human alarm clock (never worked)', 'Lifetime achievement in doing nothing'].map((title, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 16 }}>
                <EditableText id={`sup-${i}`} defaultText={title} style={{ fontSize: 17, fontStyle: 'italic' }} />
                <span style={{ flex: 1, borderBottom: `1px dotted ${color.rule}` }} />
                <EditableText id={`sup-${i}-w`} defaultText="winner" style={{ fontFamily: font.sans, fontSize: 11, letterSpacing: '0.1em', color: color.muted }} />
              </div>
            ))}
          </div>
          <Folio show={sp} n="22" />
        </div>
        <div style={{ padding: '0.6in', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <ImageSlot id="s13-photo" shape="rect" placeholder="The award ceremony (a.k.a. any random Tuesday)" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <EditableText id="s13-cap" as="p" defaultText="The winners, probably." style={{ margin: 0, fontSize: 14, fontStyle: 'italic', color: color.body }} />
            <Folio show={sp} n="23" />
          </div>
        </div>
      </>
    ),
  },
  // 13 · GRID II | QUIET II
  {
    style: { display: 'grid', gridTemplateColumns: '1fr 1fr', background: color.paper },
    render: (sp) =>
      quietGrid(
        {
          eyebrow: 'More little moments',
          sub: 'Still no order',
          grid: [
            { id: 's14-a', ph: 'The walk home' },
            { id: 's14-b', ph: 'Bad cafeteria food' },
            { id: 's14-c', ph: 'Someone asleep in class' },
            { id: 's14-d', ph: 'The group chat, live' },
          ],
          mainId: 's14-main',
          mainPh: 'Another one that speaks for itself',
          oneId: 's14-oneliner',
          oneLines: 'One line.\nMake it count.',
          folioL: '24',
          folioR: '25',
        },
        sp
      ),
  },
  // 14 · OVERHEARD | PHOTO
  {
    style: { display: 'grid', gridTemplateColumns: '1fr 1fr', background: color.paper },
    render: (sp) => (
      <>
        <div style={{ padding: '0.6in', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <ImageSlot id="s15-photo" shape="rect" placeholder="Mid-conversation, mid-chaos" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Folio show={sp} n="26" />
            <EditableText id="s15-cap" as="p" defaultText="Artist's rendering of the quotes opposite." style={{ margin: 0, fontSize: 14, fontStyle: 'italic', color: color.body }} />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', padding: '0.75in 0.8in', borderLeft: `1px solid ${color.hairline}` }}>
          <div style={{ ...sansLabel, fontSize: 10, letterSpacing: '0.28em', color: color.muted, borderBottom: `1px solid ${color.hairline}`, paddingBottom: 12 }}>Overheard, volume II</div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 30 }}>
            <Quote id="q15-1" text={'“More quotes go here as you collect them.”'} who="— Who said it" />
            <Quote id="q15-2" text={'“Context optional. Accuracy optional.”'} who="— Who said it" />
            <Quote id="q15-3" text={'“Save the best one for this slot.”'} who="— Who said it" />
          </div>
          <Folio show={sp} n="27" style={{ textAlign: 'right' }} />
        </div>
      </>
    ),
  },
  // 15 · PLACES
  {
    style: { background: color.paper, display: 'flex', flexDirection: 'column', padding: '0.65in 0.7in', gap: '0.28in' },
    render: (sp) => (
      <>
        <div style={{ display: 'flex', justifyContent: 'space-between', ...sansLabel, fontSize: 9, letterSpacing: '0.22em', color: color.muted }}>
          <span>Places we'll pretend not to miss</span>
          <span>Spoiler: we'll miss them</span>
        </div>
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: '0.3in' }}>
          {[
            { id: 'place-1', ph: 'The spot behind the gym' },
            { id: 'place-2', ph: 'The good stairwell' },
            { id: 'place-3', ph: 'Our table. Ours.' },
          ].map((p) => (
            <div key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <ImageSlot id={p.id} shape="rect" placeholder={p.ph} />
              </div>
              <div>
                <EditableText id={`${p.id}-name`} as="div" defaultText="Name the place" style={{ fontSize: 16, fontWeight: 500 }} />
                <EditableText id={`${p.id}-why`} as="div" defaultText="why it mattered" style={{ fontSize: 13, fontStyle: 'italic', color: color.muted, marginTop: 2 }} />
              </div>
            </div>
          ))}
        </div>
        {sp && footerRow('28', '29')}
      </>
    ),
  },
  // 16 · FIELD NOTES II | PHOTO
  {
    style: { display: 'grid', gridTemplateColumns: '1fr 1fr' },
    render: (sp) => (
      <>
        <div style={{ background: color.paper, display: 'flex', flexDirection: 'column', padding: '0.7in 0.8in', gap: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: `1px solid ${color.hairline}`, paddingBottom: 12 }}>
            <div style={{ ...sansLabel, fontSize: 10, letterSpacing: '0.28em', color: color.muted }}>Field notes, week two</div>
            <div style={{ width: '1.1in', height: '1.1in' }}>
              <ImageSlot id="s17-tiny" shape="rect" placeholder="tiny pic" />
            </div>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 18 }}>
            {[
              { d: 'Mon —', t: 'The countdown is getting real. Write it down anyway.' },
              { d: 'Tue —', t: '…' },
              { d: 'Wed —', t: '…' },
              { d: 'Thu —', t: '…' },
              { d: 'Fri —', t: '…' },
            ].map((e, i) => (
              <div key={i} style={{ display: 'flex', gap: 16 }}>
                <div style={{ ...sansLabel, fontSize: 10, letterSpacing: '0.15em', color: color.muted, minWidth: '0.9in' }}>{e.d}</div>
                <EditableText id={`s17-${i}`} as="p" multiline defaultText={e.t} style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: color.body }} />
              </div>
            ))}
          </div>
          <Folio show={sp} n="30" />
        </div>
        <div style={{ position: 'relative', background: color.photoWell }}>
          <ImageSlot id="s17-photo" shape="rect" placeholder="The week in one picture" />
          <OverFolio show={sp} n="31" side="right" />
        </div>
      </>
    ),
  },
  // 17 · TWO PHOTOS II | JOURNAL III
  {
    style: { display: 'grid', gridTemplateColumns: '1fr 1fr', background: color.paper },
    render: (sp) => (
      <>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 1.9in', gridTemplateRows: 'minmax(0,1fr) minmax(0,1fr) auto', gap: '0.28in', padding: '0.6in' }}>
          <div style={{ gridRow: 1 }}>
            <ImageSlot id="s18-a" shape="rect" placeholder="A dumb tradition we invented" />
          </div>
          <div style={{ gridRow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 6 }}>
            <div style={{ ...sansLabel, fontSize: 9, letterSpacing: '0.22em', color: color.muted }}>Date · Place</div>
            <EditableText id="s18-cap-a" as="p" defaultText="Caption goes here." style={{ margin: 0, fontSize: 14, fontStyle: 'italic', lineHeight: 1.5 }} />
          </div>
          <div style={{ gridRow: 2 }}>
            <ImageSlot id="s18-b" shape="rect" placeholder="Proof it happened twice" />
          </div>
          <div style={{ gridRow: 2, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 6 }}>
            <div style={{ ...sansLabel, fontSize: 9, letterSpacing: '0.22em', color: color.muted }}>Date · Place</div>
            <EditableText id="s18-cap-b" as="p" defaultText="And here." style={{ margin: 0, fontSize: 14, fontStyle: 'italic', lineHeight: 1.5 }} />
          </div>
          <Folio show={sp} n="32" style={{ gridColumn: '1 / -1' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.28in', padding: '0.6in 0.7in', borderLeft: `1px solid ${color.hairline}` }}>
          <div style={{ height: '3.3in' }}>
            <ImageSlot id="s18-main" shape="rect" placeholder="Another story-worthy day" />
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${color.hairline}`, paddingBottom: 8, ...sansLabel, fontSize: 9, letterSpacing: '0.22em', color: color.muted }}>
              <span>Journal entry</span>
              <span>Date goes here</span>
            </div>
            <EditableText id="s18-journal" as="p" multiline defaultText="Room for the long version. What almost went wrong, what definitely went wrong, and how it became the best part." style={{ margin: 0, fontSize: 14, lineHeight: 1.75, color: color.body, textWrap: 'pretty' } as React.CSSProperties} />
          </div>
          <Folio show={sp} n="33" style={{ textAlign: 'right' }} />
        </div>
      </>
    ),
  },
  // 18 · FULL BLEED III
  {
    style: { position: 'relative', background: color.photoWell },
    render: () => (
      <>
        <ImageSlot id="s19-full" shape="rect" placeholder="The third big one. Save it for something loud." />
        <CaptionPlate pos={{ right: '0.5in', bottom: '0.5in' }} labelId="s19-cap-label" label="Near the end now" capId="s19-cap" cap="Caption for the loud one." />
      </>
    ),
  },
  // 19 · LAST FIRSTS | PHOTO
  {
    style: { display: 'grid', gridTemplateColumns: '1fr 1fr', background: color.paperTinted },
    render: (sp) => (
      <>
        <div style={{ display: 'flex', flexDirection: 'column', padding: '0.75in 0.8in' }}>
          <div style={{ ...sansLabel, fontSize: 10, letterSpacing: '0.28em', color: color.muted, borderBottom: `1px solid ${color.hairlineTinted}`, paddingBottom: 12 }}>The last everything</div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly' }}>
            {['Last lunch at our table', 'Last time being told to quiet down', 'Last exam. Ever. (Here, anyway.)', 'Last walk through the gates', 'Add your own last thing'].map((t, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
                <span style={{ fontFamily: font.sans, fontSize: 11, color: color.muted }}>{'☐'}</span>
                <EditableText id={`lf-${i}`} defaultText={t} style={{ fontSize: 17, fontStyle: 'italic' }} />
                <span style={{ flex: 1, borderBottom: `1px dotted ${color.rule}` }} />
                <EditableText id={`lf-${i}-d`} defaultText="date" style={{ fontFamily: font.sans, fontSize: 11, letterSpacing: '0.1em', color: color.muted }} />
              </div>
            ))}
          </div>
          <Folio show={sp} n="36" />
        </div>
        <div style={{ padding: '0.6in', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <ImageSlot id="s20-photo" shape="rect" placeholder="One of the lasts, as it happened" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <EditableText id="s20-cap" as="p" defaultText="Checked off, reluctantly." style={{ margin: 0, fontSize: 14, fontStyle: 'italic', color: color.body }} />
            <Folio show={sp} n="37" />
          </div>
        </div>
      </>
    ),
  },
  // 20 · GRID III | QUOTE PAIR
  {
    style: { display: 'grid', gridTemplateColumns: '1fr 1fr', background: color.paper },
    render: (sp) => (
      <>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.24in', padding: '0.6in' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', ...sansLabel, fontSize: 9, letterSpacing: '0.22em', color: color.muted }}>
            <span>Even more little moments</span>
            <span>We kept taking pictures</span>
          </div>
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gridTemplateRows: 'minmax(0,1fr) minmax(0,1fr)', gap: '0.2in' }}>
            <ImageSlot id="s21-a" shape="rect" placeholder="Last-week energy" />
            <ImageSlot id="s21-b" shape="rect" placeholder="Someone crying (happy)" />
            <ImageSlot id="s21-c" shape="rect" placeholder="The yearbook signing" />
            <ImageSlot id="s21-d" shape="rect" placeholder="One more for the road" />
          </div>
          <Folio show={sp} n="38" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0.75in 0.9in', borderLeft: `1px solid ${color.hairline}`, gap: 26 }}>
          <EditableText id="s21-quote" as="p" multiline defaultText={'“Put the sentence that sums up the whole year right here, nice and big.”'} style={{ margin: 0, fontSize: 28, fontStyle: 'italic', lineHeight: 1.45, textWrap: 'pretty' } as React.CSSProperties} />
          <EditableText id="s21-attr" as="div" defaultText="— all of us, probably" style={{ fontFamily: font.sans, fontSize: 10, letterSpacing: '0.2em', color: color.muted, textTransform: 'uppercase' }} />
          <Folio show={sp} n="39" style={{ textAlign: 'right', marginTop: 20 }} />
        </div>
      </>
    ),
  },
  // 21 · WILDCARDS
  {
    style: { display: 'grid', gridTemplateColumns: '1fr 1fr', background: color.paper },
    render: (sp) => (
      <>
        <div style={{ position: 'relative', padding: '0.6in', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <ImageSlot id="s22-a" shape="rect" placeholder="Wildcard — anything goes" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Folio show={sp} n="40" />
            <EditableText id="s22-cap-a" as="p" defaultText="Caption optional." style={{ margin: 0, fontSize: 14, fontStyle: 'italic', color: color.body }} />
          </div>
        </div>
        <div style={{ position: 'relative', padding: '0.6in', display: 'flex', flexDirection: 'column', gap: 12, borderLeft: `1px solid ${color.hairline}` }}>
          <div style={{ flex: 1 }}>
            <ImageSlot id="s22-b" shape="rect" placeholder="Second wildcard — the photo that fits nowhere else" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <EditableText id="s22-cap-b" as="p" defaultText="It fits here." style={{ margin: 0, fontSize: 14, fontStyle: 'italic', color: color.body }} />
            <Folio show={sp} n="41" />
          </div>
        </div>
      </>
    ),
  },
  // 22 · LETTER | CLOSING PHOTO
  {
    style: { display: 'grid', gridTemplateColumns: '1fr 1fr', background: color.paper },
    render: (sp) => (
      <>
        <div style={{ display: 'flex', flexDirection: 'column', padding: '0.75in 0.8in', gap: 20 }}>
          <div style={{ ...sansLabel, fontSize: 10, letterSpacing: '0.28em', color: color.muted, borderBottom: `1px solid ${color.hairline}`, paddingBottom: 12 }}>Do not open until you're old(er)</div>
          <EditableText id="letter-greet" as="p" defaultText="Dear future me," style={{ margin: 0, fontSize: 20, fontStyle: 'italic', lineHeight: 1.5 }} />
          <EditableText id="letter-body" as="p" multiline defaultText="Write the letter here. What you hope stays the same, what you're glad is ending, who you hope you're still talking to. No pressure — but also, all the pressure, because this is permanent." style={{ margin: 0, fontSize: 14, lineHeight: 1.8, color: color.body, flex: 1, textWrap: 'pretty' } as React.CSSProperties} />
          <EditableText id="letter-sign" as="p" defaultText="— past you, who knew nothing" style={{ margin: 0, fontSize: 16, fontStyle: 'italic', textAlign: 'right' }} />
          <Folio show={sp} n="42" />
        </div>
        <div style={{ position: 'relative' }}>
          <ImageSlot id="s8-photo" shape="rect" placeholder="The last photo. Walking out, lights off, whatever feels like an ending." />
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: '0.5in', display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
            <EditableText id="closing-plate" as="div" defaultText="see you around." style={{ background: color.paper, padding: '10px 22px', fontSize: 15, fontStyle: 'italic', pointerEvents: 'auto' }} />
          </div>
          <OverFolio show={sp} n="43" side="right" />
        </div>
      </>
    ),
  },
];
