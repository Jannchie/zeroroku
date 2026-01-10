# Zeroroku

Nuxt 4 application with a Nitro server, Drizzle ORM, and Better Auth.

## Requirements

- Node.js (use the version required by Nuxt 4)
- pnpm 10.x

## Setup

```bash
pnpm install
```

## Development

The dev server runs on http://localhost:6066.

```bash
pnpm dev
```

## Build

```bash
pnpm build
pnpm preview
pnpm generate
```

## Environment variables

- `DATABASE_URL`: Postgres connection string used by Drizzle and auth.
- `NUXT_PUBLIC_SITE_URL`: base URL for SEO metadata (defaults to http://localhost:6066).

## Project structure

- `app/`: Nuxt app source (pages, layouts, components).
- `app/components/auxline/`: Auxline UI components.
- `server/`: Nitro server routes and plugins.
- `lib/`: shared runtime utilities (auth, database).
- `drizzle/`: generated schema artifacts.
- `public/`: static assets served as-is.

## Database workflow

- Introspect schema: `pnpm drizzle-kit introspect --config drizzle.config.ts`.
- Create migrations: `pnpm drizzle-kit generate --config drizzle.config.ts --name <migration>`.
- Avoid `pnpm drizzle-kit push`; review SQL before applying.
- Partitioned tables use numeric suffixes and are excluded by `tablesFilter` in `drizzle.config.ts`.

## Testing

No test runner is configured yet. If you add tests, use Vitest and name files `*.test.ts` or `*.spec.ts`.
