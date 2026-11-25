import React from 'react';
import { classNames } from '../../utils/helpers';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'default', size = 'md', dot = false, className, children, ...props }, ref) => {
    const variantClasses = {
      default: 'bg-notebook-blue-100 text-notebook-blue-700',
      success: 'bg-green-100 text-green-700',
      warning: 'bg-yellow-100 text-yellow-700',
      danger: 'bg-red-100 text-red-700',
      info: 'bg-cyan-100 text-cyan-700',
      primary: 'bg-notebook-blue-600 text-white',
      secondary: 'bg-notebook-purple-600 text-white',
    };

    const sizeClasses = {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-2.5 py-1 text-sm',
      lg: 'px-3 py-1.5 text-base',
    };

    return (
      <span
        ref={ref}
        className={classNames(
          'inline-flex items-center gap-1.5 font-medium rounded-full',
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {dot && (
          <span
            className={classNames(
              'rounded-full',
              size === 'sm' && 'w-1.5 h-1.5',
              size === 'md' && 'w-2 h-2',
              size === 'lg' && 'w-2.5 h-2.5',
              variant === 'default' && 'bg-notebook-blue-500',
              variant === 'success' && 'bg-green-500',
              variant === 'warning' && 'bg-yellow-500',
              variant === 'danger' && 'bg-red-500',
              variant === 'info' && 'bg-cyan-500',
              variant === 'primary' && 'bg-notebook-blue-300',
              variant === 'secondary' && 'bg-notebook-purple-300',
            )}
          />
        )}
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

interface StatusBadgeProps {
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'draft' | 'active' | 'inactive' | 'generating' | 'preview';
  size?: 'sm' | 'md' | 'lg';
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config: Record<string, { label: string; variant: BadgeProps['variant']; dot: boolean }> = {
    pending: { label: 'Pending', variant: 'warning', dot: true },
    processing: { label: 'Processing', variant: 'info', dot: true },
    completed: { label: 'Completed', variant: 'success', dot: true },
    failed: { label: 'Failed', variant: 'danger', dot: true },
    draft: { label: 'Draft', variant: 'default', dot: true },
    active: { label: 'Active', variant: 'success', dot: true },
    inactive: { label: 'Inactive', variant: 'default', dot: false },
    generating: { label: 'Generating', variant: 'info', dot: true },
    preview: { label: 'Preview', variant: 'warning', dot: true },
  };

  const { label, variant, dot } = config[status] || config.pending;

  return <Badge variant={variant} size={size} dot={dot}>{label}</Badge>;
}