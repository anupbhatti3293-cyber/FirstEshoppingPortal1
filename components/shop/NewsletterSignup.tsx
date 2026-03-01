'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function NewsletterSignup(): JSX.Element {
  const [email, setEmail] = useState<string>('');
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      setEmail('');
    }, 3000);
  };

  return (
    <section className="py-20 bg-[#1E3A5F]">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2
            className="text-3xl md:text-4xl font-bold text-white mb-4"
            style={{ fontFamily: 'Playfair Display, serif' }}
          >
            Get 10% Off Your First Order
          </h2>
          <p className="text-white/80 mb-8">
            Subscribe to our newsletter for exclusive deals, style tips, and early access to new collections.
          </p>

          {isSubmitted ? (
            <div className="bg-green-500 text-white py-3 px-6 rounded-lg">
              Thank you for subscribing! Check your email for your discount code.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4">
              <Input
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="flex-1 bg-white"
              />
              <Button
                type="submit"
                size="lg"
                className="bg-[#F4A261] hover:bg-[#e89451] text-white px-8"
              >
                Subscribe
              </Button>
            </form>
          )}

          <p className="text-white/60 text-sm mt-4">
            We respect your privacy. Unsubscribe at any time.
          </p>
        </div>
      </div>
    </section>
  );
}
