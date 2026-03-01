import { Truck, Globe, Clock, RefreshCw } from 'lucide-react';

export function TrustSignalsBar(): JSX.Element {
  const signals = [
    {
      icon: Truck,
      title: 'Free Shipping $50+',
      description: 'On all orders over $50',
    },
    {
      icon: Globe,
      title: 'No UK Customs Fees',
      description: 'Duty paid included',
    },
    {
      icon: Clock,
      title: '7-12 Day Delivery',
      description: 'Fast worldwide shipping',
    },
    {
      icon: RefreshCw,
      title: '30-Day Returns',
      description: 'Easy returns & exchanges',
    },
  ];

  return (
    <section className="py-12 bg-white border-y">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {signals.map((signal, index) => {
            const Icon = signal.icon;
            return (
              <div key={index} className="flex flex-col items-center text-center">
                <div className="mb-3 p-3 bg-[#F4A261]/10 rounded-full">
                  <Icon className="h-8 w-8 text-[#F4A261]" />
                </div>
                <h3 className="font-semibold text-[#1A1A2E] mb-1">
                  {signal.title}
                </h3>
                <p className="text-sm text-gray-600">
                  {signal.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
