'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { Eye, EyeOff, ArrowRight, Loader as Loader2, Check } from 'lucide-react';

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register } = useAuth();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const redirect = searchParams.get('redirect') || '/account';

  const passwordStrength = (pw: string) => {
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score;
  };

  const strength = passwordStrength(form.password);
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strength];
  const strengthColor = ['', '#ef4444', '#f97316', '#eab308', '#22c55e'][strength];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await register(form);
    setLoading(false);
    if (result.success) {
      router.push(redirect);
    } else {
      setError(result.error || 'Registration failed');
    }
  }

  const perks = ['Free shipping on orders over $50', 'Save items to your wishlist', 'Track orders in real time', 'Exclusive member discounts'];

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-5/12 relative overflow-hidden bg-[hsl(var(--primary))]">
        <div className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(ellipse at 70% 30%, hsl(26 77% 62% / 0.25) 0%, transparent 55%),
              radial-gradient(ellipse at 20% 80%, hsl(211 55% 35%) 0%, transparent 60%)`,
          }}
        />
        <div className="relative z-10 flex flex-col justify-between p-14 text-white w-full">
          <Link href="/" className="text-2xl font-bold tracking-widest" style={{ fontFamily: 'Playfair Display, serif' }}>
            LUXEHAVEN
          </Link>
          <div>
            <h2 className="text-3xl font-light mb-8 leading-snug" style={{ fontFamily: 'Playfair Display, serif' }}>
              Join the<br />LuxeHaven<br />community
            </h2>
            <ul className="space-y-4">
              {perks.map(p => (
                <li key={p} className="flex items-center gap-3 text-sm text-white/85">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                    <Check size={11} />
                  </span>
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-white/40 tracking-wider uppercase">Premium · Curated · Trusted</p>
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-[hsl(var(--background))]">
        <div className="w-full max-w-md">
          <Link href="/" className="lg:hidden block text-center text-xl font-bold tracking-widest mb-8 text-[hsl(var(--primary))]"
            style={{ fontFamily: 'Playfair Display, serif' }}>
            LUXEHAVEN
          </Link>

          <h1 className="text-3xl font-bold text-[hsl(var(--foreground))] mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
            Create account
          </h1>
          <p className="text-[hsl(var(--muted-foreground))] mb-8">
            Already have an account?{' '}
            <Link href={`/login${redirect !== '/account' ? `?redirect=${redirect}` : ''}`}
              className="text-[hsl(var(--primary))] font-medium hover:underline">
              Sign in
            </Link>
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {(['firstName', 'lastName'] as const).map(field => (
                <div key={field}>
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5">
                    {field === 'firstName' ? 'First name' : 'Last name'}
                  </label>
                  <input
                    type="text"
                    value={form[field]}
                    onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                    className="w-full px-4 py-3 rounded-lg border border-[hsl(var(--border))] bg-white
                      text-[hsl(var(--foreground))] placeholder-[hsl(var(--muted-foreground))]
                      focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-transparent
                      transition-all text-sm"
                    placeholder={field === 'firstName' ? 'Jane' : 'Smith'}
                  />
                </div>
              ))}
            </div>

            <div>
              <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5">Email address</label>
              <input
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required
                className="w-full px-4 py-3 rounded-lg border border-[hsl(var(--border))] bg-white
                  text-[hsl(var(--foreground))] placeholder-[hsl(var(--muted-foreground))]
                  focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-transparent
                  transition-all text-sm"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required
                  minLength={8}
                  className="w-full px-4 py-3 pr-11 rounded-lg border border-[hsl(var(--border))] bg-white
                    text-[hsl(var(--foreground))] placeholder-[hsl(var(--muted-foreground))]
                    focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-transparent
                    transition-all text-sm"
                  placeholder="Min. 8 characters"
                />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {form.password && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1 bg-[hsl(var(--muted))] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${(strength / 4) * 100}%`, backgroundColor: strengthColor }} />
                  </div>
                  <span className="text-xs" style={{ color: strengthColor }}>{strengthLabel}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-lg
                bg-[hsl(var(--primary))] text-white font-semibold text-sm tracking-wide
                hover:bg-[hsl(var(--primary)/0.9)] active:scale-[0.99]
                disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 mt-2"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <>Create account <ArrowRight size={16} /></>}
            </button>
          </form>

          <p className="text-center text-xs text-[hsl(var(--muted-foreground))] mt-8">
            By creating an account, you agree to our{' '}
            <Link href="/terms" className="underline hover:text-[hsl(var(--foreground))]">Terms</Link>
            {' '}and{' '}
            <Link href="/privacy" className="underline hover:text-[hsl(var(--foreground))]">Privacy Policy</Link>.
            California residents: see our{' '}
            <Link href="/privacy#ccpa" className="underline hover:text-[hsl(var(--foreground))]">CCPA Notice</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
