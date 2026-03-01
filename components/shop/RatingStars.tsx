import { Star } from 'lucide-react';

interface RatingStarsProps {
  rating: number;
  maxRating?: number;
  showValue?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function RatingStars({
  rating,
  maxRating = 5,
  showValue = false,
  size = 'md',
  className = ''
}: RatingStarsProps): JSX.Element {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const stars = Array.from({ length: maxRating }, (_, index) => {
    const starValue = index + 1;
    const isFilled = starValue <= Math.floor(rating);
    const isPartial = starValue > Math.floor(rating) && starValue <= Math.ceil(rating);
    const fillPercentage = isPartial ? ((rating % 1) * 100) : 0;

    return (
      <div key={index} className="relative">
        <Star
          className={`${sizeClasses[size]} text-gray-300`}
          fill="currentColor"
        />
        {(isFilled || isPartial) && (
          <div
            className="absolute inset-0 overflow-hidden"
            style={{ width: isFilled ? '100%' : `${fillPercentage}%` }}
          >
            <Star
              className={`${sizeClasses[size]} text-yellow-400`}
              fill="currentColor"
            />
          </div>
        )}
      </div>
    );
  });

  return (
    <div className={`flex items-center gap-0.5 ${className}`}>
      {stars}
      {showValue && (
        <span className="ml-1 text-sm text-gray-600">
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}
