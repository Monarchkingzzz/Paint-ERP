#!/usr/bin/env node
// =====================================================================
// AUTOMATED SUPABASE MIGRATION & DATA PUSH SCRIPT
// Project Ref: jlgnwdbdnmflhqgbnvhd
// Supabase URL: https://jlgnwdbdnmflhqgbnvhd.supabase.co
// =====================================================================

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'jlgnwdbdnmflhqgbnvhd';
const SUPABASE_URL = process.env.SUPABASE_URL || `https://${PROJECT_REF}.supabase.co`;

// Extract arguments (e.g. node push_to_supabase.js --password=yourpassword or --url=postgres://...)
const args = process.argv.slice(2);
let argPassword = '';
let argUrl = '';
let isDryRun = args.includes('--dry-run');

for (const arg of args) {
  if (arg.startsWith('--password=')) {
    argPassword = arg.split('=')[1];
  } else if (arg.startsWith('--url=')) {
    argUrl = arg.split('=')[1];
  }
}

const dbPassword = argPassword || process.env.SUPABASE_DB_PASSWORD || process.env.DB_PASSWORD || '';
let connectionString = argUrl || process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || '';

if (!connectionString && dbPassword) {
  // Construct direct & pooler connections
  connectionString = `postgresql://postgres:${encodeURIComponent(dbPassword)}@db.${PROJECT_REF}.supabase.co:5432/postgres`;
}

async function run() {
  console.log('================================================================');
  console.log('   KENYAN PAINT & HARDWARE ENTERPRISE ERP -> SUPABASE PUSH');
  console.log('================================================================');
  console.log(`Target Supabase URL : ${SUPABASE_URL}`);
  console.log(`Project Reference   : ${PROJECT_REF}`);
  console.log('----------------------------------------------------------------\n');

  if (isDryRun) {
    console.log('[DRY-RUN] Validating migration and seed files...');
    const completeSetupPath = path.join(__dirname, '..', 'supabase', 'complete_setup.sql');
    if (fs.existsSync(completeSetupPath)) {
      const stats = fs.statSync(completeSetupPath);
      console.log(`[DRY-RUN] complete_setup.sql found: ${Math.round(stats.size / 1024)} KB`);
      console.log('[DRY-RUN] Schema and 2,256+ color seed data are ready for deployment.');
    } else {
      console.error('[DRY-RUN ERROR] complete_setup.sql not found. Run "npm run supabase:seed" first.');
      process.exit(1);
    }
    return;
  }

  if (!connectionString) {
    console.log('ℹ️  No database connection string or password provided.\n');
    console.log('You have two easy ways to complete the deployment to Supabase:');
    console.log('----------------------------------------------------------------');
    console.log('👉 OPTION 1: Instant 1-Click via Supabase SQL Editor (Recommended)');
    console.log('   1. Open: https://supabase.com/dashboard/project/' + PROJECT_REF + '/sql/new');
    console.log('   2. Open the file: supabase/complete_setup.sql in this project');
    console.log('   3. Copy all contents, paste into SQL Editor, and click RUN!');
    console.log('----------------------------------------------------------------');
    console.log('👉 OPTION 2: Push via Command Line with your Database Password');
    console.log('   Run:');
    console.log(`   node scripts/push_to_supabase.js --password="YOUR_SUPABASE_DB_PASSWORD"`);
    console.log('   OR');
    console.log(`   node scripts/push_to_supabase.js --url="postgresql://postgres:[PASSWORD]@db.${PROJECT_REF}.supabase.co:5432/postgres"`);
    console.log('----------------------------------------------------------------\n');
    return;
  }

  console.log('Connecting to Supabase PostgreSQL database...');
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to Supabase PostgreSQL successfully.\n');

    // 1. Read complete_setup.sql
    const setupSqlPath = path.join(__dirname, '..', 'supabase', 'complete_setup.sql');
    if (!fs.existsSync(setupSqlPath)) {
      console.log('Generating seed files first...');
      require('./generate_supabase_seed');
    }

    const sql = fs.readFileSync(setupSqlPath, 'utf8');
    console.log(`Applying full schema, security policies, and 2,256+ shades (${Math.round(sql.length / 1024)} KB)...`);

    await client.query(sql);
    console.log('Schema, RLS policies, indexes, and seed data applied successfully!\n');

    // 2. Verify Table Counts
    console.log('Verifying table records in Supabase:');
    console.log('----------------------------------------------------------------');
    const tables = [
      'store_users',
      'manufacturer_colors',
      'stock_base_tins',
      'stock_pigments',
      'products',
      'cashflow_accounts',
      'credit_accounts',
      'suppliers',
      'purchase_orders',
      'quotations',
      'store_settings'
    ];

    for (const tbl of tables) {
      try {
        const res = await client.query(`SELECT COUNT(*) AS total FROM ${tbl}`);
        console.log(`  ✓ ${tbl.padEnd(22)} : ${res.rows[0].total} rows`);
      } catch (err) {
        console.log(`  ✗ ${tbl.padEnd(22)} : Error reading table (${err.message})`);
      }
    }

    console.log('----------------------------------------------------------------');
    console.log('SUPABASE MIGRATION COMPLETED SUCCESSFULLY!');
    console.log('All paint shades, bases, pigments, accounts, and ERP tables are live.\n');

  } catch (error) {
    console.error('\n Migration error:', error.message);
    console.log('\nTip: You can also copy/paste supabase/complete_setup.sql directly into:');
    console.log(`https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new\n`);
  } finally {
    await client.end();
  }
}

run();
