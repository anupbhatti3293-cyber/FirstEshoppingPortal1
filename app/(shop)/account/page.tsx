'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { User, MapPin, Plus, Trash2, LogOut, ShoppingBag } from 'lucide-react';

type OrderStatus =
  | 'PENDING_PAYMENT' | 'PROCESSING' | 'SHIPPED'
  | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED'
  | 'REFUNDED' | 'PARTIALLY_REFUNDED';

interface CustomerOrder {
  id: number;
  order_number: string;
  order_token: string;
  status: OrderStatus;
  currency: string;
  total_usd: number;
  total_gbp: number;
  created_at: string;
  tracking_number: string | null;
  order_items: {
    id: number;
    quantity: number;
    product_snapshot: { name: string; image_url: string | null; variant_label: string | null };
  }[];
}

interface UserData {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
}

interface Address {
  id: string;
  type: string;
  is_default: boolean;
  first_name: string;
  last_name: string;
  company: string | null;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state_province: string | null;
  postal_code: string;
  country: string;
  phone: string | null;
}

const STATUS_COLOURS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: 'bg-yellow-100 text-yellow-800',
  PROCESSING: 'bg-blue-100 text-blue-800',
  SHIPPED: 'bg-purple-100 text-purple-800',
  OUT_FOR_DELIVERY: 'bg-indigo-100 text-indigo-800',
  DELIVERED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-gray-100 text-gray-600',
  REFUNDED: 'bg-red-100 text-red-700',
  PARTIALLY_REFUNDED: 'bg-orange-100 text-orange-700',
};

export default function AccountPage(): JSX.Element {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(true);
  const [user, setUser] = useState<UserData | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const [message, setMessage] = useState<string>('');
  const [showAddressForm, setShowAddressForm] = useState<boolean>(false);

  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
  });

  const [addressData, setAddressData] = useState({
    type: 'shipping',
    isDefault: false,
    firstName: '',
    lastName: '',
    company: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    stateProvince: '',
    postalCode: '',
    country: 'US',
    phone: '',
  });

  useEffect(() => {
    fetchUserData();
    fetchAddresses();
  }, []);

  async function fetchUserData(): Promise<void> {
    try {
      const response = await fetch('/api/auth/me');
      const result = await response.json();
      if (response.status === 401) { router.push('/login'); return; }
      if (result.success) {
        setUser(result.data.user);
        setProfileData({
          firstName: result.data.user.firstName || '',
          lastName: result.data.user.lastName || '',
          phone: result.data.user.phone || '',
        });
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchAddresses(): Promise<void> {
    try {
      const response = await fetch('/api/user/addresses');
      const result = await response.json();
      if (result.success) setAddresses(result.data);
    } catch (error) {
      console.error('Failed to fetch addresses:', error);
    }
  }

  const fetchOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const res = await fetch('/api/orders');
      const data = await res.json() as { orders: CustomerOrder[] };
      setOrders(data.orders ?? []);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  async function handleProfileUpdate(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData),
      });
      const result = await response.json();
      if (result.success) {
        setMessage('Profile updated successfully');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  }

  async function handleAddressSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    try {
      const response = await fetch('/api/user/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addressData),
      });
      const result = await response.json();
      if (result.success) {
        setAddresses([result.data, ...addresses]);
        setShowAddressForm(false);
        setAddressData({
          type: 'shipping', isDefault: false, firstName: '', lastName: '',
          company: '', addressLine1: '', addressLine2: '', city: '',
          stateProvince: '', postalCode: '', country: 'US', phone: '',
        });
        setMessage('Address added successfully');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      console.error('Failed to add address:', error);
    }
  }

  async function handleDeleteAddress(id: string): Promise<void> {
    if (!confirm('Are you sure you want to delete this address?')) return;
    try {
      const response = await fetch(`/api/user/addresses/${id}`, { method: 'DELETE' });
      const result = await response.json();
      if (result.success) {
        setAddresses(addresses.filter((addr) => addr.id !== id));
        setMessage('Address deleted successfully');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      console.error('Failed to delete address:', error);
    }
  }

  async function handleLogout(): Promise<void> {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
      router.refresh();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-gray-600">Loading account...</p>
      </div>
    );
  }

  if (!user) return <div></div>;

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1
              className="text-4xl font-bold text-[#1A1A2E] mb-2"
              style={{ fontFamily: 'Playfair Display, serif' }}
            >
              My Account
            </h1>
            <p className="text-gray-600">{user.email}</p>
          </div>
          <Button
            variant="outline"
            onClick={handleLogout}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>

        {message && (
          <Alert className="mb-6">
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="profile" className="w-full" onValueChange={(v) => { if (v === 'orders') fetchOrders(); }}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">
              <User className="h-4 w-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="addresses">
              <MapPin className="h-4 w-4 mr-2" />
              Addresses
            </TabsTrigger>
            <TabsTrigger value="orders">
              <ShoppingBag className="h-4 w-4 mr-2" />
              Orders
            </TabsTrigger>
          </TabsList>

          {/* ── Profile Tab ── */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Update your personal information</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileUpdate} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        value={profileData.firstName}
                        onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        value={profileData.lastName}
                        onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" value={user.email} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                    />
                  </div>
                  <Button type="submit" className="bg-[#2E86AB] hover:bg-[#1E3A5F]">Save Changes</Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Addresses Tab ── */}
          <TabsContent value="addresses">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Saved Addresses</h2>
                <Button onClick={() => setShowAddressForm(!showAddressForm)} className="bg-[#2E86AB] hover:bg-[#1E3A5F]">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Address
                </Button>
              </div>

              {showAddressForm && (
                <Card>
                  <CardHeader><CardTitle>Add New Address</CardTitle></CardHeader>
                  <CardContent>
                    <form onSubmit={handleAddressSubmit} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="addrFirstName">First Name</Label>
                          <Input id="addrFirstName" value={addressData.firstName}
                            onChange={(e) => setAddressData({ ...addressData, firstName: e.target.value })} required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="addrLastName">Last Name</Label>
                          <Input id="addrLastName" value={addressData.lastName}
                            onChange={(e) => setAddressData({ ...addressData, lastName: e.target.value })} required />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="addressLine1">Address Line 1</Label>
                        <Input id="addressLine1" value={addressData.addressLine1}
                          onChange={(e) => setAddressData({ ...addressData, addressLine1: e.target.value })} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="addressLine2">Address Line 2 (Optional)</Label>
                        <Input id="addressLine2" value={addressData.addressLine2}
                          onChange={(e) => setAddressData({ ...addressData, addressLine2: e.target.value })} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="city">City</Label>
                          <Input id="city" value={addressData.city}
                            onChange={(e) => setAddressData({ ...addressData, city: e.target.value })} required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="postalCode">{addressData.country === 'GB' ? 'Postcode' : 'ZIP Code'}</Label>
                          <Input id="postalCode" value={addressData.postalCode}
                            onChange={(e) => setAddressData({ ...addressData, postalCode: e.target.value })} required />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="country">Country</Label>
                          <Select value={addressData.country} onValueChange={(value) => setAddressData({ ...addressData, country: value })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="US">United States</SelectItem>
                              <SelectItem value="GB">United Kingdom</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="stateProvince">{addressData.country === 'GB' ? 'County (Optional)' : 'State'}</Label>
                          <Input id="stateProvince" value={addressData.stateProvince}
                            onChange={(e) => setAddressData({ ...addressData, stateProvince: e.target.value })} />
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <Button type="submit" className="bg-[#2E86AB] hover:bg-[#1E3A5F]">Save Address</Button>
                        <Button type="button" variant="outline" onClick={() => setShowAddressForm(false)}>Cancel</Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}

              {addresses.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-600">No addresses saved yet</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {addresses.map((address) => (
                    <Card key={address.id}>
                      <CardContent className="p-6">
                        <div className="flex justify-between">
                          <div>
                            {address.is_default && (
                              <span className="inline-block bg-[#2E86AB] text-white text-xs px-2 py-1 rounded mb-2">Default</span>
                            )}
                            <p className="font-medium text-[#1A1A2E]">{address.first_name} {address.last_name}</p>
                            <p className="text-sm text-gray-600">{address.address_line1}</p>
                            {address.address_line2 && <p className="text-sm text-gray-600">{address.address_line2}</p>}
                            <p className="text-sm text-gray-600">{address.city}, {address.state_province} {address.postal_code}</p>
                            <p className="text-sm text-gray-600">{address.country === 'US' ? 'United States' : 'United Kingdom'}</p>
                          </div>
                          <div>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteAddress(address.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── Orders Tab ── */}
          <TabsContent value="orders">
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-[#1A1A2E]">Order History</h2>

              {ordersLoading ? (
                <Card><CardContent className="py-12 text-center text-gray-400">Loading orders…</CardContent></Card>
              ) : orders.length === 0 ? (
                <Card>
                  <CardContent className="py-16 text-center">
                    <ShoppingBag className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-600 mb-4">You haven't placed any orders yet.</p>
                    <Link href="/products">
                      <Button className="bg-[#2E86AB] hover:bg-[#1E3A5F]">Start Shopping</Button>
                    </Link>
                  </CardContent>
                </Card>
              ) : (
                orders.map(order => (
                  <Card key={order.id} className="overflow-hidden">
                    {/* Order header row */}
                    <div
                      className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-gray-50"
                      onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                    >
                      <div>
                        <p className="font-mono font-bold text-[#1A1A2E]">{order.order_number}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${STATUS_COLOURS[order.status]}`}>
                          {order.status.replace(/_/g, ' ')}
                        </span>
                        <p className="font-bold text-[#1A1A2E]">
                          {order.currency === 'GBP' ? `£${order.total_gbp.toFixed(2)}` : `$${order.total_usd.toFixed(2)}`}
                        </p>
                        <span className="text-gray-400 text-sm">{expandedOrderId === order.id ? '▲' : '▼'}</span>
                      </div>
                    </div>

                    {/* Expanded items + track button */}
                    {expandedOrderId === order.id && (
                      <CardContent className="border-t pt-4 pb-5">
                        <div className="space-y-3 mb-4">
                          {order.order_items.map(item => (
                            <div key={item.id} className="flex items-center gap-3">
                              {item.product_snapshot.image_url && (
                                <img src={item.product_snapshot.image_url} alt={item.product_snapshot.name}
                                  className="w-12 h-12 object-cover rounded border" />
                              )}
                              <div className="flex-1">
                                <p className="font-medium text-sm">{item.product_snapshot.name}</p>
                                {item.product_snapshot.variant_label && (
                                  <p className="text-xs text-gray-400">{item.product_snapshot.variant_label}</p>
                                )}
                              </div>
                              <span className="text-sm text-gray-500">×{item.quantity}</span>
                            </div>
                          ))}
                        </div>
                        <Link href={`/orders/${order.id}/tracking?token=${order.order_token}`}>
                          <Button className="w-full bg-[#2E86AB] hover:bg-[#1E3A5F]">
                            📦 Track Order
                          </Button>
                        </Link>
                      </CardContent>
                    )}
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
}
