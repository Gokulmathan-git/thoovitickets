# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

ThooviTickets — event ticketing platform as a monorepo.

## Tech Stack

- **Monorepo**: pnpm 11 workspaces + Turborepo
- **Frontend**: Next.js 16 (App Router) + Tailwind CSS 4 + Zustand stores
- **Backend**: NestJS 11 + TypeScript 5.9 (not 6.x — decorator emit requires 5.9)
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: JWT access tokens (15min) + refresh tokens (role-based expiry, httpOnly cookies)
- **Validation**: Zod (shared package) + class-validator (NestJS DTOs)
- **Email**: Gmail SMTP (via nodemailer) or Resend
- **Storage**: Supabase (file uploads)
- **AI**: OpenAI SDK (gpt-5.4-mini default)
- **Payments**: Razorpay

## Project Structure

```
apps/web/          - Next.js frontend (@thoovitickets/web)
apps/api/          - NestJS backend (@thoovitickets/api)
packages/shared/   - Zod validators, types, constants (@thoovitickets/shared)
packages/database/ - Prisma schema, migrations, client (@thoovitickets/database)
```

## Commands

```bash
pnpm dev                                    # Start all apps (Turborepo)
pnpm build                                  # Build all apps
pnpm build:shared                           # Build shared package only
pnpm build:api                              # Build shared + API
pnpm build:web                              # Build web only
pnpm --filter @thoovitickets/api dev        # Run API only (nest start --watch)
pnpm --filter @thoovitickets/web dev        # Run web only
pnpm db:generate                            # Generate Prisma client
pnpm db:migrate                             # Run migrations (dev)
pnpm db:migrate:deploy                      # Run migrations (prod)
pnpm db:push                                # Push schema without migration
pnpm db:seed                                # Seed admin user + categories
pnpm db:studio                              # Open Prisma Studio
pnpm format                                 # Prettier all files
pnpm lint                                   # Lint all apps
```

## Build Order & Gotchas

- `packages/shared` must build before `apps/api` — shared compiles to `dist/` and API imports from it
- If API build produces no output, delete `apps/api/tsconfig.build.tsbuildinfo` and rebuild
- After changing Prisma schema: run `pnpm db:generate` before building API

## Environment

- Root `.env` is symlinked to `apps/api/.env` and `packages/database/.env`
- Web app uses `apps/web/.env.local` for `NEXT_PUBLIC_API_URL`
- Config loaded via `apps/api/src/config/configuration.ts` (port, jwt, database, resend, gmail, supabase, openai)

## Architecture

### API (NestJS)

**Request flow**: Request → RequestIdMiddleware → ThrottlerGuard → JwtAuthGuard → RolesGuard → Controller → Service → TransformInterceptor (wraps response)

**Response format**: All responses wrapped by `TransformInterceptor`:
- Success: `{ success: true, data: {...} }`
- Error: `{ success: false, error: {...} }` (via `HttpExceptionFilter` and `PrismaExceptionFilter`)

**Auth decorators** (in `modules/auth/decorators/`):
- `@Public()` — skip JWT auth
- `@Roles(UserRole.ADMIN)` — require specific role
- `@CurrentUser()` or `@CurrentUser('id')` — extract user from JWT

**Module pattern**: Each feature is a NestJS module in `apps/api/src/modules/` with controller, service, module, and dto/ directory. Modules: admin, ai, analytics, auth, cart, categories, content, discounts, email, events, gst-bills, health, mobile, notifications, orders, payments, pricing, products, reviews, settlements, staff, subscriptions, tickets, upload, users.

**Commission system**: Three-level override — PlatformSettings (global default) → User (per-organiser) → Event (per-event). Resolved during order creation in pricing module.

**Subscriptions**: 4 tiers (FREE/PRO/ADVANCE/ENTERPRISE) with per-tier commission rates, event limits, and features. `Plan` model defines tiers, `OrgSubscription` tracks active subscriptions.

### Frontend (Next.js)

**State management**: Zustand stores in `apps/web/src/stores/` — `auth-store` (user + token, persisted), `cart-store`, `theme-store`.

**API client**: Axios instance in `apps/web/src/lib/api-client.ts` with automatic token injection from auth store and refresh-on-401 interceptor.

**UI components**: Custom components in `apps/web/src/components/ui/` (button, card, input, label, select, category-select). No component library — all hand-rolled with Tailwind.

**Route groups**: `/organiser/*` (organiser dashboard), `/admin/*` (admin panel), `/events/*` (public event pages), `/checkout` (order flow).

### Shared Package

Exports Zod validators, TypeScript types, and role constants. Both API and web import from `@thoovitickets/shared`. API mirrors Zod schemas as class-validator DTOs for NestJS pipe validation.

### Database

- Prisma schema at `packages/database/prisma/schema.prisma`
- Column naming: snake_case in DB via `@map()`, camelCase in TypeScript
- Enums defined in Prisma and re-exported from `@thoovitickets/database`
- Key enums: `UserRole` (ADMIN/ORGANISER/CUSTOMER), `EventStatus`, `OrderStatus`, `TicketStatus`, `SubscriptionTier`, `SubscriptionStatus`

## Conventions

- All API endpoints prefixed with `/api`
- Passwords hashed with bcrypt (12 rounds)
- Refresh tokens stored hashed in DB, rotated on each use
- Role-based refresh token expiry: Admin 5h, Organiser 12h, Customer 24h
- File uploads go through `/api/upload/event` → Supabase storage
- Rate limiting via `@nestjs/throttler` (global + per-endpoint with `@Throttle()`)

## Brand

- Primary color: `#FF541F` (orange gradient for all buttons — never use blue buttons)
- Brand name: ThooviTickets
