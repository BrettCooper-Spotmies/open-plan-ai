# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev            # Start Vite dev server (port 5173)
npm run build          # Production build → dist/
npm run preview        # Preview production build
npm run type-check     # tsc --noEmit

# Testing (Vitest)
npm test                                                  # Run once
npm run test:watch                                        # Watch mode
npm test -- --coverage
npm test -- src/features/projects/                        # Single directory
npm test -- --testNamePattern="useProjects"               # Name filter

# Code quality
npm run lint
```

Backend runs separately at `http://localhost:3001`. Set `VITE_API_BASE_URL` and `VITE_WS_URL` in `.env`.

## Architecture

### Routing & Code Splitting

`src/App.tsx` defines all routes with `React.lazy()` + `<Suspense>`. Every feature route is lazy-loaded, giving ~70% smaller initial bundle. Route-level skeleton components exist per variant (dashboard, list, project-detail, calendar, chat).

### Feature Modules (`src/features/`)

All domain logic lives here. Each feature folder contains its page component(s), sub-components, and any feature-specific hooks. New features follow the same pattern: feature folder → register route in `App.tsx`.

BOM feature files: `BOMView.tsx` (orchestrator), `BOMDetailScreen.tsx`, `BOMMapView.tsx`, `BOMShared.tsx`, `bomData.ts` (type definitions, adapter functions `fromApiNode()`/`fromApiRevision()`, and all tree utilities — no mock data). Hooks in `src/hooks/useBom.ts`, `useParts.ts`, `useBomDocuments.ts`.

ECO (Engineering Changes) feature files: `ECOView.tsx` (orchestrator — receives `projectId: string` from `ProjectDetail`), `ECOListView.tsx` (KPI cards + list + preview panel), `ECODetailView.tsx` (full detail + approval pipeline + ECN release), `ECOWizard.tsx` (5-step create wizard), `ECOShared.tsx` (shared pills/avatars), `ecoData.ts` (TypeScript types, enums, adapter functions, helper utilities). Hooks in `src/hooks/useECOs.ts`.

### Data Flow

```
Component → custom hook (src/hooks/) → React Query → Axios client → Backend API
                                                    ↑
                                          Zustand (UI-only state)
```

**React Query** (`src/lib/queryClient.ts`): `staleTime: 5min`, `gcTime: 30min`, `refetchOnWindowFocus: false`. All server data goes through React Query hooks in `src/hooks/`.

**Zustand stores** (`src/stores/`): Three stores — `useProjectStore` (projects + tasks local cache), `useFilterStore` (filter preferences), `useUserStore` (current user + preferences). Only for UI-only global state; don't duplicate React Query data here.

### Auth & API Client (`src/services/api/client.ts`)

Backend uses **httpOnly cookie auth** — the frontend never reads or stores tokens. `withCredentials: true` on the Axios instance sends cookies automatically.

The 401 response interceptor implements a **refresh queue**: all parallel failing requests are queued, a single `POST /auth/refresh` fires, then all queued requests retry. Skip-refresh URLs (login, register, etc.) are enumerated in the interceptor to prevent loops.

All API endpoint strings are constants in `src/services/api/endpoints.ts` — use these rather than inline strings.

### Socket.IO

The socket connection is established once (see the chat feature socket setup). Auth uses the same httpOnly cookie — the backend reads it from the handshake headers. Rooms: `user:{userId}` (auto-joined), `conversation:{id}` (joined via `join-conversation` event), `project:{id}` (for BOM and future real-time features).

### Types

`src/types/index.ts` is the authoritative source for domain types shared across features (`Task`, `Module`, `Milestone`, `TeamMember`, etc.). `ProjectSection` union controls which tabs appear in `ProjectDetail` — add new sections there and in `ProjectDetail.tsx`.

### Testing

Vitest + React Testing Library. Test setup at `src/test/setup.ts`. Path alias `@/` resolves to `src/`. shadcn/ui components are excluded from coverage. Tests live alongside source as `ComponentName.test.tsx` or in `__tests__/` subdirectories.

## Key Conventions

- **Styling**: Tailwind utility classes throughout; `cn()` from `src/lib/utils.ts` for conditional classes. Inline `style={}` only for computed/dynamic values (e.g. exact hex colors, percentage widths). Never use raw hex colors in Tailwind className — use inline styles.
- **Icons**: `lucide-react` exclusively.
- **Components**: shadcn/ui primitives (`Button`, `Dialog`, `Badge`, `Tabs`, `ScrollArea`, etc.) from `src/components/ui/`.
- **BOM category colors** use inline hex (not Tailwind theme-aware) — intentional for the hardware domain color coding.
- **PRD.md** is the authoritative product spec. `src/types/index.ts` is the authoritative type source.
- **New shadcn components**: `npx shadcn-ui@latest add <component>` — outputs to `src/components/ui/`.
- Module type vocabulary and status enumerations are fixed (`TASK_STATUSES`, `PRIORITIES`, `MODULE_TYPES`). Custom values are not supported at v1.
- **Enum case convention**: Backend API returns enum values in lowercase (`in_review`, `design_change`). Frontend TypeScript types use UPPERCASE (`IN_REVIEW`, `DESIGN_CHANGE`). Convert inbound with `.toUpperCase()` in adapter functions; outbound with `.toLowerCase()` in mutation payloads. See `ecoData.ts` adapters for the established pattern.

## ECO — Key Integration Notes

- `useECOs.ts` exports 13 React Query hooks: `useECOList`, `useECOStats`, `useECODetail`, `useCreateECO`, `useUpdateECO`, `useDeleteECO`, `useSubmitECO`, `useECODecision`, `useReleaseECO`, `useVerifyECO`, `useCloseECO`, `useHoldECO`, `useResumeECO`. All invalidate relevant `queryKeys.ecos.*` entries on success.
- `useECOList` uses `apiClient.raw.get` (not the wrapper) to access the paginated response shape `{ data: r.data.data, meta: r.data.meta }`.
- `ecoData.ts` adapter functions: `fromApiEcoListItem(raw: ApiEcoListItem): ECOListItem` and `fromApiEcoDetail(raw: ApiEcoDetail): ECODetail`. These handle the UPPERCASE conversion and map nested objects (parts, steps, diff rows, activities, ECN).
- `ECODetailView` falls back to `buildDetail(eco)` (synthetic pipeline steps) while the live `useECODetail` query loads — avoids a loading spinner for the preview-to-detail transition.
- `ECOListView` preview panel uses `buildDetail(eco)` for pipeline steps — avoids N+1 API calls for each list item.
- **ECN null-check**: `detail.ecn` is `null` for ECOs in `APPROVED` state (ECN doesn't exist until `releaseEco()` is called). Always guard ECN sections with `{ecn && ...}` before rendering distribution list or implementation tasks.
- **`modules` field**: List API returns only `moduleIds: string[]` (UUIDs); `fromApiEcoListItem` sets `modules: []`. The detail API returns full module objects with names — `fromApiEcoDetail` maps them to `raw.modules.map(m => m.name)`.
- Stats route: `/projects/:projectId/ecos/stats` — must be registered before `/:ecoId` on the backend to prevent Express matching `"stats"` as an ecoId.
