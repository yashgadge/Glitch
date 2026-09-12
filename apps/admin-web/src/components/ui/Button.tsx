import React from 'react';
import { cn } from './Card';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ElementType;
  rightIcon?: React.ElementType;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, leftIcon: LeftIcon, rightIcon: RightIcon, children, disabled, ...props }, ref) => {
    
    const variants = {
      primary: "bg-primary hover:bg-white text-white hover:text-primary shadow-[0_0_15px_rgba(227,6,19,0.4)] hover:shadow-[0_0_20px_rgba(255,255,255,0.8)] font-bebas tracking-widest",
      secondary: "bg-white/10 hover:bg-white/20 text-white border border-white/10 font-inter",
      outline: "border-2 border-primary text-primary hover:bg-primary/10 font-inter",
      ghost: "bg-transparent hover:bg-white/5 text-gray-300 hover:text-white font-inter",
      danger: "bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 font-inter"
    };

    const sizes = {
      sm: "px-3 py-1.5 text-xs",
      md: "px-6 py-2.5 text-sm",
      lg: "px-8 py-3 text-lg"
    };

    return (
      <button
        ref={ref}
        disabled={isLoading || disabled}
        className={cn(
          "inline-flex items-center justify-center rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        {!isLoading && LeftIcon && <LeftIcon className={cn("w-4 h-4 mr-2", variant === 'primary' ? 'mb-0.5' : '')} />}
        {children}
        {!isLoading && RightIcon && <RightIcon className={cn("w-4 h-4 ml-2", variant === 'primary' ? 'mb-0.5' : '')} />}
      </button>
    );
  }
);
Button.displayName = 'Button';
