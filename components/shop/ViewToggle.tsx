'use client';

import { Grid3x3, List } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ViewToggleProps {
  view: 'grid' | 'list';
  onChange: (view: 'grid' | 'list') => void;
  className?: string;
}

export function ViewToggle({ view, onChange, className = '' }: ViewToggleProps): JSX.Element {
  return (
    <div className={`flex items-center gap-1 border rounded-md p-1 ${className}`}>
      <Button
        variant={view === 'grid' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onChange('grid')}
        className="h-8 w-8 p-0"
        aria-label="Grid view"
      >
        <Grid3x3 className="w-4 h-4" />
      </Button>
      <Button
        variant={view === 'list' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onChange('list')}
        className="h-8 w-8 p-0"
        aria-label="List view"
      >
        <List className="w-4 h-4" />
      </Button>
    </div>
  );
}
