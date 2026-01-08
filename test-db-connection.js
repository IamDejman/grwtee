#!/usr/bin/env node

/**
 * Deep database connection investigation
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');

async function investigate() {
  const rawUrl = process.env.DATABASE_URL;
  console.log('🔍 Deep Connection Investigation\n');
  console.log('='.repeat(60));

  // Check for quotes
  if (rawUrl && (rawUrl.startsWith('"') || rawUrl.startsWith("'"))) {
    console.log('⚠️  WARNING: Connection string has quotes!');
    console.log('   This can cause parsing issues.');
    console.log('   Raw:', rawUrl.substring(0, 50) + '...');
  }

  // Clean the URL
  const cleanUrl = rawUrl?.replace(/^["']|["']$/g, '') || '';
  console.log('\n📋 Connection String Analysis:');
  console.log('   Clean URL:', cleanUrl.replace(/:[^:@]+@/, ':****@'));

  // Parse URL
  let parsed;
  try {
    parsed = new URL(cleanUrl);
    console.log('   ✅ URL parsing: SUCCESS');
    console.log('   Protocol:', parsed.protocol);
    console.log('   Hostname:', parsed.hostname);
    console.log('   Port:', parsed.port || '5432 (default)');
    console.log('   Database:', parsed.pathname.replace('/', ''));
    console.log('   Parameters:', parsed.search);
    
    // Check parameters
    const params = new URLSearchParams(parsed.search);
    console.log('\n📊 Connection Parameters:');
    for (const [key, value] of params.entries()) {
      console.log(`   ${key}: ${value}`);
    }
    
    // Check for problematic parameters
    if (params.has('channel_binding') && params.get('channel_binding') === 'require') {
      console.log('\n⚠️  WARNING: channel_binding=require may cause issues');
      console.log('   Some Prisma versions don\'t support this parameter');
    }
    
  } catch (e) {
    console.error('   ❌ URL parsing: FAILED');
    console.error('   Error:', e.message);
    process.exit(1);
  }

  // Test network connectivity
  console.log('\n🌐 Network Connectivity Test:');
  try {
    const result = execSync(`nc -zv ${parsed.hostname} ${parsed.port || 5432} 2>&1`, { encoding: 'utf8' });
    if (result.includes('succeeded')) {
      console.log('   ✅ Port is reachable');
    } else {
      console.log('   ⚠️  Port test result:', result.trim());
    }
  } catch (e) {
    console.log('   ❌ Port test failed:', e.message);
  }

  // Test with different connection string variations
  console.log('\n🧪 Testing Connection String Variations:\n');

  const variations = [
    { name: 'Current (with channel_binding)', url: cleanUrl },
    { name: 'Without channel_binding', url: cleanUrl.replace(/[&?]channel_binding=[^&]*/g, '') },
    { name: 'Minimal (sslmode only)', url: cleanUrl.split('?')[0] + '?sslmode=require' },
  ];

  let workingUrl = null;

  for (const variation of variations) {
    console.log(`Testing: ${variation.name}`);
    const testPrisma = new PrismaClient({
      log: [],
      datasources: { db: { url: variation.url } }
    });
    
    try {
      await testPrisma.$connect();
      console.log(`   ✅ ${variation.name}: SUCCESS\n`);
      await testPrisma.$disconnect();
      workingUrl = variation.url;
      break; // Found working variation
    } catch (e) {
      console.log(`   ❌ ${variation.name}: FAILED`);
      console.log(`   Error: ${e.message.substring(0, 80)}...\n`);
      await testPrisma.$disconnect().catch(() => {});
    }
  }

  // Final detailed test
  console.log('='.repeat(60));
  console.log('\n🔌 Detailed Prisma Connection Test:\n');
  
  const testUrl = workingUrl || cleanUrl;
  const prisma = new PrismaClient({
    log: ['error', 'warn'],
    datasources: {
      db: {
        url: testUrl
      }
    }
  });

  try {
    console.log('   Attempting connection with:', testUrl.replace(/:[^:@]+@/, ':****@'));
    await prisma.$connect();
    console.log('   ✅ Prisma connection: SUCCESS');
    
    // Try a simple query
    const result = await prisma.$queryRaw`SELECT version() as version, current_database() as db, current_user as user`;
    console.log('   ✅ Database query: SUCCESS');
    console.log('   PostgreSQL version:', result[0]?.version?.substring(0, 60) || 'Unknown');
    console.log('   Database name:', result[0]?.db || 'Unknown');
    console.log('   Current user:', result[0]?.user || 'Unknown');
    
    // Test if we can query tables
    try {
      const tables = await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' LIMIT 5`;
      console.log('   ✅ Table access: SUCCESS');
      console.log('   Found tables:', tables.length);
    } catch (e) {
      console.log('   ⚠️  Table access: Limited -', e.message.substring(0, 50));
    }
    
    if (workingUrl && workingUrl !== cleanUrl) {
      console.log('\n💡 RECOMMENDATION:');
      console.log('   Update your .env file to use this connection string:');
      console.log(`   DATABASE_URL="${workingUrl}"`);
    }
    
    return true;
  } catch (error) {
    console.error('   ❌ Prisma connection: FAILED');
    console.error('\n   Error Details:');
    console.error('   Code:', error.code || 'N/A');
    console.error('   Message:', error.message);
    
    if (error.message.includes('channel_binding')) {
      console.error('\n   💡 Solution: Remove channel_binding=require from connection string');
      console.error('   Try: DATABASE_URL="postgresql://...?sslmode=require"');
    }
    
    if (error.message.includes('sslmode')) {
      console.error('\n   💡 Solution: Ensure sslmode=require is present');
    }
    
    if (error.code === 'P1001') {
      console.error('\n   💡 Possible causes:');
      console.error('   1. Database is paused (even if dashboard says active)');
      console.error('   2. IP address is blocked');
      console.error('   3. Firewall/network restrictions');
      console.error('   4. Connection pooler issue');
      console.error('   5. channel_binding parameter not supported');
    }
    
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

investigate().then(success => {
  process.exit(success ? 0 : 1);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
