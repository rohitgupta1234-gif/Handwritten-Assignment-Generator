import React from 'react';
import { classNames } from '../../utils/helpers';

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'primary';
  showLabel?: boolean;
  label?: string;
  striped?: boolean;
  animated?: boolean;
}

export function Progress({
  value,
  max = 100,
  size = 'md',
  variant = 'default',
  showLabel = false,
  label,
  striped = false,
  animated = false,
  className,
  ...props
}: ProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const sizeClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  const variantClasses = {
    default: 'bg-notebook-blue-600',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    danger: 'bg-red-500',
    primary: 'bg-notebook-purple-600',
  };

  const trackClasses = 'bg-notebook-blue-100';

  return (
    <div className={classNames('w-full', className)} {...props}>
      {(showLabel || label) && (
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-medium text-notebook-ink-50">
            {label || `${Math.round(percentage)}%`}
          </span>
          {showLabel && (
            <span className="text-sm text-notebook-blue-500 font-mono">
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}
      <div
        className={classNames(
          'relative overflow-hidden rounded-full',
          trackClasses,
          sizeClasses[size]
        )}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label}
      >
        <div
          className={classNames(
            'h-full rounded-full transition-all duration-300 ease-out',
            variantClasses[variant],
            striped && 'bg-stripes',
            animated && 'animate-stripes'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

interface CircularProgressProps extends React.SVGAttributes<SVGSVGElement> {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'primary';
  showLabel?: boolean;
  label?: string;
  thickness?: number;
}

export function CircularProgress({
  value,
  max = 100,
  size = 60,
  strokeWidth = 4,
  variant = 'default',
  showLabel = true,
  label,
  className,
  ...props
}: CircularProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  const variantColors = {
    default: '#3b82f6',
    success: '#22c55e',
    warning: '#f59e0b',
    danger: '#ef4444',
    primary: '#a855f7',
  };

  const trackColor = '#dbeafe';

  return (
    <svg
      width={size}
      height={size}
      className={classNames('transform -rotate-90', className)}
      {...props}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={trackColor}
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={variantColors[variant]}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="transition-all duration-500 ease-out"
        style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
      />
      {showLabel && (
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={size * 0.25}
          fontWeight="600"
          fill="#1e3a8a"
          fontFamily="Inter, system-ui, sans-serif"
        >
          {label || `${Math.round(percentage)}%`}
        </text>
      )}
    </svg>
  );
}

interface StepProgressProps {
  steps: { label: string; description?: string; completed?: boolean; current?: boolean }[];
  variant?: 'horizontal' | 'vertical';
  className?: string;
}

export function StepProgress({ steps, variant = 'horizontal', className }: StepProgressProps) {
  return (
    <div className={classNames('relative', className)}>
      {variant === 'horizontal' ? (
        <div className="flex items-start">
          {steps.map((step, index) => (
            <div key={step.label} className="flex flex-col items-center flex-1 relative">
              <div className="relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300">
                {step.completed ? (
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : step.current ? (
                  <span className="w-2.5 h-2.5 rounded-full animate-pulse" />
                ) : (
                  <span className="text-notebook-blue-300 font-medium text-sm">{index + 1}</span>
                )}
              </div>
              <div className="mt-2 text-center">
                <p className={classNames(
                  'text-sm font-medium',
                  step.completed || step.current ? 'text-notebook-blue-700' : 'text-notebook-blue-400'
                )}>
                  {step.label}
                </p>
                {step.description && (
                  <p className="text-xs text-notebook-blue-400 mt-0.5">{step.description}</p>
                )}
              </div>
              {index < steps.length - 1 && (
                <div className={classNames(
                  'absolute top-5 left-1/2 w-full h-0.5 -ml-1/2',
                  step.completed ? 'bg-notebook-blue-500' : 'bg-notebook-blue-200'
                )} />
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {steps.map((step, index) => (
            <div key={step.label} className="flex gap-4 relative">
              <div className="relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 flex-shrink-0">
                {step.completed ? (
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : step.current ? (
                  <span className="w-2.5 h-2.5 rounded-full animate-pulse" />
                ) : (
                  <span className="text-notebook-blue-300 font-medium text-sm">{index + 1}</span>
                )}
              </div>
              <div className="flex-1 pt-1">
                <p className={classNames(
                  'text-sm font-medium',
                  step.completed || step.current ? 'text-notebook-blue-700' : 'text-notebook-blue-400'
                )}>
                  {step.label}
                </p>
                {step.description && (
                  <p className="text-xs text-notebook-blue-400 mt-0.5">{step.description}</p>
                )}
              </div>
              {index < steps.length - 1 && (
                <div className={classNames(
                  'absolute left-5 top-10 w-0.5 h-full',
                  step.completed ? 'bg-notebook-blue-500' : 'bg-notebook-blue-200'
                )} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}