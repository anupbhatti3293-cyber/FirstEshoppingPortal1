import { MetricCard } from '@/components/admin/MetricCard';
import { DollarSign, ShoppingCart, Package, Users } from 'lucide-react';

export default function AdminDashboardPage(): JSX.Element {
  return (
    <div>
      <h1 className="text-3xl font-bold text-[#1E3A5F] mb-8">Dashboard Overview</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Total Revenue"
          value="$0.00"
          icon={DollarSign}
          trend={{ value: 0, isPositive: true }}
        />
        <MetricCard
          title="Orders Today"
          value="0"
          icon={ShoppingCart}
          trend={{ value: 0, isPositive: true }}
        />
        <MetricCard
          title="Total Products"
          value="0"
          icon={Package}
          trend={{ value: 0, isPositive: true }}
        />
        <MetricCard
          title="Total Customers"
          value="0"
          icon={Users}
          trend={{ value: 0, isPositive: true }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg border">
          <h2 className="text-xl font-semibold text-[#1E3A5F] mb-4">Recent Orders</h2>
          <p className="text-gray-500">No orders yet. Orders will appear here once customers start purchasing.</p>
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <h2 className="text-xl font-semibold text-[#1E3A5F] mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <a
              href="/admin/products"
              className="block p-3 border rounded-lg hover:bg-[#FAFAFA] transition-colors"
            >
              Add New Product
            </a>
            <a
              href="/admin/orders"
              className="block p-3 border rounded-lg hover:bg-[#FAFAFA] transition-colors"
            >
              View All Orders
            </a>
            <a
              href="/admin/settings"
              className="block p-3 border rounded-lg hover:bg-[#FAFAFA] transition-colors"
            >
              Store Settings
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
