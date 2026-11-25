import React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { classNames } from '../../utils/helpers';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    variant = 'primary',
    size = 'md',
    isLoading = false,
    leftIcon,
    rightIcon,
    fullWidth = false,
    className,
    disabled,
    children,
    asChild = false,
    ...props
  }, ref) => {
    const baseClasses = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

    const variantClasses = {
      primary: 'bg-notebook-blue-600 text-white hover:bg-notebook-blue-700 active:bg-notebook-blue-800 shadow-lg shadow-notebook-blue-500/25 hover:shadow-notebook-blue-500/40 focus:ring-notebook-blue-500',
      secondary: 'bg-notebook-purple-600 text-white hover:bg-notebook-purple-700 active:bg-notebook-purple-800 shadow-lg shadow-notebook-purple-500/25 hover:shadow-notebook-purple-500/40 focus:ring-notebook-purple-500',
      outline: 'border-2 border-notebook-blue-500 text-notebook-blue-600 hover:bg-notebook-blue-50 active:bg-notebook-blue-100 focus:ring-notebook-blue-500',
      ghost: 'text-notebook-blue-600 hover:bg-notebook-blue-50 active:bg-notebook-blue-100 focus:ring-notebook-blue-500',
      danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-lg shadow-red-500/25 hover:shadow-red-500/40 focus:ring-red-500',
    };

    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm gap-1.5',
      md: 'px-5 py-2.5 text-base gap-2',
      lg: 'px-6 py-3 text-lg gap-2',
      xl: 'px-8 py-4 text-xl gap-3',
    };

    const widthClass = fullWidth ? 'w-full' : '';

    const buttonContent = (
      <>
        {isLoading ? (
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : leftIcon ? (
          <span className="flex-shrink-0">{leftIcon}</span>
        ) : null}
        <span>{children}</span>
        {!isLoading && rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
      </>
    );

    if (asChild) {
      return (
        <Slot ref={ref} {...props} className={classNames(baseClasses, variantClasses[variant], sizeClasses[size], widthClass, className)}>
          {buttonContent}
        </Slot>
      );
    }

    return (
      <button
        ref={ref}
        className={classNames(baseClasses, variantClasses[variant], sizeClasses[size], widthClass, className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {buttonContent}
      </button>
    );
  }
);

Button.displayName = 'Button';

export const IconButton = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  'aria-label': string;
}>(
  ({ variant = 'ghost', size = 'md', 'aria-label': ariaLabel, className, children, ...props }, ref) => {
    const baseClasses = 'inline-flex items-center justify-center rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';

    const variantClasses = {
      primary: 'bg-notebook-blue-600 text-white hover:bg-notebook-blue-700 focus:ring-notebook-blue-500',
      secondary: 'bg-notebook-purple-600 text-white hover:bg-notebook-purple-700 focus:ring-notebook-purple-500',
      outline: 'border-2 border-notebook-blue-500 text-notebook-blue-600 hover:bg-notebook-blue-50 focus:ring-notebook-blue-500',
      ghost: 'text-notebook-blue-600 hover:bg-notebook-blue-50 focus:ring-notebook-blue-500',
      danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    };

    const sizeClasses = {
      sm: 'p-1.5',
      md: 'p-2',
      lg: 'p-3',
    };

    return (
      <button
        ref={ref}
        className={classNames(baseClasses, variantClasses[variant], sizeClasses[size], className)}
        aria-label={ariaLabel}
        {...props}
      >
        {children}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';