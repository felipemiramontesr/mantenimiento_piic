/* eslint-disable no-console */
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

async function run(): Promise<void> {
  console.log('🔱 DB_HOST:', process.env.DB_HOST);
  console.log('🔱 DB_USER:', process.env.DB_USER);
  console.log('🔱 DB_NAME:', process.env.DB_NAME);

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST === 'localhost' ? '127.0.0.1' : process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const migrationPath = path.resolve(
      __dirname,
      '../migrations/071_fleet_service_orders_sovereign.sql'
    );
    console.log(`🔱 Executing Migration: ${path.basename(migrationPath)}`);
    const sql = fs.readFileSync(migrationPath, 'utf8');

    await connection.query(sql);
    console.log('🔱 Migration 071 applied successfully.');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

run();
