import type { APIRoute } from 'astro';
import { verifyCancelToken } from '../../lib/cancel-token';
import { getBookings, cancelBooking, getTimeSlots } from '../../lib/storage';
import { isS3Configured, readJsonFromS3, writeJsonToS3 } from '../../lib/s3-storage';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS, rateLimitResponse } from '../../lib/rate-limit';
import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const WORKSHOP_BOOKINGS_FILENAME = 'workshop-bookings.json';

interface WorkshopBooking {
  id: string;
  workshopId: string;
  name: string;
  email: string;
  phone?: string;
  participants: number;
  notes?: string;
  createdAt: string;
  status: 'pending' | 'confirmed' | 'cancelled';
}

async function getWorkshopBookings(): Promise<WorkshopBooking[]> {
  if (isS3Configured()) {
    return await readJsonFromS3<WorkshopBooking[]>(WORKSHOP_BOOKINGS_FILENAME, []);
  }
  const filePath = path.join(DATA_DIR, WORKSHOP_BOOKINGS_FILENAME);
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function saveWorkshopBookings(bookings: WorkshopBooking[]): Promise<void> {
  if (isS3Configured()) {
    await writeJsonToS3(WORKSHOP_BOOKINGS_FILENAME, bookings);
    return;
  }
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(path.join(DATA_DIR, WORKSHOP_BOOKINGS_FILENAME), JSON.stringify(bookings, null, 2));
}

// GET - Buchungsinfo abrufen (für die Stornierungsseite)
export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  const token = url.searchParams.get('token');
  const type = url.searchParams.get('type') || 'booking';

  if (!id || !token) {
    return new Response(JSON.stringify({ error: 'Fehlende Parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!verifyCancelToken(id, token)) {
    return new Response(JSON.stringify({ error: 'Ungültiger Stornierungslink' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    if (type === 'workshop') {
      const bookings = await getWorkshopBookings();
      const booking = bookings.find(b => b.id === id);
      if (!booking) {
        return new Response(JSON.stringify({ error: 'Buchung nicht gefunden' }), {
          status: 404, headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({
        id: booking.id,
        name: booking.name,
        participants: booking.participants,
        status: booking.status,
        type: 'workshop',
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } else {
      const bookings = await getBookings();
      const booking = bookings.find(b => b.id === id);
      if (!booking) {
        return new Response(JSON.stringify({ error: 'Buchung nicht gefunden' }), {
          status: 404, headers: { 'Content-Type': 'application/json' },
        });
      }
      const slots = await getTimeSlots();
      const slot = slots.find(s => s.id === booking.slotId);
      return new Response(JSON.stringify({
        id: booking.id,
        name: booking.name,
        participants: booking.participants,
        status: booking.status,
        type: 'booking',
        date: slot?.date,
        time: slot?.time,
        endTime: slot?.endTime,
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
  } catch (error) {
    console.error('Fehler beim Abrufen der Buchung:', error);
    return new Response(JSON.stringify({ error: 'Interner Fehler' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
};

// POST - Buchung stornieren
export const POST: APIRoute = async ({ request }) => {
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(clientId, RATE_LIMITS.BOOKING);
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit);
  }

  try {
    const { id, token, type } = await request.json();

    if (!id || !token) {
      return new Response(JSON.stringify({ error: 'Fehlende Parameter' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!verifyCancelToken(id, token)) {
      return new Response(JSON.stringify({ error: 'Ungültiger Stornierungslink' }), {
        status: 403, headers: { 'Content-Type': 'application/json' },
      });
    }

    if (type === 'workshop') {
      const bookings = await getWorkshopBookings();
      const index = bookings.findIndex(b => b.id === id);
      if (index === -1) {
        return new Response(JSON.stringify({ error: 'Buchung nicht gefunden' }), {
          status: 404, headers: { 'Content-Type': 'application/json' },
        });
      }
      if (bookings[index].status === 'cancelled') {
        return new Response(JSON.stringify({ error: 'Buchung wurde bereits storniert' }), {
          status: 400, headers: { 'Content-Type': 'application/json' },
        });
      }
      bookings[index].status = 'cancelled';
      await saveWorkshopBookings(bookings);
    } else {
      const bookings = await getBookings();
      const booking = bookings.find(b => b.id === id);
      if (!booking) {
        return new Response(JSON.stringify({ error: 'Buchung nicht gefunden' }), {
          status: 404, headers: { 'Content-Type': 'application/json' },
        });
      }
      if (booking.status === 'cancelled') {
        return new Response(JSON.stringify({ error: 'Buchung wurde bereits storniert' }), {
          status: 400, headers: { 'Content-Type': 'application/json' },
        });
      }
      await cancelBooking(id);
    }

    return new Response(JSON.stringify({ success: true, message: 'Buchung erfolgreich storniert' }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Fehler bei Stornierung:', error);
    return new Response(JSON.stringify({ error: 'Interner Fehler' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
};

