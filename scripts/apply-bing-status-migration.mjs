import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const migrationSQL = `
-- Drop il constraint esistente
ALTER TABLE public.locations
DROP CONSTRAINT IF EXISTS locations_bing_sync_status_check;

-- Ricrea il constraint con il nuovo valore 'pending_upload'
ALTER TABLE public.locations
ADD CONSTRAINT locations_bing_sync_status_check
CHECK (bing_sync_status IN ('Active', 'Pending', 'Suspended', 'Under Review', 'pending_upload'));
`;

async function applyMigration() {
  console.log('🔧 Applicazione migration per bing_sync_status...\n');

  try {
    // Esegui la migration
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      console.error('❌ Errore durante l\'applicazione della migration:', error);
      process.exit(1);
    }

    console.log('✅ Migration applicata con successo!');
    console.log('   bing_sync_status ora accetta: Active, Pending, Suspended, Under Review, pending_upload\n');
  } catch (err) {
    console.error('❌ Errore:', err);
    process.exit(1);
  }
}

applyMigration();
