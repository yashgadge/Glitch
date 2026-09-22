import React from 'react';
import { FileQuestion } from 'lucide-react';
import { cn } from './Card';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: React.ElementType;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon = FileQuestion,
  title,
  description,
  actionLabel,
  onAction,
  className
}: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-8 text-center min-h-[300px] border border-dashed border-white/10 rounded-2xl bg-white/5", className)}>
      <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-gray-500" />
      </div>
      <h3 className="text-lg font-medium text-white mb-2 font-inter">{title}</h3>
      {description && (
        <p className="text-sm text-gray-400 max-w-sm mb-6 font-inter">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="primary">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
