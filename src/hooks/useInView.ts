import { useEffect, useRef, useState, useCallback } from 'react';

export interface UseInViewOptions {
  /**
   * Margin around the root. Can have values similar to the CSS margin property.
   * e.g. "0px 0px -50px 0px" or "100px".
   */
  rootMargin?: string;
  /**
   * Either a single number or an array of numbers indicating at what percentage
   * of the target's visibility the observer's callback should be executed.
   */
  threshold?: number | number[];
  /**
   * If true, the observer will disconnect once the element is in view.
   * Defaults to true for entrance animations to eliminate scroll overhead.
   */
  triggerOnce?: boolean;
  /**
   * If true, ignores the observer and immediately sets isInView to true.
   */
  skip?: boolean;
  /**
   * Initial in-view state. Defaults to false.
   */
  initialInView?: boolean;
}

/**
 * High-performance hook that wraps the native IntersectionObserver API.
 * Optimized for 60fps/120fps smooth scrolling by disconnecting immediately
 * when triggerOnce is true, and honoring prefers-reduced-motion.
 */
export function useInView<T extends HTMLElement = HTMLDivElement>(
  options: UseInViewOptions = {}
): [React.RefCallback<T>, boolean, IntersectionObserverEntry | null] {
  const {
    rootMargin = '0px 0px -40px 0px',
    threshold = 0.1,
    triggerOnce = true,
    skip = false,
    initialInView = false,
  } = options;

  const [isInView, setIsInView] = useState<boolean>(() => {
    if (skip) return true;
    if (typeof window !== 'undefined') {
      // If user requested reduced motion or observer not supported, default to true immediately
      const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
      if (prefersReducedMotion || !('IntersectionObserver' in window)) {
        return true;
      }
    }
    return initialInView;
  });

  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);
  const nodeRef = useRef<T | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const triggeredRef = useRef<boolean>(isInView);

  const cleanup = useCallback(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
  }, []);

  const ref = useCallback(
    (node: T | null) => {
      nodeRef.current = node;

      // If already triggered and triggerOnce is true, or skip is active, do nothing
      if (triggeredRef.current && triggerOnce) return;
      if (skip) {
        setIsInView(true);
        return;
      }

      cleanup();

      if (!node) return;

      // Check for browser support
      if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
        setIsInView(true);
        triggeredRef.current = true;
        return;
      }

      // Check prefers-reduced-motion
      if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) {
        setIsInView(true);
        triggeredRef.current = true;
        return;
      }

      const observer = new IntersectionObserver(
        (entries) => {
          const firstEntry = entries[0];
          if (firstEntry && firstEntry.isIntersecting) {
            setIsInView(true);
            setEntry(firstEntry);
            triggeredRef.current = true;

            if (triggerOnce) {
              observer.unobserve(node);
              cleanup();
            }
          } else if (!triggerOnce && firstEntry) {
            setIsInView(false);
            setEntry(firstEntry);
          }
        },
        {
          root: null,
          rootMargin,
          threshold,
        }
      );

      observer.observe(node);
      observerRef.current = observer;
    },
    [rootMargin, threshold, triggerOnce, skip, cleanup]
  );

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return [ref, isInView, entry];
}

export default useInView;
