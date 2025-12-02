import type { APIRoute } from 'astro';
import { getWorkshops } from '../../lib/storage';
import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const WORKSHOP_BOOKINGS_FILE = path.join(DATA_DIR, 'workshop-bookings.json');

interface WorkshopBooking {
  id: string;
  workshopId: string;
  participants: number;
  status: 'pending' | 'confirmed' | 'cancelled';
}

async function getWorkshopBookings(): Promise<WorkshopBooking[]> {
  try {
    await fs.access(WORKSHOP_BOOKINGS_FILE);
    const data = await fs.readFile(WORKSHOP_BOOKINGS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// GET - Öffentliche Route: Nur aktive Workshops abrufen
export const GET: APIRoute = async () => {
  try {
    const allWorkshops = await getWorkshops();
    const bookings = await getWorkshopBookings();

    // Nur aktive Workshops zurückgeben
    const activeWorkshops = allWorkshops
      .filter(w => w.active)
      .map(workshop => {
        // Berechne aktuelle Teilnehmerzahl
        const workshopBookings = bookings.filter(
          b => b.workshopId === workshop.id && b.status !== 'cancelled'
        );
        const currentParticipants = workshopBookings.reduce(
          (sum, b) => sum + b.participants,
          0
        );
        const availableSpots = workshop.maxParticipants - currentParticipants;

        return {
          ...workshop,
          currentParticipants,
          availableSpots
        };
      });

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

