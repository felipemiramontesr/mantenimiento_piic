import path from 'path';
import argon2 from 'argon2';
import dotenv from 'dotenv';
import EncryptionService from '../services/encryption';

dotenv.config({ path: path.join(__dirname, '../../../.env') });

async function generate() {
  const username = 'archon';
  const password = 'pinnacle2026';
  const email = 'admin@piic.com.mx';

  try {
    const passwordHash = await argon2.hash(password);
    const encryptedEmail = EncryptionService.encrypt(email);

    console.log('\n--- SQL COMMAND FOR PHPMYADMIN ---');
    console.log(`INSERT INTO users (username, email, password_hash, role_id) VALUES ('${username}', '${encryptedEmail}', '${passwordHash}', 0) ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash);\n`);
  } catch (err) {
    console.error('Error generating values:', err);
  }
}

generate();
