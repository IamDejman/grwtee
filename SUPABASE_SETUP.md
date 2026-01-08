# Supabase Setup Guide

## Step 1: Create Supabase Account

1. Go to: **https://supabase.com**
2. Click **"Start your project"** or **"Sign up"**
3. Sign up with GitHub (recommended) or email
4. Verify your email if needed

## Step 2: Create New Project

1. Click **"New Project"**
2. Fill in:
   - **Name**: `grwtee` (or any name)
   - **Database Password**: Create a strong password (save it!)
   - **Region**: Choose closest to you (e.g., `US East`)
   - **Pricing Plan**: Free tier is fine
3. Click **"Create new project"**
4. Wait 2-3 minutes for project to initialize

## Step 3: Get Connection String

1. Once project is ready, go to: **Settings** → **Database**
2. Scroll down to **"Connection string"**
3. Select **"Connection pooling"** tab (recommended for Next.js)
4. Select **"URI"** format
5. Copy the connection string

It will look like:
```
postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?sslmode=require
```

## Step 4: Update .env.local

Replace `DATABASE_URL` in `.env.local` with the Supabase connection string.

## Step 5: Test Connection

```bash
npx prisma migrate dev --name init
```

## Important Notes

- **Use Connection Pooling** for Next.js (port 6543)
- **Save your database password** - you'll need it
- **Free tier includes**: 500MB database, 2GB bandwidth
- **Connection string format**: Should include `?sslmode=require`

## Troubleshooting

If connection fails:
- Make sure you're using **Connection Pooling** (not Direct)
- Check that password is correct
- Verify `sslmode=require` is in the connection string
- Wait a few minutes if project just finished creating

