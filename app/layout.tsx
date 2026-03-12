import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/shop/Header';
import { Footer } from '@/components/shop/Footer';
import { AnnouncementBar } from '@/components/shop/AnnouncementBar';
import { CookieConsent } from '@/components/shop/CookieConsent';
import { Toaster } from '@/components/ui/toaster';
import { CurrencyProvider } from '@/lib/currencyContext';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' });

export const metadata: Metadata = {
  metadataBase: new URL('https://luxehaven.com'),
  title: {
    default: 'LuxeHaven — Premium Fashion & Jewellery',
    template: '%s | LuxeHaven',
  },
  description: 'Discover exquisite jewellery, fashion, and beauty products curated for the modern lifestyle. Free shipping on orders over $50. Shop now.',
  keywords: ['jewellery', 'jewelry', 'fashion', 'clothing', 'purses', 'bags', 'beauty', 'luxury', 'premium', 'dropshipping'],
  authors: [{ name: 'LuxeHaven' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    alternateLocale: 'en_GB',
    url: 'https://luxehaven.com',
    siteName: 'LuxeHaven',
    title: 'LuxeHaven — Premium Fashion & Jewellery',
    description: 'Discover exquisite jewellery, fashion, and beauty products curated for the modern lifestyle.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'LuxeHaven - Premium Fashion & Jewellery',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LuxeHaven — Premium Fashion & Jewellery',
    description: 'Discover exquisite jewellery, fashion, and beauty products curated for the modern lifestyle.',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

const ANNOUNCEMENT_MESSAGES = [
  'Free Shipping on Orders Over $50 | Use Code: WELCOME10',
  'UK Orders: No Customs Fees — Duty Paid Included',
  'New Arrivals Every Day — Shop the Latest Trends',
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): JSX.Element {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className="min-h-screen flex flex-col">
        <CurrencyProvider>
          <AnnouncementBar messages={ANNOUNCEMENT_MESSAGES} />
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <CookieConsent />
          <Toaster />
        </CurrencyProvider>
      </body>
    </html>
  );
}
