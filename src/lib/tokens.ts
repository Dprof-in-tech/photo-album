// Design tokens — final values from the handoff README + .dc.html sources.
// These are the source of truth; do not eyeball colors.

export const color = {
  paper: '#FAF8F4', // page background
  paperTinted: '#F3EFE8', // alternate pages, info bars
  photoWell: '#EFEBE4', // behind full-bleed slots / desk background
  ink: '#1A1816', // primary text; dark back-cover background
  body: '#4A453E', // body / secondary text
  muted: '#8A837A', // muted labels
  faint: '#B5AEA3', // folios / page numbers; dark-page dim text
  hairline: '#E3DED6', // hairlines on paper
  hairlineTinted: '#DDD6CB', // hairlines on tinted paper
  rule: '#C9C1B4', // signature / dotted fill-in lines
  darkHairline: '#4A453E', // hairline on dark pages
} as const;

export const font = {
  serif: "'EB Garamond', serif",
  sans: "'Archivo', sans-serif",
} as const;

// Spread geometry: each album spread is two facing 8x8in pages = 16in x 8in.
// At 96dpi that is 1536 x 768 px. Slots print full-bleed, overflow:hidden.
export const SPREAD_W = 1536;
export const SPREAD_H = 768;

// Total fillable photo slots across the book (README: "N of 51").
export const TOTAL_SLOTS = 51;
