/* eslint-disable */
// @ts-nocheck
/* eslint-disable */
import db from './config/database';

async function checkUsers() {
  try {
    const [rows] = await db.execute('SELECT username FROM users');
    console.log('Current users:', rows);
  } catch (e) {
    console.error('Error checking users:', e.message);
  } finally {
    process.exit();
  }
}

checkUsers();
