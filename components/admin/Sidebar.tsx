'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Truck,
  Sparkles,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Tag,
  ShoppingBag,
} from 'lucide-react';
import { useState } from 'react';

const NAV_ITEMS = [
  { href: '/admin/dashboard',       icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/products',        icon: Package,         label: 'Products' },
  { href: '/admin/orders',          icon: ShoppingCart,    label: 'Orders' },
  { href: '/admin/discounts',       icon: Tag,             label: 'Discounts' },
  { href: '/admin/abandoned-carts', icon: ShoppingBag,     label: 'Abandoned Carts' },
  { href: '/admin/customers',       icon: Users,           label: 'Customers' },
  { href: '/admin/suppliers',       icon: Truck,           label: 'Suppliers' },
  { href: '/admin/stylemate',       icon: Sparkles,        label: 'StyleMate AI' },
  { href: '/admin/analytics',       icon: BarChart3,       label: 'Analytics' },
  { href: '/admin/settings',        icon: Settings,        label: 'Settings' },
];

export function Sidebar(): JSX.Element {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState<boolean>(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg"
        aria-label="Toggle sidebar"
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      <aside
        className={cn(
          'fixed top-0 left-0 h-screen bg-[#1E3A5F] text-white w-64 flex flex-col transition-transform duration-300 z-40',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="p-6 border-b border-white/10">
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: 'Playfair Display, serif' }}
          >
            LuxeHaven
          </h1>
          <p className="text-sm text-white/70 mt-1">Admin Panel</p>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                      isActive
                        ? 'bg-white/20 text-white font-medium'
                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                    )}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-white/10">
          <button
            onClick={() => { window.location.href = '/admin/login'; }}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition-colors w-full"
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
