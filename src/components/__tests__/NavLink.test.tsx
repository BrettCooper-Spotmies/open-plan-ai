import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { screen } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { NavLink } from '../NavLink';

// Helper to render NavLink with router context
const renderWithRouter = (
  ui: React.ReactElement,
  { initialEntries = ['/'] }: { initialEntries?: string[] } = {}
) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      {ui}
    </MemoryRouter>
  );
};

describe('NavLink', () => {
  describe('basic rendering', () => {
    it('should render a link with correct href', () => {
      renderWithRouter(<NavLink to="/dashboard">Dashboard</NavLink>);

      const link = screen.getByRole('link', { name: 'Dashboard' });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/dashboard');
    });

    it('should render children content', () => {
      renderWithRouter(
        <NavLink to="/test">
          <span>Link Text</span>
        </NavLink>
      );

      expect(screen.getByText('Link Text')).toBeInTheDocument();
    });

    it('should render complex children', () => {
      renderWithRouter(
        <NavLink to="/test">
          <span className="icon">🏠</span>
          <span>Home</span>
        </NavLink>
      );

      expect(screen.getByText('🏠')).toBeInTheDocument();
      expect(screen.getByText('Home')).toBeInTheDocument();
    });
  });

  describe('className handling', () => {
    it('should apply base className', () => {
      renderWithRouter(
        <NavLink to="/test" className="base-class">
          Link
        </NavLink>
      );

      const link = screen.getByRole('link');
      expect(link).toHaveClass('base-class');
    });

    it('should apply activeClassName when route is active', () => {
      renderWithRouter(
        <NavLink to="/current" className="base" activeClassName="active-class">
          Active Link
        </NavLink>,
        { initialEntries: ['/current'] }
      );

      const link = screen.getByRole('link');
      expect(link).toHaveClass('base');
      expect(link).toHaveClass('active-class');
    });

    it('should not apply activeClassName when route is not active', () => {
      renderWithRouter(
        <NavLink to="/other" className="base" activeClassName="active-class">
          Inactive Link
        </NavLink>,
        { initialEntries: ['/current'] }
      );

      const link = screen.getByRole('link');
      expect(link).toHaveClass('base');
      expect(link).not.toHaveClass('active-class');
    });

    it('should handle multiple classes', () => {
      renderWithRouter(
        <NavLink 
          to="/test" 
          className="class1 class2" 
          activeClassName="active1 active2"
        >
          Link
        </NavLink>,
        { initialEntries: ['/test'] }
      );

      const link = screen.getByRole('link');
      expect(link).toHaveClass('class1');
      expect(link).toHaveClass('class2');
      expect(link).toHaveClass('active1');
      expect(link).toHaveClass('active2');
    });
  });

  describe('navigation behavior', () => {
    it('should navigate on click', async () => {
      const user = userEvent.setup();
      
      render(
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/" element={<NavLink to="/destination">Go</NavLink>} />
            <Route path="/destination" element={<div>Destination Page</div>} />
          </Routes>
        </MemoryRouter>
      );

      await user.click(screen.getByRole('link', { name: 'Go' }));

      expect(screen.getByText('Destination Page')).toBeInTheDocument();
    });

    it('should update active state after navigation', async () => {
      const user = userEvent.setup();
      
      render(
        <MemoryRouter initialEntries={['/']}>
          <div>
            <NavLink to="/" className="base" activeClassName="active">
              Home
            </NavLink>
            <NavLink to="/about" className="base" activeClassName="active">
              About
            </NavLink>
          </div>
          <Routes>
            <Route path="/" element={<div>Home Page</div>} />
            <Route path="/about" element={<div>About Page</div>} />
          </Routes>
        </MemoryRouter>
      );

      // Initially Home is active
      expect(screen.getByRole('link', { name: 'Home' })).toHaveClass('active');
      expect(screen.getByRole('link', { name: 'About' })).not.toHaveClass('active');

      // Click About
      await user.click(screen.getByRole('link', { name: 'About' }));

      // Now About should be active
      expect(screen.getByRole('link', { name: 'Home' })).not.toHaveClass('active');
      expect(screen.getByRole('link', { name: 'About' })).toHaveClass('active');
    });
  });

  describe('forwarded ref', () => {
    it('should forward ref to anchor element', () => {
      let linkRef: HTMLAnchorElement | null = null;
      
      renderWithRouter(
        <NavLink to="/test" ref={(ref) => { linkRef = ref; }}>
          Link
        </NavLink>
      );

      expect(linkRef).toBeInstanceOf(HTMLAnchorElement);
    });
  });

  describe('additional props', () => {
    it('should pass through additional props', () => {
      renderWithRouter(
        <NavLink to="/test" data-testid="custom-link" aria-label="Custom label">
          Link
        </NavLink>
      );

      const link = screen.getByTestId('custom-link');
      expect(link).toHaveAttribute('aria-label', 'Custom label');
    });

    it('should handle target prop', () => {
      renderWithRouter(
        <NavLink to="/external" target="_blank" rel="noopener">
          External Link
        </NavLink>
      );

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener');
    });
  });

  describe('nested routes', () => {
    it('should handle nested route matching', () => {
      renderWithRouter(
        <NavLink to="/projects" className="base" activeClassName="active">
          Projects
        </NavLink>,
        { initialEntries: ['/projects/123'] }
      );

      // React Router v6's NavLink by default matches the start of the path
      // So /projects is active when on /projects/123
      // Use end prop to require exact matching
      const link = screen.getByRole('link');
      expect(link).toHaveClass('active');
    });

    it('should match exact route', () => {
      renderWithRouter(
        <NavLink to="/projects/123" className="base" activeClassName="active">
          Project 123
        </NavLink>,
        { initialEntries: ['/projects/123'] }
      );

      const link = screen.getByRole('link');
      expect(link).toHaveClass('active');
    });
  });

  describe('edge cases', () => {
    it('should handle empty className', () => {
      renderWithRouter(
        <NavLink to="/test" className="">
          Link
        </NavLink>
      );

      const link = screen.getByRole('link');
      expect(link).toBeInTheDocument();
    });

    it('should handle undefined activeClassName', () => {
      renderWithRouter(
        <NavLink to="/test" className="base">
          Link
        </NavLink>,
        { initialEntries: ['/test'] }
      );

      const link = screen.getByRole('link');
      expect(link).toHaveClass('base');
    });

    it('should handle route with query params', () => {
      renderWithRouter(
        <NavLink to="/test?param=value" className="base" activeClassName="active">
          Link
        </NavLink>,
        { initialEntries: ['/test?param=value'] }
      );

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '/test?param=value');
    });

    it('should handle route with hash', () => {
      renderWithRouter(
        <NavLink to="/test#section" className="base">
          Link
        </NavLink>
      );

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '/test#section');
    });
  });
});
