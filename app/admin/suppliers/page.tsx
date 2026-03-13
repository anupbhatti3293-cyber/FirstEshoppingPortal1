import { Metadata } from 'next';

export const metadata: Metadata = { title: 'Suppliers — LuxeHaven Admin' };

export default function SuppliersPage() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-[#1E3A5F] mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>Suppliers</h1>
      <p className="text-gray-500 mb-8">Manage your supplier integrations (CJ Dropshipping, AliExpress, Zendrop).</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {['CJ Dropshipping (Primary)', 'AliExpress via DSers', 'Zendrop'].map((name) => (
          <div key={name} className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-[#1E3A5F] mb-2">{name}</h3>
            <span className="inline-block px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-full">Inactive</span>
            <p className="text-gray-400 text-sm mt-3">Add API key in Settings → Suppliers to activate.</p>
          </div>
        ))}
      </div>
    </div>
  );
}
