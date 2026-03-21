// Keramik-Auszeit Farbpalette
// Warm, ruhig, hochwertig - inspiriert von Keramik und Naturmaterialien

export const colors = {
  // Primärfarben (warmes Braun/Terrakotta)
  primary: '#8B6F47',
  primaryLight: '#A68B5B',
  primaryDark: '#6B5535',

  // Akzentfarben
  accent: '#C4956A',
  accentLight: '#D4B08C',

  // Hintergrund
  background: '#FAFAF7',
  surface: '#FFFFFF',
  surfaceElevated: '#F5F3EE',

  // Text
  text: '#2D2A26',
  textSecondary: '#6B6560',
  textLight: '#9B9590',
  textOnPrimary: '#FFFFFF',

  // Status-Farben
  statusNeu: '#4A90D9',
  statusGeplant: '#7B68EE',
  statusImOfen: '#E8833A',
  statusGebrannt: '#D4956A',
  statusAbholbereit: '#5CB85C',
  statusAbgeschlossen: '#8B8B8B',
  statusStorniert: '#D9534F',

  // Funktionale Farben
  success: '#5CB85C',
  warning: '#F0AD4E',
  error: '#D9534F',
  info: '#4A90D9',

  // Bezahlt-Status
  paid: '#5CB85C',
  unpaid: '#D9534F',

  // Ränder und Trennlinien
  border: '#E8E4DE',
  borderLight: '#F0EDE8',
  divider: '#E8E4DE',

  // Schatten
  shadow: 'rgba(45, 42, 38, 0.08)',
  shadowDark: 'rgba(45, 42, 38, 0.16)',
} as const;

export const statusColors: Record<string, string> = {
  neu: colors.statusNeu,
  geplant: colors.statusGeplant,
  im_ofen: colors.statusImOfen,
  gebrannt: colors.statusGebrannt,
  abholbereit: colors.statusAbholbereit,
  abgeschlossen: colors.statusAbgeschlossen,
  storniert: colors.statusStorniert,
};

export const statusLabels: Record<string, string> = {
  neu: 'Neu',
  geplant: 'Geplant',
  im_ofen: 'Im Ofen',
  gebrannt: 'Gebrannt',
  abholbereit: 'Abholbereit',
  abgeschlossen: 'Abgeschlossen',
  storniert: 'Storniert',
};
