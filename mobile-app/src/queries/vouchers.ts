import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../api/adminClient';
import { queryKeys } from './keys';
import type { Voucher } from '../types';

/**
 * Lädt alle verkauften Gutscheine (Admin, Basic-Auth gegen /api/admin/vouchers).
 * Backend liefert bereits nach createdAt absteigend sortiert.
 */
export function useVouchers() {
  return useQuery({
    queryKey: queryKeys.vouchers.all,
    queryFn: async () => {
      const data = await adminApi.get<Voucher[]>('/api/admin/vouchers');
      return Array.isArray(data) ? data : [];
    },
    refetchInterval: 60 * 1000,
    refetchIntervalInBackground: false,
  });
}
