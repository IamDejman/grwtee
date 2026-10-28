# GRWTEE (Get Ready With Tee): website and dashboard

The public website, the admin dashboard and the stylist dashboard for the
GRWTEE app.

Next.js 16 (App Router) + TypeScript + Tailwind + Prisma 6 on Supabase Postgres + NextAuth (admin sign-in) + Supabase (the app's data) + Cloudinary (gallery) + Resend (email) + Sentry (errors).

The mobile app and its API are in the `grwtee-mobile` repository. Both read the same Supabase project: Prisma owns the website's own tables (bookings, invoices, gallery, newsletter, admins); the app's tables (profiles, looks, lookbooks, messages) are created by `api/supabase/*.sql` in `grwtee-mobile`, and the dashboard reaches them with the Supabase service role.

## Setup

```bash
npm install
cp .env.example .env    # then fill it in; every variable is explained there
npx prisma migrate deploy
npx prisma db seed      # first admin: book@grwtee.com, password ADMIN_SEED_PASSWORD
npm run dev
```

- Public site: http://localhost:3000
- Admin sign-in: http://localhost:3000/admin/login (you'll be asked to change the password and set up an authenticator app)

To change the database, edit `prisma/schema.prisma` and run `npx prisma migrate dev --name <change>`. CI fails when the schema and the migrations don't match.

## Checks

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

CI runs all of these, applies the migrations to an empty Postgres, and compares them with `schema.prisma` (`.github/workflows/ci.yml`).

## Deploying (Vercel, Hobby plan)

Vercel runs `npm run build:deploy` (`scripts/vercel-build.sh`). Production builds apply the migrations first; preview builds never touch the database.

Security headers are set in `next.config.ts` from `src/lib/security/headers.ts`. Deploy checklists are in `docs/infrastructure-security.md`.

### Scheduled jobs

Hobby only runs daily jobs, so the frequent ones run from Supabase (pg_cron), defined in `grwtee-mobile/api/supabase/28-scheduled-jobs.sql`. Every job calls a route on this site with `CRON_SECRET`, which must also be in Supabase Vault as `website_cron_secret`.

| Job | Runs | Route |
|-----|------|-------|
| December reminders | Daily, 07:00 UTC (`vercel.json`) | `/api/cron/december-reminders` |
| December payment holds | Hourly (pg_cron) | `/api/cron/december-holds` |
| Newsletter broadcasts | Every 15 minutes (pg_cron) | `/api/cron/broadcasts` |
| Cleanup (data retention) | Daily, 03:23 UTC (pg_cron) | `/api/cron/cleanup` |

The cleanup job deletes old data on the schedule in `src/lib/retention.ts`; the privacy page (section 6) states the same periods, so change both together.

### Error tracking

Sentry is off until `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN` are set. Request bodies, cookies, query strings and most headers are removed before events are sent, and admins are identified by id only (`src/lib/sentry-scrub.ts`). Browser reports go through `/monitoring` on this site.

## Photos

- **Gallery**: Cloudinary. The browser uploads straight to Cloudinary with a signature from `/api/upload/sign`, which fixes the folder, file name, formats and resizing.
- **Looks and lookbooks** made in the dashboard: the app's Supabase storage (`looks` and `lookbooks` buckets), the same place the app keeps them. The browser shrinks the photo and uploads it with a one-use address from `/api/stylist/uploads`.

Photos uploaded to Cloudinary before this change can be moved with:

```bash
npx tsx scripts/move-dashboard-images-to-supabase.ts           # shows what would move
npx tsx scripts/move-dashboard-images-to-supabase.ts --apply   # moves them
```

## Scripts

| Command | What it does |
|---------|--------------|
| `npm run security:reencrypt` | Re-encrypts payment details and authenticator secrets with the current `DATA_ENCRYPTION_KEY` |
| `npx tsx scripts/move-dashboard-images-to-supabase.ts` | Moves dashboard photos from Cloudinary to Supabase storage (see above) |

## Dashboard

- **Website**: bookings, December bookings, invoices, services, gallery, mailing list and broadcasts, waitlist, settings (including payment accounts and two-step sign-in).
- **App**: looks, lookbooks, calendar, clients, messages, sign-ups waiting for approval, and reports of content.
