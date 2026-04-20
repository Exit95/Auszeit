import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { queryKeys } from './keys';
import type { Order, OrderStatus } from '../types';

interface OrdersListResult {
  data?: { orders?: Order[] } | Order[];
}

export function useOrders(filter: OrderStatus | 'alle') {
  return useQuery({
    queryKey: queryKeys.orders.list({ status: filter }),
    queryFn: async () => {
      const params = filter !== 'alle' ? `?status=${filter}&limit=500` : '?limit=500';
      const result = await api.get<OrdersListResult | Order[]>(`/orders${params}`);
      const list =
        (result as OrdersListResult)?.data && 'orders' in ((result as OrdersListResult).data as object)
          ? ((result as OrdersListResult).data as { orders: Order[] }).orders
          : (result as OrdersListResult)?.data ?? result;
      return Array.isArray(list) ? (list as Order[]) : [];
    },
    refetchInterval: 60 * 1000,
    refetchIntervalInBackground: false,
  });
}
