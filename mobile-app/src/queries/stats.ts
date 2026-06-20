import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../api/adminClient';
import { api } from '../api/client';
import { queryKeys } from './keys';
import type { Booking, Inquiry, Review, Voucher } from '../types';

export interface StatsData {
  bookingsThisWeek: number;
  bookingsThisMonth: number;
  participantsThisMonth: number;
  openInquiries: number;
  voucherCount: number;
  voucherRevenueEur: number;
  voucherActiveEur: number;
  reviewAvg: number | null;
  reviewCount: number;
  ordersReady: number;
  ordersInProgress: number;
  ordersTotal: number;
}

function startOfWeekISO(): string {
  const d = new Date();
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function startOfMonthISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

export function useStats() {
  return useQuery<StatsData>({
    queryKey: queryKeys.stats.all,
    queryFn: async () => {
      const weekStart = startOfWeekISO();
      const monthStart = startOfMonthISO();

      const [bookingsRes, inquiriesRes, vouchersRes, reviewsRes, brennStatsRes] =
        await Promise.allSettled([
          adminApi.get<Booking[]>('/api/admin/bookings'),
          adminApi.get<Inquiry[]>('/api/inquiries'),
          adminApi.get<Voucher[]>('/api/admin/vouchers'),
          adminApi.get<Review[]>('/api/reviews', { all: 'true' }),
          api.get<any>('/stats'),
        ]);

      let bookingsThisWeek = 0, bookingsThisMonth = 0, participantsThisMonth = 0;
      if (bookingsRes.status === 'fulfilled') {
        const confirmed = bookingsRes.value.filter(b => b.status === 'confirmed' && b.slotDate);
        bookingsThisWeek = confirmed.filter(b => (b.slotDate as string) >= weekStart).length;
        const monthly = confirmed.filter(b => (b.slotDate as string) >= monthStart);
        bookingsThisMonth = monthly.length;
        participantsThisMonth = monthly.reduce((sum, b) => sum + (b.participants || 0), 0);
      }

      let openInquiries = 0;
      if (inquiriesRes.status === 'fulfilled') {
        openInquiries = inquiriesRes.value.filter(i => i.status === 'new').length;
      }

      let voucherCount = 0, voucherRevenueEur = 0, voucherActiveEur = 0;
      if (vouchersRes.status === 'fulfilled') {
        const vouchers = vouchersRes.value;
        voucherCount = vouchers.length;
        voucherRevenueEur = vouchers.filter(v => v.status === 'redeemed')
          .reduce((sum, v) => sum + (v.amount || 0), 0) / 100;
        voucherActiveEur = vouchers.filter(v => v.status === 'active')
          .reduce((sum, v) => sum + (v.amount || 0), 0) / 100;
      }

      let reviewAvg: number | null = null, reviewCount = 0;
      if (reviewsRes.status === 'fulfilled') {
        const approved = reviewsRes.value.filter(r => r.approved);
        reviewCount = approved.length;
        if (approved.length > 0) {
          reviewAvg = approved.reduce((sum, r) => sum + (r.rating || 0), 0) / approved.length;
        }
      }

      let ordersReady = 0, ordersInProgress = 0, ordersTotal = 0;
      if (brennStatsRes.status === 'fulfilled') {
        const data = brennStatsRes.value?.data || brennStatsRes.value;
        ordersTotal = Number(data?.gesamt?.auftraege ?? 0);
        ordersReady = Number(data?.abholquote?.wartet_auf_abholung ?? 0);
        const bearbeitet = Number(data?.abholquote?.gesamt_bearbeitet ?? 0);
        const abgeholt = Number(data?.abholquote?.abgeholt ?? 0);
        ordersInProgress = Math.max(0, bearbeitet - abgeholt - ordersReady);
      }

      return {
        bookingsThisWeek, bookingsThisMonth, participantsThisMonth,
        openInquiries, voucherCount, voucherRevenueEur, voucherActiveEur,
        reviewAvg, reviewCount, ordersReady, ordersInProgress, ordersTotal,
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}
