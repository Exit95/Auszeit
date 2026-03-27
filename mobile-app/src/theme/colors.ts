// Malatelier Auszeit Farbpalette
// Abgestimmt auf das Website-Redesign: Sienna, Espresso, Terra, Leinen

export const colors = {
  // Primärfarben (Sienna/Terracotta)
  primary: '#A0522D',
  primaryLight: '#B1735C',
  primaryDark: '#8B4726',

  // Akzentfarben (Terra)
  accent: '#D96C4A',
  accentLight: '#E8956E',

  // Marke
  brandEspresso: '#423430',

  // Hintergrund (Leinen/Paper)
  background: '#FAF7F2',
  surface: '#FFFFFF',
  surfaceElevated: '#EDE4DA',

  // Text
  text: '#423430',
  textSecondary: '#6B5D56',
  textLight: '#9B8E88',
  textOnPrimary: '#FFFFFF',

  // Status-Farben (Brennprozess)
  statusErfasst: '#A0522D',
  statusWartet: '#D4956A',
  statusImOfen: '#D96C4A',
  statusGebrannt: '#B1735C',
  statusAbholbereit: '#5CB85C',
  statusAbgeholt: '#8B8B8B',
  statusStorniert: '#D9534F',

  // Funktionale Farben
  success: '#5CB85C',
  warning: '#E8833A',
  error: '#D9534F',
  info: '#4A90D9',

  // Bezahlt-Status
  paid: '#5CB85C',
  unpaid: '#D9534F',

  // Ränder und Trennlinien
  border: '#E0D6CC',
  borderLight: '#EDE4DA',
  divider: '#E0D6CC',

  // Schatten
  shadow: 'rgba(66, 52, 48, 0.08)',
  shadowDark: 'rgba(66, 52, 48, 0.16)',
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
