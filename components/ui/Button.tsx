import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const variantStyles = {
    primary: 'bg-[#FF7A19] text-white hover:bg-[#E66600] focus:ring-[#FF7A19] active:bg-[#B34F00]',
    secondary: 'bg-[#1A1A1A] text-white hover:bg-[#3A3A3A] focus:ring-[#1A1A1A] active:bg-[#000000]',
    outline: 'border-2 border-[#FF7A19] text-[#FF7A19] hover:bg-orange-50 focus:ring-[#FF7A19]',
    ghost: 'text-[#3A3A3A] hover:bg-gray-100 focus:ring-gray-400',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 active:bg-red-800',
  };

  const sizeStyles = {
    sm: 'text-sm px-3 py-1.5 gap-1.5 min-h-11 md:min-h-0',
    md: 'text-base px-4 py-2 gap-2 min-h-11 md:min-h-0',
    lg: 'text-lg px-6 py-3 gap-2.5 min-h-11',
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      disabled={disabled || isLoading}
      suppressHydrationWarning
      {...props}
    >
      {isLoading && <Loader2 className="animate-spin" size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} />}
      {!isLoading && icon && icon}
      {children}
    </button>
  );
};

