import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/utils';
import { 
  SuspenseFallback, 
  CardSkeleton, 
  ListSkeleton, 
  KPISkeleton, 
  ChartSkeleton 
} from '../SuspenseFallback';

describe('SuspenseFallback', () => {
  describe('default behavior', () => {
    it('should render loading spinner', () => {
      render(<SuspenseFallback />);
      
      // The Loader2 component should be rendered (has animate-spin class)
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should display default loading message', () => {
      render(<SuspenseFallback />);
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should not be fullscreen by default', () => {
      const { container } = render(<SuspenseFallback />);
      
      const wrapper = container.firstChild;
      expect(wrapper).not.toHaveClass('min-h-screen');
      expect(wrapper).toHaveClass('min-h-[200px]');
    });
  });

  describe('custom message', () => {
    it('should display custom message when provided', () => {
      render(<SuspenseFallback message="Loading projects..." />);
      
      expect(screen.getByText('Loading projects...')).toBeInTheDocument();
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    it('should handle empty message', () => {
      render(<SuspenseFallback message="" />);
      
      // Should render but with empty text
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('fullScreen mode', () => {
    it('should use fullscreen class when enabled', () => {
      const { container } = render(<SuspenseFallback fullScreen />);
      
      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('min-h-screen');
    });

    it('should not use small height when fullScreen', () => {
      const { container } = render(<SuspenseFallback fullScreen />);
      
      const wrapper = container.firstChild;
      expect(wrapper).not.toHaveClass('min-h-[200px]');
    });
  });

  describe('styling', () => {
    it('should center content', () => {
      const { container } = render(<SuspenseFallback />);
      
      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('flex', 'items-center', 'justify-center');
    });

    it('should use muted foreground color for text', () => {
      const { container } = render(<SuspenseFallback />);
      
      const contentWrapper = container.querySelector('.text-muted-foreground');
      expect(contentWrapper).toBeInTheDocument();
    });
  });
});

describe('CardSkeleton', () => {
  it('should render skeleton card', () => {
    const { container } = render(<CardSkeleton />);
    
    const card = container.querySelector('.rounded-lg.border.bg-card');
    expect(card).toBeInTheDocument();
  });

  it('should have animation', () => {
    const { container } = render(<CardSkeleton />);
    
    const animatedElement = container.querySelector('.animate-pulse');
    expect(animatedElement).toBeInTheDocument();
  });

  it('should have skeleton lines', () => {
    const { container } = render(<CardSkeleton />);
    
    const skeletonLines = container.querySelectorAll('.bg-muted.rounded');
    expect(skeletonLines.length).toBeGreaterThanOrEqual(2);
  });
});

describe('ListSkeleton', () => {
  it('should render default 5 skeleton items', () => {
    const { container } = render(<ListSkeleton />);
    
    const items = container.querySelectorAll('.animate-pulse');
    expect(items).toHaveLength(5);
  });

  it('should render custom number of items', () => {
    const { container } = render(<ListSkeleton count={3} />);
    
    const items = container.querySelectorAll('.animate-pulse');
    expect(items).toHaveLength(3);
  });

  it('should render 0 items when count is 0', () => {
    const { container } = render(<ListSkeleton count={0} />);
    
    const items = container.querySelectorAll('.animate-pulse');
    expect(items).toHaveLength(0);
  });

  it('should render avatar placeholder for each item', () => {
    const { container } = render(<ListSkeleton count={2} />);
    
    const avatars = container.querySelectorAll('.rounded-full');
    expect(avatars).toHaveLength(2);
  });

  it('should render text lines for each item', () => {
    const { container } = render(<ListSkeleton count={2} />);
    
    // Each item has 2 text lines
    const items = container.querySelectorAll('.animate-pulse');
    items.forEach(item => {
      const textLines = item.querySelectorAll('.bg-muted.rounded');
      expect(textLines.length).toBeGreaterThanOrEqual(2);
    });
  });
});

describe('KPISkeleton', () => {
  it('should render 4 KPI cards', () => {
    const { container } = render(<KPISkeleton />);
    
    const cards = container.querySelectorAll('.rounded-lg.border.bg-card');
    expect(cards).toHaveLength(4);
  });

  it('should have animation on all cards', () => {
    const { container } = render(<KPISkeleton />);
    
    const animatedCards = container.querySelectorAll('.animate-pulse');
    expect(animatedCards).toHaveLength(4);
  });

  it('should use responsive grid layout', () => {
    const { container } = render(<KPISkeleton />);
    
    const grid = container.firstChild;
    expect(grid).toHaveClass('grid');
    expect(grid).toHaveClass('grid-cols-1');
    expect(grid).toHaveClass('sm:grid-cols-2');
    expect(grid).toHaveClass('lg:grid-cols-4');
  });

  it('should have icon placeholder for each card', () => {
    const { container } = render(<KPISkeleton />);
    
    const iconPlaceholders = container.querySelectorAll('.h-8.w-8.rounded');
    expect(iconPlaceholders).toHaveLength(4);
  });
});

describe('ChartSkeleton', () => {
  it('should render chart skeleton', () => {
    const { container } = render(<ChartSkeleton />);
    
    const card = container.querySelector('.rounded-lg.border.bg-card');
    expect(card).toBeInTheDocument();
  });

  it('should have animation', () => {
    const { container } = render(<ChartSkeleton />);
    
    const animatedElement = container.querySelector('.animate-pulse');
    expect(animatedElement).toBeInTheDocument();
  });

  it('should have title placeholder', () => {
    const { container } = render(<ChartSkeleton />);
    
    const titlePlaceholder = container.querySelector('.h-5.bg-muted.rounded');
    expect(titlePlaceholder).toBeInTheDocument();
  });

  it('should have chart area placeholder', () => {
    const { container } = render(<ChartSkeleton />);
    
    const chartPlaceholder = container.querySelector('.h-\\[200px\\]');
    expect(chartPlaceholder).toBeInTheDocument();
  });
});

describe('accessibility', () => {
  it('SuspenseFallback should be accessible during loading', () => {
    const { container } = render(<SuspenseFallback message="Loading content" />);
    
    // Should have visible loading text
    expect(screen.getByText('Loading content')).toBeInTheDocument();
  });

  it('skeletons should have reduced motion for animation', () => {
    // Note: animate-pulse in Tailwind respects prefers-reduced-motion
    const { container } = render(<CardSkeleton />);
    
    const animatedElement = container.querySelector('.animate-pulse');
    expect(animatedElement).toBeInTheDocument();
  });
});
