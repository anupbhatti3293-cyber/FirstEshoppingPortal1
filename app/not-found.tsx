import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Home, Search } from 'lucide-react';

export default function NotFound(): JSX.Element {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#FAFAFA] to-white px-4">
      <div className="text-center max-w-2xl">
        <h1
          className="text-9xl font-bold text-[#1E3A5F] mb-4"
          style={{ fontFamily: 'Playfair Display, serif' }}
        >
          404
        </h1>
        <h2 className="text-3xl md:text-4xl font-semibold text-[#1A1A2E] mb-6">
          Page Not Found
        </h2>
        <p className="text-xl text-gray-600 mb-8">
          Oops! The page you're looking for doesn't exist. It might have been moved or deleted.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            asChild
            size="lg"
            className="bg-[#2E86AB] hover:bg-[#1E3A5F] text-white"
          >
            <Link href="/">
              <Home className="mr-2 h-5 w-5" />
              Go Home
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="border-2 border-[#2E86AB] text-[#2E86AB] hover:bg-[#2E86AB] hover:text-white"
          >
            <Link href="/products">
              <Search className="mr-2 h-5 w-5" />
              Browse Products
            </Link>
          </Button>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-[#1A1A2E] mb-4">Popular Links</h3>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/category/jewellery" className="text-[#2E86AB] hover:underline">
              Jewellery
            </Link>
            <Link href="/category/clothing" className="text-[#2E86AB] hover:underline">
              Clothing
            </Link>
            <Link href="/category/purses-bags" className="text-[#2E86AB] hover:underline">
              Purses & Bags
            </Link>
            <Link href="/category/beauty" className="text-[#2E86AB] hover:underline">
              Beauty
            </Link>
            <Link href="/contact" className="text-[#2E86AB] hover:underline">
              Contact Us
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
