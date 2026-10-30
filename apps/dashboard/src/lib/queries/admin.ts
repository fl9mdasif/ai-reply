import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export interface AdminSeller {
  sellerId: string;
  businessName: string;
  email: string;
  plan: string;
  status: 'active' | 'suspended';
  role: string;
  ordersCount?: number;
  createdAt: string;
  facebook?: { pageId: string; pageName: string };
  sheets?: { spreadsheetId: string };
}

export interface AdminStats {
  totalSellers: number;
  activeSellers: number;
  newThisWeek: number;
  totalOrders: number;
  pendingOrders: number;
  avgRiskScore?: number;
}

export interface InviteCode {
  code: string;
  maxUses: number;
  usedCount: number;
  createdAt: string;
  expiresAt?: string;
}

export interface AdminOrder {
  orderId: string;
  sellerBusinessName: string;
  customerName: string;
  productName: string;
  quantity: number;
  status: string;
  riskScore: number | null;
  createdAt: string;
}

export function useAdminStats() {
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => api.get<AdminStats>('/admin/stats'),
  });
}

export function useAdminSellers(limit = 50) {
  return useQuery({
    queryKey: ['admin', 'sellers', limit],
    queryFn: () => api.get<{ sellers: AdminSeller[] }>(`/admin/sellers?limit=${limit}`),
  });
}

export function useAdminSeller(id: string | null) {
  return useQuery({
    queryKey: ['admin', 'sellers', id],
    queryFn: () => api.get<AdminSeller>(`/admin/sellers/${id}`),
    enabled: !!id,
  });
}

export function useAdminOrders(limit = 50) {
  return useQuery({
    queryKey: ['admin', 'orders', limit],
    queryFn: () => api.get<{ orders: AdminOrder[] }>(`/admin/orders?limit=${limit}`),
  });
}

export function useInviteCodes() {
  return useQuery({
    queryKey: ['admin', 'invite-codes'],
    queryFn: () => api.get<{ codes: InviteCode[] }>('/admin/invite-codes'),
  });
}

export function useUpdateSellerStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sellerId, status }: { sellerId: string; status: 'active' | 'suspended' }) =>
      api.patch(`/admin/sellers/${sellerId}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'sellers'] });
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
  });
}

export function useUpdateSellerPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sellerId, plan }: { sellerId: string; plan: string }) =>
      api.patch(`/admin/sellers/${sellerId}/plan`, { plan }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'sellers'] }),
  });
}

export function useCreateInviteCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { code: string; maxUses: number; expiresAt?: string }) =>
      api.post('/admin/invite-codes', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'invite-codes'] }),
  });
}
