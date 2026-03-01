import Link from 'next/link';
import { Instagram, Facebook, Video } from 'lucide-react';
import { FOOTER_LINKS, SOCIAL_LINKS } from '@/lib/constants';

export function Footer(): JSX.Element {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#1A1A2E] text-white">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
          <div className="lg:col-span-1">
            <h3 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
              LuxeHaven
            </h3>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              Premium jewellery, fashion, and beauty products curated for the modern lifestyle.
            </p>
            <div className="flex gap-4">
              <a
                href="https://instagram.com/luxehaven"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href="https://facebook.com/luxehaven"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a
                href="https://tiktok.com/@luxehaven"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                aria-label="TikTok"
              >
                <Video className="h-5 w-5" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-[#F4A261]">Shop</h4>
            <ul className="space-y-2">
              {FOOTER_LINKS.shop.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-gray-400 hover:text-white text-sm transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-[#F4A261]">Company</h4>
            <ul className="space-y-2">
              {FOOTER_LINKS.company.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-gray-400 hover:text-white text-sm transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-[#F4A261]">Support</h4>
            <ul className="space-y-2">
              {FOOTER_LINKS.support.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-gray-400 hover:text-white text-sm transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-[#F4A261]">Legal</h4>
            <ul className="space-y-2">
              {FOOTER_LINKS.legal.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-gray-400 hover:text-white text-sm transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-400 text-sm">
              &copy; {currentYear} LuxeHaven. All rights reserved.
            </p>

            <div className="flex items-center gap-4">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/b/b7/MasterCard_Logo.svg"
                alt="Mastercard"
                className="h-8 opacity-70 hover:opacity-100 transition-opacity"
              />
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/a/a4/Visa_2021.svg"
                alt="Visa"
                className="h-8 opacity-70 hover:opacity-100 transition-opacity"
              />
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/f/fa/American_Express_logo_%282018%29.svg"
                alt="American Express"
                className="h-8 opacity-70 hover:opacity-100 transition-opacity"
              />
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg"
                alt="PayPal"
                className="h-8 opacity-70 hover:opacity-100 transition-opacity"
              />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
