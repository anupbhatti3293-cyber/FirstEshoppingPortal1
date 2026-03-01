'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { HERO_SLIDES } from '@/lib/constants';

export function HeroCarousel(): JSX.Element {
  const [currentSlide, setCurrentSlide] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isPaused]);

  return (
    <div
      className="relative w-full h-[80vh] overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {HERO_SLIDES.map((slide, index) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            index === currentSlide ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <Image
            src={slide.image}
            alt={slide.title}
            fill
            className="object-cover"
            priority={index === 0}
            sizes="100vw"
          />

          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent" />

          <div className="absolute inset-0 flex items-center">
            <div className="container mx-auto px-4">
              <div className="max-w-2xl text-white">
                <h1
                  className="text-5xl md:text-6xl lg:text-7xl font-bold mb-4"
                  style={{ fontFamily: 'Playfair Display, serif' }}
                >
                  {slide.title}
                </h1>
                <p className="text-xl md:text-2xl mb-8 text-gray-200">
                  {slide.subtitle}
                </p>
                <div className="flex flex-wrap gap-4">
                  <Button
                    asChild
                    size="lg"
                    className="bg-[#F4A261] hover:bg-[#e89451] text-white text-lg px-8"
                  >
                    <Link href={slide.primaryCta.href}>
                      {slide.primaryCta.text}
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="border-2 border-white text-white hover:bg-white hover:text-[#1E3A5F] text-lg px-8"
                  >
                    <Link href={slide.secondaryCta.href}>
                      {slide.secondaryCta.text}
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
        {HERO_SLIDES.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`w-3 h-3 rounded-full transition-all ${
              index === currentSlide ? 'bg-white w-8' : 'bg-white/50'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
