import type { Metadata } from 'next';
import { LoginForm } from './LoginForm';

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to your LuxeHaven account to access your wishlist, orders, and account settings.',
};

export default function LoginPage() {
  return <LoginForm />;
}
