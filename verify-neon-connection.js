#!/usr/bin/env node

/**
 * Neon Database Connection Verifier
 * 
 * This script helps verify your Neon database connection settings
 * and provides troubleshooting guidance.
 */

require('dotenv').config();

const currentUrl = process.env.DATABASE_URL;

console.log('🔍 Neon Database Connection Verification\n');
console.log('=' .repeat(60));

// Parse current connection string
if (!currentUrl) {
  console.error('❌ DATABASE_URL not found in .env file');
  process.exit(1);
}

console.log('\n📋 Current Connection String:');
console.log('   ' + currentUrl.replace(/:[^:@]+@/, ':****@'));

// Extract components
const urlMatch = currentUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^\/]+)\/([^?]+)(\?.*)?/);
if (!urlMatch) {
  console.error('❌ Invalid connection string format');
  process.exit(1);
}

const [, username, password, host, database, params] = urlMatch;

console.log('\n📊 Connection Details:');
console.log('   Username:', username);
console.log('   Host:', host);
console.log('   Database:', database);
console.log('   Parameters:', params || '(none)');

// Check if using pooled connection
const isPooled = host.includes('-pooler');
console.log('\n🔗 Connection Type:');
console.log('   ' + (isPooled ? '✅ Pooled Connection (recommended for Next.js)' : '⚠️  Direct Connection'));

// Check SSL mode
const hasSSL = currentUrl.includes('sslmode=require');
console.log('\n🔒 SSL Configuration:');
console.log('   ' + (hasSSL ? '✅ SSL required (sslmode=require)' : '⚠️  SSL not explicitly required'));

// Verify hostname format
const isValidNeonHost = host.includes('.neon.tech') || host.includes('.neon.tech');
console.log('\n🌐 Hostname Validation:');
console.log('   ' + (isValidNeonHost ? '✅ Valid Neon hostname' : '⚠️  Hostname does not match Neon format'));

console.log('\n' + '='.repeat(60));
console.log('\n📝 Neon Dashboard Verification Checklist:\n');

console.log('1. ✅ Check Database Status:');
console.log('   → Go to: https://console.neon.tech');
console.log('   → Select your project');
console.log('   → Check if database shows "Active" (not "Paused")');
console.log('   → If paused, click "Resume" or wait for auto-wake\n');

console.log('2. ✅ Verify Connection String:');
console.log('   → In Neon dashboard, go to: Connection Details');
console.log('   → Copy the "Pooled Connection" string');
console.log('   → Compare with your .env file\n');

console.log('3. ✅ Check Connection Details Match:');
console.log('   → Host should match: ' + host);
console.log('   → Database should match: ' + database);
console.log('   → Username should match: ' + username);
console.log('   → Should include: ?sslmode=require\n');

console.log('4. ✅ Check IP Restrictions:');
console.log('   → In Neon dashboard, go to: Settings → IP Allowlist');
console.log('   → Ensure your IP is allowed (or allowlist is empty for public access)');
console.log('   → If using VPN, make sure VPN IP is allowed\n');

console.log('5. ✅ Test Direct Connection (if pooled fails):');
console.log('   → In Neon dashboard, copy "Direct Connection" string');
console.log('   → Temporarily replace DATABASE_URL in .env');
console.log('   → Run: npx prisma migrate dev --name init');
console.log('   → If direct works, there may be a pooler issue\n');

console.log('='.repeat(60));
console.log('\n🧪 Testing Connection...\n');

// Test connection
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  log: ['error'],
  datasources: {
    db: {
      url: currentUrl
    }
  }
});

async function testConnection() {
  try {
    console.log('Attempting to connect...');
    await prisma.$connect();
    console.log('✅ SUCCESS: Connected to database!');
    
    // Try a simple query
    const result = await prisma.$queryRaw`SELECT version() as version`;
    console.log('✅ Database query successful');
    console.log('   PostgreSQL version:', result[0]?.version?.substring(0, 50) || 'Unknown');
    
    return true;
  } catch (error) {
    console.error('❌ CONNECTION FAILED');
    console.error('\nError Details:');
    console.error('   Code:', error.code || 'N/A');
    console.error('   Message:', error.message);
    
    if (error.code === 'P1001') {
      console.error('\n💡 Troubleshooting:');
      console.error('   1. Database is likely PAUSED - wake it up in Neon dashboard');
      console.error('   2. Check if your IP is blocked by firewall');
      console.error('   3. Verify connection string is correct');
      console.error('   4. Try direct connection string instead of pooled');
    } else if (error.code === 'P1000') {
      console.error('\n💡 Troubleshooting:');
      console.error('   1. Authentication failed - check username/password');
      console.error('   2. Verify credentials in Neon dashboard');
    }
    
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

testConnection().then(success => {
  process.exit(success ? 0 : 1);
});

