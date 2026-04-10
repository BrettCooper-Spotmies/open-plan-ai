# OpenPlan AI - Repository Context & Guide

This document provides a comprehensive overview of the OpenPlan AI codebase. It is designed to help AI agents (like Antigravity, Cursor, Claude) and developers quickly understand the project structure, tech stack, and core business logic.

---

## 1. Project Overview
**OpenPlan AI** is a hardware-native project management platform. It is tailored for hardware development teams, tracking physical prototypes, component dependencies, BOM, and manufacturing transitions.

- **Primary Goal**: Manage complex hardware projects with module-based organization and dependency tracking.
- **Project Status**: ~75% Complete (Production Capable).
- **Core Entities**: Organizations, Projects, Tasks, Modules (subsystems), Milestones, Issues, Team Members, Chat/Messages.

---

## 2. Tech Stack

### Frontend
- **Framework**: React 18 (Vite-based)
- **Language**: TypeScript
- **State Management**: 
    - **Global**: Zustand (`src/stores/`)
    - **Server State**: TanStack React Query v5 (`src/hooks/`)
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Forms**: React Hook Form + Zod
- **Routing**: React Router DOM v6
- **Charts**: Recharts

### Backend
- **Platform**: Supabase (PostgreSQL + Auth + Storage + Realtime)
- **Database**: Complex schema with RLS (Row Level Security), triggers for activity logging, and RPCs for batch operations.
- **Functions**: Supabase Edge Functions (located in `supabase/functions/`)

### Infrastructure
- **Deployment**: Vercel
- **Package Manager**: Bun (recommended) or NPM
- **Testing**: Vitest + React Testing Library

---

## 3. Directory Structure

```text
src/
├── features/          # Domain-driven feature modules (RECOMMENDED PLACE FOR NEW LOGIC)
│   ├── dashboard/     # Summary views and stats
│   ├── projects/      # Core project/task/issue management
│   ├── myday/         # User-specific focus view
│   ├── calendar/      # Event visualization
│   ├── reports/       # Data analytics
│   ├── settings/      # User/Org preferences
│   ├── team/          # User management
│   └── chat/          # Real-time communication
├── components/        # Shared UI components
│   ├── ui/            # shadcn/ui primitives
│   └── layout/        # AppLayout, Sidebar, Header
├── stores/            # Zustand stores (useProjectStore, useUserStore, etc.)
├── hooks/             # Custom hooks and React Query definitions (useProjects, useTasks)
├── services/          # API clients and business logic services
├── lib/               # Utility functions (utils.ts, queryClient.ts)
├── types/             # Global TypeScript interfaces
└── pages/             # Route entry points (Login, Signup, etc.)

supabase/
├── migrations/        # SQL schema and security policies
└── functions/         # Edge functions (e.g., send-invitation)
```

---

## 4. Key Workflows & Patterns

### Feature-Based Development
Always check `src/features/[feature_name]` before adding new components or logic. Avoid putting feature-specific code in the global `src/components` directory.

### Data Fetching
- Use **React Query** hooks in `src/hooks/` for all async data.
- Do NOT fetch data directly in components unless it's a very simple one-off.
- Use `supabase` client via services in `src/services/`.

### State Management
- Use **Zustand** for UI-only global state (e.g., sidebar collapse, active filters).
- Use **React Query** for anything cached from the database.

### Database Security
- The project relies heavily on **RLS**. When performing mutations, ensure the `user_id` or `org_id` is properly handled.
- Many events (like activity logging) are handled by **PostgreSQL triggers** automatically.

---

## 5. IDE Setup (Cursor / Claude / Copilot)

### Formatting Rules
- Follow Prettier/ESLint configs.
- Use functional components with TypeScript.
- Prefer Tailwind classes for styling.

### Important Files to Reference
- `PRD.md`: The single source of truth for features and entity definitions.
- `src/types/index.ts`: Contains the core TypeScript interfaces for the entire domain.
- `src/lib/utils.ts`: Contains the `cn()` utility for Tailwind class merging.

### Common Tasks
- **Adding a new UI component**: Use `npx shadcn-ui@latest add [component]` or check `src/components/ui/`.
- **Modifying the Database**: Add a new migration in `supabase/migrations/` and run `supabase db push` (if local).

---

## 6. How to Run Locally

1. **Install Dependencies**: `bun install` or `npm install`
2. **Environment Variables**: Copy `.env.example` to `.env` and fill in Supabase credentials.
3. **Start Dev Server**: `npm run dev`
4. **Run Tests**: `npm run test`
