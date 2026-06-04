import { useEffect, useRef, useState } from 'react';

interface Options extends IntersectionObserverInit {
  triggerOnce?: boolean;
}

export function useIntersectionObserver<T extends Element>(
  options: Options = {}
): [React.RefObject<T>, boolean] {
  const { triggerOnce = false, ...observerOptions } = options;
  const ref = useRef<T>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);
  const hasTriggered = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (triggerOnce && hasTriggered.current) return;
      const value = entry.isIntersecting;
      setIsIntersecting(value);
      if (value && triggerOnce) {
        hasTriggered.current = true;
        observer.disconnect();
      }
    }, observerOptions);

    observer.observe(el);
    return () => observer.disconnect();
  }, [triggerOnce, observerOptions.root, observerOptions.rootMargin, observerOptions.threshold]);

  return [ref, isIntersecting];
}
