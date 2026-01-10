# Repository Guidelines

## Project Structure & Module Organization

- `app/` holds the Nuxt app source (pages, layouts, components). Routes live under `app/pages/` (e.g., `app/pages/login.vue`).
- `app/components/auxline/` contains reusable UI elements specific to the Auxline design system.
- `server/` contains Nitro server code and API routes (e.g., `server/api/auth/*.ts`) plus server plugins.
- `lib/` contains shared runtime utilities such as auth and database setup.
- `drizzle/` is generated output for schema introspection/migrations; treat it as build artifacts unless you are updating DB schema.
- `public/` contains static assets served as-is.

## Build, Test, and Development Commands

- `pnpm dev`: run the Nuxt development server at `http://localhost:6066`.
- `pnpm build`: build the production bundle.
- `pnpm preview`: serve the production build locally.
- `pnpm generate`: generate a static build.
- `pnpm drizzle-kit introspect --config drizzle.config.ts`: pull DB schema into `drizzle/` (read-only).

## Database & Partitioned Tables

- Partition tables use numeric suffixes (e.g., `author_info_1` ... `author_info_100`) and are excluded from introspection via `tablesFilter` in `drizzle.config.ts` (patterns: `author_info_[0-9]*`, `author_fans_stat_[0-9]*`, `tag_info_[0-9]*`, `video_info_[0-9]*`, `video_history_stats_[0-9]*`).
- Do not use `pnpm drizzle-kit push`. Use `pnpm drizzle-kit generate --config drizzle.config.ts --name <migration>` (or `--custom`) to create SQL, then review and adapt it.
- For partitioned tables, apply DDL on the parent table and verify behavior (columns propagate; indexes/constraints may need explicit handling). Avoid drop/recreate workflows that detach partitions.
- If new partition families appear, update `tablesFilter` to keep partitions excluded.

## Coding Style & Naming Conventions

- Use TypeScript for all new code.
- Follow the ESLint configuration in `eslint.config.mjs` (based on `@jannchie/eslint-config`).
- Use 2-space indentation and prefer single quotes where applicable.
- Vue components use PascalCase filenames in `app/components/` and route files use kebab-case under `app/pages/`.

## Testing Guidelines

- No test runner is configured yet. If adding tests, use Vitest and place files as `*.test.ts` or `*.spec.ts` near the code they cover.
- Keep tests focused on server handlers (`server/api/`) and core utilities (`lib/`).

## Commit & Pull Request Guidelines

- Commit messages follow Conventional Commits with scopes, e.g., `feat(auth): add login flow` or `chore(eslint): update config`.
- PRs should include a summary, screenshots for UI changes, and DB/schema impact notes.

## Security & Configuration Tips

- Store secrets and DB credentials in `.env`; do not commit them.
- When working with remote databases, prefer introspection and avoid destructive schema sync.
