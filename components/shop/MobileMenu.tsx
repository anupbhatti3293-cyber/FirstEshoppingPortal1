'use client';

import { X } from 'lucide-react';
import Link from 'next/link';
import { NAV_LINKS } from '@/lib/constants';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileMenu({ isOpen, onClose }: MobileMenuProps): JSX.Element | null {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white">
      <div className="flex items-center justify-between p-4 border-b">
        <span className="text-xl font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>
          LuxeHaven
        </span>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Close menu"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      <nav className="flex flex-col p-4 space-y-4">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={onClose}
            className="text-lg py-3 px-4 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {link.name}
          </Link>
        ))}
      </nav>
    </div>
  );
}
