import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../api/adminClient';
import { queryKeys } from './keys';
import type { Booking } from '../types';

export function useBookings() {
  return useQuery({
    queryKey: queryKeys.bookings.all,
    queryFn: async () => {
      const all = await adminApi.get<Booking[]>('/api/admin/bookings');
      return Array.isArray(all) ? all : [];
    },
    refetchInterval: 60 * 1000,
    refetchIntervalInBackground: false,
  });
}

// Server-Contract: POST /api/admin/bookings { id, action: 'confirm' | 'cancel' }
type BookingAction = 'confirm' | 'cancel';

function useBookingAction(action: BookingAction) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApi.post<Booking>('/api/admin/bookings', { id, action }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.bookings.all });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}

export function useConfirmBooking() {
  return useBookingAction('confirm');
}

export function useCancelBooking() {
  return useBookingAction('cancel');
}
