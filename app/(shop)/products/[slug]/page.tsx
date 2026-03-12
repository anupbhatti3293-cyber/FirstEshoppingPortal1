'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ShoppingCart, Heart, Share2, Truck, RefreshCw, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Breadcrumbs } from '@/components/shop/Breadcrumbs';
import { RatingStars } from '@/components/shop/RatingStars';
import { PriceDisplay } from '@/components/shop/PriceDisplay';
import { QuantitySelector } from '@/components/shop/QuantitySelector';
import { ProductCard } from '@/components/shop/ProductCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import type { Product, Currency } from '@/types';
import { getCategoryName } from '@/lib/products';
import { getClientCurrency } from '@/lib/clientCookies';

export default function ProductDetailPage(): JSX.Element {
  const params = useParams();
  const slug = params.slug as string;
  const [currency, setCurrency] = useState<Currency>('USD');
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);

  useEffect(() => {
    setCurrency(getClientCurrency('USD'));
  }, []);

  useEffect(() => {
    async function fetchProduct(): Promise<void> {
      setLoading(true);
      try {
        const response = await fetch(`/api/products/${slug}`);
        const result = await response.json();
        if (result.success && result.data) {
          setProduct(result.data.product);
          setRelatedProducts(result.data.relatedProducts || []);
        }
      } catch (error) {
        console.error('Failed to fetch product:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchProduct();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-6 w-64 mb-8" />
          <div className="grid md:grid-cols-2 gap-12">
            <Skeleton className="aspect-square w-full" />
            <div className="space-y-6">
              <Skeleton className="h-12 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Product Not Found</h1>
          <Link href="/products">
            <Button>Browse All Products</Button>
          </Link>
        </div>
      </div>
    );
  }

  const mainImage = product.images && product.images.length > 0 ? product.images[selectedImage].url : '';
  const isOutOfStock = product.stock_quantity <= 0 && !product.allow_backorder;

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8">
        <Breadcrumbs
          items={[
            { label: 'Products', href: '/products' },
            { label: getCategoryName(product.category), href: `/products/category/${product.category}` },
            { label: product.name, href: `/products/${product.slug}` },
          ]}
          className="mb-8"
        />

        <div className="grid md:grid-cols-2 gap-12 mb-16">
          <div className="space-y-4">
            <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
              {mainImage && (
                <Image
                  src={mainImage}
                  alt={product.name}
                  fill
                  className="object-cover"
                  priority
                />
              )}
            </div>
            {product.images && product.images.length > 1 && (
              <div className="grid grid-cols-4 gap-4">
                {product.images.map((image, index) => (
                  <button
                    key={image.id}
                    onClick={() => setSelectedImage(index)}
                    className={`relative aspect-square rounded-lg overflow-hidden bg-gray-100 border-2 ${
                      selectedImage === index ? 'border-gray-900' : 'border-transparent'
                    }`}
                  >
                    <Image
                      src={image.url}
                      alt={`${product.name} ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="uppercase text-xs">
                  {getCategoryName(product.category)}
                </Badge>
                {product.tags.includes('new') && (
                  <Badge className="bg-green-600">NEW</Badge>
                )}
              </div>
              <h1 className="text-4xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
                {product.name}
              </h1>
              <div className="flex items-center gap-4 mb-4">
                <RatingStars rating={product.rating_average} size="md" showValue />
                <span className="text-sm text-gray-500">
                  {product.rating_count} {product.rating_count === 1 ? 'review' : 'reviews'}
                </span>
              </div>
            </div>

            <PriceDisplay
              priceUsd={product.base_price_usd}
              priceGbp={product.base_price_gbp}
              salePriceUsd={product.sale_price_usd}
              salePriceGbp={product.sale_price_gbp}
              currency={currency}
              size="lg"
              showVatNotice={currency === 'GBP'}
            />

            {product.short_description && (
              <p className="text-gray-600 leading-relaxed">
                {product.short_description}
              </p>
            )}

            <div className="flex items-center gap-4 py-4 border-t border-b border-gray-200">
              <span className="text-sm font-medium">SKU:</span>
              <span className="text-sm text-gray-600">{product.sku}</span>
              {!isOutOfStock && (
                <>
                  <span className="text-sm font-medium ml-4">Stock:</span>
                  <span className="text-sm text-green-600">{product.stock_quantity} in stock</span>
                </>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <QuantitySelector
                  value={quantity}
                  onChange={setQuantity}
                  max={product.stock_quantity}
                />
                <Button
                  size="lg"
                  className="flex-1 gap-2"
                  disabled={isOutOfStock}
                >
                  <ShoppingCart className="w-5 h-5" />
                  {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => setIsWishlisted(!isWishlisted)}
                >
                  <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-current text-red-500' : ''}`} />
                </Button>
              </div>
              <Button variant="outline" size="lg" className="w-full gap-2">
                <Share2 className="w-4 h-4" />
                Share Product
              </Button>
            </div>

            <div className="space-y-3 pt-4">
              <div className="flex items-center gap-3 text-sm">
                <Truck className="w-5 h-5 text-gray-600" />
                <span>Free shipping on orders over {currency === 'USD' ? '$50' : '£40'}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <RefreshCw className="w-5 h-5 text-gray-600" />
                <span>14-day return policy</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Shield className="w-5 h-5 text-gray-600" />
                <span>Secure payment guaranteed</span>
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="description" className="mb-16">
          <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
            <TabsTrigger value="description" className="rounded-none border-b-2 border-transparent data-[state=active]:border-gray-900">
              Description
            </TabsTrigger>
            <TabsTrigger value="reviews" className="rounded-none border-b-2 border-transparent data-[state=active]:border-gray-900">
              Reviews ({product.rating_count})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="description" className="mt-6">
            <div className="prose max-w-none">
              <p className="text-gray-600 leading-relaxed">
                {product.description || product.short_description}
              </p>
            </div>
          </TabsContent>
          <TabsContent value="reviews" className="mt-6">
            <p className="text-gray-500">Reviews feature coming soon</p>
          </TabsContent>
        </Tabs>

        {relatedProducts.length > 0 && (
          <div>
            <h2 className="text-3xl font-bold mb-8" style={{ fontFamily: 'Playfair Display, serif' }}>
              You May Also Like
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((relatedProduct) => (
                <ProductCard
                  key={relatedProduct.id}
                  product={relatedProduct}
                  currency={currency}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
