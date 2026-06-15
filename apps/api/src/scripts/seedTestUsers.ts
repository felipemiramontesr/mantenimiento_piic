/* eslint-disable no-restricted-syntax, no-await-in-loop, no-continue */
import dotenv from 'dotenv';
import path from 'path';

import { hash as argon2Hash } from '@node-rs/argon2';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import EncryptionService from '../services/encryption';

dotenv.config({ path: path.join(__dirname, '../../../../.env') });

const usersToSeed = [
  {
    username: 'op_general',
    full_name: 'Carlos Mendoza Ruiz',
    email: 'op.general@test.piic.mx',
    password: 'Test@2026!',
    role_id: 1,
  },
  {
    username: 'sup_mant',
    full_name: 'Laura Vega Torres',
    email: 'sup.mant@test.piic.mx',
    password: 'Test@2026!',
    role_id: 2,
  },
  {
    username: 'dir_finanzas',
    full_name: 'Roberto Castillo Mora',
    email: 'dir.fin@test.piic.mx',
    password: 'Test@2026!',
    role_id: 3,
  },
  {
    username: 'gestor_flot',
    full_name: 'Ana Herrera López',
    email: 'gestor.flot@test.piic.mx',
    password: 'Test@2026!',
    role_id: 4,
  },
  {
    username: 'plan_rutas',
    full_name: 'Miguel Soto Navarro',
    email: 'plan.rutas@test.piic.mx',
    password: 'Test@2026!',
    role_id: 5,
  },
  {
    username: 'sup_transito',
    full_name: 'Diana Ramos Fuentes',
    email: 'sup.trans@test.piic.mx',
    password: 'Test@2026!',
    role_id: 6,
  },
  {
    username: 'admin_rrhh',
    full_name: 'Jorge Núñez Vargas',
    email: 'admin.rrhh@test.piic.mx',
    password: 'Test@2026!',
    role_id: 7,
  },
  {
    username: 'admin_ti',
    full_name: 'Sofía Delgado Cruz',
    email: 'admin.ti@test.piic.mx',
    password: 'Test@2026!',
    role_id: 8,
  },
];

async function main() {
  console.log('Seeding test users (1 per role, roles 1-8)...');
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
        console.log(`[SKIPPED] "${u.username}" already exists (id: ${existing[0].id})`);
        continue;
      }

      const passwordHash = await argon2Hash(u.password);
      const encryptedEmail = EncryptionService.encrypt(u.email);

      const [res] = await connection.execute<ResultSetHeader>(
        'INSERT INTO users (username, full_name, email, password_hash, role_id, is_active) VALUES (?, ?, ?, ?, ?, 1)',
        [u.username, u.full_name, encryptedEmail, passwordHash, u.role_id]
      );

      console.log(`[CREATED] "${u.username}" (role_id=${u.role_id}) → id=${res.insertId}`);
    }

    await connection.commit();
    console.log('Done. Transaction committed.');
    process.exit(0);
  } catch (err) {
    await connection.rollback();
    console.error('Transaction rolled back:', err);
    process.exit(1);
  } finally {
    connection.release();
  }
}

main();
