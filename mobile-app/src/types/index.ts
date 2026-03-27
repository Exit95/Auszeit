// ============================================================
// Datenmodell-Typen für die Malatelier Auszeit Brennverwaltung
// Abgestimmt auf die bestehenden Brenn-API-Endpunkte
// ============================================================

export type UserRole = 'admin' | 'mitarbeiter';

export type OrderStatus =
  | 'ERFASST'
  | 'WARTET_AUF_BRENNEN'
  | 'IM_BRENNOFEN'
  | 'GEBRANNT'
  | 'ABHOLBEREIT'
  | 'ABGEHOLT'
  | 'STORNIERT';

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Customer {
  id: number;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerForm {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  notes: string;
}

export interface Order {
  id: number;
  reference_code: string;
  customer_id: number;
  overall_status: OrderStatus;
  visit_date: string;
  storage_code: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  first_name?: string;
  last_name?: string;
  items_summary?: string;
}

export interface OrderItem {
  id: number;
  order_id: number;
  item_type_id: number;
  quantity: number;
  status: OrderStatus;
  storage_location_id: number | null;
  notes: string | null;
  item_type_name?: string;
  storage_code?: string;
}

export interface OrderDetail extends Order {
  items: OrderItem[];
  status_log: StatusLogEntry[];
}

export interface StatusLogEntry {
  id: number;
  order_id: number;
  old_status: string | null;
  new_status: string;
  changed_by: string | null;
  note: string | null;
  changed_at: string;
}

export interface ItemType {
  id: number;
  name: string;
  category: string | null;
  default_price: number | null;
}

export interface StorageLocation {
  id: number;
  code: string;
  description: string | null;
  capacity: number | null;
  current_count: number;
}

// Dashboard-Daten (von /api/admin/brenn/dashboard)
export interface DashboardData {
  counters: {
    wartet_auf_brennen: number;
    im_brennofen: number;
    abholbereit: number;
    ueberfaellig: number;
    heute_abgeholt: number;
    erfasst_ohne_lagerort: number;
    probleme: number;
  };
  next_steps: Order[];
  abholbereit_list: Order[];
}

export interface DashboardResponse {
  success: boolean;
  data: DashboardData;
}

export interface OrderFilters {
  status?: OrderStatus;
  customer_id?: number;
  date_from?: string;
  date_to?: string;
  search?: string;
}

// ============================================================
// Atelier Admin Typen (Buchungen, Anfragen, Bewertungen)
// ============================================================

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled';

export interface Booking {
  id: string;
  slotId: string;
  name: string;
  email: string;
  phone?: string;
  participants: number;
  participantNames?: string[];
  notes?: string;
  createdAt: string;
  status: BookingStatus;
  // Joined from slot
  slotDate?: string | null;
  slotTime?: string | null;
  slotEndTime?: string | null;
  slotMaxCapacity?: number | null;
  slotAvailable?: number | null;
}

export type InquiryEventType =
  | 'kindergeburtstag'
  | 'jga'
  | 'stammtisch'
  | 'firmen_event'
  | 'privater_anlass'
  | 'sonstiges';

export type InquiryStatus = 'new' | 'contacted' | 'confirmed' | 'cancelled';

export interface Inquiry {
  id: string;
  eventType: InquiryEventType;
  name: string;
  email: string;
  phone?: string;
  preferredDate?: string;
  participants: number;
  message?: string;
  status: InquiryStatus;
  adminNotes?: string;
  createdAt: string;
}

export interface Review {
  id: string;
  name: string;
  rating: number;
  comment: string;
  date: string;
  approved: boolean;
}

// Navigation
export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
  OrderDetail: { id: number };
  OrderForm: { id?: number; customerId?: number };
  CustomerDetail: { id: number };
  CustomerForm: { id?: number };
  AtelierToday: undefined;
  AtelierBookings: undefined;
  AtelierInquiries: undefined;
  AdminReviews: undefined;
};

export type TabParamList = {
  Dashboard: undefined;
  Orders: undefined;
  Customers: undefined;
  Search: undefined;
  Atelier: undefined;
};
