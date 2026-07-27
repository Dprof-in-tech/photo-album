// Canonical slot manifest — mirrors the logic class in Photo Drop.dc.html.
// Both surfaces key on these ids; the ids are how a Photo Drop upload appears
// in the matching album slot. Page ranges match the album's printed folios.

export interface Slot {
  id: string;
  label: string;
  hint: string;
  /** column span in the Photo Drop 3-col grid (1–3) */
  span: number;
}

export interface SlotGroup {
  name: string;
  pages: string;
  slots: Slot[];
}

const S = (id: string, label: string, hint: string, span = 1): Slot => ({ id, label, hint, span });

export const SLOT_GROUPS: SlotGroup[] = [
  { name: 'Cover', pages: 'front + back', slots: [S('cover-circle', 'Cover circle', 'the crew')] },
  { name: 'Opening', pages: 'pages 2–3', slots: [S('s2-photo', 'Opening photo', 'where it started', 3)] },
  { name: 'The big one', pages: 'pages 4–5', slots: [S('s3-full', 'Two-page photo', 'go wide', 3)] },
  {
    name: 'Photos + journal',
    pages: 'pages 6–7',
    slots: [S('s4-a', 'Ordinary thing', 'ordinary thing'), S('s4-b', 'Unposed', 'unposed'), S('s4-main', 'Journal photo', 'big day')],
  },
  { name: 'Quotes', pages: 'pages 8–9', slots: [S('s5-photo', 'Exhibit A', 'the face', 3)] },
  {
    name: 'Little moments',
    pages: 'pages 10–11',
    slots: [
      S('s6-a', 'Lunch table', 'lunch'),
      S('s6-b', 'Mid-laugh', 'mid-laugh'),
      S('s6-c', 'Blurry one', 'blurry'),
      S('s6-d', 'Empty classroom', 'empty room'),
      S('s6-main', 'Quiet page', 'no caption needed', 2),
    ],
  },
  { name: 'Field notes', pages: 'pages 12–13', slots: [S('s7-tiny', 'Tiny pic', 'tiny')] },
  {
    name: 'The cast',
    pages: 'pages 14–15',
    slots: [
      S('cast-1', 'Idiot #1', '#1'),
      S('cast-2', 'Idiot #2', '#2'),
      S('cast-3', 'Idiot #3', '#3'),
      S('cast-4', 'Stooge #1', '#4'),
      S('cast-5', 'Stooge #2', '#5'),
      S('cast-6', 'Stooge #3', '#6'),
    ],
  },
  { name: 'Big one, part II', pages: 'pages 16–17', slots: [S('s10-full', 'Two-page photo', 'golden hour', 3)] },
  {
    name: 'Filmstrip',
    pages: 'pages 18–19',
    slots: [
      S('strip-1', 'Frame 1', '1'),
      S('strip-2', 'Frame 2', '2'),
      S('strip-3', 'Frame 3', '3'),
      S('strip-4', 'Frame 4', '4'),
      S('strip-5', 'Frame 5', '5'),
      S('strip-6', 'Frame 6', '6'),
    ],
  },
  { name: 'Journal, part II', pages: 'pages 20–21', slots: [S('s12-photo', 'Story photo', 'the day', 3)] },
  { name: 'Superlatives', pages: 'pages 22–23', slots: [S('s13-photo', 'Award ceremony', 'any Tuesday', 3)] },
  {
    name: 'More moments',
    pages: 'pages 24–25',
    slots: [
      S('s14-a', 'Walk home', 'walk home'),
      S('s14-b', 'Cafeteria', 'cafeteria'),
      S('s14-c', 'Asleep in class', 'zzz'),
      S('s14-d', 'Group chat live', 'chaos'),
      S('s14-main', 'Quiet page II', 'speaks for itself', 2),
    ],
  },
  { name: 'Overheard', pages: 'pages 26–27', slots: [S('s15-photo', 'Mid-chaos', 'mid-chaos', 3)] },
  {
    name: 'Places',
    pages: 'pages 28–29',
    slots: [S('place-1', 'Behind the gym', 'the spot'), S('place-2', 'The stairwell', 'stairwell'), S('place-3', 'Our table', 'our table')],
  },
  {
    name: 'Field notes II',
    pages: 'pages 30–31',
    slots: [S('s17-tiny', 'Tiny pic', 'tiny'), S('s17-photo', 'Week in one shot', 'the week', 2)],
  },
  {
    name: 'Photos + journal II',
    pages: 'pages 32–33',
    slots: [S('s18-a', 'Dumb tradition', 'tradition'), S('s18-b', 'Proof, twice', 'proof'), S('s18-main', 'Journal photo', 'story day')],
  },
  { name: 'Big one, part III', pages: 'pages 34–35', slots: [S('s19-full', 'Two-page photo', 'something loud', 3)] },
  { name: 'Last everything', pages: 'pages 36–37', slots: [S('s20-photo', 'One of the lasts', 'a last', 3)] },
  {
    name: 'Even more moments',
    pages: 'pages 38–39',
    slots: [
      S('s21-a', 'Last-week energy', 'energy'),
      S('s21-b', 'Happy tears', 'tears'),
      S('s21-c', 'Yearbook signing', 'signing'),
      S('s21-d', 'One for the road', 'road'),
    ],
  },
  { name: 'Wildcards', pages: 'pages 40–41', slots: [S('s22-a', 'Wildcard 1', 'anything'), S('s22-b', 'Wildcard 2', 'fits nowhere else')] },
  { name: 'The ending', pages: 'pages 42–43', slots: [S('s8-photo', 'The last photo', 'lights off', 3)] },
];

export const ALL_SLOT_IDS: string[] = SLOT_GROUPS.flatMap((g) => g.slots.map((s) => s.id));
