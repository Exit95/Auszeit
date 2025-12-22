import type { APIRoute } from 'astro';
import { getTimeSlots } from '../../lib/storage';

// GET - Öffentlich verfügbare Zeitslots abrufen (nur zukünftige)
// Inkludiert auch Kindergeburtstag/Stammtisch-Tage (als ausgebucht markiert)
export const GET: APIRoute = async () => {
  try {
    const allSlots = await getTimeSlots();
    const now = new Date();

    // Filtere zukünftige Slots
    // - Normale Termine: nur wenn verfügbare Plätze > 0
    // - Kindergeburtstag/Stammtisch: immer anzeigen (als ausgebucht)
    const relevantSlots = allSlots.filter(slot => {
      const slotDateTime = new Date(`${slot.date}T${slot.time}`);
      if (slotDateTime <= now) return false; // Vergangene Termine ausschließen

      // Kindergeburtstag oder Stammtisch immer anzeigen (auch wenn ausgebucht)
      if (slot.eventType === 'kindergeburtstag' || slot.eventType === 'stammtisch') {
        return true;
      }

      // Normale Termine nur wenn Plätze frei
      return slot.available > 0;
    });

    // Sortiere nach Datum und Zeit
    relevantSlots.sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time}`);
      const dateB = new Date(`${b.date}T${b.time}`);
      return dateA.getTime() - dateB.getTime();
    });

    // Füge zusätzliche Info für Frontend hinzu
    const slotsWithInfo = relevantSlots.map(slot => ({
      ...slot,
      isBlocked: slot.eventType === 'kindergeburtstag' || slot.eventType === 'stammtisch',
      blockedReason: slot.eventType === 'kindergeburtstag'
        ? 'Kindergeburtstag'
        : slot.eventType === 'stammtisch'
          ? 'Stammtisch'
          : null
    }));

    return new Response(JSON.stringify(slotsWithInfo), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching slots:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch slots' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

