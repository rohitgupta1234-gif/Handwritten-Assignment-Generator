import React from 'react';
import { classNames } from '../../utils/helpers';
import { Card } from './Card';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular' | 'card' | 'avatar' | 'button' | 'input' | 'badge' | 'outline' | 'progress';
  width?: string | number;
  height?: string | number;
  lines?: number;
  animation?: 'pulse' | 'wave' | 'none';
}

export function Skeleton({
  variant = 'text',
  width = '100%',
  height,
  lines = 1,
  animation = 'pulse',
  className,
  ...props
}: SkeletonProps) {
  const baseClasses = 'bg-notebook-blue-100 rounded overflow-hidden';
  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-wave',
    none: '',
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    text: {
      width: typeof width === 'number' ? `${width}px` : width,
      height: height || '1rem',
      borderRadius: '0.375rem',
    },
    circular: {
      width: width || '3rem',
      height: height || '3rem',
      borderRadius: '50%',
    },
    rectangular: {
      width: typeof width === 'number' ? `${width}px` : width,
      height: height || '1rem',
      borderRadius: '0.5rem',
    },
    card: {
      width: '100%',
      height: height || '12rem',
      borderRadius: '1rem',
    },
    avatar: {
      width: width || '3rem',
      height: height || '3rem',
      borderRadius: '50%',
    },
    button: {
      width: typeof width === 'number' ? `${width}px` : width,
      height: height || '2.5rem',
      borderRadius: '0.75rem',
    },
    input: {
      width: '100%',
      height: height || '2.5rem',
      borderRadius: '0.75rem',
    },
    badge: {
      width: typeof width === 'number' ? `${width}px` : width,
      height: height || '1.5rem',
      borderRadius: '9999px',
    },
    outline: {
      width: typeof width === 'number' ? `${width}px` : width,
      height: height || '2.5rem',
      borderRadius: '0.75rem',
      border: '2px solid',
      borderColor: '#93c5fd',
      backgroundColor: 'transparent',
    },
    progress: {
      width: '100%',
      height: height || '0.5rem',
      borderRadius: '9999px',
    },
  };

  if (variant === 'text' && lines > 1) {
    return (
      <div className={classNames(baseClasses, animationClasses[animation], className)} {...props}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {Array.from({ length: lines }).map((_, i) => (
            <div
              key={i}
              style={{
                width: i === lines - 1 ? (typeof width === 'number' ? `${width * 0.6}px` : '60%') : '100%',
                height: '1rem',
                borderRadius: '0.375rem',
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={classNames(baseClasses, animationClasses[animation], className)}
      style={variantStyles[variant] || variantStyles.text}
      {...props}
    />
  );
}

interface SkeletonCardProps {
  variant?: 'default' | 'assignment' | 'profile' | 'dashboard';
  className?: string;
}

export function SkeletonCard({ variant = 'default', className }: SkeletonCardProps) {
  const variants = {
    default: (
      <div className="space-y-4">
        <Skeleton variant="rectangular" width="40%" height="1.5rem" />
        <Skeleton variant="text" lines={3} />
        <div className="flex gap-2">
          <Skeleton variant="button" width="80px" />
          <Skeleton variant="button" width="100px" />
        </div>
      </div>
    ),
    assignment: (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton variant="text" width="60%" height="1.25rem" />
          <Skeleton variant="badge" width="80px" height="1.5rem" />
        </div>
        <Skeleton variant="text" width="80%" />
        <div className="flex items-center gap-4 text-sm">
          <Skeleton variant="text" width="100px" height="0.875rem" />
          <Skeleton variant="text" width="120px" height="0.875rem" />
          <Skeleton variant="text" width="80px" height="0.875rem" />
        </div>
        <div className="flex gap-2">
          <Skeleton variant="button" width="100px" />
          <Skeleton variant="outline" width="100px" />
        </div>
      </div>
    ),
    profile: (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton variant="avatar" width="4rem" height="4rem" />
          <div className="space-y-2">
            <Skeleton variant="text" width="40%" height="1.5rem" />
            <Skeleton variant="text" width="30%" height="1rem" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Skeleton variant="circular" width="60px" height="60px" />
          <Skeleton variant="circular" width="60px" height="60px" />
          <Skeleton variant="circular" width="60px" height="60px" />
        </div>
        <Skeleton variant="progress" width="100%" />
      </div>
    ),
    dashboard: (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton variant="card" height="80px" />
          <Skeleton variant="card" height="80px" />
          <Skeleton variant="card" height="80px" />
          <Skeleton variant="card" height="80px" />
        </div>
        <Skeleton variant="card" height="200px" />
        <Skeleton variant="card" height="300px" />
      </div>
    ),
  };

  return (
    <Card variant="hover" padding="lg" className={className}>
      {variants[variant]}
    </Card>
  );
}

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function SkeletonTable({ rows = 5, columns = 4, className }: SkeletonTableProps) {
  return (
    <div className={classNames('overflow-x-auto', className)}>
      <table className="w-full">
        <thead>
          <tr>
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="text-left p-4">
                <Skeleton variant="text" width="80%" height="0.875rem" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <td key={colIndex} className="p-4">
                  <Skeleton variant="text" width="90%" height="1rem" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface SkeletonListProps {
  items?: number;
  variant?: 'simple' | 'avatar' | 'media';
  className?: string;
}

export function SkeletonList({ items = 5, variant = 'simple', className }: SkeletonListProps) {
  const renderItem = () => {
    switch (variant) {
      case 'avatar':
        return (
          <div className="flex items-center gap-4">
            <Skeleton variant="avatar" />
            <div className="flex-1 space-y-2">
              <Skeleton variant="text" width="40%" />
              <Skeleton variant="text" width="30%" height="0.875rem" />
            </div>
            <Skeleton variant="button" width="80px" height="32px" />
          </div>
        );
      case 'media':
        return (
          <div className="flex gap-4">
            <Skeleton variant="rectangular" width="80px" height="80px" />
            <div className="flex-1 space-y-2">
              <Skeleton variant="text" width="60%" height="1.25rem" />
              <Skeleton variant="text" width="80%" />
              <Skeleton variant="text" width="40%" height="0.875rem" />
            </div>
          </div>
        );
      default:
        return (
          <div className="space-y-2">
            <Skeleton variant="text" width="100%" />
            <Skeleton variant="text" width="70%" height="0.875rem" />
          </div>
        );
    }
  };

  return (
    <div className={classNames('space-y-4', className)}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="p-4 bg-white rounded-xl border border-notebook-blue-100">
          {renderItem()}
        </div>
      ))}
    </div>
  );
}