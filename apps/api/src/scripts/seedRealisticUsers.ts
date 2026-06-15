/* eslint-disable no-restricted-syntax, no-await-in-loop, no-continue */
import dotenv from 'dotenv';
import path from 'path';

import { hash as argon2Hash } from '@node-rs/argon2';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import EncryptionService from '../services/encryption';

dotenv.config({ path: path.join(__dirname, '../../../../.env') });

const usersToSeed = [
  {
    username: 'mflores',
    full_name: 'Mauricio Flores Ortiz',
    email: 'm.flores@piic.com.mx',
    password: 'Pinnacle#GG01!',
    role_id: 1,
    department_id: 222,
    employee_number: 'EMP-GG-01',
  },
  {
    username: 'acarrillo',
    full_name: 'Alejandro Carrillo Silva',
    email: 'a.carrillo@piic.com.mx',
    password: 'Pinnacle#SM02!',
    role_id: 2,
    department_id: 229,
    employee_number: 'EMP-SM-02',
  },
  {
    username: 'rtorres',
    full_name: 'Roberto Torres Landeros',
    email: 'r.torres@piic.com.mx',
    password: 'Pinnacle#JM03!',
    role_id: 3,
    department_id: 227,
    employee_number: 'EMP-JM-03',
  },
  {
    username: 'sgarcia',
    full_name: 'Sandra García Delgado',
    email: 's.garcia@piic.com.mx',
    password: 'Pinnacle#PS04!',
    role_id: 4,
    department_id: 231,
    employee_number: 'EMP-PS-04',
  },
  {
    username: 'hromero',
    full_name: 'Hugo Romero Parga',
    email: 'h.romero@piic.com.mx',
    password: 'Pinnacle#TE05!',
    role_id: 5,
    department_id: 226,
    employee_number: 'EMP-TE-05',
  },
  {
    username: 'jmartinez',
    full_name: 'Jesús Martínez Luna',
    email: 'j.martinez@piic.com.mx',
    password: 'Pinnacle#OP06!',
    role_id: 6,
    department_id: 229,
    employee_number: 'EMP-OP-06',
  },
];

async function main() {
  console.log('🔱 Starting Idempotent User Seeding Pipeline...');
  // Dynamic import to bypass hoisted ESM import order database execution
  const db = (await import('../services/db')).default;
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    for (const u of usersToSeed) {
      const [existing] = await connection.execute<RowDataPacket[]>(
        'SELECT id FROM users WHERE username = ?',
        [u.username]
      );

      if (existing.length > 0) {
        console.log(`[SKIPPED] User "${u.username}" already exists (id: ${existing[0].id}).`);
        continue;
      }

      const passwordHash = await argon2Hash(u.password);
      const encryptedEmail = EncryptionService.encrypt(u.email);

      const [res] = await connection.execute<ResultSetHeader>(
        'INSERT INTO users (username, full_name, email, password_hash, role_id, department_id, employee_number, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
        [
          u.username,
          u.full_name,
          encryptedEmail,
          passwordHash,
          u.role_id,
          u.department_id,
          u.employee_number,
        ]
      );

      console.log(`[CREATED] Seeded user "${u.username}" with ID ${res.insertId}.`);
    }

    await connection.commit();
    console.log('✅ Transaction committed successfully. Seeding complete.');
    process.exit(0);
  } catch (err) {
    await connection.rollback();
    console.error('❌ Transaction rolled back due to error:', err);
    process.exit(1);
  } finally {
    connection.release();
  }
}

main();
