import type { Metadata } from 'next';
import { CheckoutPageClient } from './CheckoutPageClient';

export const metadata: Metadata = {
  title: 'Checkout',
  description: 'Complete your LuxeHaven order.',
  robots: { index: false },
};

export default function CheckoutPage() {
  return <CheckoutPageClient />;
}
