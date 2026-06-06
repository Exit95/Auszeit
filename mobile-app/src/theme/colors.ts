// Malatelier Auszeit Farbpalette
// Exakt abgestimmt auf das Website-Redesign "Warmes Atelier-Editorial".
// OKLCH-Palette der Website, hier als hex-Äquivalente.
//   bg #F7F1EA · surface #FFFFFF · card #F0E9E0 · ink #3A2D24 · ink-2 #6B5143
//   meta #9B847A · terra #D96C4A · terra-h #C85A38 · caramel #CFA874 · hair #E2D8CF

export const colors = {
  // Primär (Terrakotta — der CTA-/Akzentton der Website)
  primary: '#D96C4A',       // terra
  primaryLight: '#E8956E',
  primaryDark: '#C85A38',   // terra-h (Hover/Dark)

  // Akzent (identisch mit primary — Terra ist der eine Brand-Akzent)
  accent: '#D96C4A',        // terra
  accentLight: '#E8956E',

  // Sekundärer Akzent (Goldton)
  secondary: '#CFA874',     // caramel

  // Marke — Espresso-Dunkel (Alias auf ink, damit Bestandscode weiterläuft)
  brandEspresso: '#3A2D24', // = ink
  ink: '#3A2D24',
  inkSecondary: '#6B5143',  // ink-2
  meta: '#9B847A',

  // Hintergrund (Cream-Leinen / Paper)
  background: '#F7F1EA',     // bg
  surface: '#FFFFFF',
  card: '#F0E9E0',          // leicht wärmer als surface
  surfaceElevated: '#F0E9E0', // Alias auf card (Bestandscode)

  // Text
  text: '#3A2D24',          // ink
  textSecondary: '#6B5143', // ink-2
  textLight: '#9B847A',     // meta
  textOnPrimary: '#FFFFFF',

  // Status-Farben (Brennprozess) — warmer Unterton
  statusErfasst: '#A0855C',    // warmgelb-braun
  statusWartet: '#CFA874',     // caramel
  statusImOfen: '#D96C4A',     // terra
  statusGebrannt: '#B87333',   // Kupfer-warm
  statusAbholbereit: '#5A9E6A',// sanftes Grün
  statusAbgeholt: '#9B847A',   // meta
  statusStorniert: '#C4524F',  // warm-rot

  // Funktionale Farben (warm abgestimmt)
  success: '#5A9E6A',
  warning: '#CFA874',
  error: '#C4524F',
  info: '#A0855C',

  // Bezahlt-Status
  paid: '#5A9E6A',
  unpaid: '#C4524F',

  // Ränder und Trennlinien
  border: '#E2D8CF',        // hair
  borderLight: '#EDE6DC',
  divider: '#E2D8CF',

  // Schatten (weich, warm)
  shadow: 'rgba(58, 45, 36, 0.08)',
  shadowDark: 'rgba(58, 45, 36, 0.16)',
} as const;

export const statusColors: Record<string, string> = {
  ERFASST: colors.statusErfasst,
  WARTET_AUF_BRENNEN: colors.statusWartet,
  IM_BRENNOFEN: colors.statusImOfen,
  GEBRANNT: colors.statusGebrannt,
  ABHOLBEREIT: colors.statusAbholbereit,
  ABGEHOLT: colors.statusAbgeholt,
  STORNIERT: colors.statusStorniert,
};

export const statusLabels: Record<string, string> = {
  ERFASST: 'Erfasst',
  WARTET_AUF_BRENNEN: 'Wartet auf Brennen',
  IM_BRENNOFEN: 'Im Ofen',
  GEBRANNT: 'Gebrannt',
  ABHOLBEREIT: 'Abholbereit',
  ABGEHOLT: 'Abgeholt',
  STORNIERT: 'Storniert',
};
