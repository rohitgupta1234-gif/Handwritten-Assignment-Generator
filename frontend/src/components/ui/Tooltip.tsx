import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { classNames } from '../../utils/helpers';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  className?: string;
}

export function Tooltip({
  content,
  children,
  position = 'top',
  delay = 200,
  className,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipRect, setTooltipRect] = useState<DOMRect | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const childRef = useRef<HTMLElement>(null);

  const showTooltip = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };

  const handleMouseEnter = () => showTooltip();
  const handleMouseLeave = () => hideTooltip();
  const handleFocus = () => showTooltip();
  const handleBlur = () => hideTooltip();

  useEffect(() => {
    if (isVisible && childRef.current) {
      const rect = childRef.current.getBoundingClientRect();
      setTooltipRect(rect);
    }
  }, [isVisible]);

  if (!React.isValidElement(children)) {
    throw new Error('Tooltip children must be a single React element');
  }

  const childWithProps = React.cloneElement(children as React.ReactElement, {
    ref: childRef,
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    onFocus: handleFocus,
    onBlur: handleBlur,
  });

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-notebook-ink-50',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-notebook-ink-50',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-notebook-ink-50',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-notebook-ink-50',
  };

  const tooltipContent = isVisible && tooltipRect && (
    <div
      className={classNames(
        'fixed z-50 px-3 py-1.5 text-xs font-medium text-white bg-notebook-ink-50 rounded-lg shadow-lg',
        'whitespace-nowrap pointer-events-none animate-fade-in',
        positionClasses[position],
        className
      )}
      style={{
        top: position === 'top' ? tooltipRect.top : tooltipRect.bottom,
        left: position === 'left' ? tooltipRect.left : tooltipRect.right,
      }}
      role="tooltip"
    >
      {content}
      <div
        className={classNames(
          'absolute w-0 h-0 border-4 border-transparent',
          arrowClasses[position]
        )}
      />
    </div>
  );

  return (
    <>
      {childWithProps}
      {typeof window !== 'undefined' && tooltipContent && createPortal(tooltipContent, document.body)}
    </>
  );
}