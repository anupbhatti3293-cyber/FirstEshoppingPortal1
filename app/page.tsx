import type { Metadata } from 'next';
import { HeroCarousel } from '@/components/shop/HeroCarousel';
import { CategoryGrid } from '@/components/shop/CategoryGrid';
import { TrendingProducts } from '@/components/shop/TrendingProducts';
import { StyleMateAIBanner } from '@/components/shop/StyleMateAIBanner';
import { TrustSignalsBar } from '@/components/shop/TrustSignalsBar';
import { NewArrivalsGrid } from '@/components/shop/NewArrivalsGrid';
import { NewsletterSignup } from '@/components/shop/NewsletterSignup';

export const metadata: Metadata = {
  title: 'Home',
  description: 'Discover exquisite jewellery, premium fashion, and luxury beauty products at LuxeHaven. Free shipping on orders over $50. Shop the latest trends now.',
  openGraph: {
    title: 'LuxeHaven — Premium Fashion & Jewellery',
    description: 'Discover exquisite jewellery, premium fashion, and luxury beauty products. Free shipping on orders over $50.',
    url: 'https://luxehaven.com',
    type: 'website',
  },
};

export default function Home(): JSX.Element {
  return (
    <>
      <HeroCarousel />
      <CategoryGrid />
      <TrendingProducts />
      <StyleMateAIBanner />
      <TrustSignalsBar />
      <NewArrivalsGrid />
      <NewsletterSignup />
    </>
  );
}
