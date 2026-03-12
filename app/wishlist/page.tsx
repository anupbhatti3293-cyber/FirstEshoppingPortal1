import type { Metadata } from 'next';
import { WishlistPage } from './WishlistPage';

export const metadata: Metadata = {
  title: 'My Wishlist',
  description: 'Your saved LuxeHaven products.',
};

export default function Wishlist() {
  return <WishlistPage />;
}
