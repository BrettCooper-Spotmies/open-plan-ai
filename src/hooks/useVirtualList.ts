import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

interface UseVirtualListOptions<T> {
  items: T[];
  estimateSize?: number;
  overscan?: number;
  horizontal?: boolean;
}

export function useVirtualList<T>({
  items,
  estimateSize = 60,
  overscan = 5,
  horizontal = false,
}: UseVirtualListOptions<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();

  return {
    parentRef,
    virtualItems,
    totalSize,
    virtualizer,
    getItem: (index: number) => items[index],
  };
}

// Helper to create virtual list container styles
export function getVirtualContainerStyle(totalSize: number, horizontal = false) {
  return {
    height: horizontal ? 'auto' : `${totalSize}px`,
    width: horizontal ? `${totalSize}px` : '100%',
    position: 'relative' as const,
  };
}

// Helper to create virtual item styles
export function getVirtualItemStyle(start: number, horizontal = false) {
  return {
    position: 'absolute' as const,
    top: horizontal ? 0 : 0,
    left: horizontal ? `${start}px` : 0,
    transform: horizontal ? undefined : `translateY(${start}px)`,
    width: horizontal ? undefined : '100%',
  };
}
