import Image from 'next/image';
import Link from 'next/link';
import { CATEGORIES } from '@/lib/constants';

export function CategoryGrid(): JSX.Element {
  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <h2
          className="text-4xl md:text-5xl font-bold text-center mb-12 text-[#1E3A5F]"
          style={{ fontFamily: 'Playfair Display, serif' }}
        >
          Shop by Category
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {CATEGORIES.map((category) => (
            <Link
              key={category.id}
              href={`/category/${category.slug}`}
              className="group relative aspect-[4/5] overflow-hidden rounded-lg"
            >
              <Image
                src={category.image}
                alt={category.name}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-110 group-hover:brightness-110"
                sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute inset-0 flex items-end p-4">
                <h3 className="text-white text-lg md:text-xl font-semibold">
                  {category.name}
                </h3>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
