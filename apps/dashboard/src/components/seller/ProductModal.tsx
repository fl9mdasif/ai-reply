'use client';

import { useState, useEffect, FormEvent } from 'react';
import { X } from 'lucide-react';
import type { Product, ProductInput } from '@/lib/queries/catalog';

interface Props {
  product?: Product | null;
  onSave: (data: ProductInput) => void;
  onClose: () => void;
  saving?: boolean;
}

export function ProductModal({ product, onSave, onClose, saving }: Props) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (product) {
      setName(product.name);
      setPrice(String(product.price));
      setStock(product.stock != null ? String(product.stock) : '');
      setDescription(product.description ?? '');
    }
  }, [product]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const data: ProductInput = {
      name: name.trim(),
      price: parseFloat(price),
      ...(stock ? { stock: parseInt(stock, 10) } : {}),
      ...(description.trim() ? { description: description.trim() } : {}),
    };
    onSave(data);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-lg text-[#09090B]">
            {product ? 'Edit Product' : 'Add Product'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F3F0FF] text-[#6B7280]">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#09090B] mb-1.5">Product Name *</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Red Cotton Saree"
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#EDE9FE] text-sm focus:outline-none focus:ring-2 focus:ring-[#7D39EB]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[#09090B] mb-1.5">Price (৳) *</label>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="1500"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#EDE9FE] text-sm focus:outline-none focus:ring-2 focus:ring-[#7D39EB]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#09090B] mb-1.5">Stock</label>
              <input
                type="number"
                min="0"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="50"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#EDE9FE] text-sm focus:outline-none focus:ring-2 focus:ring-[#7D39EB]"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#09090B] mb-1.5">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Product details, materials, size..."
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#EDE9FE] text-sm focus:outline-none focus:ring-2 focus:ring-[#7D39EB] resize-none"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-[#EDE9FE] text-sm font-medium text-[#6B7280] hover:bg-[#F9FAFB]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 rounded-lg bg-[#7D39EB] text-white text-sm font-medium hover:bg-[#6B2ED6] disabled:opacity-60"
            >
              {saving ? 'Saving…' : product ? 'Update' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
