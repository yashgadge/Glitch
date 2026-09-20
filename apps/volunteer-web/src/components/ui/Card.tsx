import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// eslint-disable-next-line react-refresh/only-export-components
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: CardProps) {
  return (
    <div className={cn("px-6 py-4 border-b border-white/10", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }: CardProps) {
  return (
    <h3 className={cn("font-bebas text-2xl tracking-wider text-white", className)} {...props}>
      {children}
    </h3>
  );
}

export function CardContent({ className, children, ...props }: CardProps) {
  return (
    <div className={cn("p-6", className)} {...props}>
      {children}
    </div>
  );
}

interface StatisticCardProps {
  title: string;
  value: string | number;
  icon?: React.ElementType;
  trend?: { value: number; isPositive: boolean };
}

export function StatisticCard({ title, value, icon: Icon, trend }: StatisticCardProps) {
  return (
    <Card className="hover:bg-white/[0.07] transition-colors duration-300">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="font-inter text-sm font-medium text-gray-400 tracking-wider">{title}</p>
          {Icon && <Icon className="w-5 h-5 text-primary" />}
        </div>
        <div className="flex items-baseline gap-4">
          <h4 className="font-bebas text-4xl tracking-wider text-white">{value}</h4>
          {trend && (
            <span className={cn(
              "font-inter text-sm font-medium",
              trend.isPositive ? "text-green-400" : "text-primary"
            )}>
              {trend.isPositive ? '+' : '-'}{Math.abs(trend.value)}%
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

