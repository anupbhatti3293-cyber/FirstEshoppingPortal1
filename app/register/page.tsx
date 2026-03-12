import type { Metadata } from 'next';
import { RegisterForm } from './RegisterForm';

export const metadata: Metadata = {
  title: 'Create Account',
  description: 'Join LuxeHaven — create your account to save wishlists, track orders and access exclusive member benefits.',
};

export default function RegisterPage() {
  return <RegisterForm />;
}
