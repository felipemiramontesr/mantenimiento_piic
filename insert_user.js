const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'archon'
  });

  const username = 'GrayMan';
  const fullName = 'Gray Man';
  const email = '0df2ab713c49f99e81f3f1f3:69c3bd1035d5d43684e4cdb208533233:b4a3083387af414e3dc621f976';
  const passwordHash = '$argon2id$v=19$m=65536,t=3,p=4$GReQGAsEF63lqX0ajixMDA$nO8vlc+TOBGYyHwCFWmJleGgb97IjNJt3EBrdCCp0os';
  const roleId = 0;

  await connection.execute('DELETE FROM users WHERE username = ?', [username]);
  
  const [result] = await connection.execute(
    'INSERT INTO users (username, full_name, email, password_hash, role_id, is_active) VALUES (?, ?, ?, ?, ?, 1)',
    [username, fullName, email, passwordHash, roleId]
  );

  console.log('User inserted successfully:', result.insertId);
  await connection.end();
}

main().catch(console.error);
