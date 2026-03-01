'use client';

import { useState } from 'react';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { RatingStars } from './RatingStars';
import type { Currency } from '@/types';

interface FilterSidebarProps {
  filters: {
    categories: string[];
    minPrice?: number;
    maxPrice?: number;
    rating?: number;
    inStock?: boolean;
    tags: string[];
  };
  facets: {
    categories: { name: string; slug: string; count: number }[];
    priceRange: { min: number; max: number };
    availableTags: string[];
  };
  currency: Currency;
  onFiltersChange: (filters: any) => void;
  onClearFilters: () => void;
  className?: string;
  isMobile?: boolean;
}

function FilterSection({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }): JSX.Element {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-gray-200 py-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full text-left font-medium text-gray-900 mb-3"
      >
        {title}
        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {isOpen && <div className="space-y-3">{children}</div>}
    </div>
  );
}

function FilterContent({ filters, facets, currency, onFiltersChange, onClearFilters }: FilterSidebarProps): JSX.Element {
  const currencySymbol = currency === 'USD' ? '$' : '£';
  const maxPriceRange = currency === 'USD' ? 500 : 400;

  const hasActiveFilters =
    filters.categories.length > 0 ||
    filters.minPrice !== undefined ||
    filters.maxPrice !== undefined ||
    filters.rating !== undefined ||
    filters.inStock ||
    filters.tags.length > 0;

  const handleCategoryChange = (slug: string, checked: boolean): void => {
    const newCategories = checked
      ? [...filters.categories, slug]
      : filters.categories.filter((c) => c !== slug);
    onFiltersChange({ ...filters, categories: newCategories });
  };

  const handlePriceRangeChange = (values: number[]): void => {
    onFiltersChange({ ...filters, minPrice: values[0], maxPrice: values[1] });
  };

  const handleMinPriceInput = (value: string): void => {
    const num = parseFloat(value);
    if (!isNaN(num)) {
      onFiltersChange({ ...filters, minPrice: num });
    }
  };

  const handleMaxPriceInput = (value: string): void => {
    const num = parseFloat(value);
    if (!isNaN(num)) {
      onFiltersChange({ ...filters, maxPrice: num });
    }
  };

  const handleRatingChange = (rating: number): void => {
    onFiltersChange({ ...filters, rating: filters.rating === rating ? undefined : rating });
  };

  const handleInStockChange = (checked: boolean): void => {
    onFiltersChange({ ...filters, inStock: checked });
  };

  const handleTagChange = (tag: string, checked: boolean): void => {
    const newTags = checked
      ? [...filters.tags, tag]
      : filters.tags.filter((t) => t !== tag);
    onFiltersChange({ ...filters, tags: newTags });
  };

  return (
    <div className="space-y-0">
      {hasActiveFilters && (
        <div className="pb-4 border-b border-gray-200">
          <Button
            variant="outline"
            size="sm"
            onClick={onClearFilters}
            className="w-full gap-2"
          >
            <X className="w-4 h-4" />
            Clear All Filters
          </Button>
        </div>
      )}

      <FilterSection title="Category">
        {facets.categories.map((category) => (
          <div key={category.slug} className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox
                id={`category-${category.slug}`}
                checked={filters.categories.includes(category.slug)}
                onCheckedChange={(checked) => handleCategoryChange(category.slug, checked as boolean)}
              />
              <Label
                htmlFor={`category-${category.slug}`}
                className="text-sm font-normal cursor-pointer"
              >
                {category.name}
              </Label>
            </div>
            <span className="text-sm text-gray-500">({category.count})</span>
          </div>
        ))}
      </FilterSection>

      <FilterSection title="Price Range">
        <Slider
          value={[filters.minPrice || facets.priceRange.min, filters.maxPrice || facets.priceRange.max]}
          min={facets.priceRange.min}
          max={facets.priceRange.max}
          step={1}
          onValueChange={handlePriceRangeChange}
          className="mb-4"
        />
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Label className="text-xs text-gray-500">Min</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                {currencySymbol}
              </span>
              <Input
                type="number"
                value={filters.minPrice || facets.priceRange.min}
                onChange={(e) => handleMinPriceInput(e.target.value)}
                className="pl-7"
              />
            </div>
          </div>
          <div className="flex-1">
            <Label className="text-xs text-gray-500">Max</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                {currencySymbol}
              </span>
              <Input
                type="number"
                value={filters.maxPrice || facets.priceRange.max}
                onChange={(e) => handleMaxPriceInput(e.target.value)}
                className="pl-7"
              />
            </div>
          </div>
        </div>
      </FilterSection>

      <FilterSection title="Rating">
        {[4, 3, 2].map((rating) => (
          <button
            key={rating}
            onClick={() => handleRatingChange(rating)}
            className={`flex items-center gap-2 w-full text-left py-2 px-3 rounded-md transition-colors ${
              filters.rating === rating ? 'bg-gray-100' : 'hover:bg-gray-50'
            }`}
          >
            <RatingStars rating={rating} size="sm" />
            <span className="text-sm">& up</span>
          </button>
        ))}
      </FilterSection>

      <FilterSection title="Availability">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="in-stock"
            checked={filters.inStock || false}
            onCheckedChange={handleInStockChange}
          />
          <Label htmlFor="in-stock" className="text-sm font-normal cursor-pointer">
            In Stock Only
          </Label>
        </div>
      </FilterSection>

      {facets.availableTags.length > 0 && (
        <FilterSection title="Tags">
          {facets.availableTags.map((tag) => (
            <div key={tag} className="flex items-center space-x-2">
              <Checkbox
                id={`tag-${tag}`}
                checked={filters.tags.includes(tag)}
                onCheckedChange={(checked) => handleTagChange(tag, checked as boolean)}
              />
              <Label htmlFor={`tag-${tag}`} className="text-sm font-normal cursor-pointer capitalize">
                {tag.replace('-', ' ')}
              </Label>
            </div>
          ))}
        </FilterSection>
      )}
    </div>
  );
}

export function FilterSidebar(props: FilterSidebarProps): JSX.Element {
  const activeFilterCount =
    props.filters.categories.length +
    (props.filters.minPrice !== undefined ? 1 : 0) +
    (props.filters.rating !== undefined ? 1 : 0) +
    (props.filters.inStock ? 1 : 0) +
    props.filters.tags.length;

  if (props.isMobile) {
    return (
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" className="gap-2">
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-1 bg-gray-900 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-80 overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <FilterContent {...props} />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div className={`${props.className}`}>
      <h2 className="text-lg font-semibold mb-4">Filters</h2>
      <FilterContent {...props} />
    </div>
  );
}
