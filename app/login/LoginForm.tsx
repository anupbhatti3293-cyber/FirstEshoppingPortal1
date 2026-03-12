'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const redirect = searchParams.get('redirect') || '/account';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.success) {
      router.push(redirect);
    } else {
      setError(result.error || 'Login failed');
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left — decorative panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[hsl(var(--primary))]">
        <div className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(ellipse at 30% 50%, hsl(211 55% 35%) 0%, transparent 60%),
              radial-gradient(ellipse at 80% 20%, hsl(26 77% 62% / 0.3) 0%, transparent 50%)`,
          }}
        />
        <div className="relative z-10 flex flex-col justify-between p-16 text-white w-full">
          <div>
            <Link href="/" className="text-2xl font-bold tracking-widest" style={{ fontFamily: 'Playfair Display, serif' }}>
              LUXEHAVEN
            </Link>
          </div>
          <div>
            <blockquote className="text-4xl font-light leading-tight mb-8" style={{ fontFamily: 'Playfair Display, serif' }}>
              "Luxury is not about<br />price. It is about<br />the feeling."
            </blockquote>
            <div className="flex items-center gap-3">
              <div className="w-10 h-px bg-white/40" />
              <span className="text-sm text-white/60 tracking-widest uppercase">LuxeHaven</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {['Free Shipping', 'Easy Returns', 'Secure Checkout'].map(t => (
              <div key={t} className="border border-white/20 rounded-lg p-4 text-center">
                <p className="text-xs text-white/70 tracking-wide uppercase">{t}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-[hsl(var(--background))]">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <Link href="/" className="lg:hidden block text-center text-xl font-bold tracking-widest mb-8 text-[hsl(var(--primary))]"
            style={{ fontFamily: 'Playfair Display, serif' }}>
            LUXEHAVEN
          </Link>

          <h1 className="text-3xl font-bold text-[hsl(var(--foreground))] mb-2"
            style={{ fontFamily: 'Playfair Display, serif' }}>
            Welcome back
          </h1>
          <p className="text-[hsl(var(--muted-foreground))] mb-8">
            Don&apos;t have an account?{' '}
            <Link href={`/register${redirect !== '/account' ? `?redirect=${redirect}` : ''}`}
              className="text-[hsl(var(--primary))] font-medium hover:underline">
              Create one
            </Link>
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5">
                Email address
              </label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg border border-[hsl(var(--border))] bg-white
                  text-[hsl(var(--foreground))] placeholder-[hsl(var(--muted-foreground))]
                  focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-transparent
                  transition-all text-sm"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-sm font-medium text-[hsl(var(--foreground))]">Password</label>
                <Link href="/forgot-password" className="text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 pr-11 rounded-lg border border-[hsl(var(--border))] bg-white
                    text-[hsl(var(--foreground))] placeholder-[hsl(var(--muted-foreground))]
                    focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-transparent
                    transition-all text-sm"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-lg
                bg-[hsl(var(--primary))] text-white font-semibold text-sm tracking-wide
                hover:bg-[hsl(var(--primary)/0.9)] active:scale-[0.99]
                disabled:opacity-60 disabled:cursor-not-allowed
                transition-all duration-200"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <>Sign in <ArrowRight size={16} /></>}
            </button>
          </form>

          <p className="text-center text-xs text-[hsl(var(--muted-foreground))] mt-8">
            By signing in, you agree to our{' '}
            <Link href="/terms" className="underline hover:text-[hsl(var(--foreground))]">Terms</Link>
            {' '}and{' '}
            <Link href="/privacy" className="underline hover:text-[hsl(var(--foreground))]">Privacy Policy</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
