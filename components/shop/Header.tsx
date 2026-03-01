'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, Heart, ShoppingCart, User, Menu, X } from 'lucide-react';
import { CurrencySelector } from './CurrencySelector';
import { MobileMenu } from './MobileMenu';
import { SearchBar } from './SearchBar';
import { NAV_LINKS } from '@/lib/constants';
import { Dialog, DialogContent } from '@/components/ui/dialog';

export function Header(): JSX.Element {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);

  return (
    <header className="sticky top-0 z-40 bg-white border-b shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden p-2 hover:bg-gray-100 rounded-full transition-colors"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-6 w-6" />
            </button>

            <Link href="/" className="text-2xl font-bold text-[#1E3A5F]" style={{ fontFamily: 'Playfair Display, serif' }}>
              LuxeHaven
            </Link>
          </div>

          <nav className="hidden lg:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-[#1A1A2E] hover:text-[#2E86AB] transition-colors"
              >
                {link.name}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <div className="hidden md:block w-64">
              <SearchBar />
            </div>

            <button
              className="md:hidden p-2 hover:bg-gray-100 rounded-full transition-colors"
              onClick={() => setIsSearchOpen(true)}
              aria-label="Search"
            >
              <Search className="h-5 w-5" />
            </button>

            <CurrencySelector />

            <Link
              href="/wishlist"
              className="relative p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Wishlist"
            >
              <Heart className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 bg-[#F4A261] text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                0
              </span>
            </Link>

            <Link
              href="/cart"
              className="relative p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Shopping cart"
            >
              <ShoppingCart className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 bg-[#F4A261] text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                0
              </span>
            </Link>

            <Link
              href="/account"
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Account"
            >
              <User className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>

      <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

      <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <div className="py-4">
            <SearchBar />
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
