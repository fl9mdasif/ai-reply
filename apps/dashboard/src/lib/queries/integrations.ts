import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

// Matches seller.service.ts toProfile() — flat fields, no nested objects
export interface SellerMe {
  sellerId: string;
  businessName: string;
  email: string;
  role: string;
  plan?: string;
  facebookPageId?: string;
  facebookPageName?: string;
  webhookSubscribed: boolean;
  googleSheetConnected: boolean;
  googleSheetUrl?: string;
  fallbackMessage?: string;
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


export function useConnectFacebookPage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { pageId: string; pageAccessToken: string }) =>
      api.post('/seller/facebook/connect-page', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['seller', 'me'] }),
  });
}

export function useConnectFacebook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { pageId: string; pageAccessToken: string }) =>
      api.post('/seller/connect-facebook', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['seller', 'me'] }),
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
      api.patch('/seller/facebook/webhook', { subscribe }),
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
