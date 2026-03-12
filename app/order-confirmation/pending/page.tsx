import Link from 'next/link';
import { CheckCircle } from 'lucide-react';

export default function PendingConfirmationPage() {
  return (
    <div className="min-h-screen bg-[hsl(var(--background))] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle size={40} className="text-green-600" strokeWidth={1.5} />
          </div>
        </div>
        <h1 className="text-3xl font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>
          Payment Successful!
        </h1>
        <p className="text-[hsl(var(--muted-foreground))]">
          Your order is being processed. You&apos;ll receive a confirmation email shortly with your order details.
        </p>
        <Link href="/products"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[hsl(var(--primary))] text-white font-medium text-sm hover:bg-[hsl(var(--primary)/0.9)] transition-all">
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}
