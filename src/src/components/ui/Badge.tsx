import React from 'react';
import { cn } from './Card';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'outline';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variants = {
    default: "bg-primary/20 text-primary border border-primary/50",
    success: "bg-green-500/20 text-green-400 border border-green-500/50",
    warning: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/50",
    danger: "bg-red-500/20 text-red-400 border border-red-500/50",
    outline: "bg-transparent text-gray-300 border border-white/20"
  };

  return (
    <span 
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium font-inter tracking-wider", 
        variants[variant], 
        className
      )}
      {...props}
    />
  );
}
