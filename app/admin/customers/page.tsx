import { Metadata } from 'next';

export const metadata: Metadata = { title: 'Customers — LuxeHaven Admin' };

export default function CustomersPage() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-[#1E3A5F] mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>Customers</h1>
      <p className="text-gray-500 mb-8">View and manage your customer accounts.</p>
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <p className="text-gray-400 text-lg">No customers yet.</p>
        <p className="text-gray-400 text-sm mt-1">Customers will appear here once they register or place an order.</p>
      </div>
    </div>
  );
}
