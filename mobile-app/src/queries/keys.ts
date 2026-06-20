// Zentrale QueryKey-Factory — Quelle der Wahrheit für invalidations.
// Konvention: queryKeys.feature.subkey(args)

export const queryKeys = {
  dashboard: {
    all: ['dashboard'] as const,
  },
  bookings: {
    all: ['bookings'] as const,
    detail: (id: string) => ['bookings', id] as const,
  },
  orders: {
    all: ['orders'] as const,
    list: (filters?: Record<string, unknown>) =>
      filters ? (['orders', 'list', filters] as const) : (['orders', 'list'] as const),
    detail: (id: number) => ['orders', id] as const,
  },
  customers: {
    all: ['customers'] as const,
    detail: (id: number) => ['customers', id] as const,
  },
  inquiries: {
    all: ['inquiries'] as const,
    detail: (id: string) => ['inquiries', id] as const,
  },
  reviews: {
    all: ['reviews'] as const,
  },
  vouchers: {
    all: ['vouchers'] as const,
  },
  blockedDates: {
    all: ['blockedDates'] as const,
  },
  stats: {
    all: ['stats'] as const,
  },
} as const;
