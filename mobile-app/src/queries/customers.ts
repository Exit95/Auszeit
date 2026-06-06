import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { queryKeys } from './keys';
import type { Customer } from '../types';

interface CustomersListResult {
  data?: { customers?: Customer[] } | Customer[];
}

export function useCustomers() {
  return useQuery({
    queryKey: queryKeys.customers.all,
    queryFn: async () => {
      const result = await api.get<CustomersListResult | Customer[]>('/customers?limit=500');
      const list =
        (result as CustomersListResult)?.data && 'customers' in ((result as CustomersListResult).data as object)
          ? ((result as CustomersListResult).data as { customers: Customer[] }).customers
          : (result as CustomersListResult)?.data ?? result;
      return Array.isArray(list) ? (list as Customer[]) : [];
    },
    refetchInterval: 60 * 1000,
    refetchIntervalInBackground: false,
  });
}
