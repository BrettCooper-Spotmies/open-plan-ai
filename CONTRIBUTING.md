# Contributing to Open Plan AI

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to the project.

## 🚀 Development Setup

### Prerequisites

- Node.js 18+ 
- npm 9+

### Getting Started

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd openplanai
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:5173](http://localhost:5173) in your browser.

## 📝 Code Style Guidelines

### TypeScript

- Use TypeScript strict mode
- Define explicit types for function parameters and return values
- Avoid `any` type - use `unknown` if type is truly unknown
- Prefix unused parameters with underscore: `_event`

### React

- Use functional components with hooks
- Wrap expensive components with `React.memo`
- Use `useCallback` for event handlers passed to child components
- Keep components small and focused (< 200 lines)

### File Organization

- Place components in feature folders: `src/features/<feature>/`
- Create `index.ts` barrel files for clean imports
- Keep tests alongside components: `ComponentName.test.tsx`
- Use `__tests__/` directories for grouped tests

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `TaskCard.tsx` |
| Hooks | camelCase with `use` prefix | `useProjects.ts` |
| Utilities | camelCase | `formatDate.ts` |
| Types/Interfaces | PascalCase | `interface TaskProps` |
| Constants | SCREAMING_SNAKE_CASE | `API_BASE_URL` |

### Styling

- Use Tailwind CSS utility classes
- Use semantic tokens from `index.css` (not raw colors)
- Use shadcn/ui components for common UI patterns
- Maintain responsive design with Tailwind breakpoints

## 📋 Commit Message Conventions

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation changes |
| `style` | Code style changes (formatting, etc.) |
| `refactor` | Code refactoring |
| `test` | Adding or updating tests |
| `chore` | Maintenance tasks |
| `perf` | Performance improvements |

### Examples

```bash
feat(projects): add task filtering by status
fix(calendar): correct date range calculation
docs(readme): update installation instructions
test(reports): add KPI calculation tests
refactor(stores): simplify filter state management
```

## 🧪 Testing Requirements

### Running Tests

```bash
# Run all tests
npm test

# Run in watch mode
npm run test:watch

# Run with coverage
npm test -- --coverage
```

### Test Guidelines

1. **Unit Tests**: Test utility functions and hooks in isolation
2. **Component Tests**: Test component rendering and user interactions
3. **Integration Tests**: Test feature workflows end-to-end

### Test Structure

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('ComponentName', () => {
  it('renders correctly', () => {
    render(<ComponentName />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('handles user interaction', async () => {
    const user = userEvent.setup();
    render(<ComponentName />);
    
    await user.click(screen.getByRole('button'));
    expect(screen.getByText('Success')).toBeInTheDocument();
  });
});
```

## 🔄 Pull Request Process

### Before Submitting

1. Ensure all tests pass: `npm test`
2. Verify type checking: `npm run type-check`
3. Check linting: `npm run lint`
4. Update documentation if needed

### PR Guidelines

1. **Title**: Use conventional commit format
2. **Description**: Explain what and why, not just how
3. **Size**: Keep PRs focused and reviewable (< 400 lines)
4. **Tests**: Include tests for new functionality
5. **Screenshots**: Add screenshots for UI changes

### Review Process

1. At least one approval required
2. All CI checks must pass
3. No unresolved conversations
4. Squash and merge preferred

## 🏗️ Architecture Guidelines

### State Management

- **Zustand stores** for global state (projects, filters, user)
- **React Query** for server state and caching
- **Local state** for component-specific UI state

### Service Layer

- All API calls go through `src/services/api/client.ts`
- Use services in `src/services/` for data operations
- Services return typed data, not raw responses

### Performance

- Use `React.memo` for list item components
- Use `useCallback` for handler props
- Use virtual scrolling for large lists (100+ items)
- Offload heavy calculations to Web Workers

## ❓ Getting Help

- Check existing issues for similar problems
- Create a new issue with detailed reproduction steps
- Tag issues appropriately (bug, feature, question)

Thank you for contributing! 🎉
