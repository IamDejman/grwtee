# Infrastructure-led security

GRWTEE separates **platform controls** (things your host, CDN, and env config own) from **application controls** (things the Next.js code enforces). Prefer pushing policy to the edge/host first; use app code for auth, business rules, and data access.

## Layer model

```text
Internet
   │
   ▼
[ CDN / WAF ]  ← TLS, DDoS, optional IP rules, bot filtering
   │
   ▼
[ Vercel ]     ← HTTPS redirect, security headers (next.config.ts), env secrets
   │
   ▼
[ Middleware ] ← Global headers, optional ADMIN_ALLOWED_IPS, session gate
   │
   ▼
[ API routes ] ← AuthZ, step-up password, OTP policy, audit logs
   │
   ▼
[ Postgres / Supabase / Cloudinary / Resend ]
```

## What runs where

| Control | Owner | Config |
|--------|--------|--------|
| HTTPS + TLS 1.2+ | Vercel | Automatic; enforce custom domain |
| HSTS preload | `next.config.ts` + `src/lib/security/headers.ts` | Already set |
| Security headers (CSP, X-Frame-Options, nosniff) | Middleware + `next.config.ts` | Edit `src/lib/security/headers.ts` once |
| Hide `X-Powered-By` | `next.config.ts` | `poweredByHeader: false` |
| Admin IP allowlist | Env + middleware | `ADMIN_ALLOWED_IPS=1.2.3.4,5.6.7.8` |
| Secrets | Vercel env / DB `SiteSettings` | Never commit; rotate via dashboard |
| Session invalidation on password change | App (`tokenVersion` in JWT) | Automatic after deploy |
| OTP / login abuse | App (existing login rate limits) | No extra public rate limits per your request |
| Upload type, size and folder | Cloudinary signature (gallery), Supabase bucket limits (looks, lookbooks) | `src/lib/cloudinary.ts`, `src/app/api/stylist/uploads/route.ts` |
| Malware scan on uploads | **Infrastructure (recommended)** | Cloudinary add-on or pre-scan worker |
| Audit trail | Postgres `AdminAuditLog` | Query via Prisma Studio / future admin UI |

## Deploy checklist (production)

Run in order after merging security changes:

1. **Set env vars in Vercel** (Production scope):
   - `DATA_ENCRYPTION_KEY` — generate with `openssl rand -base64 32`
   - `PDF_SIGNING_SECRET` — optional; defaults to `NEXTAUTH_SECRET`
   - `NEXT_PUBLIC_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY` — Cloudflare Turnstile
   - `ADMIN_ALLOWED_IPS` — optional office/home IPs
   - `CLOUDINARY_MODERATION=true` — optional, requires Cloudinary add-on

2. **Run database migrations**:
   ```bash
   npx prisma migrate deploy
   ```

3. **Re-encrypt existing payment accounts** (after `DATA_ENCRYPTION_KEY` is set):
   - Admin → Settings → Payment Accounts → **Re-encrypt stored data**
   - Or call `POST /api/payment-accounts/re-encrypt` with step-up password

4. **Enable MFA** for admin accounts: Settings → Security → Set up MFA

5. **Optional: Cloudflare WAF** in front of Vercel (see below)

6. **Verify public forms**: `/book` and `/contact` submit successfully with Turnstile enabled

## Vercel checklist

1. **Production domain** on `grwtee.com` with HTTPS only.
2. **Environment variables** — `NEXTAUTH_SECRET`, `DATABASE_URL`, `DIRECT_URL`, `DATA_ENCRYPTION_KEY`, `CRON_SECRET`, Supabase service role, Cloudinary, Resend, Sentry. `.env.example` lists them all. Use Production vs Preview scopes.
3. **Deploy** — production builds apply the migrations (`scripts/vercel-build.sh`); preview builds don't touch the database. To apply them by hand:
   ```bash
   npx prisma migrate deploy
   ```
4. **Optional: admin IP allowlist**
   ```bash
   ADMIN_ALLOWED_IPS=your.office.ip,your.home.ip
   ```
   Leave unset to allow admin from anywhere (current default).
5. **Optional: Vercel WAF / Pro firewall** — rate limits and geo blocks at the edge without app changes.

## Cloudflare (optional front door)

If you add Cloudflare in front of Vercel:

- Enable **Always Use HTTPS** and **Full (strict)** SSL.
- Add **WAF managed rules** for OWASP top 10.
- Consider **Bot Fight Mode** on `/admin/*` and `/api/admin/*`.
- Do **not** duplicate HSTS with conflicting values; one policy is enough.

## Supabase

- Keep **service role key** server-only (`src/lib/supabase/admin.ts`).
- Enable **RLS** on stylist tables if you move off service-role client later.
- Review Supabase **Auth logs** separately from `AdminAuditLog`.

## Cloudinary uploads

Gallery uploads go from the browser straight to Cloudinary. The site signs each one for the gallery folder, a random file name, image formats only and resizing, and the gallery only saves images from that folder. For defense in depth:

- Restrict upload preset to **image** types in Cloudinary dashboard.
- Enable **Moderation** or antivirus add-on if you accept user-provided images at scale.

## Observability without leaking data

- App logs use `src/lib/security/logger.ts` to redact passwords, OTPs, tokens.
- Production API responses use `src/lib/security/api-response.ts` — generic client errors, detailed logs server-side only.
- In Vercel → Logs, avoid logging raw request bodies on auth routes.

## Rotating credentials

1. Change password in admin settings (invalidates all JWT sessions via `tokenVersion`).
2. Rotate `NEXTAUTH_SECRET` in Vercel — forces all users to re-login.
3. Rotate Cloudinary/Resend keys in Vercel env; update DB-backed settings if used.

## First-login password change

New admins created via `prisma db seed` get `mustChangePassword: true`. Middleware sends them to `/admin/change-password` until updated.

To require reset for an existing admin:

```sql
UPDATE "Admin" SET "mustChangePassword" = true WHERE email = 'book@grwtee.com';
```

## What we intentionally did not infrastructure-lead

- **Public form rate limits** (bookings, contact) — excluded per your request; add at Cloudflare/Vercel WAF when needed.
- **CAPTCHA** — Turnstile on `/book` and `/contact` when keys are set; add CDN rules if abuse continues.
- **Distributed rate-limit store (Redis)** — only needed at scale or multi-region.

## Code map (single source of truth)

| Concern | File |
|---------|------|
| Response headers | `src/lib/security/headers.ts`, `middleware.ts`, `next.config.ts` |
| Safe API errors | `src/lib/security/api-response.ts` |
| Password policy | `src/lib/security/password-policy.ts` |
| Argon2 + bcrypt migration | `src/lib/security/password-hash.ts` |
| Step-up re-auth | `src/lib/security/step-up.ts` |
| Session binding | `src/lib/security/session-auth.ts` |
| Audit logs | `src/lib/security/audit-log.ts` |
| Upload signing | `src/lib/cloudinary.ts` (gallery), `src/app/api/stylist/uploads/route.ts` (looks, lookbooks) |
| Field encryption at rest | `src/lib/security/field-encryption.ts`, `DATA_ENCRYPTION_KEY` |
| Signed PDF links | `src/lib/security/signed-access.ts`, `PDF_SIGNING_SECRET` |
| TOTP MFA | `/api/admin/mfa`, login TOTP field |
| Session registry | `AdminSession` table, `/api/admin/sessions` |
| CAPTCHA (Turnstile) | `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` |
| Cloudinary moderation | `CLOUDINARY_MODERATION=true` (requires add-on) |
| Supabase RLS | `prisma/migrations/20261026_enable_rls/migration.sql` |

## New environment variables (phase 2)

| Variable | Purpose |
|----------|---------|
| `DATA_ENCRYPTION_KEY` | Encrypts payment account numbers/IBANs at rest (required in production) |
| `PDF_SIGNING_SECRET` | HMAC key for 5-minute invoice PDF links (falls back to `NEXTAUTH_SECRET`) |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile site key (public forms) |
| `TURNSTILE_SECRET_KEY` | Turnstile server verification |
| `CLOUDINARY_MODERATION=true` | Enable AWS Rekognition moderation on upload |
| `ADMIN_ALLOWED_IPS` | Comma-separated IPs for `/admin` + admin APIs |
