import type { APIRoute } from 'astro';
import { getTimeSlots } from '../../lib/storage';

// GET - Öffentlich verfügbare Zeitslots abrufen (nur zukünftige)
export const GET: APIRoute = async () => {
  try {
    const allSlots = await getTimeSlots();
    const now = new Date();
    
    // Filtere nur zukünftige Slots mit verfügbaren Plätzen
    const availableSlots = allSlots.filter(slot => {
      const slotDateTime = new Date(`${slot.date}T${slot.time}`);
      return slotDateTime > now && slot.available > 0;
    });

    // Sortiere nach Datum und Zeit
    availableSlots.sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time}`);
      const dateB = new Date(`${b.date}T${b.time}`);
      return dateA.getTime() - dateB.getTime();
    });

    return new Response(JSON.stringify(availableSlots), {
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

