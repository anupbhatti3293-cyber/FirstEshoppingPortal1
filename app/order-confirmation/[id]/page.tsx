import type { Metadata } from 'next';
import { OrderConfirmationClient } from './OrderConfirmationClient';

export const metadata: Metadata = {
  title: 'Order Confirmed',
  robots: { index: false },
};

export default function OrderConfirmationPage({ params }: { params: { id: string } }) {
  return <OrderConfirmationClient orderId={params.id} />;
}
