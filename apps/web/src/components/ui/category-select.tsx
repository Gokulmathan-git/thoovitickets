'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Category {
  id: string;
  name: string;
  icon: string | null;
  imageUrl: string | null;
}

interface CategorySelectProps {
  categories: Category[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
  id?: string;
}

function CategoryIcon({ cat }: { cat: Category }) {
  const imgSrc = cat.imageUrl || (cat.icon && (cat.icon.startsWith('http') || cat.icon.startsWith('/')) ? cat.icon : null);
  if (imgSrc) {
    return <img src={imgSrc} alt="" className="h-5 w-5 object-contain rounded" />;
  }
  if (cat.icon) {
    return <span className="text-base leading-none">{cat.icon}</span>;
  }
  return <span className="text-base leading-none">🎫</span>;
}

export function CategorySelect({ categories, value, onChange, error, id }: CategorySelectProps) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selected = categories.find((c) => c.id === value);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        buttonRef.current && !buttonRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      document.removeEventListener('mousedown', handler);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open, updatePosition]);

  return (
    <div className="w-full">
      <button
        type="button"
        ref={buttonRef}
        id={id}
        onClick={() => setOpen(!open)}
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-md border bg-white dark:bg-gray-700 px-3 py-2 text-sm text-left focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent',
          error ? 'border-red-500' : 'border-gray-300 dark:border-gray-600',
        )}
      >
        {selected ? (
          <span className="flex items-center gap-2">
            <CategoryIcon cat={selected} />
            <span className="text-gray-900 dark:text-gray-100">{selected.name}</span>
          </span>
        ) : (
          <span className="text-gray-400">Select a category</span>
        )}
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-gray-400 transition-transform', open && 'rotate-180')} />
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-9999 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl max-h-60 overflow-y-auto"
          style={{ top: pos.top, left: pos.left, width: pos.width }}
        >
          <button
            type="button"
            onClick={() => { onChange(''); setOpen(false); }}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Select a category
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => { onChange(cat.id); setOpen(false); }}
              className={cn(
                'flex w-full items-center gap-2.5 px-3 py-2.5 text-sm transition-colors',
                cat.id === value
                  ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400'
                  : 'text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700',
              )}
            >
              <CategoryIcon cat={cat} />
              <span>{cat.name}</span>
            </button>
          ))}
        </div>,
        document.body,
      )}

      {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
