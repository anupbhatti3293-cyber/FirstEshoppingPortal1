'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Home, RefreshCw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): JSX.Element {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#FAFAFA] to-white px-4">
      <div className="text-center max-w-2xl">
        <h1
          className="text-9xl font-bold text-[#1E3A5F] mb-4"
          style={{ fontFamily: 'Playfair Display, serif' }}
        >
          500
        </h1>
        <h2 className="text-3xl md:text-4xl font-semibold text-[#1A1A2E] mb-6">
          Something Went Wrong
        </h2>
        <p className="text-xl text-gray-600 mb-8">
          We're sorry, but something unexpected happened. Our team has been notified and we're working on it.
        </p>

        {error.digest && (
          <p className="text-sm text-gray-500 mb-8 font-mono">
            Error ID: {error.digest}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            size="lg"
            onClick={reset}
            className="bg-[#2E86AB] hover:bg-[#1E3A5F] text-white"
          >
            <RefreshCw className="mr-2 h-5 w-5" />
            Try Again
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="border-2 border-[#2E86AB] text-[#2E86AB] hover:bg-[#2E86AB] hover:text-white"
          >
            <Link href="/">
              <Home className="mr-2 h-5 w-5" />
              Go Home
            </Link>
          </Button>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200">
          <p className="text-gray-600 mb-4">Need help? Contact our support team:</p>
          <a
            href="mailto:hello@luxehaven.com"
            className="text-[#2E86AB] hover:underline font-medium"
          >
            hello@luxehaven.com
          </a>
        </div>
      </div>
    </div>
  );
}
