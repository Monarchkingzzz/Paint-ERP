#!/usr/bin/env node
// =====================================================================
// SYNC ALL LOCAL ERP TABLES DIRECTLY TO SUPABASE
// =====================================================================

require('dotenv').config();
const { syncAllToSupabase } = require('../paint-erp/backend/supabaseSync');

async function main() {
  console.log('Starting full data sync to Supabase...');
  const res = await syncAllToSupabase();
  if (res.error) {
    console.error('Sync failed:', res.error);
    process.exit(1);
  } else {
    console.log('Sync finished successfully:', res.results);
  }
}

main();
