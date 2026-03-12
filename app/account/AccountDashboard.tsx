'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/authContext';
import { User, MapPin, Heart, Package, LogOut, Loader as Loader2, Save, Trash2, Plus, X, Shield } from 'lucide-react';

type Tab = 'profile' | 'addresses' | 'wishlist';

interface Address {
  id: number;
  label: string;
  first_name: string;
  last_name: string;
  line1: string;
  line2: string | null;
  city: string;
  county: string | null;
  postcode: string;
  country: string;
  is_default: boolean;
}

export function AccountDashboard() {
  const { user, logout, refreshUser, wishlistCount } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('profile');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '' });
  const [saveMsg, setSaveMsg] = useState('');
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addingAddress, setAddingAddress] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({ firstName: user.firstName || '', lastName: user.lastName || '', phone: user.phone || '' });
    }
  }, [user]);

  useEffect(() => {
    if (tab === 'addresses') fetchAddresses();
  }, [tab]);

  async function fetchAddresses() {
    const res = await fetch('/api/account/addresses');
    if (res.ok) {
      const { data } = await res.json();
      setAddresses(data || []);
    }
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch('/api/account', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ first_name: form.firstName, last_name: form.lastName, phone: form.phone }),
    });
    setSaving(false);
    if (res.ok) {
      await refreshUser();
      setSaveMsg('Profile updated');
      setTimeout(() => setSaveMsg(''), 3000);
    }
  }

  async function handleLogout() {
    await logout();
    router.push('/');
  }

  async function deleteAccount() {
    if (!confirm('Are you sure? This will permanently anonymise your account and cannot be undone.')) return;
    setDeleting(true);
    await fetch('/api/account', { method: 'DELETE' });
    await logout();
    router.push('/');
  }

  async function deleteAddress(id: number) {
    await fetch(`/api/account/addresses/${id}`, { method: 'DELETE' });
    fetchAddresses();
  }

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="animate-spin text-[hsl(var(--primary))]" size={32} />
    </div>
  );

  const navItems = [
    { id: 'profile' as Tab, label: 'Profile', icon: User },
    { id: 'addresses' as Tab, label: 'Addresses', icon: MapPin },
    { id: 'wishlist' as Tab, label: 'Wishlist', icon: Heart, badge: wishlistCount },
  ];

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      {/* Page header */}
      <div className="bg-white border-b border-[hsl(var(--border))]">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]" style={{ fontFamily: 'Playfair Display, serif' }}>
                My Account
              </h1>
              <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                {user.firstName ? `Welcome back, ${user.firstName}` : user.email}
              </p>
            </div>
            <button onClick={handleLogout}
              className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors">
              <LogOut size={16} />
              Sign out
            </button>
          </div>
          {/* Tab nav */}
          <div className="flex gap-1 mt-6">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  tab === item.id
                    ? 'bg-[hsl(var(--primary))] text-white'
                    : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]'
                }`}
              >
                <item.icon size={15} />
                {item.label}
                {item.badge ? (
                  <span className={`text-xs rounded-full px-1.5 py-0.5 min-w-5 text-center leading-none ${
                    tab === item.id ? 'bg-white/20 text-white' : 'bg-[hsl(var(--accent))] text-white'
                  }`}>{item.badge}</span>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* ── PROFILE TAB ── */}
        {tab === 'profile' && (
          <div className="max-w-lg">
            <div className="bg-white rounded-2xl border border-[hsl(var(--border))] p-6 mb-6">
              <h2 className="text-lg font-semibold mb-5 text-[hsl(var(--foreground))]">Personal Information</h2>
              <form onSubmit={saveProfile} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {(['firstName', 'lastName'] as const).map(field => (
                    <div key={field}>
                      <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5">
                        {field === 'firstName' ? 'First name' : 'Last name'}
                      </label>
                      <input type="text" value={form[field]}
                        onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-lg border border-[hsl(var(--border))] bg-white text-sm
                          focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-transparent transition-all"
                      />
                    </div>
                  ))}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5">Email</label>
                  <input type="email" value={user.email} disabled
                    className="w-full px-4 py-2.5 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted))] text-sm text-[hsl(var(--muted-foreground))] cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5">Phone</label>
                  <input type="tel" value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="+44 7700 000000"
                    className="w-full px-4 py-2.5 rounded-lg border border-[hsl(var(--border))] bg-white text-sm
                      focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-transparent transition-all"
                  />
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <button type="submit" disabled={saving}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[hsl(var(--primary))] text-white text-sm font-medium
                      hover:bg-[hsl(var(--primary)/0.9)] disabled:opacity-60 transition-all">
                    {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                    Save changes
                  </button>
                  {saveMsg && <span className="text-sm text-green-600">{saveMsg}</span>}
                </div>
              </form>
            </div>

            {/* GDPR / danger zone */}
            <div className="bg-white rounded-2xl border border-red-100 p-6">
              <div className="flex items-center gap-2 mb-3">
                <Shield size={16} className="text-red-500" />
                <h2 className="text-sm font-semibold text-[hsl(var(--foreground))]">Privacy & Data</h2>
              </div>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">
                You have the right to request deletion of your personal data (GDPR Article 17).
                Deleting your account will anonymise your profile while preserving order history records.
              </p>
              <button onClick={deleteAccount} disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 text-red-600 text-sm
                  hover:bg-red-50 disabled:opacity-60 transition-all">
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Delete my account
              </button>
            </div>
          </div>
        )}

        {/* ── ADDRESSES TAB ── */}
        {tab === 'addresses' && (
          <div className="max-w-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">Saved Addresses</h2>
              <button onClick={() => setAddingAddress(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[hsl(var(--primary))] text-white text-sm font-medium hover:bg-[hsl(var(--primary)/0.9)] transition-all">
                <Plus size={15} /> Add address
              </button>
            </div>

            {addresses.length === 0 ? (
              <div className="bg-white rounded-2xl border border-[hsl(var(--border))] p-12 text-center">
                <MapPin size={32} className="mx-auto text-[hsl(var(--muted-foreground))] mb-3" />
                <p className="text-[hsl(var(--muted-foreground))] text-sm">No saved addresses yet</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {addresses.map(addr => (
                  <div key={addr.id} className="bg-white rounded-2xl border border-[hsl(var(--border))] p-5 relative">
                    {addr.is_default && (
                      <span className="absolute top-4 right-4 text-xs bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] px-2 py-0.5 rounded-full font-medium">
                        Default
                      </span>
                    )}
                    <p className="font-medium text-sm mb-1">{addr.first_name} {addr.last_name}</p>
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">{addr.line1}</p>
                    {addr.line2 && <p className="text-sm text-[hsl(var(--muted-foreground))]">{addr.line2}</p>}
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">{addr.city}{addr.county ? `, ${addr.county}` : ''}</p>
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">{addr.postcode} · {addr.country}</p>
                    <button onClick={() => deleteAddress(addr.id)}
                      className="mt-3 flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors">
                      <X size={12} /> Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Address Form */}
            {addingAddress && (
              <AddressForm onSave={() => { setAddingAddress(false); fetchAddresses(); }} onCancel={() => setAddingAddress(false)} />
            )}
          </div>
        )}

        {/* ── WISHLIST TAB ── */}
        {tab === 'wishlist' && (
          <div>
            <Link href="/wishlist"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[hsl(var(--primary))] text-white text-sm font-medium hover:bg-[hsl(var(--primary)/0.9)] transition-all">
              <Heart size={15} /> View full wishlist ({wishlistCount} items)
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function AddressForm({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    first_name: '', last_name: '', line1: '', line2: '', city: '',
    county: '', postcode: '', country: 'GB', is_default: false,
  });
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch('/api/account/addresses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setSaving(false);
    onSave();
  }

  const field = (key: keyof typeof form, label: string, placeholder = '', type = 'text') => (
    <div>
      <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">{label}</label>
      <input type={type} value={String(form[key])} placeholder={placeholder}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        className="w-full px-4 py-2.5 rounded-lg border border-[hsl(var(--border))] bg-white text-sm
          focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-transparent transition-all"
      />
    </div>
  );

  return (
    <div className="bg-white rounded-2xl border border-[hsl(var(--border))] p-6 mt-6">
      <h3 className="font-semibold mb-5 text-[hsl(var(--foreground))]">New Address</h3>
      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {field('first_name', 'First name')}
          {field('last_name', 'Last name')}
        </div>
        {field('line1', 'Address line 1', '123 High Street')}
        {field('line2', 'Address line 2 (optional)', 'Flat 4')}
        {field('city', 'Town / City', 'London')}
        <div className="grid grid-cols-2 gap-4">
          {field('county', 'County (optional)', 'Greater London')}
          {field('postcode', 'Postcode', 'SW1A 1AA')}
        </div>
        <div>
          <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">Country</label>
          <select value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
            className="w-full px-4 py-2.5 rounded-lg border border-[hsl(var(--border))] bg-white text-sm
              focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-transparent">
            <option value="GB">United Kingdom</option>
            <option value="US">United States</option>
            <option value="CA">Canada</option>
            <option value="AU">Australia</option>
            <option value="IE">Ireland</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={form.is_default} onChange={e => setForm(f => ({ ...f, is_default: e.target.checked }))}
            className="rounded border-[hsl(var(--border))]" />
          Set as default address
        </label>
        <div className="flex gap-3 pt-1">
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[hsl(var(--primary))] text-white text-sm font-medium
              hover:bg-[hsl(var(--primary)/0.9)] disabled:opacity-60 transition-all">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save address
          </button>
          <button type="button" onClick={onCancel}
            className="px-5 py-2.5 rounded-lg border border-[hsl(var(--border))] text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-all">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
