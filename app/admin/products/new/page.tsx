'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function NewProductPage(): JSX.Element {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    category: '',
    short_description: '',
    description: '',
    base_price_usd: '',
    base_price_gbp: '',
    stock_quantity: '',
    is_active: 'true',
    image_url: '',
  });

  function handleNameChange(name: string): void {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    setFormData({ ...formData, name, slug });
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          slug: formData.slug,
          category: formData.category,
          short_description: formData.short_description,
          description: formData.description,
          base_price_usd: parseFloat(formData.base_price_usd),
          base_price_gbp: parseFloat(formData.base_price_gbp),
          stock_quantity: parseInt(formData.stock_quantity),
          is_active: formData.is_active === 'true',
          image_url: formData.image_url,
        }),
      });

      const result = await response.json();
      if (result.success) {
        router.push('/admin/products');
      } else {
        alert(result.error || 'Failed to create product');
      }
    } catch (error) {
      console.error('Failed to create product:', error);
      alert('Failed to create product');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <Link href="/admin/products">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Products
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-[#1A1A2E]">Add New Product</h1>
        <p className="text-gray-600 mt-1">Create a new product in your catalog</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-3xl">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="col-span-2">
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                required
                placeholder="Gold Layered Necklace"
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="slug">Slug *</Label>
              <Input
                id="slug"
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                required
                placeholder="gold-layered-necklace"
              />
              <p className="text-sm text-gray-500 mt-1">Auto-generated from name, but you can edit it</p>
            </div>

            <div>
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="jewellery">Jewellery</SelectItem>
                  <SelectItem value="clothing">Clothing</SelectItem>
                  <SelectItem value="purses-bags">Purses & Bags</SelectItem>
                  <SelectItem value="beauty">Beauty</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="is_active">Status *</Label>
              <Select
                value={formData.is_active}
                onValueChange={(value) => setFormData({ ...formData, is_active: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <Label htmlFor="short_description">Short Description *</Label>
              <Input
                id="short_description"
                type="text"
                value={formData.short_description}
                onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
                required
                placeholder="Elegant layered gold necklace"
                maxLength={200}
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="description">Full Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
                placeholder="Detailed product description..."
                rows={6}
              />
            </div>

            <div>
              <Label htmlFor="base_price_usd">Price USD *</Label>
              <Input
                id="base_price_usd"
                type="number"
                step="0.01"
                min="0"
                value={formData.base_price_usd}
                onChange={(e) => setFormData({ ...formData, base_price_usd: e.target.value })}
                required
                placeholder="89.99"
              />
            </div>

            <div>
              <Label htmlFor="base_price_gbp">Price GBP *</Label>
              <Input
                id="base_price_gbp"
                type="number"
                step="0.01"
                min="0"
                value={formData.base_price_gbp}
                onChange={(e) => setFormData({ ...formData, base_price_gbp: e.target.value })}
                required
                placeholder="69.99"
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="stock_quantity">Stock Quantity *</Label>
              <Input
                id="stock_quantity"
                type="number"
                min="0"
                value={formData.stock_quantity}
                onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                required
                placeholder="100"
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="image_url">Image URL</Label>
              <Input
                id="image_url"
                type="url"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                placeholder="https://images.unsplash.com/photo-..."
              />
              <p className="text-sm text-gray-500 mt-1">Optional: Add a product image URL</p>
            </div>
          </div>

          <div className="flex gap-4 pt-4 border-t border-gray-200">
            <Button type="submit" disabled={loading} className="bg-[#2E86AB] hover:bg-[#2E86AB]/90">
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Creating...' : 'Create Product'}
            </Button>
            <Link href="/admin/products">
              <Button type="button" variant="outline" disabled={loading}>
                Cancel
              </Button>
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}
