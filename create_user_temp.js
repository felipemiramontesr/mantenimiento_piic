const argon2 = require('argon2');
const crypto = require('crypto');

const DB_ENCRYPTION_KEY = '332ccf26c54c94ae8ac33475931cdf40a9cd09ac476299370f04287a75a68f5b';
const ALGORITHM = 'aes-256-gcm';

function getKey() {
  const key = DB_ENCRYPTION_KEY.trim();
  if (/^[0-9a-fA-F]{64}$/.test(key)) {
    return Buffer.from(key, 'hex');
  }
  return Buffer.from(key, 'utf-8');
}

function encrypt(text) {
  const iv = crypto.randomBytes(12);
  const key = getKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const tag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${tag}:${encrypted}`;
}

async function main() {
  const username = 'GrayMan';
  const password = 'Archon2026!';
  const email = 'admin@piic.mx';
  const fullName = 'Gray Man';
  const roleId = 0; // Archon

  const hash = await argon2.hash(password);
  const encEmail = encrypt(email);

  console.log(`INSERT INTO users (username, email, password_hash, role_id, full_name, is_active) VALUES ('${username}', '${encEmail}', '${hash}', ${roleId}, '${fullName}', 1);`);
}

main().catch(console.error);
