import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export interface Product {
  productId: string;
  name: string;
  price: number;
  stock?: number;
  description?: string;
  embedStatus: 'synced' | 'failed' | 'pending';
  createdAt: string;
}

interface CatalogResponse {
  products: Product[];
  nextCursor?: string;
}

export interface ProductInput {
  name: string;
  price: number;
  stock?: number;
  description?: string;
}

export function useCatalog(limit = 50) {
  return useQuery({
    queryKey: ['catalog', limit],
    queryFn: () => api.get<CatalogResponse>(`/catalog?limit=${limit}`),
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ProductInput) => api.post('/catalog', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['catalog'] }),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, data }: { productId: string; data: ProductInput }) =>
      api.put(`/catalog/${productId}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['catalog'] }),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (productId: string) => api.delete(`/catalog/${productId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['catalog'] }),
  });
}

export function useReembed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (productId: string) => api.post(`/catalog/${productId}/reembed`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['catalog'] }),
  });
}

export function useBulkImport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (items: ProductInput[]) => api.post('/catalog/import', items),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['catalog'] }),
  });
}
