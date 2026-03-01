'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export function CookieConsent(): JSX.Element | null {
  const [showBanner, setShowBanner] = useState<boolean>(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookieConsent');
    if (!consent) {
      setShowBanner(true);
    }
  }, []);

  const acceptCookies = (): void => {
    localStorage.setItem('cookieConsent', 'accepted');
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-700">
            We use cookies to enhance your browsing experience and analyze our traffic.
            By clicking "Accept", you consent to our use of cookies.{' '}
            <Link href="/privacy" className="text-[#2E86AB] hover:underline">
              Privacy Policy
            </Link>
          </p>
          <div className="flex gap-3 flex-shrink-0">
            <Button
              variant="outline"
              onClick={() => setShowBanner(false)}
              className="whitespace-nowrap"
            >
              Decline
            </Button>
            <Button
              onClick={acceptCookies}
              className="bg-[#2E86AB] hover:bg-[#1E3A5F] text-white whitespace-nowrap"
            >
              Accept Cookies
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
