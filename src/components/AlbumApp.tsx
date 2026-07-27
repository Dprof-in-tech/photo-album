import { useEffect, useState } from 'react';
import Spread from './Spread';
import Celebration from './Celebration';
import { PrintContext } from './PrintContext';
import { SPREADS, sansLabel } from './spreads';
import { getStore } from '@/lib/store';
import { getTextStore } from '@/lib/text';
import { useSetting, useChoice } from '@/lib/settings';
import { LOOK_OPTIONS } from '@/lib/looks';
import { color } from '@/lib/tokens';

export default function AlbumApp({
  print = false,
  showPageNumbers: initialShow = true,
}: {
  print?: boolean;
  showPageNumbers?: boolean;
}) {
  const [showPageNumbers, setShowPageNumbers] = useState(initialShow);
  const sp = showPageNumbers;
  const [look, setLook] = useChoice('filter', 'off');
  const [dateStamp, setDateStamp] = useSetting('datestamp', true);

  // Once photos + settings have hydrated from R2, flag readiness so Browser
  // Rendering knows the page is safe to capture as a PDF.
  useEffect(() => {
    if (!print) return;
    getTextStore().load();
    getStore()
      .load()
      .then(() =>
        setTimeout(() => {
          (window as unknown as { __ALBUM_READY__?: boolean }).__ALBUM_READY__ = true;
        }, 400)
      );
  }, [print]);

  const downloadPdf = async () => {
    try {
      const r = await fetch('/api/pdf');
      if (r.ok) {
        const blob = await r.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = '3-idiots-and-the-stooges.pdf';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        return;
      }
    } catch {
      /* fall through */
    }
    // Fallback (e.g. local dev without Browser Rendering): open the print
    // layout so the browser's own Save-as-PDF produces the exact same output.
    window.open('/print', '_blank');
  };

  return (
    <PrintContext.Provider value={print}>
      {!print && <Celebration />}
      <div style={print ? { background: '#fff' } : { maxWidth: 1200, margin: '0 auto', padding: '28px 20px 80px' }}>
        {!print && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ ...sansLabel, fontSize: 9, letterSpacing: '0.26em', color: color.muted }}>School memories album</div>
              <div style={{ fontSize: 24, fontWeight: 500, marginTop: 2 }}>
                3 Idiots <span style={{ fontStyle: 'italic', fontWeight: 400 }}>&amp;</span> the Stooges
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <label style={{ ...sansLabel, fontSize: 10, letterSpacing: '0.14em', color: color.muted, display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
                <input type="checkbox" checked={showPageNumbers} onChange={(e) => setShowPageNumbers(e.target.checked)} />
                Page numbers
              </label>
              <label style={{ ...sansLabel, fontSize: 10, letterSpacing: '0.14em', color: color.muted, display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
                Film look
                <select
                  value={look}
                  onChange={(e) => setLook(e.target.value)}
                  style={{ ...sansLabel, fontSize: 10, letterSpacing: '0.1em', color: color.ink, background: color.paper, border: `1px solid ${color.ink}`, padding: '6px 8px', cursor: 'pointer' }}
                >
                  {LOOK_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              {look !== 'off' && (
                <label style={{ ...sansLabel, fontSize: 10, letterSpacing: '0.14em', color: color.muted, display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
                  <input type="checkbox" checked={dateStamp} onChange={(e) => setDateStamp(e.target.checked)} />
                  Date stamp
                </label>
              )}
              <a href="/book" style={{ ...sansLabel, fontSize: 10, letterSpacing: '0.14em', textDecoration: 'none', background: color.ink, color: color.paper, border: `1px solid ${color.ink}`, padding: '10px 14px' }}>
                Flip through
              </a>
              <button type="button" onClick={downloadPdf} style={{ ...sansLabel, fontSize: 10, letterSpacing: '0.14em', background: 'transparent', color: color.ink, border: `1px solid ${color.ink}`, padding: '10px 14px', cursor: 'pointer' }}>
                Print-ready PDF
              </button>
              <a href="/" style={{ ...sansLabel, fontSize: 10, letterSpacing: '0.14em', textDecoration: 'none', border: `1px solid ${color.ink}`, padding: '10px 14px' }}>
                Photo drop
              </a>
            </div>
          </div>
        )}

        {!print && (
          <p
            style={{
              margin: '0 0 20px',
              padding: '10px 14px',
              background: color.paperTinted,
              border: `1px solid ${color.hairlineTinted}`,
              fontSize: 13,
              fontStyle: 'italic',
              color: color.body,
              textAlign: 'center',
            }}
          >
            Tip: tap any caption, name, quote, or note to write your own — it saves automatically. Tap a photo box to add a picture; double-click a filled photo to reframe it.
          </p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: print ? 0 : 28 }}>
          {SPREADS.map((s, i) => (
            <Spread key={i} style={s.style}>
              {s.render(sp)}
            </Spread>
          ))}
        </div>

        {!print && (
          <p style={{ textAlign: 'center', marginTop: 40, fontSize: 13, fontStyle: 'italic', color: color.faint }}>
            All 22 spreads. Drop photos here or from Photo Drop; double-click a filled photo to reframe. Toggle page numbers above.
          </p>
        )}
      </div>
    </PrintContext.Provider>
  );
}
