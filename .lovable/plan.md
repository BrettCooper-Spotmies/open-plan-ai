
# Implement Dark / Light / System Theme

## What's Already in Place

- `next-themes` package is installed
- `tailwind.config.ts` already uses `darkMode: ["class"]` — correct mode for next-themes
- `src/components/ui/sonner.tsx` already calls `useTheme()` from next-themes (but crashes silently because `ThemeProvider` is missing from the tree)
- `UserSettings.theme` type is `'light' | 'dark' | 'system'` in `types/index.ts`
- `useUserStore` persists `preferences.theme` to localStorage via Zustand `persist`
- The Appearance tab UI already exists in Settings — just fully disabled with `opacity-50 pointer-events-none`

## What's Missing

1. `ThemeProvider` from `next-themes` is **never mounted** anywhere in the app — nothing applies dark mode
2. The Appearance tab is disabled and its buttons do nothing
3. There's no bridge between `next-themes` `setTheme` and the Zustand `useUserStore` preferences

## Implementation Plan

### Step 1 — Wrap App with `ThemeProvider` (`src/App.tsx`)

Add `ThemeProvider` from `next-themes` around the existing tree. The `attribute="class"` prop makes next-themes toggle the `dark` class on `<html>`, which is exactly what Tailwind's `darkMode: ["class"]` needs.

```tsx
import { ThemeProvider } from "next-themes";

// Wrap everything:
<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
  {/* existing providers */}
</ThemeProvider>
```

`enableSystem` means when the user picks "System" it follows the OS preference. `disableTransitionOnChange` prevents a white flash on load.

### Step 2 — Create a `useAppTheme` hook (`src/hooks/useAppTheme.ts`)

This thin hook bridges next-themes and the Zustand store so both stay in sync:

```ts
import { useTheme } from "next-themes";
import { useUserStore } from "@/stores/useUserStore";

export function useAppTheme() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const updatePreferences = useUserStore(s => s.updatePreferences);

  const changeTheme = (t: 'light' | 'dark' | 'system') => {
    setTheme(t);                        // next-themes applies the class
    updatePreferences({ theme: t });    // Zustand persists the preference
  };

  return { theme, resolvedTheme, changeTheme };
}
```

On mount, next-themes already reads from its own localStorage key (`theme`). We keep Zustand in sync so the Settings UI shows the correct active selection.

### Step 3 — Initialize theme from Zustand on first load (`src/App.tsx`)

Because `useUserStore` persists to a different localStorage key (`user-store`), and next-themes uses its own key (`theme`), we need a tiny initialization step: read the stored Zustand preference on app start and hand it to `ThemeProvider` via its `defaultTheme` prop, OR simply use the next-themes `storageKey` to read the persisted value.

The cleanest approach: pass `defaultTheme` to `ThemeProvider` from the Zustand store's hydrated value. Because Zustand's `persist` middleware runs synchronously on import, we can read it before render:

```tsx
const storedTheme = useUserStore.getState().preferences.theme;
// then: <ThemeProvider defaultTheme={storedTheme} ...>
```

This is safe because `getState()` is synchronous and doesn't cause re-renders.

### Step 4 — Enable the Appearance Tab (`src/features/settings/Settings.tsx`)

- Remove the `"Coming Soon"` badge from the Appearance tab trigger
- Remove `opacity-50 pointer-events-none` from the Appearance tab content
- Remove `disabled` from the theme buttons and the sidebar/compact switches
- Wire theme buttons to `useAppTheme().changeTheme(theme)`
- Show the active theme with a check mark / border highlight based on `useAppTheme().theme`
- Wire Sidebar Collapsed toggle to `updatePreferences({ sidebarCollapsed: ... })` from Zustand
- Wire Compact Mode toggle to `updatePreferences({ compactMode: ... })` from Zustand
- Add a "Save Appearance" button that shows a toast confirmation (preferences are already saved on change, so the button is instant)
- Remove the tooltip wrapper around the Appearance tab trigger

### Step 5 — Apply `compact` mode class when enabled

When `preferences.compactMode` is true, add a `compact` class to the `<html>` element (or a root div) and add Tailwind overrides in `index.css`:

```css
.compact .card { @apply p-3; }
.compact header { @apply h-12; }
/* etc. */
```

This is non-breaking — the class is simply not applied when compact mode is off.

### Step 6 — Apply `sidebarCollapsed` preference on load

In `AppLayout.tsx`, the `SidebarProvider` accepts a `defaultOpen` prop. Read from `useUserStore`:

```tsx
const sidebarCollapsed = useUserStore(s => s.preferences.sidebarCollapsed);
<SidebarProvider defaultOpen={!sidebarCollapsed}>
```

## Files to Change

| File | Change |
|---|---|
| `src/App.tsx` | Wrap tree with `ThemeProvider`, read `defaultTheme` from Zustand store |
| `src/hooks/useAppTheme.ts` | New hook bridging next-themes + Zustand |
| `src/features/settings/Settings.tsx` | Enable Appearance tab, wire theme buttons + switches to real state |
| `src/components/layout/AppLayout.tsx` | Pass `defaultOpen={!sidebarCollapsed}` to `SidebarProvider` |
| `src/index.css` | Add `.compact` mode utility overrides |

## No Database Changes Needed

Theme preference is stored in the browser's localStorage via Zustand `persist`. No backend storage is needed — themes are inherently per-device preferences.

## How It Works End-to-End

1. User opens the app → `ThemeProvider` reads the stored theme from `next-themes` localStorage key → applies `dark`/`light` class to `<html>` → Tailwind's dark mode variants kick in
2. User goes to Settings → Appearance → clicks "Dark" → `changeTheme('dark')` is called → next-themes immediately toggles the class on `<html>` → the whole app switches themes instantly → Zustand also saves it for the Settings UI indicator
3. User picks "System" → next-themes watches the OS `prefers-color-scheme` media query and automatically switches as the OS changes
4. User refreshes → same theme is restored from localStorage
