import { Metadata } from 'next';

export const metadata: Metadata = { title: 'StyleMate AI — LuxeHaven Admin' };

export default function StyleMateAIPage() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-[#1E3A5F] mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>StyleMate AI</h1>
      <p className="text-gray-500 mb-8">AI-powered product descriptions, SEO optimisation, and quality scoring.</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[
          { label: 'Products Analysed', value: '0' },
          { label: 'Avg Quality Score', value: '—' },
          { label: 'SEO Optimised', value: '0' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-gray-500 text-sm">{stat.label}</p>
            <p className="text-3xl font-bold text-[#1E3A5F] mt-1">{stat.value}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <p className="text-gray-400 text-lg">No AI analysis runs yet.</p>
        <p className="text-gray-400 text-sm mt-1">Connect a supplier and run a product sync to trigger AI analysis.</p>
      </div>
    </div>
  );
}
