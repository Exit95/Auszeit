/**
 * Input-Validierung für Brenn- und Abholverwaltung
 * Alle Fehlermeldungen auf Deutsch.
 */

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

function result(errors: ValidationError[]): ValidationResult {
  return { valid: errors.length === 0, errors };
}

// ─── Kunden ─────────────────────────────────────────────────────────────────

export function validateCustomer(data: any): ValidationResult {
  const errors: ValidationError[] = [];

  if (!data.first_name || typeof data.first_name !== 'string' || data.first_name.trim().length === 0) {
    errors.push({ field: 'first_name', message: 'Vorname ist erforderlich.' });
  } else if (data.first_name.trim().length > 100) {
    errors.push({ field: 'first_name', message: 'Vorname darf maximal 100 Zeichen lang sein.' });
  }

  if (!data.last_name || typeof data.last_name !== 'string' || data.last_name.trim().length === 0) {
    errors.push({ field: 'last_name', message: 'Nachname ist erforderlich.' });
  } else if (data.last_name.trim().length > 100) {
    errors.push({ field: 'last_name', message: 'Nachname darf maximal 100 Zeichen lang sein.' });
  }

  if (data.email !== undefined && data.email !== null && data.email !== '') {
    if (typeof data.email !== 'string' || !isValidEmail(data.email)) {
      errors.push({ field: 'email', message: 'Ungültige E-Mail-Adresse.' });
    } else if (data.email.length > 255) {
      errors.push({ field: 'email', message: 'E-Mail darf maximal 255 Zeichen lang sein.' });
    }
  }

  if (data.phone !== undefined && data.phone !== null && data.phone !== '') {
    if (typeof data.phone !== 'string' || data.phone.trim().length > 50) {
      errors.push({ field: 'phone', message: 'Telefonnummer darf maximal 50 Zeichen lang sein.' });
    }
  }

  return result(errors);
}

// ─── Aufträge ───────────────────────────────────────────────────────────────

export function validateOrder(data: any): ValidationResult {
  const errors: ValidationError[] = [];

  if (!data.customer_id || typeof data.customer_id !== 'number' || data.customer_id < 1) {
    errors.push({ field: 'customer_id', message: 'Kunde ist erforderlich.' });
  }

  if (!data.visit_date || typeof data.visit_date !== 'string') {
    errors.push({ field: 'visit_date', message: 'Besuchsdatum ist erforderlich.' });
  } else if (!isValidDate(data.visit_date)) {
    errors.push({ field: 'visit_date', message: 'Ungültiges Datumsformat (YYYY-MM-DD erwartet).' });
  }

  if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
    errors.push({ field: 'items', message: 'Mindestens ein Werkstück ist erforderlich.' });
  } else {
    for (let i = 0; i < data.items.length; i++) {
      const itemErrors = validateOrderItem(data.items[i]);
      for (const err of itemErrors.errors) {
        errors.push({ field: `items[${i}].${err.field}`, message: err.message });
      }
    }
  }

  return result(errors);
}

// ─── Werkstücke ─────────────────────────────────────────────────────────────

export function validateOrderItem(data: any): ValidationResult {
  const errors: ValidationError[] = [];

  if (!data.item_type || typeof data.item_type !== 'string' || data.item_type.trim().length === 0) {
    errors.push({ field: 'item_type', message: 'Werkstücktyp ist erforderlich.' });
  } else if (data.item_type.trim().length > 80) {
    errors.push({ field: 'item_type', message: 'Werkstücktyp darf maximal 80 Zeichen lang sein.' });
  }

  if (data.quantity !== undefined) {
    const qty = Number(data.quantity);
    if (!Number.isInteger(qty) || qty < 1 || qty > 100) {
      errors.push({ field: 'quantity', message: 'Anzahl muss zwischen 1 und 100 liegen.' });
    }
  }

  if (data.description !== undefined && data.description !== null && data.description !== '') {
    if (typeof data.description !== 'string' || data.description.trim().length > 255) {
      errors.push({ field: 'description', message: 'Beschreibung darf maximal 255 Zeichen lang sein.' });
    }
  }

  return result(errors);
}

// ─── Lagerorte ──────────────────────────────────────────────────────────────

export function validateStorageLocation(data: any): ValidationResult {
  const errors: ValidationError[] = [];

  if (!data.code || typeof data.code !== 'string' || data.code.trim().length === 0) {
    errors.push({ field: 'code', message: 'Code ist erforderlich.' });
  } else if (data.code.trim().length > 20) {
    errors.push({ field: 'code', message: 'Code darf maximal 20 Zeichen lang sein.' });
  }

  if (!data.label || typeof data.label !== 'string' || data.label.trim().length === 0) {
    errors.push({ field: 'label', message: 'Bezeichnung ist erforderlich.' });
  } else if (data.label.trim().length > 100) {
    errors.push({ field: 'label', message: 'Bezeichnung darf maximal 100 Zeichen lang sein.' });
  }

  const validAreaTypes = ['Abholen', 'Nicht Abgeholt'];
  if (!data.area_type || !validAreaTypes.includes(data.area_type)) {
    errors.push({ field: 'area_type', message: 'Bereich muss "Abholen" oder "Nicht Abgeholt" sein.' });
  }

  return result(errors);
}

// ─── Werkstücktypen ─────────────────────────────────────────────────────────

export function validateItemType(data: any): ValidationResult {
  const errors: ValidationError[] = [];

  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Name ist erforderlich.' });
  } else if (data.name.trim().length > 80) {
    errors.push({ field: 'name', message: 'Name darf maximal 80 Zeichen lang sein.' });
  }

  return result(errors);
}

// ─── Abholung ───────────────────────────────────────────────────────────────

export function validatePickup(data: any): ValidationResult {
  const errors: ValidationError[] = [];

  if (!data.picked_up_by || typeof data.picked_up_by !== 'string' || data.picked_up_by.trim().length === 0) {
    errors.push({ field: 'picked_up_by', message: 'Name der abholenden Person ist erforderlich.' });
  } else if (data.picked_up_by.trim().length > 200) {
    errors.push({ field: 'picked_up_by', message: 'Name darf maximal 200 Zeichen lang sein.' });
  }

  return result(errors);
}

// ─── Bulk-Status ────────────────────────────────────────────────────────────

export function validateBulkStatus(data: any): ValidationResult {
  const errors: ValidationError[] = [];

  if (!data.item_ids || !Array.isArray(data.item_ids) || data.item_ids.length === 0) {
    errors.push({ field: 'item_ids', message: 'Mindestens ein Werkstück muss ausgewählt sein.' });
  } else {
    for (const id of data.item_ids) {
      if (typeof id !== 'number' || id < 1) {
        errors.push({ field: 'item_ids', message: 'Ungültige Werkstück-ID.' });
        break;
      }
    }
  }

  if (!data.new_status || typeof data.new_status !== 'string') {
    errors.push({ field: 'new_status', message: 'Neuer Status ist erforderlich.' });
  }

  return result(errors);
}

// ─── Hilfsfunktionen ────────────────────────────────────────────────────────

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidDate(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && !isNaN(new Date(date).getTime());
}
