import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export interface SellerMe {
  sellerId: string;
  businessName: string;
  email: string;
  role: string;
  plan?: string;
  facebook?: {
    pageId: string;
    pageName: string;
    webhookSubscribed: boolean;
  };
  sheets?: {
    spreadsheetId: string;
    spreadsheetUrl: string;
    lastSyncAt?: string;
  };
}

export interface HealthStatus {
  status: string;
  deps?: {
    mongo?: { status: string; latencyMs?: number };
    ragEngine?: { status: string; latencyMs?: number };
  };
}

export function useSellerMe() {
  return useQuery({
    queryKey: ['seller', 'me'],
    queryFn: () => api.get<SellerMe>('/seller/me'),
  });
}

export function useHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: () => api.get<HealthStatus>('/health/deps'),
    refetchInterval: 30_000,
  });
}

export function useDisconnectFacebook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete('/seller/connect-facebook'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['seller', 'me'] }),
  });
}

export function useWebhookToggle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ subscribe }: { subscribe: boolean }) =>
      subscribe
        ? api.post('/seller/facebook/subscribe', {})
        : api.post('/seller/facebook/unsubscribe', {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['seller', 'me'] }),
  });
}

export function useDisconnectSheets() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete('/seller/connect-sheets'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['seller', 'me'] }),
  });
}
