import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const buttonVariants = {
  default: 'bg-linear-to-r from-[#ff4a1f] via-[#ff5413] to-[#ff6800] text-white hover:from-[#e0421b] hover:via-[#e04a10] hover:to-[#e05d00] shadow-sm',
  destructive: 'bg-linear-to-r from-red-500 to-red-700 text-white hover:from-red-600 hover:to-red-800 shadow-sm',
  outline: 'border border-gray-300 dark:border-gray-600 bg-linear-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 hover:from-gray-50 hover:to-gray-100 dark:hover:from-gray-700 dark:hover:to-gray-800 text-gray-700 dark:text-gray-200',
  secondary: 'bg-linear-to-b from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 text-gray-900 dark:text-gray-100 hover:from-gray-200 hover:to-gray-300 dark:hover:from-gray-600 dark:hover:to-gray-700',
  ghost: 'hover:bg-linear-to-b hover:from-gray-50 hover:to-gray-100 dark:hover:from-gray-800 dark:hover:to-gray-900 text-gray-700 dark:text-gray-300',
  link: 'text-[#FF541F] dark:text-orange-400 underline-offset-4 hover:underline',
};

const sizeVariants = {
  default: 'h-10 px-4 py-2',
  sm: 'h-9 px-3 text-sm',
  lg: 'h-11 px-8 text-lg',
  icon: 'h-10 w-10',
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', disabled, ...props }, ref) => {
    return (
      <button
        className={cn(
          'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900 disabled:pointer-events-none disabled:opacity-50',
          buttonVariants[variant],
          sizeVariants[size],
          className,
        )}
        ref={ref}
        disabled={disabled}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button };
