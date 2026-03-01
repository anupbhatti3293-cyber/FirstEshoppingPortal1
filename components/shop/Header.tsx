'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Heart, ShoppingCart, User, Menu, X, LogOut } from 'lucide-react';
import { CurrencySelector } from './CurrencySelector';
import { MobileMenu } from './MobileMenu';
import { SearchBar } from './SearchBar';
import { NAV_LINKS } from '@/lib/constants';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useRouter } from 'next/navigation';

interface UserData {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

export function Header(): JSX.Element {
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [user, setUser] = useState<UserData | null>(null);
  const [wishlistCount, setWishlistCount] = useState<number>(0);

  useEffect(() => {
    fetchUser();
    fetchWishlistCount();
  }, []);

  async function fetchUser(): Promise<void> {
    try {
      const response = await fetch('/api/auth/me');
      const result = await response.json();
      if (result.success) {
        setUser(result.data.user);
      }
    } catch (error) {
      // User not logged in
    }
  }

  async function fetchWishlistCount(): Promise<void> {
    try {
      const response = await fetch('/api/wishlist');
      const result = await response.json();
      if (result.success) {
        setWishlistCount(result.data.length);
      }
    } catch (error) {
      // Failed to fetch wishlist
    }
  }

  async function handleLogout(): Promise<void> {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      setWishlistCount(0);
      router.push('/');
      router.refresh();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }

  function getInitials(): string {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return 'U';
  }

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
              {wishlistCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#F4A261] text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {wishlistCount}
                </span>
              )}
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

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="p-0 hover:opacity-80 transition-opacity focus:outline-none"
                    aria-label="Account menu"
                  >
                    <Avatar className="h-8 w-8 bg-[#2E86AB]">
                      <AvatarFallback className="bg-[#2E86AB] text-white text-sm">
                        {getInitials()}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-2">
                    <p className="text-sm font-medium text-[#1A1A2E]">
                      {user.firstName && user.lastName
                        ? `${user.firstName} ${user.lastName}`
                        : user.email}
                    </p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/account" className="cursor-pointer">
                      <User className="h-4 w-4 mr-2" />
                      My Account
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/wishlist" className="cursor-pointer">
                      <Heart className="h-4 w-4 mr-2" />
                      Wishlist
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="cursor-pointer text-red-600 focus:text-red-700"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link
                href="/login"
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Login"
              >
                <User className="h-5 w-5" />
              </Link>
            )}
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
