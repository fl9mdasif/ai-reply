'use client';

import { useState, useRef, ChangeEvent } from 'react';
import { Plus, Upload, RefreshCw, Pencil, Trash2, Search } from 'lucide-react';
import {
  useCatalog,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  useReembed,
  useBulkImport,
  type Product,
  type ProductInput,
} from '@/lib/queries/catalog';
import { ProductModal } from '@/components/seller/ProductModal';
import { Badge } from '@/components/ui/Badge';

function parseCSV(text: string): ProductInput[] {
  const lines = text.trim().split('\n');
  const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const cols = line.split(',');
    const row: Record<string, string> = {};
    header.forEach((h, i) => { row[h] = (cols[i] ?? '').trim(); });
    return {
      name: row['name'] ?? row['product'] ?? '',
      price: parseFloat(row['price'] ?? '0'),
      ...(row['stock'] ? { stock: parseInt(row['stock'], 10) } : {}),
      ...(row['description'] ? { description: row['description'] } : {}),
    };
  }).filter((p) => p.name && p.price > 0);
}

export default function CatalogPage() {
  const { data, isLoading } = useCatalog(100);
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const deleteMutation = useDeleteProduct();
  const reembedMutation = useReembed();
  const bulkMutation = useBulkImport();

  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [importResult, setImportResult] = useState<{ created?: number; failed?: unknown[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const products = (data?.products ?? []).filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  );

  function openAdd() { setEditProduct(null); setShowModal(true); }
  function openEdit(p: Product) { setEditProduct(p); setShowModal(true); }
  function closeModal() { setShowModal(false); setEditProduct(null); }

  async function handleSave(input: ProductInput) {
    if (editProduct) {
      await updateMutation.mutateAsync({ productId: editProduct.productId, data: input });
    } else {
      await createMutation.mutateAsync(input);
    }
    closeModal();
  }

  async function handleDelete() {
    if (!deleteId) return;
    await deleteMutation.mutateAsync(deleteId);
    setDeleteId(null);
  }

  async function handleCSV(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const items = parseCSV(text);
    if (items.length === 0) { alert('No valid rows found. Need columns: name, price'); return; }
    const result = await bulkMutation.mutateAsync(items) as { created: number; failed: unknown[] };
    setImportResult(result);
    if (fileRef.current) fileRef.current.value = '';
  }

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#09090B]">Catalog</h1>
          <p className="text-[#6B7280] text-sm mt-0.5">{data?.products.length ?? 0} products</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#EDE9FE] text-sm font-medium text-[#6B7280] hover:bg-[#F9FAFB] transition-colors"
          >
            <Upload size={15} />
            Import CSV
          </button>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => { void handleCSV(e); }} />
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#7D39EB] text-white text-sm font-medium hover:bg-[#6B2ED6] transition-colors"
          >
            <Plus size={15} />
            Add Product
          </button>
        </div>
      </div>

      {importResult && (
        <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700 flex items-center justify-between">
          <span>Imported {importResult.created} products. {(importResult.failed?.length ?? 0) > 0 ? `${importResult.failed?.length} failed.` : ''}</span>
          <button onClick={() => setImportResult(null)} className="text-green-600 hover:text-green-800 text-xs">Dismiss</button>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products…"
          className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-[#EDE9FE] text-sm focus:outline-none focus:ring-2 focus:ring-[#7D39EB] bg-white"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#EDE9FE]">
        {isLoading ? (
          <p className="text-center text-[#9CA3AF] text-sm py-12">Loading…</p>
        ) : products.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[#6B7280] mb-3">{search ? 'No products match your search.' : 'No products yet.'}</p>
            {!search && (
              <button onClick={openAdd} className="text-sm text-[#7D39EB] hover:underline">
                + Add your first product
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[#6B7280] border-b border-[#EDE9FE]">
                  <th className="px-5 py-3 font-medium">Product</th>
                  <th className="px-5 py-3 font-medium">Price</th>
                  <th className="px-5 py-3 font-medium">Stock</th>
                  <th className="px-5 py-3 font-medium">Embed</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.productId} className="border-b border-[#F3F0FF] last:border-0 hover:bg-[#FAFAFE]">
                    <td className="px-5 py-3">
                      <p className="font-medium text-[#09090B]">{p.name}</p>
                      {p.description && (
                        <p className="text-xs text-[#9CA3AF] mt-0.5 line-clamp-1">{p.description}</p>
                      )}
                    </td>
                    <td className="px-5 py-3 text-[#09090B] font-medium">৳{p.price.toLocaleString()}</td>
                    <td className="px-5 py-3 text-[#6B7280]">{p.stock ?? '—'}</td>
                    <td className="px-5 py-3">
                      <Badge variant={p.embedStatus === 'synced' ? 'synced' : 'failed'}>
                        {p.embedStatus}
                      </Badge>
                      {p.embedStatus === 'failed' && (
                        <button
                          onClick={() => reembedMutation.mutate(p.productId)}
                          disabled={reembedMutation.isPending}
                          className="ml-2 text-[#7D39EB] hover:text-[#6B2ED6]"
                          title="Re-embed"
                        >
                          <RefreshCw size={13} className={reembedMutation.isPending ? 'animate-spin' : ''} />
                        </button>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEdit(p)}
                          className="p-1.5 rounded-lg hover:bg-[#F3F0FF] text-[#6B7280] hover:text-[#7D39EB]"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteId(p.productId)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-[#6B7280] hover:text-[#EF4444]"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit modal */}
      {showModal && (
        <ProductModal
          product={editProduct}
          onSave={(d) => { void handleSave(d); }}
          onClose={closeModal}
          saving={saving}
        />
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteId(null)} />
          <div className="relative bg-white rounded-2xl p-6 shadow-xl w-full max-w-sm">
            <h3 className="font-semibold text-[#09090B] mb-2">Delete Product?</h3>
            <p className="text-sm text-[#6B7280] mb-5">
              This will also remove the product from the AI catalog. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-[#EDE9FE] text-sm font-medium text-[#6B7280] hover:bg-[#F9FAFB]"
              >
                Cancel
              </button>
              <button
                onClick={() => { void handleDelete(); }}
                disabled={deleteMutation.isPending}
                className="flex-1 px-4 py-2.5 rounded-lg bg-[#EF4444] text-white text-sm font-medium hover:bg-red-600 disabled:opacity-60"
              >
                {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
