# Neon Database Connection Troubleshooting Guide

## Current Connection Status

✅ **Connection String Format**: Correct  
✅ **Connection Type**: Pooled (recommended)  
✅ **SSL Configuration**: Required  
✅ **Hostname**: Valid Neon format  
❌ **Connection**: **FAILING** - Database likely paused or unreachable

---

## Step-by-Step Neon Dashboard Verification

### Step 1: Check Database Status

1. Go to [Neon Console](https://console.neon.tech)
2. Log in to your account
3. Select your project (should be named something like "neondb" or similar)
4. **Look for the database status indicator:**
   - 🟢 **Active** = Database is running (good!)
   - 🟡 **Paused** = Database is sleeping (needs to wake up)
   - 🔴 **Error** = Database has an issue

**If the database is paused:**
- Click the **"Resume"** or **"Wake"** button
- Wait 10-30 seconds for the database to fully wake up
- Try your migration again: `npx prisma migrate dev --name init`

---

### Step 2: Verify Connection String

1. In the Neon dashboard, click on **"Connection Details"** or **"Connection String"**
2. You should see two connection options:
   - **Pooled Connection** (recommended for Next.js) ✅
   - **Direct Connection** (for testing)

3. **Compare your current connection string:**
   ```
   Current: postgresql://neondb_owner:****@ep-orange-butterfly-ahx39qby-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```

4. **Verify these match:**
   - ✅ Host: `ep-orange-butterfly-ahx39qby-pooler.c-3.us-east-1.aws.neon.tech`
   - ✅ Database: `neondb`
   - ✅ Username: `neondb_owner`
   - ✅ Includes: `?sslmode=require`

5. **If they don't match:**
   - Copy the **Pooled Connection** string from Neon dashboard
   - Update your `.env` file with the new connection string
   - Make sure it includes `?sslmode=require` at the end

---

### Step 3: Check IP Restrictions

1. In Neon dashboard, go to **Settings** → **IP Allowlist** (or **Network Access**)
2. Check if there are any IP restrictions:
   - **Empty allowlist** = All IPs allowed (recommended for development)
   - **IPs listed** = Only those IPs can connect

3. **If your IP is blocked:**
   - Add your current IP address to the allowlist
   - Or temporarily remove all restrictions for testing
   - **Note:** Your IP might change if you're on a dynamic connection

4. **To find your IP:**
   - Visit: https://whatismyipaddress.com/
   - Copy your IPv4 address
   - Add it to Neon's IP allowlist

---

### Step 4: Test Direct Connection (Alternative)

If the pooled connection doesn't work, try the direct connection:

1. In Neon dashboard, copy the **Direct Connection** string
2. It should look like:
   ```
   postgresql://neondb_owner:PASSWORD@ep-orange-butterfly-ahx39qby.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```
   (Notice: no `-pooler` in the hostname)

3. **Temporarily update your `.env` file:**
   ```bash
   # Backup current
   cp .env .env.backup
   
   # Update DATABASE_URL with direct connection string
   # (Edit .env file manually)
   ```

4. **Test the migration:**
   ```bash
   npx prisma migrate dev --name init
   ```

5. **If direct connection works:**
   - There may be an issue with the pooler
   - You can use direct connection for migrations
   - But switch back to pooled for your Next.js app (better performance)

---

### Step 5: Verify Credentials

1. In Neon dashboard, check if you can reset the password
2. If needed, create a new database user:
   - Go to **Settings** → **Users** or **Database Users**
   - Create a new user with a strong password
   - Update your connection string with new credentials

---

## Quick Fixes to Try

### Fix 1: Wake Up the Database
```bash
# Just wait 30 seconds after clicking "Resume" in Neon dashboard
# Then try:
npx prisma migrate dev --name init
```

### Fix 2: Update Connection String
```bash
# 1. Get fresh connection string from Neon dashboard
# 2. Update .env file:
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require"
# 3. Try migration again
```

### Fix 3: Test with Direct Connection
```bash
# Temporarily use direct connection string in .env
# Run migration
# If it works, switch back to pooled for production
```

### Fix 4: Check Network/Firewall
```bash
# Test if you can reach the database server
ping ep-orange-butterfly-ahx39qby-pooler.c-3.us-east-1.aws.neon.tech

# Or test port connectivity (if you have telnet/netcat
nc -zv ep-orange-butterfly-ahx39qby-pooler.c-3.us-east-1.aws.neon.tech 5432
```

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Database is paused | Wake it up in Neon dashboard |
| Connection timeout | Wait 30 seconds after waking database |
| IP blocked | Add your IP to Neon allowlist |
| Wrong credentials | Update connection string from Neon dashboard |
| Pooler not working | Try direct connection string |
| SSL error | Ensure `?sslmode=require` is in connection string |

---

## Verification Script

Run this script to verify your connection:
```bash
node verify-neon-connection.js
```

This will:
- ✅ Check your connection string format
- ✅ Verify SSL configuration
- ✅ Test the actual connection
- ✅ Provide specific troubleshooting steps

---

## Next Steps

1. **Go to Neon Dashboard** → Check database status
2. **Wake up database** if paused
3. **Verify connection string** matches dashboard
4. **Check IP allowlist** settings
5. **Run verification script**: `node verify-neon-connection.js`
6. **Try migration again**: `npx prisma migrate dev --name init`

---

## Need More Help?

- **Neon Documentation**: https://neon.tech/docs
- **Neon Status Page**: https://status.neon.tech
- **Prisma Connection Issues**: https://www.prisma.io/docs/guides/deployment/troubleshooting-orm/help-articles/connectivity-issues

---

**Last Verified**: Your connection string format is correct. The issue is likely that the database needs to be woken up in the Neon dashboard.

