import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export interface ConversationMessage {
  role: 'user' | 'assistant';
  text: string;
  timestamp?: string;
}

export interface Conversation {
  conversationId: string;
  customerPsid: string;
  state: 'idle' | 'collecting' | 'awaiting_confirmation' | 'confirmed' | 'cancelled';
  lastMessage?: string;
  lastActivityAt: string;
  messages: ConversationMessage[];
}

interface ConversationsResponse {
  conversations: Conversation[];
  nextCursor?: string;
}

export function useConversations(limit = 50) {
  return useQuery({
    queryKey: ['conversations', limit],
    queryFn: () => api.get<ConversationsResponse>(`/conversations?limit=${limit}`),
  });
}

export function useConversation(id: string | null) {
  return useQuery({
    queryKey: ['conversations', id],
    queryFn: () => api.get<Conversation>(`/conversations/${id}`),
    enabled: !!id,
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { businessName?: string; fallbackMessage?: string }) =>
      api.patch('/seller/me', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['seller', 'me'] }),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      api.post('/auth/change-password', data),
  });
}
