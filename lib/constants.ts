export const BRAND = {
  name: 'LuxeHaven',
  tagline: 'Premium Fashion & Jewellery',
  description: 'Discover exquisite jewellery, fashion, and beauty products curated for the modern lifestyle.',
} as const;

export const COLORS = {
  primary: '#1E3A5F',
  secondary: '#2E86AB',
  accent: '#F4A261',
  background: '#FAFAFA',
  text: '#1A1A2E',
} as const;

export const CATEGORIES = [
  {
    id: 'jewellery',
    name: 'Jewellery',
    slug: 'jewellery',
    image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&h=600&fit=crop',
  },
  {
    id: 'clothing',
    name: 'Clothing',
    slug: 'clothing',
    image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&h=600&fit=crop',
  },
  {
    id: 'purses',
    name: 'Purses & Bags',
    slug: 'purses-bags',
    image: 'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=800&h=600&fit=crop',
  },
  {
    id: 'beauty',
    name: 'Beauty',
    slug: 'beauty',
    image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&h=600&fit=crop',
  },
  {
    id: 'sale',
    name: 'Sale',
    slug: 'sale',
    image: 'https://images.unsplash.com/photo-1607083206968-13611e3d76db?w=800&h=600&fit=crop',
  },
] as const;

export const HERO_SLIDES = [
  {
    id: 1,
    image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=1920&h=1080&fit=crop',
    title: 'Timeless Elegance',
    subtitle: 'Discover our exclusive jewellery collection',
    primaryCta: { text: 'Shop Collection', href: '/products' },
    secondaryCta: { text: 'Meet StyleMate AI', href: '/stylemate' },
  },
  {
    id: 2,
    image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1920&h=1080&fit=crop',
    title: 'Curated Fashion',
    subtitle: 'Premium clothing for every occasion',
    primaryCta: { text: 'Shop Collection', href: '/products' },
    secondaryCta: { text: 'Meet StyleMate AI', href: '/stylemate' },
  },
  {
    id: 3,
    image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=1920&h=1080&fit=crop',
    title: 'Beauty Essentials',
    subtitle: 'Your daily luxury routine starts here',
    primaryCta: { text: 'Shop Collection', href: '/products' },
    secondaryCta: { text: 'Meet StyleMate AI', href: '/stylemate' },
  },
] as const;

export const MOCK_PRODUCTS = [
  {
    id: '1',
    name: 'Gold Layered Necklace',
    price: { usd: 89.99, gbp: 69.99 },
    image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400&h=500&fit=crop',
    rating: 4.8,
    reviews: 124,
    badge: 'Trending',
    category: 'jewellery',
  },
  {
    id: '2',
    name: 'Minimalist Ring Set',
    price: { usd: 49.99, gbp: 39.99 },
    image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400&h=500&fit=crop',
    rating: 4.9,
    reviews: 89,
    badge: 'Trending',
    category: 'jewellery',
  },
  {
    id: '3',
    name: 'Pearl Drop Earrings',
    price: { usd: 129.99, gbp: 99.99 },
    image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=400&h=500&fit=crop',
    rating: 5.0,
    reviews: 203,
    badge: 'Trending',
    category: 'jewellery',
  },
  {
    id: '4',
    name: 'Silk Midi Dress',
    price: { usd: 159.99, gbp: 129.99 },
    image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400&h=500&fit=crop',
    rating: 4.7,
    reviews: 67,
    badge: 'Trending',
    category: 'clothing',
  },
  {
    id: '5',
    name: 'Leather Tote Bag',
    price: { usd: 189.99, gbp: 149.99 },
    image: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=400&h=500&fit=crop',
    rating: 4.6,
    reviews: 156,
    badge: null,
    category: 'purses',
  },
  {
    id: '6',
    name: 'Radiance Serum',
    price: { usd: 79.99, gbp: 64.99 },
    image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&h=500&fit=crop',
    rating: 4.9,
    reviews: 312,
    badge: null,
    category: 'beauty',
  },
  {
    id: '7',
    name: 'Cashmere Sweater',
    price: { usd: 199.99, gbp: 159.99 },
    image: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400&h=500&fit=crop',
    rating: 4.8,
    reviews: 94,
    badge: null,
    category: 'clothing',
  },
  {
    id: '8',
    name: 'Diamond Stud Earrings',
    price: { usd: 299.99, gbp: 239.99 },
    image: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=400&h=500&fit=crop',
    rating: 5.0,
    reviews: 178,
    badge: null,
    category: 'jewellery',
  },
  {
    id: '9',
    name: 'Velvet Evening Clutch',
    price: { usd: 119.99, gbp: 94.99 },
    image: 'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=400&h=500&fit=crop',
    rating: 4.7,
    reviews: 45,
    badge: 'NEW',
    category: 'purses',
  },
  {
    id: '10',
    name: 'Luxury Face Cream',
    price: { usd: 149.99, gbp: 119.99 },
    image: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400&h=500&fit=crop',
    rating: 4.9,
    reviews: 267,
    badge: 'NEW',
    category: 'beauty',
  },
  {
    id: '11',
    name: 'Tailored Blazer',
    price: { usd: 249.99, gbp: 199.99 },
    image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400&h=500&fit=crop',
    rating: 4.8,
    reviews: 112,
    badge: 'NEW',
    category: 'clothing',
  },
  {
    id: '12',
    name: 'Rose Gold Bracelet',
    price: { usd: 169.99, gbp: 134.99 },
    image: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=400&h=500&fit=crop',
    rating: 4.9,
    reviews: 201,
    badge: 'NEW',
    category: 'jewellery',
  },
] as const;

export const TRUST_SIGNALS = [
  {
    icon: 'truck',
    title: 'Free Shipping $50+',
    description: 'On all orders over $50',
  },
  {
    icon: 'globe',
    title: 'No UK Customs Fees',
    description: 'Duty paid included',
  },
  {
    icon: 'clock',
    title: '7-12 Day Delivery',
    description: 'Fast worldwide shipping',
  },
  {
    icon: 'refresh-cw',
    title: '30-Day Returns',
    description: 'Easy returns & exchanges',
  },
] as const;

export const NAV_LINKS = [
  { name: 'Jewellery', href: '/products/category/jewellery' },
  { name: 'Clothing', href: '/products/category/clothing' },
  { name: 'Purses & Bags', href: '/products/category/purses-bags' },
  { name: 'Beauty', href: '/products/category/beauty' },
  { name: 'Deals', href: '/products?tags=sale' },
  { name: 'New Arrivals', href: '/products?tags=new' },
] as const;

export const FOOTER_LINKS = {
  shop: [
    { name: 'All Products', href: '/products' },
    { name: 'Jewellery', href: '/products/category/jewellery' },
    { name: 'Clothing', href: '/products/category/clothing' },
    { name: 'Purses & Bags', href: '/products/category/purses-bags' },
    { name: 'Beauty', href: '/products/category/beauty' },
    { name: 'Sale', href: '/products?tags=sale' },
  ],
  company: [
    { name: 'About Us', href: '/about' },
    { name: 'Contact', href: '/contact' },
    { name: 'Careers', href: '/careers' },
    { name: 'Press', href: '/press' },
  ],
  support: [
    { name: 'FAQ', href: '/contact#faq' },
    { name: 'Shipping', href: '/shipping' },
    { name: 'Returns', href: '/returns' },
    { name: 'Track Order', href: '/track-order' },
  ],
  legal: [
    { name: 'Privacy Policy', href: '/privacy' },
    { name: 'Terms of Service', href: '/terms' },
    { name: 'Cookie Policy', href: '/cookies' },
  ],
} as const;

export const SOCIAL_LINKS = [
  { name: 'Instagram', href: 'https://instagram.com/luxehaven', icon: 'instagram' },
  { name: 'Facebook', href: 'https://facebook.com/luxehaven', icon: 'facebook' },
  { name: 'TikTok', href: 'https://tiktok.com/@luxehaven', icon: 'video' },
  { name: 'Pinterest', href: 'https://pinterest.com/luxehaven', icon: 'pinterest' },
] as const;

export const FAQ_ITEMS = [
  {
    question: 'What are your shipping times?',
    answer: 'We offer worldwide shipping with delivery times of 7-12 business days for standard shipping. Express shipping (3-5 days) is available at checkout. All UK orders include duty paid for a seamless delivery experience.',
  },
  {
    question: 'What is your return policy?',
    answer: 'We offer a 30-day return policy on all items. Products must be unused and in original packaging. Return shipping is free for UK and US customers. Refunds are processed within 5-7 business days of receiving your return.',
  },
  {
    question: 'Do you ship internationally?',
    answer: 'Yes! We ship to over 100 countries worldwide. Shipping costs and delivery times vary by destination. All international orders are tracked, and customs documentation is provided.',
  },
  {
    question: 'Are your products authentic?',
    answer: 'Absolutely. We work directly with verified suppliers and conduct quality checks on all products. Every item comes with a certificate of authenticity where applicable, and we stand behind the quality of everything we sell.',
  },
  {
    question: 'How do I track my order?',
    answer: 'Once your order ships, you\'ll receive a tracking number via email. You can also track your order by logging into your account or using our Track Order page. Updates are provided at each shipping milestone.',
  },
] as const;
