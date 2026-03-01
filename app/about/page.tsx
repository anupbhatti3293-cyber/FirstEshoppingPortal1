import type { Metadata } from 'next';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'About Us',
  description: 'Learn about LuxeHaven\'s mission to bring you premium jewellery, fashion, and beauty products from around the world. Discover our story and values.',
  openGraph: {
    title: 'About Us | LuxeHaven',
    description: 'Learn about LuxeHaven\'s mission to bring you premium jewellery, fashion, and beauty products from around the world.',
  },
};

export default function AboutPage(): JSX.Element {
  return (
    <div className="min-h-screen">
      <section className="py-20 bg-gradient-to-b from-[#FAFAFA] to-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1
              className="text-5xl md:text-6xl font-bold text-[#1E3A5F] mb-6"
              style={{ fontFamily: 'Playfair Display, serif' }}
            >
              Our Story
            </h1>
            <p className="text-xl text-gray-700 leading-relaxed">
              LuxeHaven was founded on a simple belief: everyone deserves access to premium,
              beautifully crafted products that elevate their everyday lives.
            </p>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
            <div className="relative aspect-[4/3] rounded-lg overflow-hidden">
              <Image
                src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=600&fit=crop"
                alt="LuxeHaven Store"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
            <div>
              <h2
                className="text-4xl font-bold text-[#1E3A5F] mb-6"
                style={{ fontFamily: 'Playfair Display, serif' }}
              >
                Our Mission
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We curate the finest jewellery, fashion, and beauty products from trusted suppliers
                worldwide, bringing them directly to you at accessible prices.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                Every product is carefully selected for quality, style, and value. We believe luxury
                should be attainable, and exceptional customer service should be standard.
              </p>
              <p className="text-gray-700 leading-relaxed">
                With transparent pricing, fast worldwide shipping, and a commitment to your satisfaction,
                LuxeHaven is your trusted partner in premium lifestyle shopping.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-[#FAFAFA]">
        <div className="container mx-auto px-4">
          <h2
            className="text-4xl font-bold text-center text-[#1E3A5F] mb-12"
            style={{ fontFamily: 'Playfair Display, serif' }}
          >
            Why Choose LuxeHaven?
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-white p-8 rounded-lg shadow-sm text-center">
              <div className="text-5xl mb-4">✨</div>
              <h3 className="text-xl font-semibold text-[#1E3A5F] mb-3">
                Curated Quality
              </h3>
              <p className="text-gray-600">
                Every product is hand-selected and verified for authenticity and quality before reaching you.
              </p>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-sm text-center">
              <div className="text-5xl mb-4">🌍</div>
              <h3 className="text-xl font-semibold text-[#1E3A5F] mb-3">
                Global Reach
              </h3>
              <p className="text-gray-600">
                We ship to over 100 countries with transparent pricing and no hidden customs fees for UK orders.
              </p>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-sm text-center">
              <div className="text-5xl mb-4">💝</div>
              <h3 className="text-xl font-semibold text-[#1E3A5F] mb-3">
                Customer First
              </h3>
              <p className="text-gray-600">
                30-day returns, responsive support, and a genuine commitment to your complete satisfaction.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-b from-white to-[#FAFAFA]">
        <div className="container mx-auto px-4 text-center">
          <h2
            className="text-4xl font-bold text-[#1E3A5F] mb-6"
            style={{ fontFamily: 'Playfair Display, serif' }}
          >
            Join the LuxeHaven Community
          </h2>
          <p className="text-xl text-gray-700 max-w-2xl mx-auto mb-8">
            Follow us on social media for style inspiration, exclusive deals, and early access
            to new collections.
          </p>
          <div className="flex justify-center gap-6">
            <a
              href="https://instagram.com/luxehaven"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-3 bg-[#2E86AB] text-white rounded-lg hover:bg-[#1E3A5F] transition-colors"
            >
              Follow on Instagram
            </a>
            <a
              href="https://tiktok.com/@luxehaven"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-3 border-2 border-[#2E86AB] text-[#2E86AB] rounded-lg hover:bg-[#2E86AB] hover:text-white transition-colors"
            >
              Follow on TikTok
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
