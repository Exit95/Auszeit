import crypto from 'crypto';
import { isS3Configured, readJsonFromS3, writeJsonToS3 } from './s3-storage';
import { isDbEnabled, isDualWriteEnabled, isJsonFallbackEnabled } from './database';
import { dbGetVouchers, dbSaveVoucher } from './db-storage';

const VOUCHERS_FILENAME = 'vouchers.json';

export type VoucherStatus = 'active' | 'redeemed' | 'expired';

export interface Voucher {
  id: string;
  code: string;               // z.B. AUSZ-7K3D-91LM
  amount: number;              // Betrag in Cent
  status: VoucherStatus;
  customerEmail: string;
  customerName?: string;
  stripeSessionId: string;
  stripePaymentIntentId?: string;
  createdAt: string;
  redeemedAt?: string;
  redeemedBy?: string;         // Admin-Name der eingelöst hat
  note?: string;               // Optionale Notiz bei Einlösung
}

// Generiert einen lesbaren Gutschein-Code: AUSZ-XXXX-XXXX
function generateVoucherCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // keine I,O,0,1 (Verwechslungsgefahr)
  const segment = (len: number) => {
    let result = '';
    const bytes = crypto.randomBytes(len);
    for (let i = 0; i < len; i++) {
      result += chars[bytes[i] % chars.length];
    }
    return result;
  };
  return `AUSZ-${segment(4)}-${segment(4)}`;
}

// Alle Gutscheine laden
export async function getVouchers(): Promise<Voucher[]> {
  if (isDbEnabled() && !isJsonFallbackEnabled()) {
    try { return await dbGetVouchers(); } catch (err) {
      console.error('[VoucherStorage] DB-Lesefehler, Fallback auf JSON:', err);
    }
  }
  if (isS3Configured()) {
    return await readJsonFromS3<Voucher[]>(VOUCHERS_FILENAME, []);
  }
  return [];
}

// Alle Gutscheine speichern
export async function saveVouchers(vouchers: Voucher[]): Promise<void> {
  if (isDbEnabled() && isDualWriteEnabled()) {
    try {
      for (const v of vouchers) { await dbSaveVoucher(v); }
    } catch (err) {
      console.error('[VoucherStorage] DB-Schreibfehler:', err);
    }
  }
  if (isS3Configured()) {
    await writeJsonToS3(VOUCHERS_FILENAME, vouchers);
    return;
  }
}

// Neuen Gutschein erstellen (idempotent: bei gleicher stripeSessionId wird der bestehende zurückgegeben)
export async function createVoucher(data: {
  amount: number;
  customerEmail: string;
  customerName?: string;
  stripeSessionId: string;
  stripePaymentIntentId?: string;
}): Promise<Voucher> {
  // Idempotenz-Check: Gutschein für diese Stripe-Session bereits vorhanden?
  const existing = await getVoucherBySessionId(data.stripeSessionId);
  if (existing) {
    console.log(`[Voucher] Idempotent: Gutschein für Session ${data.stripeSessionId} existiert bereits: ${existing.code}`);
    return existing;
  }

  const vouchers = await getVouchers();

  // Sicherstellen dass der Code einzigartig ist
  let code: string;
  do {
    code = generateVoucherCode();
  } while (vouchers.some(v => v.code === code));

  const voucher: Voucher = {
    id: `voucher_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    code,
    amount: data.amount,
    status: 'active',
    customerEmail: data.customerEmail,
    customerName: data.customerName,
    stripeSessionId: data.stripeSessionId,
    stripePaymentIntentId: data.stripePaymentIntentId,
    createdAt: new Date().toISOString(),
  };

  vouchers.push(voucher);
  await saveVouchers(vouchers);
  console.log(`[Voucher] Created: ${voucher.code} (${(voucher.amount / 100).toFixed(2)}€) for ${voucher.customerEmail}`);
  return voucher;
}

// Gutschein per Code finden
export async function getVoucherByCode(code: string): Promise<Voucher | null> {
  const vouchers = await getVouchers();
  return vouchers.find(v => v.code.toUpperCase() === code.toUpperCase()) || null;
}

// Gutschein per Stripe-Session finden
export async function getVoucherBySessionId(sessionId: string): Promise<Voucher | null> {
  const vouchers = await getVouchers();
  return vouchers.find(v => v.stripeSessionId === sessionId) || null;
}

// Gutschein einlösen
export async function redeemVoucher(code: string, redeemedBy?: string, note?: string): Promise<Voucher | null> {
  const vouchers = await getVouchers();
  const index = vouchers.findIndex(v => v.code.toUpperCase() === code.toUpperCase());
  if (index === -1) return null;

  const voucher = vouchers[index];
  if (voucher.status !== 'active') return null;

  voucher.status = 'redeemed';
  voucher.redeemedAt = new Date().toISOString();
  voucher.redeemedBy = redeemedBy || 'admin';
  voucher.note = note;

  await saveVouchers(vouchers);
  console.log(`[Voucher] Redeemed: ${voucher.code} by ${voucher.redeemedBy}`);
  return voucher;
}

// Gutschein-Status ändern (z.B. zurücksetzen)
export async function updateVoucherStatus(code: string, status: VoucherStatus): Promise<Voucher | null> {
  const vouchers = await getVouchers();
  const index = vouchers.findIndex(v => v.code.toUpperCase() === code.toUpperCase());
  if (index === -1) return null;

  vouchers[index].status = status;
  if (status === 'active') {
    vouchers[index].redeemedAt = undefined;
    vouchers[index].redeemedBy = undefined;
    vouchers[index].note = undefined;
  }

  await saveVouchers(vouchers);
  return vouchers[index];
}

// Formatierung: Betrag in Cent -> Euro-String
export function formatAmount(cents: number): string {
  return `${(cents / 100).toFixed(2).replace('.', ',')} €`;
}

