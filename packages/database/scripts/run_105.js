const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

async function runMigration() {
  console.log('[105] Conectando a BD...');
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'archon',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    multipleStatements: true,
  });

  const connection = await pool.getConnection();

  try {
    console.log('[105] Cargando SQL...');
    const sqlPath = path.join(__dirname, '../migrations/105_three_role_architecture.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('[105] Ejecutando migración (Three-Role Architecture)...');
    await connection.query(sql);

    console.log('[105] ✅ Migración aplicada exitosamente.');
    console.log('[105] Verificando resultado...');

    const [roles] = await connection.query('SELECT id, name FROM roles ORDER BY id');
    console.log('[105] Roles activos:', roles);

    const [perms] = await connection.query(
      `SELECT rp.role_id, p.slug FROM role_permissions rp
       JOIN permissions p ON p.id = rp.permission_id
       WHERE rp.role_id IN (1, 2) ORDER BY rp.role_id, p.slug`
    );
    console.log('[105] Permisos roles 1 y 2:', perms);

    const [users] = await connection.query(
      'SELECT id, email, role_id FROM users WHERE id IN (4, 19)'
    );
    console.log('[105] Usuarios clave (4 y 19):', users);

    const [ur] = await connection.query(
      'SELECT user_id, role_id FROM user_roles WHERE user_id = 19'
    );
    console.log('[105] user_roles para user 19:', ur);
  } catch (err) {
    console.error('[105] ❌ Falló.', err);
    process.exit(1);
  } finally {
    connection.release();
    await pool.end();
  }
}

runMigration();
