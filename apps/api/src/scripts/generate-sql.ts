import argon2 from 'argon2';
import dotenv from 'dotenv';
import EncryptionService from '../services/encryption';

dotenv.config({ path: '../../.env' });

async function generateSQL() {
  const username = 'archon';
  const password = 'pinnacle2026';
  const email = 'admin@piic.com.mx';

  try {
    const passwordHash = await argon2.hash(password);
    const encryptedEmail = EncryptionService.encrypt(email);

    console.log('\n🚀 COPIA Y PEGA ESTO EN PHPMYADMIN (Pestaña SQL):\n');
    console.log(`INSERT INTO users (username, email, password_hash, role_id) 
VALUES ('${username}', '${encryptedEmail}', '${passwordHash}', 0) 
ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash);`);
    console.log('\n--------------------------------------------------\n');

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

generateSQL();
