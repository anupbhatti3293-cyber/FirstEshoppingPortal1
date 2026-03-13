import { Metadata } from 'next';

export const metadata: Metadata = { title: 'Analytics — LuxeHaven Admin' };

export default function AnalyticsPage() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-[#1E3A5F] mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>Analytics</h1>
      <p className="text-gray-500 mb-8">Revenue, traffic, and conversion insights.</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Total Revenue', value: '$0.00' },
          { label: 'Total Orders', value: '0' },
          { label: 'Conversion Rate', value: '0%' },
          { label: 'Avg Order Value', value: '$0.00' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-gray-500 text-sm">{stat.label}</p>
            <p className="text-3xl font-bold text-[#1E3A5F] mt-1">{stat.value}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <p className="text-gray-400 text-lg">No data yet.</p>
        <p className="text-gray-400 text-sm mt-1">Analytics will populate once customers start browsing and purchasing.</p>
      </div>
    </div>
  );
}
