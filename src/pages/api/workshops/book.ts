import type { APIRoute } from 'astro';
import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const WORKSHOP_BOOKINGS_FILE = path.join(DATA_DIR, 'workshop-bookings.json');

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

// Sicherstellen, dass das Data-Verzeichnis existiert
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

// Sicherstellen, dass die Datei existiert
async function ensureFile(filePath: string, defaultData: any) {
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, JSON.stringify(defaultData, null, 2));
  }
}

async function getWorkshopBookings(): Promise<WorkshopBooking[]> {
  await ensureDataDir();
  await ensureFile(WORKSHOP_BOOKINGS_FILE, []);
  const data = await fs.readFile(WORKSHOP_BOOKINGS_FILE, 'utf-8');
  return JSON.parse(data);
}

async function saveWorkshopBookings(bookings: WorkshopBooking[]): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(WORKSHOP_BOOKINGS_FILE, JSON.stringify(bookings, null, 2));
}

// POST - Workshop buchen
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { workshopId, name, email, phone, participants, notes } = body;

    // Validierung
    if (!workshopId || !name || !email || !participants) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (participants < 1) {
      return new Response(JSON.stringify({ error: 'Invalid number of participants' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // E-Mail-Validierung
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ error: 'Invalid email address' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Workshop laden
    const workshopsFile = path.join(DATA_DIR, 'workshops.json');
    await ensureFile(workshopsFile, []);
    const workshopsData = await fs.readFile(workshopsFile, 'utf-8');
    const workshops = JSON.parse(workshopsData);
    
    const workshop = workshops.find((w: any) => w.id === workshopId);
    
    if (!workshop) {
      return new Response(JSON.stringify({ error: 'Workshop not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!workshop.active) {
      return new Response(JSON.stringify({ error: 'Workshop is not active' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Prüfe verfügbare Plätze
    const bookings = await getWorkshopBookings();
    const workshopBookings = bookings.filter(
      b => b.workshopId === workshopId && b.status !== 'cancelled'
    );
    
    const currentParticipants = workshopBookings.reduce(
      (sum, b) => sum + b.participants, 
      0
    );
    
    const availableSpots = workshop.maxParticipants - currentParticipants;
    
    if (participants > availableSpots) {
      return new Response(JSON.stringify({ 
        error: 'Not enough spots available',
        availableSpots 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Erstelle Buchung
    const newBooking: WorkshopBooking = {
      id: `wb_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      workshopId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim(),
      participants,
      notes: notes?.trim(),
      createdAt: new Date().toISOString(),
      status: 'pending',
    };

    bookings.push(newBooking);
    await saveWorkshopBookings(bookings);

    return new Response(JSON.stringify({ 
      success: true, 
      booking: newBooking 
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error creating workshop booking:', error);
    return new Response(JSON.stringify({ error: 'Failed to create booking' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

