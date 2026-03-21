// ============================================================
// Datenmodell-Typen für die Auszeit Brennsystem App
// ============================================================

export type UserRole = 'admin' | 'mitarbeiter';

export type OrderStatus =
  | 'neu'
  | 'geplant'
  | 'im_ofen'
  | 'gebrannt'
  | 'abholbereit'
  | 'abgeschlossen'
  | 'storniert';

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

export interface Kiln {
  id: number;
  name: string;
  max_temp: number | null;
  description: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface KilnDetail extends Kiln {
  currentLoad: Order[];
  history: Order[];
}

export interface KilnForm {
  name: string;
  max_temp: number | null;
  description: string;
  active: boolean;
}

export interface Order {
  id: number;
  customer_id: number;
  kiln_id: number | null;
  title: string;
  category: string | null;
  quantity: number;
  firing_type: string | null;
  temperature: number | null;
  firing_program: string | null;
  desired_date: string | null;
  status: OrderStatus;
  notes: string | null;
  price: number | null;
  paid: boolean;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  first_name?: string;
  last_name?: string;
  kiln_name?: string | null;
  customer_email?: string;
  customer_phone?: string;
}

export interface OrderDetail extends Order {
  images: OrderImage[];
  history: OrderHistoryEntry[];
}

export interface OrderImage {
  id: number;
  order_id: number;
  file_path: string;
  file_name: string;
  uploaded_at: string;
}

export interface OrderHistoryEntry {
  id: number;
  order_id: number;
  old_status: string | null;
  new_status: string;
  changed_by: number | null;
  changed_by_name: string | null;
  note: string | null;
  changed_at: string;
}

export interface OrderForm {
  customer_id: number;
  kiln_id: number | null;
  title: string;
  category: string;
  quantity: number;
  firing_type: string;
  temperature: number | null;
  firing_program: string;
  desired_date: string;
  status: OrderStatus;
  notes: string;
  price: number | null;
  paid: boolean;
}

export interface DashboardData {
  open: Order[];
  inProgress: Order[];
  dueToday: Order[];
  recentDone: Order[];
  counts: Record<string, number>;
}

export interface OrderFilters {
  status?: OrderStatus;
  kiln_id?: number;
  paid?: boolean;
  customer_id?: number;
  firing_type?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}

// Navigation
export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
  OrderDetail: { id: number };
  OrderForm: { id?: number; customerId?: number };
  CustomerDetail: { id: number };
  CustomerForm: { id?: number };
  KilnDetail: { id: number };
  KilnForm: { id?: number };
};

export type TabParamList = {
  Dashboard: undefined;
  Orders: undefined;
  Customers: undefined;
  Kilns: undefined;
  Search: undefined;
};
