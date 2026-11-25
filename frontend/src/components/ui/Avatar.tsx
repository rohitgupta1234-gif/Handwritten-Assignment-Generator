import React from 'react';
import { classNames } from '../../utils/helpers';
import { getInitials } from '../../utils/helpers';

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  shape?: 'circle' | 'square';
  status?: 'online' | 'offline' | 'busy' | 'away';
  statusPosition?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

export const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({
    src,
    alt,
    name,
    size = 'md',
    shape = 'circle',
    status,
    statusPosition = 'bottom-right',
    className,
    ...props
  }, ref) => {
    const sizeClasses = {
      xs: 'w-6 h-6 text-xs',
      sm: 'w-8 h-8 text-sm',
      md: 'w-10 h-10 text-base',
      lg: 'w-12 h-12 text-lg',
      xl: 'w-16 h-16 text-xl',
      '2xl': 'w-24 h-24 text-2xl',
    };

    const shapeClass = shape === 'circle' ? 'rounded-full' : 'rounded-xl';

    const statusSizeClasses = {
      xs: 'w-1.5 h-1.5',
      sm: 'w-2 h-2',
      md: 'w-2.5 h-2.5',
      lg: 'w-3 h-3',
      xl: 'w-4 h-4',
      '2xl': 'w-5 h-5',
    };

    const statusPositionClasses = {
      'bottom-right': 'bottom-0 right-0',
      'bottom-left': 'bottom-0 left-0',
      'top-right': 'top-0 right-0',
      'top-left': 'top-0 left-0',
    };

    const statusColors = {
      online: 'bg-green-500',
      offline: 'bg-gray-400',
      busy: 'bg-red-500',
      away: 'bg-yellow-500',
    };

    const initials = name ? getInitials(name) : '?';
    const bgColor = name
      ? `hsl(${name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 360}, 70%, 50%)`
      : '#9ca3af';

    return (
      <div
        ref={ref}
        className={classNames('relative inline-flex shrink-0', className)}
        {...props}
      >
        <div
          className={classNames(
            'inline-flex items-center justify-center font-medium text-white overflow-hidden',
            sizeClasses[size],
            shapeClass,
            'bg-[${bgColor}]'
          )}
          style={{ backgroundColor: bgColor }}
        >
          {src ? (
            <img
              src={src}
              alt={alt || name || 'Avatar'}
              className="w-full h-full object-cover"
            />
          ) : (
            <span>{initials}</span>
          )}
        </div>
        {status && (
          <span
            className={classNames(
              'absolute rounded-full border-2 border-white',
              statusSizeClasses[size],
              statusColors[status],
              statusPositionClasses[statusPosition]
            )}
            aria-label={`Status: ${status}`}
          />
        )}
      </div>
    );
  }
);

Avatar.displayName = 'Avatar';

interface AvatarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  avatars: { src?: string; name: string; alt?: string }[];
  max?: number;
  size?: AvatarProps['size'];
  overlap?: number;
}

export function AvatarGroup({
  avatars,
  max = 5,
  size = 'md',
  overlap = 8,
  className,
  ...props
}: AvatarGroupProps) {
  const visibleAvatars = avatars.slice(0, max);
  const remainingCount = avatars.length - max;

  return (
    <div
      className={classNames('flex items-center', className)}
      {...props}
      style={{ ...props.style, marginLeft: 0 } as React.CSSProperties}
    >
      {visibleAvatars.map((avatar, index) => (
        <Avatar
          key={avatar.name}
          src={avatar.src}
          name={avatar.name}
          alt={avatar.alt}
          size={size}
          className={index > 0 ? `-ml-${overlap / 4}` : ''}
          style={{ zIndex: visibleAvatars.length - index }}
        />
      ))}
      {remainingCount > 0 && (
        <Avatar
          name={`+${remainingCount}`}
          size={size}
          className={`-ml-${overlap / 4} bg-notebook-blue-100 text-notebook-blue-700 font-medium`}
        />
      )}
    </div>
  );
}