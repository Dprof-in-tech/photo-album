// Film "looks" for the photos — a global album setting (`set:filter`). Applied
// in ImageSlot to filled photos and rendered everywhere the album shows (editor,
// flip book, print/PDF). Each look = a CSS filter on the image plus optional
// tint / grain / vignette overlays.

export type FilmLook = 'off' | 'golden' | 'faded' | 'bw' | 'cool';

export const LOOK_OPTIONS: { value: FilmLook; label: string }[] = [
  { value: 'off', label: 'No filter' },
  { value: 'golden', label: 'Golden' },
  { value: 'faded', label: 'Faded matte' },
  { value: 'bw', label: 'Black & white' },
  { value: 'cool', label: 'Cool / cross-process' },
];

export interface LookSpec {
  filter: string;
  grain: number; // 0–1 overlay opacity
  vignette: string; // CSS background (radial gradient)
  tint?: { bg: string; blend: string }; // optional color wash
}

export const LOOKS: Record<Exclude<FilmLook, 'off'>, LookSpec> = {
  // Warm faded film + orange date stamp — classic disposable camera.
  golden: {
    filter: 'contrast(1.06) saturate(0.82) sepia(0.2) brightness(1.03)',
    grain: 0.14,
    vignette: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 52%, rgba(40,28,14,0.4) 100%)',
  },
  // Low-contrast, milky, minimal color shift.
  faded: {
    filter: 'contrast(0.86) saturate(0.9) brightness(1.09)',
    grain: 0.08,
    vignette: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 60%, rgba(60,54,46,0.16) 100%)',
    tint: { bg: 'rgba(250,248,244,0.14)', blend: 'normal' },
  },
  // Classic film black & white with grain.
  bw: {
    filter: 'grayscale(1) contrast(1.1) brightness(1.02)',
    grain: 0.18,
    vignette: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 50%, rgba(0,0,0,0.4) 100%)',
  },
  // Cross-processed: cyan/teal cast, punchy.
  cool: {
    filter: 'contrast(1.12) saturate(1.12) hue-rotate(-10deg) brightness(1.01)',
    grain: 0.12,
    vignette: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 52%, rgba(10,22,40,0.4) 100%)',
    tint: { bg: 'rgba(20,70,90,0.14)', blend: 'soft-light' },
  },
};
