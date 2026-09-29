import React, { ElementType, ReactNode, CSSProperties } from 'react';
import { useInView, UseInViewOptions } from '../../hooks/useInView';

export type AnimationVariant =
  | 'fade-up'
  | 'fade-down'
  | 'fade-left'
  | 'fade-right'
  | 'scale-up'
  | 'zoom-in'
  | 'fade'
  | 'hero-scale'
  | 'none';

export interface InViewRevealProps extends UseInViewOptions {
  children: ReactNode | ((props: { isInView: boolean }) => ReactNode);
  variant?: AnimationVariant;
  delay?: number; // In milliseconds
  duration?: number; // In milliseconds
  className?: string;
  as?: ElementType;
  style?: CSSProperties;
  id?: string;
  role?: string;
  onClick?: React.MouseEventHandler;
  staggerIndex?: number;
  staggerDelay?: number; // delay step per index in ms (default 80ms)
}

/**
 * InViewReveal is a zero-dependency, GPU-accelerated component that defers
 * entrance animations until the element enters the user's viewport via IntersectionObserver.
 * Once in view, it disconnects its observer for optimal 60fps/120fps scrolling performance.
 */
export const InViewReveal: React.FC<InViewRevealProps> = ({
  children,
  variant = 'fade-up',
  delay = 0,
  duration = 650,
  className = '',
  as: Component = 'div',
  style = {},
  id,
  role,
  onClick,
  staggerIndex,
  staggerDelay = 75,
  rootMargin = '0px 0px -40px 0px',
  threshold = 0.08,
  triggerOnce = true,
  skip = false,
  initialInView = false,
}) => {
  const [ref, isInView] = useInView<HTMLElement>({
    rootMargin,
    threshold,
    triggerOnce,
    skip,
    initialInView,
  });

  const computedDelay = staggerIndex !== undefined ? staggerIndex * staggerDelay + delay : delay;

  // Determine variant-specific hidden vs visible styles
  const getVariantStyles = (): { hidden: string; visible: string } => {
    switch (variant) {
      case 'fade-up':
        return {
          hidden: 'opacity-0 translate-y-7',
          visible: 'opacity-100 translate-y-0',
        };
      case 'fade-down':
        return {
          hidden: 'opacity-0 -translate-y-7',
          visible: 'opacity-100 translate-y-0',
        };
      case 'fade-left':
        return {
          hidden: 'opacity-0 translate-x-7',
          visible: 'opacity-100 translate-x-0',
        };
      case 'fade-right':
        return {
          hidden: 'opacity-0 -translate-x-7',
          visible: 'opacity-100 translate-x-0',
        };
      case 'scale-up':
      case 'zoom-in':
        return {
          hidden: 'opacity-0 scale-95 translate-y-3',
          visible: 'opacity-100 scale-100 translate-y-0',
        };
      case 'hero-scale':
        return {
          hidden: 'opacity-0 scale-[0.96] translate-y-6',
          visible: 'opacity-100 scale-100 translate-y-0',
        };
      case 'fade':
        return {
          hidden: 'opacity-0',
          visible: 'opacity-100',
        };
      case 'none':
      default:
        return {
          hidden: '',
          visible: '',
        };
    }
  };

  const { hidden, visible } = getVariantStyles();

  const transitionStyle: CSSProperties =
    variant !== 'none'
      ? {
          transitionProperty: 'opacity, transform',
          transitionDuration: `${duration}ms`,
          transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
          transitionDelay: `${computedDelay}ms`,
          willChange: isInView ? 'auto' : 'transform, opacity',
          ...style,
        }
      : style;

  const content = typeof children === 'function' ? children({ isInView }) : children;

  return (
    <Component
      ref={ref as any}
      id={id}
      role={role}
      onClick={onClick}
      style={transitionStyle}
      className={`${variant !== 'none' ? (isInView ? visible : hidden) : ''} ${className}`.trim()}
    >
      {content}
    </Component>
  );
};

export default InViewReveal;
