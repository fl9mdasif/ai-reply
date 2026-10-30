import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export interface Order {
  orderId: string;
  customerName: string;
  productName: string;
  quantity: number;
  phone: string;
  address: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  riskScore: number | null;
  riskFlags: { code: string; reason: string }[];
  createdAt: string;
}

interface OrdersResponse {
  orders: Order[];
  nextCursor?: string;
}

export function useOrders(limit = 10) {
  return useQuery({
    queryKey: ['orders', limit],
    queryFn: () => api.get<OrdersResponse>(`/orders?limit=${limit}`),
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: string }) =>
      api.patch(`/orders/${orderId}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  });
}

export function useRetrySheets() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => api.post(`/orders/${orderId}/retry-sheet`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  });
}
