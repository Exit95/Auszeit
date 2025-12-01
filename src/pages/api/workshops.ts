import type { APIRoute } from 'astro';
import { getWorkshops } from '../../lib/storage';

// GET - Öffentliche Route: Nur aktive Workshops abrufen
export const GET: APIRoute = async () => {
  try {
    const allWorkshops = await getWorkshops();
    // Nur aktive Workshops zurückgeben
    const activeWorkshops = allWorkshops.filter(w => w.active);
    
    return new Response(JSON.stringify(activeWorkshops), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching workshops:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch workshops' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

