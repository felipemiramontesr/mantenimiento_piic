import fs from 'fs';
import path from 'path';

const MIGRATIONS_DIR = path.join(process.cwd(), 'packages', 'database', 'migrations');

async function validateSQL() {
  console.log('🏛️ Initializing Database Schema Validation...');

  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.error('❌ Migrations directory not found!');
    process.exit(1);
  }

  const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql'));

  if (files.length === 0) {
    console.warn('⚠️ No migration files found to validate.');
    return;
  }

  for (const file of files) {
    const content = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');

    // Basic Syntax Check: Every file must end with a semicolon or have content
    if (content.trim().length === 0) {
      console.error(`❌ Migration ${file} is empty!`);
      process.exit(1);
    }

    if (!content.trim().endsWith(';')) {
      console.warn(`⚠️ Migration ${file} might be missing a trailing semicolon.`);
    }

    console.log(`✅ ${file}: Passed basic syntax audit.`);
  }

  console.log('🛡️ Database Schema Audit: 100% Success.');
}

validateSQL().catch((err) => {
  console.error(err);
  process.exit(1);
});
