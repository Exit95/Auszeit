/**
 * DB-Storage-Modul für Auszeit.
 *
 * Bietet dieselben Funktionen wie storage.ts / voucher-storage.ts,
 * aber liest/schreibt in MariaDB statt JSON.
 *
 * Wird nur aktiv wenn DB_ENABLED=true in .env gesetzt ist.
 * Bei DUAL_WRITE=true wird zusätzlich in JSON geschrieben.
 * Bei JSON_FALLBACK=true wird bei DB-Fehler aus JSON gelesen.
 */

import { query, execute, withTransaction, isDbEnabled } from './database.js';
import type { RowDataPacket } from 'mysql2/promise';
import type { TimeSlot, Booking, Workshop, GalleryCategory, ImageMetadata, Inquiry } from './storage.js';
import type { Voucher, VoucherStatus } from './voucher-storage.js';

// ─── Helper: ISO → MariaDB DATETIME ─────────────────────────────────────────

export function toDbDatetime(iso: string | undefined | null): string | null {
  if (!iso) return null;
  // "2025-03-16T21:51:00.000Z" → "2025-03-16 21:51:00"
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

// ─── TimeSlots ───────────────────────────────────────────────────────────────

export async function dbGetTimeSlots(): Promise<TimeSlot[]> {
  const rows = await query<RowDataPacket[]>(
    'SELECT * FROM time_slots WHERE deleted_at IS NULL ORDER BY slot_date, start_time'
  );
  return rows.map(rowToTimeSlot);
}

export async function dbSaveTimeSlot(slot: TimeSlot): Promise<void> {
  await execute(
    `INSERT INTO time_slots (legacy_id, slot_date, start_time, end_time, max_capacity, available, event_type, event_duration, raw_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       slot_date = VALUES(slot_date), start_time = VALUES(start_time), end_time = VALUES(end_time),
       max_capacity = VALUES(max_capacity), available = VALUES(available),
       event_type = VALUES(event_type), event_duration = VALUES(event_duration),
       updated_at = NOW()`,
    [slot.id, slot.date, slot.time, slot.endTime || null, slot.maxCapacity, slot.available,
     slot.eventType || 'normal', slot.eventDuration || null, JSON.stringify(slot), toDbDatetime(slot.createdAt) || new Date().toISOString().slice(0, 19).replace('T', ' ')]
  );
}

export async function dbDeleteTimeSlot(legacyId: string): Promise<boolean> {
  const result = await execute(
    'UPDATE time_slots SET deleted_at = NOW() WHERE legacy_id = ? AND deleted_at IS NULL',
    [legacyId]
  );
  return result.affectedRows > 0;
}

export async function dbUpdateTimeSlot(legacyId: string, updates: Partial<TimeSlot>): Promise<void> {
  const sets: string[] = [];
  const params: any[] = [];

  if (updates.date !== undefined) { sets.push('slot_date = ?'); params.push(updates.date); }
  if (updates.time !== undefined) { sets.push('start_time = ?'); params.push(updates.time); }
  if (updates.endTime !== undefined) { sets.push('end_time = ?'); params.push(updates.endTime); }
  if (updates.maxCapacity !== undefined) { sets.push('max_capacity = ?'); params.push(updates.maxCapacity); }
  if (updates.available !== undefined) { sets.push('available = ?'); params.push(updates.available); }
  if (updates.eventType !== undefined) { sets.push('event_type = ?'); params.push(updates.eventType); }

  if (sets.length === 0) return;
  sets.push('updated_at = NOW()');
  params.push(legacyId);

  await execute(`UPDATE time_slots SET ${sets.join(', ')} WHERE legacy_id = ?`, params);
}

// ─── Bookings ────────────────────────────────────────────────────────────────

export async function dbGetBookings(): Promise<Booking[]> {
  const rows = await query<RowDataPacket[]>(
    'SELECT * FROM bookings WHERE deleted_at IS NULL ORDER BY created_at DESC'
  );
  return rows.map(rowToBooking);
}

export async function dbSaveBooking(booking: Booking): Promise<void> {
  await execute(
    `INSERT INTO bookings (legacy_id, slot_legacy_id, customer_name, email, phone, participants, participant_names, notes, booking_status, raw_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       customer_name = VALUES(customer_name), email = VALUES(email), phone = VALUES(phone),
       participants = VALUES(participants), participant_names = VALUES(participant_names), notes = VALUES(notes),
       booking_status = VALUES(booking_status), updated_at = NOW()`,
    [booking.id, booking.slotId, booking.name, booking.email, booking.phone || null,
     booking.participants, booking.participantNames ? JSON.stringify(booking.participantNames) : null,
     booking.notes || null, booking.status, JSON.stringify(booking), toDbDatetime(booking.createdAt) || new Date().toISOString().slice(0, 19).replace('T', ' ')]
  );
}

export async function dbUpdateBookingStatus(legacyId: string, status: string): Promise<void> {
  await execute(
    'UPDATE bookings SET booking_status = ?, updated_at = NOW() WHERE legacy_id = ?',
    [status, legacyId]
  );
}

// ─── Workshops ───────────────────────────────────────────────────────────────

export async function dbGetWorkshops(): Promise<Workshop[]> {
  const rows = await query<RowDataPacket[]>(
    'SELECT * FROM workshops WHERE deleted_at IS NULL ORDER BY workshop_date, start_time'
  );
  return rows.map(rowToWorkshop);
}

export async function dbSaveWorkshop(ws: Workshop): Promise<void> {
  await execute(
    `INSERT INTO workshops (legacy_id, title, description, detailed_description, workshop_date, start_time, price, max_participants, current_participants, is_active, image_filename, raw_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       title = VALUES(title), description = VALUES(description),
       detailed_description = VALUES(detailed_description),
       workshop_date = VALUES(workshop_date), start_time = VALUES(start_time),
       price = VALUES(price), max_participants = VALUES(max_participants),
       current_participants = VALUES(current_participants),
       is_active = VALUES(is_active), image_filename = VALUES(image_filename),
       updated_at = NOW()`,
    [ws.id, ws.title, ws.description, ws.detailedDescription || null, ws.date, ws.time,
     ws.price, ws.maxParticipants, ws.currentParticipants || 0, ws.active ? 1 : 0,
     ws.imageFilename || null, JSON.stringify(ws), toDbDatetime(ws.createdAt) || new Date().toISOString().slice(0, 19).replace('T', ' ')]
  );
}

// ─── Reviews ─────────────────────────────────────────────────────────────────

interface Review {
  id: string;
  name: string;
  rating: number;
  comment: string;
  date: string;
  approved: boolean;
}

export async function dbGetReviews(): Promise<Review[]> {
  const rows = await query<RowDataPacket[]>(
    'SELECT * FROM reviews WHERE deleted_at IS NULL ORDER BY review_date DESC'
  );
  return rows.map(r => ({
    id: r.legacy_id,
    name: r.reviewer_name,
    rating: r.rating,
    comment: r.comment || '',
    date: r.review_date ? new Date(r.review_date).toISOString() : r.created_at,
    approved: !!r.is_approved,
  }));
}

export async function dbSaveReview(review: Review): Promise<void> {
  await execute(
    `INSERT INTO reviews (legacy_id, reviewer_name, rating, comment, is_approved, review_date, raw_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       reviewer_name = VALUES(reviewer_name), rating = VALUES(rating),
       comment = VALUES(comment), is_approved = VALUES(is_approved),
       updated_at = NOW()`,
    [review.id, review.name, review.rating, review.comment, review.approved ? 1 : 0,
     toDbDatetime(review.date), JSON.stringify(review), toDbDatetime(review.date) || new Date().toISOString().slice(0, 19).replace('T', ' ')]
  );
}

// ─── Vouchers ────────────────────────────────────────────────────────────────

export async function dbGetVouchers(): Promise<Voucher[]> {
  const rows = await query<RowDataPacket[]>(
    'SELECT * FROM vouchers WHERE deleted_at IS NULL ORDER BY created_at DESC'
  );
  return rows.map(r => ({
    id: r.legacy_id,
    code: r.voucher_code,
    amount: r.amount,
    status: r.voucher_status as VoucherStatus,
    customerEmail: r.customer_email,
    customerName: r.customer_name || undefined,
    stripeSessionId: r.stripe_session_id,
    stripePaymentIntentId: r.stripe_payment_intent_id || undefined,
    createdAt: new Date(r.created_at).toISOString(),
    redeemedAt: r.redeemed_at ? new Date(r.redeemed_at).toISOString() : undefined,
    redeemedBy: r.redeemed_by || undefined,
    note: r.note || undefined,
  }));
}

export async function dbSaveVoucher(v: Voucher): Promise<void> {
  await execute(
    `INSERT INTO vouchers (legacy_id, voucher_code, amount, voucher_status, customer_email, customer_name, stripe_session_id, stripe_payment_intent_id, redeemed_at, redeemed_by, note, raw_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       voucher_status = VALUES(voucher_status), redeemed_at = VALUES(redeemed_at),
       redeemed_by = VALUES(redeemed_by), note = VALUES(note), updated_at = NOW()`,
    [v.id, v.code, v.amount, v.status, v.customerEmail, v.customerName || null,
     v.stripeSessionId, v.stripePaymentIntentId || null,
     toDbDatetime(v.redeemedAt) || null, v.redeemedBy || null, v.note || null,
     JSON.stringify(v), toDbDatetime(v.createdAt) || new Date().toISOString().slice(0, 19).replace('T', ' ')]
  );
}

// ─── Gallery Categories ──────────────────────────────────────────────────────

export async function dbGetCategories(): Promise<GalleryCategory[]> {
  const rows = await query<RowDataPacket[]>(
    'SELECT * FROM gallery_categories ORDER BY category_name'
  );
  return rows.map(r => ({
    id: r.legacy_id,
    name: r.category_name,
    createdAt: new Date(r.created_at).toISOString(),
  }));
}

export async function dbSaveCategory(cat: GalleryCategory): Promise<void> {
  await execute(
    `INSERT INTO gallery_categories (legacy_id, category_name, raw_json, created_at)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE category_name = VALUES(category_name), updated_at = NOW()`,
    [cat.id, cat.name, JSON.stringify(cat), toDbDatetime(cat.createdAt) || new Date().toISOString().slice(0, 19).replace('T', ' ')]
  );
}

// ─── Image Metadata ──────────────────────────────────────────────────────────

export async function dbGetImageMetadata(): Promise<ImageMetadata[]> {
  const rows = await query<RowDataPacket[]>(
    'SELECT * FROM image_metadata ORDER BY uploaded_at DESC'
  );
  return rows.map(r => ({
    filename: r.filename,
    categories: r.categories_json || [],
    uploadedAt: r.uploaded_at ? new Date(r.uploaded_at).toISOString() : new Date(r.created_at).toISOString(),
  }));
}

export async function dbSaveImageMetadata(meta: ImageMetadata): Promise<void> {
  await execute(
    `INSERT INTO image_metadata (legacy_id, filename, categories_json, uploaded_at, raw_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE categories_json = VALUES(categories_json), updated_at = NOW()`,
    [meta.filename, meta.filename, JSON.stringify(meta.categories),
     toDbDatetime(meta.uploadedAt), JSON.stringify(meta), toDbDatetime(meta.uploadedAt) || new Date().toISOString().slice(0, 19).replace('T', ' ')]
  );
}

// ─── Row → Object Mapping ────────────────────────────────────────────────────

function rowToTimeSlot(r: RowDataPacket): TimeSlot {
  return {
    id: r.legacy_id,
    date: formatDate(r.slot_date),
    time: formatTime(r.start_time),
    endTime: r.end_time ? formatTime(r.end_time) : undefined,
    maxCapacity: r.max_capacity,
    available: r.available,
    createdAt: new Date(r.created_at).toISOString(),
    eventType: r.event_type !== 'normal' ? r.event_type : undefined,
    eventDuration: r.event_duration || undefined,
  };
}

function rowToBooking(r: RowDataPacket): Booking {
  let participantNames: string[] | undefined;
  if (r.participant_names) {
    try {
      participantNames = typeof r.participant_names === 'string'
        ? JSON.parse(r.participant_names)
        : r.participant_names;
    } catch { participantNames = undefined; }
  }
  return {
    id: r.legacy_id,
    slotId: r.slot_legacy_id,
    name: r.customer_name,
    email: r.email || '',
    phone: r.phone || undefined,
    participants: r.participants,
    participantNames,
    notes: r.notes || undefined,
    createdAt: new Date(r.created_at).toISOString(),
    status: r.booking_status as Booking['status'],
  };
}

function rowToWorkshop(r: RowDataPacket): Workshop {
  return {
    id: r.legacy_id,
    title: r.title,
    description: r.description || '',
    detailedDescription: r.detailed_description || undefined,
    date: formatDate(r.workshop_date),
    time: formatTime(r.start_time),
    price: r.price || '',
    maxParticipants: r.max_participants,
    currentParticipants: r.current_participants || undefined,
    active: !!r.is_active,
    imageFilename: r.image_filename || undefined,
    createdAt: new Date(r.created_at).toISOString(),
  };
}

function formatDate(d: any): string {
  if (!d) return '';
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return String(d).slice(0, 10);
}

function formatTime(t: any): string {
  if (!t) return '';
  const s = String(t);
  // MySQL TIME can be "HH:MM:SS" → take "HH:MM"
  return s.length >= 5 ? s.slice(0, 5) : s;
}



// ─── Inquiries (Anfragen für besondere Anlässe) ─────────────────────────────

export async function dbGetInquiries(): Promise<Inquiry[]> {
  const rows = await query('SELECT * FROM inquiries ORDER BY created_at DESC') as RowDataPacket[];
  return rows.map(rowToInquiry);
}

export async function dbSaveInquiry(inq: Omit<Inquiry, 'id' | 'createdAt' | 'status'>): Promise<Inquiry> {
  const result = await execute(
    `INSERT INTO inquiries (event_type, customer_name, email, phone, preferred_date, participants, message, inquiry_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'new')`,
    [inq.eventType, inq.name, inq.email, inq.phone || null,
     inq.preferredDate || null, inq.participants, inq.message || null]
  );
  const insertId = (result as any).insertId;
  return {
    id: String(insertId),
    eventType: inq.eventType,
    name: inq.name,
    email: inq.email,
    phone: inq.phone,
    preferredDate: inq.preferredDate,
    participants: inq.participants,
    message: inq.message,
    status: 'new',
    createdAt: new Date().toISOString(),
  };
}

export async function dbUpdateInquiry(id: string, updates: { status?: string; adminNotes?: string }): Promise<void> {
  const fields: string[] = [];
  const values: any[] = [];
  if (updates.status !== undefined) { fields.push('inquiry_status = ?'); values.push(updates.status); }
  if (updates.adminNotes !== undefined) { fields.push('admin_notes = ?'); values.push(updates.adminNotes); }
  if (fields.length === 0) return;
  values.push(id);
  await execute(`UPDATE inquiries SET ${fields.join(', ')} WHERE id = ?`, values);
}

function rowToInquiry(r: RowDataPacket): Inquiry {
  return {
    id: String(r.id),
    eventType: r.event_type,
    name: r.customer_name,
    email: r.email,
    phone: r.phone || undefined,
    preferredDate: r.preferred_date ? formatDate(r.preferred_date) : undefined,
    participants: r.participants,
    message: r.message || undefined,
    status: r.inquiry_status,
    adminNotes: r.admin_notes || undefined,
    createdAt: new Date(r.created_at).toISOString(),
  };
}