# Database-Led Configuration

Your application now supports storing environment variables in the database instead of managing them in Vercel's environment variables panel.

## How It Works

1. **Database Storage**: Environment variables are stored in the `SiteSettings` table with keys prefixed with `env_` (e.g., `env_NEXTAUTH_SECRET`).

2. **Priority**: Values in the database take precedence over environment variables. If a value exists in both, the database value is used.

3. **Fallback**: If a value doesn't exist in the database, the system falls back to environment variables, then to default values.

## Required Environment Variable

**Only `DATABASE_URL` must remain as an environment variable** in Vercel, as it's needed to connect to the database in the first place.

## Creating tables (new database or first deploy)

If you see errors like "The table \`public.BookingRequest\` does not exist", the database schema hasn't been applied yet. Run one of:

- **With migrations (recommended):** `npx prisma migrate deploy` — applies `prisma/migrations` to the current database.
- **Quick sync:** `npx prisma db push` — syncs the schema without migration history (e.g. for dev or one-off DBs).

Use the same `DATABASE_URL` as the running app (e.g. in Vercel env or `.env`).

## Setup for Vercel Deployment

1. **Set only DATABASE_URL in Vercel**:
   - Go to your Vercel project settings
   - Add only `DATABASE_URL` as an environment variable
   - Deploy your application

2. **Populate database with config values**:
   - After first deployment, log into the admin panel at `/admin/login`
   - Go to Settings (`/admin/settings`)
   - Click "Show Env Vars" to see all environment variables
   - Fill in the values you need (Cloudinary, Resend, etc.)
   - Click "Save Env Vars"

3. **Alternative: Use seed script**:
   - If you have environment variables set locally, run `npx prisma db seed`
   - This will copy your env vars to the database (if they exist)

## Managed Environment Variables

The following variables can be managed through the database:

- `NEXTAUTH_SECRET` - NextAuth session secret
- `NEXTAUTH_URL` - NextAuth callback URL
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` - Cloudinary cloud name
- `CLOUDINARY_API_KEY` - Cloudinary API key
- `CLOUDINARY_API_SECRET` - Cloudinary API secret
- `RESEND_API_KEY` - Resend API key (https://resend.com/api-keys)
- `RESEND_FROM` - Sender address, e.g. `GRWTEE <book@grwtee.com>` (use verified domain or `onboarding@resend.dev`)
- `CONTACT_EMAIL` - Inbox for booking/contact notifications (e.g. book@grwtee.com)
- `NEXT_PUBLIC_SITE_URL` - Public site URL
- `NEXT_PUBLIC_INSTAGRAM_URL` - Instagram URL
- `NEXT_PUBLIC_CONTACT_EMAIL` - Public contact email
- `NEXT_PUBLIC_GA_MEASUREMENT_ID` - Google Analytics 4 Measurement ID (see ANALYTICS.md)

## Admin Interface

Access the environment variables management interface at:
- `/admin/settings` → Click "Show Env Vars"

The interface shows:
- Current value (from database or environment)
- Source indicator (DB = database, ENV = environment variable)
- Ability to update values

## Technical Details

- Config values are cached for 5 minutes to reduce database queries
- Changes take effect within 5 minutes (cache refresh)
- Sensitive values (secrets, passwords, keys) are masked in the UI
- All database-backed config uses the `getConfig()` utility from `@/lib/config`

## Migration from Environment Variables

If you already have environment variables set in Vercel:

1. Deploy with only `DATABASE_URL` set
2. After deployment, use the admin panel to copy values from env vars to database
3. Once all values are in the database, you can remove them from Vercel (except `DATABASE_URL`)

## Benefits

- ✅ No need to manage env vars in Vercel UI
- ✅ Easy to update values through admin panel
- ✅ Values persist across deployments
- ✅ Can be version controlled (if you want to include seed data)
- ✅ Single source of truth in database

