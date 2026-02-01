import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read .env.local manually
function loadEnv() {
  const envPath = join(__dirname, '..', '.env.local');
  const envContent = readFileSync(envPath, 'utf8');
  const env = {};

  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      env[key] = value;
    }
  });

  return env;
}

const env = loadEnv();
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

async function runMigration() {
  try {
    // Read the migration file
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20260131000003_clean_locations_seo_focus.sql');
    const sql = readFileSync(migrationPath, 'utf8');

    console.log('🚀 Running migration: 20260131000003_clean_locations_seo_focus.sql\n');

    // Use Supabase's SQL endpoint (v1)
    const dbUrl = SUPABASE_URL.replace('https://', '').replace('.supabase.co', '');
    const response = await fetch(`https://${dbUrl}.supabase.co/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ sql })
    });

    const result = await response.text();

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${result}`);
    }

    console.log('Response:', result);
    console.log('\n✅ Migration executed successfully!\n');
    console.log('Changes applied:');
    console.log('  - Removed 50+ real estate columns');
    console.log('  - Added SEO-focused fields (business_name, category, place_id, is_active)');
    console.log('  - Migrated title → business_name');
    console.log('  - Added NAP documentation comments\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\n📋 Please run the migration manually:');
    console.error('1. Open: https://supabase.com/dashboard/project/ycvxnsgikfgnygnnumxe/sql/new');
    console.error('2. Copy the contents of: supabase/migrations/20260131000003_clean_locations_seo_focus.sql');
    console.error('3. Paste and run in SQL Editor\n');
    process.exit(1);
  }
}

runMigration();
