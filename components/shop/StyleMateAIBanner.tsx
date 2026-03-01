import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

export function StyleMateAIBanner(): JSX.Element {
  return (
    <section className="py-24 bg-gradient-to-r from-[#1E3A5F] via-[#2E86AB] to-[#F4A261]">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto text-center text-white">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="h-8 w-8" />
            <h2
              className="text-4xl md:text-5xl font-bold"
              style={{ fontFamily: 'Playfair Display, serif' }}
            >
              Meet StyleMate — Your Free Personal AI Stylist
            </h2>
          </div>

          <p className="text-xl md:text-2xl mb-8 text-white/90 max-w-3xl mx-auto leading-relaxed">
            Tell us your style, occasion, and budget — get a complete curated look in seconds
          </p>

          <Button
            asChild
            size="lg"
            className="bg-white text-[#1E3A5F] hover:bg-gray-100 text-lg px-8 py-6"
          >
            <Link href="/stylemate">
              Try StyleMate Free →
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
