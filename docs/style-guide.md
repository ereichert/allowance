# Style Guide

## Rust

### Formatting & Linting

- `cargo fmt` — enforced, no exceptions
- `cargo clippy -- -D warnings` — all warnings are errors

### Naming

- Types: `PascalCase`
- Functions, methods, variables: `snake_case`
- Constants: `SCREAMING_SNAKE_CASE`
- Crate names: `allowance-{name}` (kebab-case)
- Module files: `snake_case.rs`

### Error Handling

- Library crates (`types`, `domain`, `repo`, `service`): define errors with `thiserror`
- Binary / top-level (`api`, tests): may use `anyhow` for ad-hoc errors
- Never use `.unwrap()` in production code (tests are fine)
- Prefer `?` propagation over match chains

### Types

- Public types: derive `Debug, Clone` at minimum
- API-facing types: also derive `Serialize, Deserialize`
- Use newtypes for IDs: `struct ChoreId(Uuid)` instead of bare `Uuid`
- Monetary values: `i64` cents, never `f64`

### Testing

- Unit tests: `#[cfg(test)] mod tests` within the module
- Integration tests: `backend/tests/` directory
- Test names describe the scenario: `fn assigning_chore_to_person_creates_pending_assignment()`
- Use `assert!` / `assert_eq!` with descriptive messages
- Test both the happy path and all documented error paths.
- Test function names must fully describe the scenario: `fn returns_error_when_description_is_blank()` — not `fn test_error()`.
- No inline comments inside test bodies — rename the test or extract a helper instead.

### Database

- Every operation writing to multiple tables or inserting a collection must use an explicit `sqlx` transaction (`pool.begin()` / `tx.commit()`).
- Prefer a single bulk `INSERT ... VALUES (row1), (row2)` over a loop of individual inserts.

### Dependencies

- Prefer `tokio` for async runtime
- Prefer `sqlx` for database access
- Prefer `axum` for HTTP framework
- Prefer `serde` / `serde_json` for serialization

## TypeScript / React

### Formatting & Linting

- Prettier for formatting (2-space indent, single quotes, no semicolons)
- ESLint with strict TypeScript rules

### Naming

- Components: `PascalCase` (files and exports)
- Hooks: `useCamelCase`
- Utilities, variables: `camelCase`
- Types/interfaces: `PascalCase`
- Constants: `SCREAMING_SNAKE_CASE`
- Files: `PascalCase.tsx` for components, `camelCase.ts` for utilities

### Components

- Functional components only (no class components)
- Props defined as named interfaces: `interface ChoreCardProps { ... }`
- Destructure props in function signature
- Co-locate component-specific styles

### State Management

- React hooks for local state
- Context for shared state (evaluate need before adding)
- No global state library unless complexity demands it

### API Integration

- All HTTP calls go through `src/api/client.ts`
- Request/response types mirror the backend API contracts doc
- Use custom hooks (`useChores`, `useAssignments`) to wrap API calls

### Testing

- Test files: `ComponentName.test.tsx` / `hookName.test.ts`, co-located with the module under test.
- Test both the happy path and error states (API errors, empty results, loading states).
- Test names must be self-descriptive: `it('shows an error when the API returns 500')` — no explanatory inline comments.
- Frontend tests run separately from backend tests. Debug failures in their own context.

## Both Languages

### File Size

- Hard limit: 300 lines per file
- Soft target: under 200 lines
- Split when approaching the limit; do not wait until you hit it

### Comments

- Explain *why*, not *what*
- Doc comments on all public items
- No commented-out code — delete it (git has history)

### Commits

- Imperative mood, under 50 characters
- No conventional-commit prefixes
- Body explains why, not how
