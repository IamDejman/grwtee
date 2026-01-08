#!/usr/bin/env node

/**
 * Test if @vercel/postgres works better than Prisma
 * This will help determine if the issue is Prisma-specific or database-level
 */

require('dotenv').config();

async function testVercelPostgres() {
  try {
    // Try to use @vercel/postgres if available
    const { sql } = require('@vercel/postgres');
    
    console.log('🧪 Testing @vercel/postgres connection...\n');
    console.log('Using POSTGRES_URL:', process.env.POSTGRES_URL ? 'Set' : 'Not set');
    console.log('Using DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
    
    // @vercel/postgres uses POSTGRES_URL, but we have DATABASE_URL
    // Let's set it temporarily
    if (process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
      process.env.POSTGRES_URL = process.env.DATABASE_URL;
    }
    
    const result = await sql`SELECT version() as version, current_database() as db`;
    console.log('✅ @vercel/postgres connection: SUCCESS');
    console.log('Database:', result.rows[0].db);
    console.log('Version:', result.rows[0].version.substring(0, 50));
    return true;
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.log('❌ @vercel/postgres not installed');
      console.log('   Install with: npm install @vercel/postgres');
      return false;
    }
    console.error('❌ @vercel/postgres connection: FAILED');
    console.error('Error:', error.message);
    console.error('Code:', error.code || 'N/A');
    return false;
  }
}

testVercelPostgres().then(success => {
  process.exit(success ? 0 : 1);
});

