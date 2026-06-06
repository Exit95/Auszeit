/**
 * Status-Logik für Brenn- und Abholverwaltung
 * Transitions-Validierung und Overall-Status-Berechnung
 */

export const ALL_STATUSES = [
  'ERFASST', 'WARTET_AUF_BRENNEN', 'IM_BRENNOFEN',
  'GEBRANNT', 'ABHOLBEREIT', 'ABGEHOLT', 'PROBLEM'
] as const;

export type Status = typeof ALL_STATUSES[number];

export const STATUS_PRIORITY: readonly Status[] = [
  'ERFASST', 'WARTET_AUF_BRENNEN', 'IM_BRENNOFEN',
  'GEBRANNT', 'ABHOLBEREIT', 'ABGEHOLT'
];

export const VALID_TRANSITIONS: Record<Status, Status[]> = {
  'ERFASST':              ['WARTET_AUF_BRENNEN', 'PROBLEM'],
  'WARTET_AUF_BRENNEN':   ['IM_BRENNOFEN', 'PROBLEM'],
  'IM_BRENNOFEN':         ['GEBRANNT', 'PROBLEM'],
  'GEBRANNT':             ['ABHOLBEREIT', 'PROBLEM'],
  'ABHOLBEREIT':          ['ABGEHOLT', 'PROBLEM'],
  'ABGEHOLT':             [],
  'PROBLEM':              [],
};

export const STATUS_LABELS: Record<Status, string> = {
  'ERFASST': 'Erfasst',
  'WARTET_AUF_BRENNEN': 'Wartet auf Brennen',
  'IM_BRENNOFEN': 'Im Brennofen',
  'GEBRANNT': 'Gebrannt',
  'ABHOLBEREIT': 'Abholbereit',
  'ABGEHOLT': 'Abgeholt',
  'PROBLEM': 'Problem',
};

/**
 * Prüft ob ein Statuswechsel erlaubt ist.
 * Sonderfall: Rücksprung von PROBLEM auf previous_status.
 */
export function isValidTransition(
  currentStatus: Status,
  newStatus: Status,
  previousStatus: Status | null
): boolean {
  // Rücksprung von PROBLEM
  if (currentStatus === 'PROBLEM' && previousStatus && newStatus === previousStatus) {
    return true;
  }

  const allowed = VALID_TRANSITIONS[currentStatus];
  return allowed ? allowed.includes(newStatus) : false;
}

/**
 * Ermittelt den nächsten regulären Status (nicht PROBLEM).
 */
export function getNextStatus(currentStatus: Status): Status | null {
  const idx = STATUS_PRIORITY.indexOf(currentStatus);
  if (idx === -1 || idx >= STATUS_PRIORITY.length - 1) return null;
  return STATUS_PRIORITY[idx + 1];
}

/**
 * Berechnet den Overall-Status eines Auftrags aus den Item-Status.
 */
export function calculateOverallStatus(items: { status: Status }[]): Status {
  const activeItems = items.filter(i => i.status !== 'PROBLEM');

  if (activeItems.length === 0) return 'PROBLEM';
  if (activeItems.every(i => i.status === 'ABGEHOLT')) return 'ABGEHOLT';

  let lowestIndex = STATUS_PRIORITY.length - 1;
  for (const item of activeItems) {
    if (item.status === 'ABGEHOLT') continue;
    const idx = STATUS_PRIORITY.indexOf(item.status);
    if (idx < lowestIndex) lowestIndex = idx;
  }
  return STATUS_PRIORITY[lowestIndex];
}

/**
 * Prüft ob ein Status ein gültiger Status-Wert ist.
 */
export function isValidStatus(status: string): status is Status {
  return ALL_STATUSES.includes(status as Status);
}
