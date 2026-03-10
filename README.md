# GRWTEE (Get Ready With Tee) — Luxury Styling Website

Next.js 14 (App Router) + TypeScript + Tailwind + Prisma (Postgres/Neon) + NextAuth (Admin) + Cloudinary + React Hook Form + Zod.

## Setup

### 1) Install

```bash
npm install
```

### 2) Create `.env.local`

Create the file manually (this repo ignores it):

```env
DATABASE_URL="postgresql://username:password@host/database?sslmode=require"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"

NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="..."
CLOUDINARY_API_KEY="..."
CLOUDINARY_API_SECRET="..."

SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="..."
SMTP_PASSWORD="..."
CONTACT_EMAIL="book@grwtee.com"

NEXT_PUBLIC_SITE_URL="http://localhost:3000"
NEXT_PUBLIC_INSTAGRAM_URL="https://instagram.com/grwtee"
NEXT_PUBLIC_CONTACT_EMAIL="book@grwtee.com"

# Required for seeding the first admin user (admin@grwtee.com)
ADMIN_SEED_PASSWORD="set-a-strong-password"
```

### 3) Prisma

```bash
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed
```

Seed creates:
- Admin: `admin@grwtee.com` (password = `ADMIN_SEED_PASSWORD`)

### 4) Run

```bash
npm run dev
```

Open:
- Public site: `http://localhost:3000`
- Admin login: `http://localhost:3000/admin/login`

## Required brand assets (manual upload)

Place these files:
- `public/patterns/basket-weave-dark.png`
- `public/patterns/basket-weave-light.png`
- Replace placeholder `public/logo.svg`, `public/favicon.svg`, and OG images as needed.

## Admin features

- Gallery: upload to Cloudinary, create DB records, edit/delete, featured + order.
- Services: CRUD + toggles.
- Bookings: status updates + CSV export.
- Settings: site settings + password change.


