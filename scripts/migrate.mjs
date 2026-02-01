import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function showMigrations() {
  try {
    // Get all migration files
    const migrationsDir = join(__dirname, '..', 'supabase', 'migrations');
    const files = readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    console.log('\n📁 Database Migrations');
    console.log('='.repeat(60));
    console.log(`\nFound ${files.length} migration files:\n`);

    files.forEach((file, index) => {
      console.log(`${index + 1}. ${file}`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('\n📋 NEXT STEPS:\n');
    console.log('1. Open: https://supabase.com/dashboard/project/ycvxnsgikfgnygnnumxe/sql/new');
    console.log('2. Copy the SQL below');
    console.log('3. Paste and click "Run"\n');
    console.log('='.repeat(60));
    console.log('\n🔽 SQL TO EXECUTE (copy everything below):\n');
    console.log('='.repeat(60));
    console.log('\n');

    // Show only the latest migration that likely needs to be run
    const latestFile = files[files.length - 1];
    const latestPath = join(migrationsDir, latestFile);
    const sql = readFileSync(latestPath, 'utf8');

    console.log(`-- Migration: ${latestFile}`);
    console.log(sql);
    console.log('\n' + '='.repeat(60));
    console.log('\n✅ Copy the SQL above and paste it in Supabase SQL Editor\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

showMigrations();
