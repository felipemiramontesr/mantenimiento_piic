import argon2 from 'argon2';
import dotenv from 'dotenv';
import db from '../services/db';
import EncryptionService from '../services/encryption';

dotenv.config({ path: '../../.env' });

async function seed() {
  console.log('🌱 Seeding Archon Master User...');

  const username = 'archon';
  const password = 'pinnacle2026';
  const email = 'admin@piic.com.mx';

  try {
    // 1. Hash Password
    const passwordHash = await argon2.hash(password);

    // 2. Encrypt Email
    const encryptedEmail = EncryptionService.encrypt(email);

    // 3. Insert into DB (Archon Role ID = 0)
    await db.execute(
      'INSERT INTO users (username, email, password_hash, role_id) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)',
      [username, encryptedEmail, passwordHash, 0]
    );

    console.log('✅ Archon User Created Successfully!');
    console.log(`👤 Username: ${username}`);
    console.log(`🔑 Password: ${password}`);
    console.log('🛡️  Email stored as Ciphertext.');

    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
}

seed();
