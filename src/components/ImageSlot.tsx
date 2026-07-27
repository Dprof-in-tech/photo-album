import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { getStore, type Crop, type SlotValue } from '@/lib/store';
import { getTextStore } from '@/lib/text';
import { useSetting, useChoice, useTextValue } from '@/lib/settings';
import { LOOKS, type FilmLook } from '@/lib/looks';
import { ACCEPT, fileToWebpBlob } from '@/lib/image';
import { color } from '@/lib/tokens';
import { PrintContext } from './PrintContext';

// Fine-grain SVG noise for the disposable-camera grain overlay.
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

function stampDate(ms: string): string {
  const n = Number(ms);
  if (!ms || !Number.isFinite(n)) return '';
  const d = new Date(n);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${mm} ${dd} '${String(d.getFullYear()).slice(2)}`;
}

type Shape = 'rect' | 'rounded' | 'circle' | 'pill';

export interface ImageSlotProps {
  id: string;
  shape?: Shape;
  radius?: number;
  fit?: 'cover' | 'contain';
  placeholder?: string;
  /** compact chrome for the small Photo Drop tiles */
  compact?: boolean;
}

const S_MAX = 5;
const clampS = (s: number) => Math.max(1, Math.min(S_MAX, s));
const DEFAULT_CROP: Crop = { x: 0, y: 0, scale: 1 };

function radiusFor(shape: Shape, radius: number): string {
  if (shape === 'circle') return '50%';
  if (shape === 'pill') return '9999px';
  if (shape === 'rounded') return `${radius}px`;
  return '0';
}

export default function ImageSlot({
  id,
  shape = 'rect',
  radius = 12,
  fit = 'cover',
  placeholder = 'Drop an image',
  compact = false,
}: ImageSlotProps) {
  const store = getStore();
  const isPrint = useContext(PrintContext);
  const hostRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const viewRef = useRef<Crop>({ ...DEFAULT_CROP });

  const [value, setValue] = useState<SlotValue | null>(null);
  const [reframing, setReframing] = useState(false);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hostW, setHostW] = useState(0); // for sizing the date stamp to the slot

  // Film look (global album setting) + this photo's date.
  const [look] = useChoice('filter', 'off');
  const [dateStamp] = useSetting('datestamp', true);
  const photoDate = useTextValue(`date:${id}`);
  const spec = look !== 'off' ? LOOKS[look as Exclude<FilmLook, 'off'>] : null;

  // ── Store hydration + cross-tab subscription ─────────────────────────────
  useEffect(() => {
    let alive = true;
    const sync = () => {
      const v = store.get(id);
      if (!alive) return;
      setValue(v);
      viewRef.current = v ? { ...v.crop } : { ...DEFAULT_CROP };
    };
    store.load().then(sync);
    const unsub = store.subscribe((changedId) => {
      if (changedId === id) sync();
    });
    return () => {
      alive = false;
      unsub();
    };
  }, [id, store]);

  // ── Geometry (ported from prototype image-slot.js) ───────────────────────
  const geom = useCallback(() => {
    const host = hostRef.current;
    const img = imgRef.current;
    if (!host || !img) return null;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const fw = host.clientWidth;
    const fh = host.clientHeight;
    if (!iw || !ih || !fw || !fh) return null;
    const base = fit === 'contain' ? Math.min(fw / iw, fh / ih) : Math.max(fw / iw, fh / ih);
    return { iw, ih, fw, fh, base };
  }, [fit]);

  const clampView = useCallback(() => {
    const g = geom();
    if (!g) return;
    const v = viewRef.current;
    const mx = Math.max(0, ((g.iw * g.base * v.scale) / g.fw - 1) * 50);
    const my = Math.max(0, ((g.ih * g.base * v.scale) / g.fh - 1) * 50);
    v.x = Math.max(-mx, Math.min(mx, v.x));
    v.y = Math.max(-my, Math.min(my, v.y));
  }, [geom]);

  const applyView = useCallback(() => {
    const img = imgRef.current;
    const g = geom();
    if (!img) return;
    if (!g) {
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.left = '50%';
      img.style.top = '50%';
      img.style.objectFit = fit;
      return;
    }
    const v = viewRef.current;
    const k = g.base * v.scale;
    img.style.width = `${(g.iw * k) / g.fw * 100}%`;
    img.style.height = `${(g.ih * k) / g.fh * 100}%`;
    img.style.left = `${50 + v.x}%`;
    img.style.top = `${50 + v.y}%`;
    img.style.objectFit = '';
  }, [geom, fit]);

  // Re-apply framing whenever the image or committed crop changes, and on resize.
  useEffect(() => {
    applyView();
    const host = hostRef.current;
    if (!host) return;
    setHostW(host.clientWidth);
    const ro = new ResizeObserver(() => {
      clampView();
      applyView();
      setHostW(host.clientWidth);
    });
    ro.observe(host);
    return () => ro.disconnect();
  }, [value, applyView, clampView]);

  // ── Upload / ingest ──────────────────────────────────────────────────────
  const ingest = useCallback(
    async (file: File) => {
      setError(null);
      if (!file || ACCEPT.indexOf(file.type) < 0) {
        setError('Drop a PNG, JPEG, WebP, or AVIF image.');
        return;
      }
      setBusy(true);
      try {
        const blob = await fileToWebpBlob(file); // print-quality, sized independent of the slot
        await store.upload(id, blob); // triggers subscription → setValue + view reset
        // Record the photo's date (from the file) for the disposable-camera stamp.
        getTextStore().set(`date:${id}`, String(file.lastModified || Date.now()));
      } catch (err) {
        console.warn('ImageSlot ingest failed:', err);
        setError('Could not read that image.');
      } finally {
        setBusy(false);
      }
    },
    [id, store]
  );

  // Auto-dismiss transient errors.
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 3000);
    return () => clearTimeout(t);
  }, [error]);

  // ── Reframe: pan (drag) + zoom (wheel) ───────────────────────────────────
  const commitView = useCallback(() => {
    if (!value) return;
    store.setCrop(id, { ...viewRef.current });
  }, [id, store, value]);

  const enterReframe = useCallback(() => {
    if (!value) return;
    setReframing(true);
  }, [value]);

  const exitReframe = useCallback(
    (commit: boolean) => {
      setReframing(false);
      if (commit) commitView();
    },
    [commitView]
  );

  // Close reframe on Escape / outside click.
  useEffect(() => {
    if (!reframing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') exitReframe(true);
    };
    const onDown = (e: PointerEvent) => {
      if (hostRef.current && !e.composedPath().includes(hostRef.current)) exitReframe(true);
    };
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('pointerdown', onDown, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('pointerdown', onDown, true);
    };
  }, [reframing, exitReframe]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!reframing || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const host = hostRef.current!;
    host.setPointerCapture(e.pointerId);
    const fw = host.clientWidth || 1;
    const fh = host.clientHeight || 1;
    const start = { px: e.clientX, py: e.clientY, x: viewRef.current.x, y: viewRef.current.y };
    const move = (ev: PointerEvent) => {
      viewRef.current.x = start.x + ((ev.clientX - start.px) / fw) * 100;
      viewRef.current.y = start.y + ((ev.clientY - start.py) / fh) * 100;
      clampView();
      applyView();
    };
    const up = () => {
      try {
        host.releasePointerCapture(e.pointerId);
      } catch {}
      host.removeEventListener('pointermove', move);
      host.removeEventListener('pointerup', up);
      host.removeEventListener('pointercancel', up);
    };
    host.addEventListener('pointermove', move);
    host.addEventListener('pointerup', up);
    host.addEventListener('pointercancel', up);
  };

  const onWheel = (e: React.WheelEvent) => {
    if (!reframing) return;
    e.preventDefault();
    const host = hostRef.current!;
    const r = host.getBoundingClientRect();
    const cx = ((e.clientX - r.left) / r.width) * 100 - 50;
    const cy = ((e.clientY - r.top) / r.height) * 100 - 50;
    const prev = viewRef.current.scale;
    const next = clampS(prev * Math.pow(1.0015, -e.deltaY));
    if (next === prev) return;
    const k = next / prev;
    viewRef.current.scale = next;
    viewRef.current.x = cx * (1 - k) + viewRef.current.x * k;
    viewRef.current.y = cy * (1 - k) + viewRef.current.y * k;
    clampView();
    applyView();
  };

  // ── Drag & drop ──────────────────────────────────────────────────────────
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setOver(false);
    const f = e.dataTransfer?.files?.[0];
    if (f) ingest(f);
  };

  const filled = !!value?.url;
  const br = radiusFor(shape, radius);
  const capSize = compact ? 11 : 13;

  return (
    <div
      ref={hostRef}
      className="image-slot"
      onDragEnter={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
      }}
      onDragLeave={isPrint ? undefined : () => setOver(false)}
      onDrop={isPrint ? undefined : onDrop}
      onDoubleClick={
        isPrint
          ? undefined
          : (e) => {
              if (!filled) return;
              e.preventDefault();
              reframing ? exitReframe(true) : enterReframe();
            }
      }
      onPointerDown={isPrint ? undefined : onPointerDown}
      onWheel={isPrint ? undefined : onWheel}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        borderRadius: br,
        overflow: 'hidden',
        background: filled ? 'transparent' : isPrint ? color.photoWell : 'rgba(127,127,127,0.08)',
        color: 'inherit',
        cursor: isPrint ? 'default' : filled ? (reframing ? 'grab' : 'default') : 'pointer',
        boxShadow: reframing ? `0 0 0 2px ${color.rule}` : undefined,
        touchAction: reframing ? 'none' : undefined,
        userSelect: 'none',
      }}
    >
      {/* Filled image */}
      {filled && (
        <img
          ref={imgRef}
          src={value!.url}
          alt=""
          draggable={false}
          onLoad={() => {
            clampView();
            applyView();
          }}
          style={{
            position: 'absolute',
            maxWidth: 'none',
            transform: 'translate(-50%,-50%)',
            WebkitUserSelect: 'none',
            userSelect: 'none',
            pointerEvents: 'none',
            filter: spec ? spec.filter : undefined,
          }}
        />
      )}

      {/* Film look: optional tint + grain + vignette + date stamp (renders in print/PDF too) */}
      {filled && spec && (
        <>
          {spec.tint && (
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: spec.tint.bg, mixBlendMode: spec.tint.blend as React.CSSProperties['mixBlendMode'] }} />
          )}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: GRAIN, backgroundSize: '120px 120px', opacity: spec.grain, mixBlendMode: 'overlay' }} />
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: spec.vignette }} />
          {dateStamp && stampDate(photoDate) && (
            <div
              style={{
                position: 'absolute',
                right: '6%',
                bottom: '5%',
                fontFamily: "'Courier New', monospace",
                fontWeight: 700,
                fontSize: Math.max(7, hostW * 0.032),
                letterSpacing: 1,
                color: '#ff8a1e',
                textShadow: '0 0 4px rgba(255,120,0,0.75)',
                pointerEvents: 'none',
              }}
            >
              {stampDate(photoDate)}
            </div>
          )}
        </>
      )}

      {/* Empty placeholder (interactive only — print shows a plain photo well) */}
      {!filled && !isPrint && (
        <div
          onClick={() => inputRef.current?.click()}
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            textAlign: 'center',
            padding: 12,
            boxSizing: 'border-box',
            cursor: 'pointer',
          }}
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ opacity: 0.45 }}
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="m21 15-5-5L5 21" />
          </svg>
          <div
            style={{ maxWidth: '90%', fontWeight: 500, letterSpacing: '0.01em', opacity: 0.75, fontSize: capSize }}
          >
            {placeholder}
          </div>
          <div style={{ fontSize: 11, opacity: 0.75 }}>
            or <u style={{ textUnderlineOffset: 2 }}>browse files</u>
          </div>
        </div>
      )}

      {/* Dashed ring (empty only) */}
      {!filled && !isPrint && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            border: `1.5px dashed ${over ? color.ink : 'currentColor'}`,
            borderRadius: br,
            opacity: over ? 1 : 0.35,
            transition: 'border-color .12s, opacity .12s',
          }}
        />
      )}

      {/* Hover / reframe controls */}
      {filled && !isPrint && (
        <div
          className="slot-ctl"
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            display: 'flex',
            gap: 6,
            opacity: reframing ? 1 : 0,
            pointerEvents: reframing ? 'auto' : 'none',
            transition: 'opacity .12s',
            zIndex: 2,
            whiteSpace: 'nowrap',
          }}
        >
          <button type="button" onClick={() => inputRef.current?.click()} style={ctlBtn}>
            Replace
          </button>
          <button type="button" onClick={() => (reframing ? exitReframe(true) : enterReframe())} style={ctlBtn}>
            {reframing ? 'Done' : 'Edit'}
          </button>
        </div>
      )}

      {/* Busy spinner during encode */}
      {busy && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <span className="slot-spin" />
        </div>
      )}

      {error && (
        <div
          style={{
            position: 'absolute',
            left: 8,
            bottom: 8,
            right: 8,
            color: '#b3261e',
            fontSize: 11,
            background: 'rgba(255,255,255,0.85)',
            padding: '4px 6px',
            borderRadius: 5,
            pointerEvents: 'none',
          }}
        >
          {error}
        </div>
      )}

      {!isPrint && (
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT.join(',')}
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) ingest(f);
            e.target.value = '';
          }}
        />
      )}
    </div>
  );
}

const ctlBtn: React.CSSProperties = {
  appearance: 'none',
  border: 0,
  borderRadius: 6,
  padding: '5px 10px',
  cursor: 'pointer',
  background: 'rgba(0,0,0,0.65)',
  color: '#fff',
  font: '11px/1 system-ui, -apple-system, sans-serif',
  backdropFilter: 'blur(6px)',
};
