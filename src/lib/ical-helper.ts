/**
 * ICS/iCal Helper für korrekte Kalender-Events mit Europe/Berlin Zeitzone.
 *
 * Problem vorher: Zeiten wurden als UTC (Z-Suffix) gespeichert, aber die
 * Termine sind in lokaler deutscher Zeit. 11:00 Uhr lokal wurde als 11:00 UTC
 * gesendet, was im Kalender als 12:00 CET angezeigt wird.
 *
 * Lösung: DTSTART/DTEND mit TZID=Europe/Berlin und VTIMEZONE-Block.
 */

/** Formatiert ein Datum+Uhrzeit für iCal OHNE Zeitzone-Suffix (für TZID-Nutzung) */
function formatLocalDateTime(dateStr: string, timeStr: string): string {
  // dateStr: "2026-03-07", timeStr: "11:00"
  const d = dateStr.replace(/-/g, '');
  const t = timeStr.replace(/:/g, '') + '00';
  return `${d}T${t}`;
}

/** Formatiert ein JS-Date als UTC für DTSTAMP */
function formatUtcTimestamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

/** Berechnet die Endzeit als String */
function addHours(timeStr: string, hours: number): string {
  const [h, m] = timeStr.split(':').map(Number);
  const totalMinutes = h * 60 + m + hours * 60;
  const newH = Math.floor(totalMinutes / 60) % 24;
  const newM = totalMinutes % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

/** VTIMEZONE-Block für Europe/Berlin (CET/CEST) */
const VTIMEZONE_BERLIN = `BEGIN:VTIMEZONE
TZID:Europe/Berlin
BEGIN:STANDARD
DTSTART:19701025T030000
RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=10
TZOFFSETFROM:+0200
TZOFFSETTO:+0100
TZNAME:CET
END:STANDARD
BEGIN:DAYLIGHT
DTSTART:19700329T020000
RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=3
TZOFFSETFROM:+0100
TZOFFSETTO:+0200
TZNAME:CEST
END:DAYLIGHT
END:VTIMEZONE`;

interface ICalEventOptions {
  uid?: string;
  summary: string;
  description: string;
  location?: string;
  date: string;      // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime?: string;  // HH:MM (optional, default: startTime + defaultDurationHours)
  defaultDurationHours?: number; // Fallback-Dauer wenn keine Endzeit (default: 2)
  status?: 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED';
  prodId?: string;
}

/**
 * Erzeugt einen vollständigen iCal-String mit korrekter Europe/Berlin Zeitzone.
 */
export function createICalEvent(options: ICalEventOptions): string {
  const {
    uid = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}@auszeit-keramik.de`,
    summary,
    description,
    location = 'Atelier Auszeit, Feldstiege 6a, 48599 Gronau',
    date,
    startTime,
    endTime,
    defaultDurationHours = 2,
    status = 'CONFIRMED',
    prodId = '-//Atelier Auszeit//Booking//DE',
  } = options;

  const resolvedEndTime = endTime || addHours(startTime, defaultDurationHours);
  const dtStart = formatLocalDateTime(date, startTime);
  const dtEnd = formatLocalDateTime(date, resolvedEndTime);
  const dtstamp = formatUtcTimestamp(new Date());

  // Escape special chars in description for iCal
  const escapedDesc = description
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${prodId}`,
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    VTIMEZONE_BERLIN,
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART;TZID=Europe/Berlin:${dtStart}`,
    `DTEND;TZID=Europe/Berlin:${dtEnd}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${escapedDesc}`,
    `LOCATION:${location}`,
    `STATUS:${status}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

