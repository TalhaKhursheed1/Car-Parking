# Car Parking (ParkSpace)

A Next.js app for listing, finding, and booking car parking spaces. Consumers search and pay, providers manage listings and payouts, and admins moderate spaces and reports.

## Roles

- **Consumer** — browse spaces, book, pay with Stripe, view invoices and notifications
- **Provider** — list spaces, set availability and rates, connect Stripe for payouts, track earnings
- **Admin** — approve providers and spaces, view live listings, income, and metrics

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- MongoDB (`MONGODB_URI`) or in-memory store (`MONGODB_URI=memory://local`)
- Stripe Checkout and Connect
- Cloudinary for space images
- Resend for consumer invoice emails
- TanStack Query + Zustand

## Getting started

```bash
npm install
cp .env.example .env.local
```

Fill in `.env.local`, then:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | Atlas connection string, or `memory://local` for UI-only local work |
| `MONGODB_DB` | Database name (default in example: `car-space-renting-system`) |
| `NEXT_PUBLIC_SITE_URL` | Public site URL (used for metadata and Stripe return URLs) |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `RESEND_API_KEY` | Resend API key (invoice emails) |
| `RESEND_FROM` | From address for invoice emails |

Do not commit `.env` or `.env.local`. `.env.example` is a template only.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Dev server (Turbopack off) |
| `npm run dev:turbo` | Dev server with Turbopack |
| `npm run build` | Production build |
| `npm start` | Run production server |
| `npm run lint` | ESLint |
| `npm test` | Project tests |

## Main routes

| Path | Who |
| --- | --- |
| `/spaces` | Public listings |
| `/login`, `/register` | Consumer auth |
| `/consumer/bookings`, `/consumer/invoices` | Consumer bookings and invoices |
| `/provider/login`, `/provider/register` | Provider auth |
| `/provider/spaces`, `/provider/dashboard` | Provider listings and dashboard |
| `/admin/login` | Admin sign-in |
| `/admin/dashboard` | Admin console |

New provider spaces start as **pending** until an admin approves them. Providers need Stripe Connect onboarding before live payouts.

## Project layout

```
src/app/          Pages and API routes
src/components/   UI and feature components
src/features/     Client API helpers and hooks
src/lib/          Auth, DB, Stripe, bookings, validation
tests/            Unit tests
```
