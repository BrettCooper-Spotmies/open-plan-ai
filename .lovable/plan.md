

# Phase 5 Completion: Fix Critical Gaps

## Current State (Verified)

| Item | Audit Claim | Actual Status |
|------|-------------|---------------|
| `.husky/pre-commit` | Missing | EXISTS - but references missing scripts |
| `test` script | Missing | Missing |
| `test:watch` script | Missing | Missing |
| `type-check` script | Missing | Missing |
| `lint-staged` config | Missing | Missing |
| TypeScript strict | Disabled | Disabled (`strict: false`) |
| husky/lint-staged location | N/A | In dependencies (should be devDependencies) |

The pre-commit hook exists but will fail because it references `npm run type-check` and `npm run test` which don't exist in package.json.

---

## Implementation Plan

### Step 1: Fix package.json Scripts & Configuration

Add missing scripts and lint-staged configuration:

**Changes to `package.json`:**
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "build:dev": "vite build --mode development",
    "lint": "eslint .",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "type-check": "tsc --noEmit"
  },
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix"
    ]
  }
}
```

**Also move to devDependencies:**
- `husky`
- `lint-staged`
- `@testing-library/dom`
- `@testing-library/jest-dom`
- `@testing-library/react`
- `@testing-library/user-event`
- `jsdom`
- `vitest`

---

### Step 2: Enable TypeScript Strict Mode

**Update `tsconfig.app.json`:**
```json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitAny": true
  }
}
```

**Update `tsconfig.json`:**
```json
{
  "compilerOptions": {
    "strictNullChecks": true,
    "noImplicitAny": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

---

### Step 3: Fix Type Errors (Expected Patterns)

After enabling strict mode, fix common issues:

1. **Unused parameters** - Prefix with underscore: `_event`, `_index`
2. **Implicit any** - Add explicit type annotations
3. **Null checks** - Add optional chaining or guards
4. **Unused imports** - Remove or use

Files likely to need updates:
- Components with event handlers (unused event params)
- Service layer (API response types)
- Store selectors (potential undefined returns)
- Test files (mock type assertions)

---

### Step 4: Add prepare script for Husky

Ensure Husky installs correctly on `npm install`:

```json
{
  "scripts": {
    "prepare": "husky"
  }
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `package.json` | Add scripts, lint-staged config, move devDependencies |
| `tsconfig.json` | Enable strict options |
| `tsconfig.app.json` | Enable strict mode |
| Various `.ts/.tsx` files | Fix type errors from strict mode |

---

## Success Criteria

After implementation:
- `npm test` runs Vitest test suite
- `npm run type-check` passes with no errors
- `npm run lint` passes
- Pre-commit hook runs successfully
- TypeScript compiles with `strict: true`
- All tests continue to pass

---

## Estimated Time

| Task | Time |
|------|------|
| Fix package.json | 5 minutes |
| Enable strict mode | 5 minutes |
| Fix type errors | 2-4 hours |
| Verify all tests pass | 30 minutes |
| **Total** | **3-5 hours** |

---

## Priority Order

1. **Fix package.json scripts** - Unblocks pre-commit hook
2. **Add lint-staged config** - Completes tooling setup
3. **Enable TypeScript strict** - Type safety
4. **Fix type errors** - Make build pass
5. **Move devDependencies** - Best practice cleanup

