import type { Metadata } from 'next';
import { AccountDashboard } from './AccountDashboard';

export const metadata: Metadata = {
  title: 'My Account',
  description: 'Manage your LuxeHaven account, addresses, and preferences.',
};

export default function AccountPage() {
  return <AccountDashboard />;
}
