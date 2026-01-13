# Zeroroku

Nuxt 4 application with a Nitro server, Drizzle ORM, and Better Auth.

## Requirements

- Node.js (use the version required by Nuxt 4)
- pnpm 10.x

## Quick start

```bash
pnpm install
pnpm dev
```

The dev server runs at <http://localhost:6066>.

## Scripts

```bash
pnpm dev
pnpm build
pnpm preview
pnpm generate
```

## Environment variables

- `DATABASE_URL`: Postgres connection string used by Drizzle and auth.
- `NUXT_PUBLIC_SITE_URL`: Base URL for SEO metadata (defaults to <http://localhost:6066>).

## Project structure

- `app/`: Nuxt app source (pages, layouts, components).
- `app/components/auxline/`: Auxline UI components.
- `server/`: Nitro server routes and plugins.
- `lib/`: Shared runtime utilities (auth, database).
- `drizzle/`: Generated schema artifacts.
- `public/`: Static assets served as-is.

## Database workflow

- Create migrations: `pnpm drizzle-kit generate --config drizzle.config.ts --name <migration>`.
- Avoid `pnpm drizzle-kit push`; review SQL before applying.
- Partitioned tables use numeric suffixes and are excluded by `tablesFilter` in `drizzle.config.ts`.

## Testing

No test runner is configured yet. If you add tests, use Vitest and name files `*.test.ts` or `*.spec.ts`.
