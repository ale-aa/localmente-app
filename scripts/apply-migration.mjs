import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Leggi manualmente .env.local
const envPath = join(__dirname, '..', '.env.local');
const envContent = readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const value = match[2].trim().replace(/^["']|["']$/g, '');
    envVars[key] = value;
  }
});

const { Client } = pg;

async function applyMigration() {
  const client = new Client({
    connectionString: envVars.DATABASE_URL,
  });

  try {
    console.log('\n🔌 Connessione al database...');
    await client.connect();
    console.log('✅ Connesso!\n');

    // Leggi la migration
    const migrationFile = '20260205000004_bing_places_integration.sql';
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', migrationFile);
    const sql = readFileSync(migrationPath, 'utf8');

    console.log(`📄 Applicazione migration: ${migrationFile}\n`);
    console.log('='.repeat(60));

    // Esegui la migration
    const result = await client.query(sql);

    console.log('='.repeat(60));
    console.log('\n✅ Migration applicata con successo!\n');

    // Mostra i messaggi finali dalla migration
    if (result.rows && result.rows.length > 0) {
      console.log('📋 Risultato:');
      result.rows.forEach(row => {
        Object.entries(row).forEach(([key, value]) => {
          console.log(`   ${key}: ${value}`);
        });
      });
    }

    console.log('\n🎉 Database aggiornato con Bing Places Integration!\n');

  } catch (error) {
    console.error('\n❌ Errore durante l\'applicazione della migration:');
    console.error(error.message);
    if (error.detail) {
      console.error('Dettagli:', error.detail);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyMigration();
