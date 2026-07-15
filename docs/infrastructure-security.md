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
[ Vercel ]     ← HTTPS redirect, security headers (vercel.json), env secrets
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
| HSTS preload | Vercel + `vercel.json` + `src/lib/security/headers.ts` | Already set |
| Security headers (CSP, X-Frame-Options, nosniff) | Middleware + `vercel.json` | Edit `src/lib/security/headers.ts` once |
| Hide `X-Powered-By` | `next.config.js` | `poweredByHeader: false` |
| Admin IP allowlist | Env + middleware | `ADMIN_ALLOWED_IPS=1.2.3.4,5.6.7.8` |
| Secrets | Vercel env / DB `SiteSettings` | Never commit; rotate via dashboard |
| Session invalidation on password change | App (`tokenVersion` in JWT) | Automatic after deploy |
| OTP / login abuse | App (existing login rate limits) | No extra public rate limits per your request |
| Upload MIME + magic bytes | App `/api/upload` | `src/lib/security/file-validation.ts` |
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
2. **Environment variables** — `NEXTAUTH_SECRET`, `DATABASE_URL`, `DIRECT_URL`, Supabase service role, Cloudinary, Resend. Use Production vs Preview scopes.
3. **Deploy** — run migration after deploy:
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

App validates type/size/signature before upload. For defense in depth:

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
| Response headers | `src/lib/security/headers.ts`, `middleware.ts`, `vercel.json` |
| Safe API errors | `src/lib/security/api-response.ts` |
| Password policy | `src/lib/security/password-policy.ts` |
| Argon2 + bcrypt migration | `src/lib/security/password-hash.ts` |
| Step-up re-auth | `src/lib/security/step-up.ts` |
| Session binding | `src/lib/security/session-auth.ts` |
| Audit logs | `src/lib/security/audit-log.ts` |
| Upload validation | `src/lib/security/file-validation.ts` |
| Field encryption at rest | `src/lib/security/field-encryption.ts`, `DATA_ENCRYPTION_KEY` |
| Signed PDF links | `src/lib/security/signed-access.ts`, `PDF_SIGNING_SECRET` |
| TOTP MFA | `/api/admin/mfa`, login TOTP field |
| Session registry | `AdminSession` table, `/api/admin/sessions` |
| CAPTCHA (Turnstile) | `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` |
| Cloudinary moderation | `CLOUDINARY_MODERATION=true` (requires add-on) |
| Supabase RLS (future) | `supabase/migrations/20260703_rls_policies.sql` |

## New environment variables (phase 2)

| Variable | Purpose |
|----------|---------|
| `DATA_ENCRYPTION_KEY` | Encrypts payment account numbers/IBANs at rest (required in production) |
| `PDF_SIGNING_SECRET` | HMAC key for 5-minute invoice PDF links (falls back to `NEXTAUTH_SECRET`) |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile site key (public forms) |
| `TURNSTILE_SECRET_KEY` | Turnstile server verification |
| `CLOUDINARY_MODERATION=true` | Enable AWS Rekognition moderation on upload |
| `ADMIN_ALLOWED_IPS` | Comma-separated IPs for `/admin` + admin APIs |
