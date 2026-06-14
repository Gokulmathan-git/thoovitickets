# ThooviTickets

Event ticketing platform - monorepo.

## Tech Stack

- **Monorepo**: pnpm workspaces + Turborepo
- **Frontend**: Next.js 16 (App Router) + Tailwind CSS 4 + custom UI components
- **Backend**: NestJS 11 + TypeScript 5.9
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: JWT access tokens (15min) + refresh tokens (7d, httpOnly cookies)
- **Validation**: Zod (shared package) + class-validator (NestJS DTOs)

## Project Structure

```
apps/web/        - Next.js frontend (@thoovitickets/web)
apps/api/        - NestJS backend (@thoovitickets/api)
packages/shared/ - Shared types, Zod validators, constants (@thoovitickets/shared)
packages/database/ - Prisma schema, migrations, client (@thoovitickets/database)
```

## Commands

```bash
pnpm dev              # Start all apps (Turborepo)
pnpm build            # Build all apps
pnpm db:generate      # Generate Prisma client
pnpm db:migrate       # Run migrations (dev)
pnpm db:seed          # Seed admin user + categories
pnpm db:studio        # Open Prisma Studio
```

## Build Notes

- Must build `packages/shared` before `apps/api` (shared compiles to `dist/`)
- API dev: run `pnpm --filter @thoovitickets/api dev` (uses `rimraf dist && nest start --watch`)
- If API build produces no output, delete `tsconfig.build.tsbuildinfo` and rebuild

## Environment

- Copy `.env.example` to `.env` and update `DATABASE_URL`
- The `.env` file is symlinked to `apps/api/.env` and `packages/database/.env`
- Web app uses `apps/web/.env.local` for `NEXT_PUBLIC_API_URL`

## API

- All endpoints prefixed with `/api`
- Global JWT auth guard (use `@Public()` decorator to skip)
- Role-based access with `@Roles(UserRole.ADMIN)` decorator
- Standardized response: `{ success: true, data: {...} }` or `{ success: false, error: {...} }`

## Conventions

- NestJS API uses TypeScript 5.9 (not 6.x) due to decorator emit requirements
- Database columns use snake_case via `@map()`, TypeScript uses camelCase
- Passwords hashed with bcrypt (12 rounds)
- Refresh tokens stored hashed in DB, rotated on each use
