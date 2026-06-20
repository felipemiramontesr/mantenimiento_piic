/* eslint-disable no-restricted-syntax, no-await-in-loop */
import dotenv from 'dotenv';
import path from 'path';
import { hash as argon2Hash } from '@node-rs/argon2';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

dotenv.config({ path: path.join(__dirname, '../../../../.env') });

// ─── FASE 1C ─── VIM Universe PIIC — Full 7-Table Seed ───────────────────────
// Seed Ana Karen Flores Baca as the PIIC VIM center admin (role_id=3).
// Tables: users · common_catalogs · owners · user_owner_membership · user_roles
//         owner_profiles · owner_specialties

const PIIC_USERNAME = 'Abacaf';
const PIIC_EMAIL = 'anakarenfloresbaca@piic.com.mx';
const PIIC_FULLNAME = 'Ana Karen Flores Baca';
const PIIC_PASSWORD = 'Piic.Centro1!';
const PIIC_ROLE_ID = 3;

const PIIC_RFC = 'FOBA980115MHN';
const PIIC_RAZON_SOCIAL = 'PIIC S.A. de C.V.';
const PIIC_TELEFONO = '6621234567';
const PIIC_CALLE = 'Blvd. Luis Encinas Johnson';
const PIIC_NUM_EXT = '1200';

// Specialty codes to assign to PIIC — INSERT IGNORE (skips if code not in catalog)
const PIIC_SPECIALTIES = ['MOTOR', 'TRANSMISION', 'FRENOS', 'SUSPENSION'];

async function runFase1C(): Promise<void> {
  console.log('═══════════════════════════════════════════════════════');
  console.log('VIM_Universe_PIIC_Seed | FASE 1C — 7 tablas · Ana Karen');
  console.log('═══════════════════════════════════════════════════════');

  const db = (await import('../services/db')).default;
  const EncryptionService = (await import('../services/encryption')).default;
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    // ── Cleanup idempotente ──────────────────────────────────────────────────
    console.log('[CLEANUP] Buscando registros previos de Abacaf...');
    const [existingUsers] = await conn.execute<RowDataPacket[]>(
      'SELECT id FROM users WHERE username = ?',
      [PIIC_USERNAME]
    );
    if (existingUsers.length > 0) {
      const prevUserId = existingUsers[0].id as number;
      const [prevMem] = await conn.execute<RowDataPacket[]>(
        'SELECT owner_id FROM user_owner_membership WHERE user_id = ? LIMIT 1',
        [prevUserId]
      );
      if (prevMem.length > 0) {
        const prevOwnerId = prevMem[0].owner_id as number;
        await conn.execute('DELETE FROM owner_specialties WHERE owner_id = ?', [prevOwnerId]);
        await conn.execute('DELETE FROM fleet_units WHERE ownerId = ?', [prevOwnerId]);
        await conn.execute('DELETE FROM owner_profiles WHERE owner_id = ?', [prevOwnerId]);
        await conn.execute('DELETE FROM user_owner_membership WHERE owner_id = ?', [prevOwnerId]);
        await conn.execute(
          "DELETE FROM common_catalogs WHERE id = ? AND category = 'FLEET_OWNER'",
          [prevOwnerId]
        );
        await conn.execute('DELETE FROM owners WHERE id = ?', [prevOwnerId]);
      }
      await conn.execute('DELETE FROM user_roles WHERE user_id = ?', [prevUserId]);
      await conn.execute('DELETE FROM users WHERE id = ?', [prevUserId]);
      console.log(
        `[CLEANUP] Usuario Abacaf (id=${existingUsers[0].id}) y owner previo eliminados.`
      );
    }

    // Limpiar también el id=100 incorrecto de la Fase 1 original
    await conn.execute('DELETE FROM owner_specialties WHERE owner_id = 100');
    await conn.execute('DELETE FROM fleet_units WHERE ownerId = 100');
    await conn.execute('DELETE FROM owner_profiles WHERE owner_id = 100');
    await conn.execute('DELETE FROM user_owner_membership WHERE owner_id = 100');
    await conn.execute("DELETE FROM common_catalogs WHERE id = 100 AND category = 'FLEET_OWNER'");
    await conn.execute('DELETE FROM owners WHERE id = 100');
    console.log('[CLEANUP] Datos incorrectos id=100 (Fase 1) eliminados.');

    // ── Paso 1: users ────────────────────────────────────────────────────────
    console.log(`[FASE 1C] Creando usuario ${PIIC_USERNAME} (role_id=${PIIC_ROLE_ID})...`);
    const passwordHash = await argon2Hash(PIIC_PASSWORD);
    const encEmail = EncryptionService.encrypt(PIIC_EMAIL);
    const [userRes] = await conn.execute<ResultSetHeader>(
      'INSERT INTO users (username, email, password_hash, role_id, full_name) VALUES (?, ?, ?, ?, ?)',
      [PIIC_USERNAME, encEmail, passwordHash, PIIC_ROLE_ID, PIIC_FULLNAME]
    );
    const userId = userRes.insertId;
    console.log(`[FASE 1C] users → insertId=${userId}`);

    // ── Paso 2: ownerId dinámico (mismo patrón que onboarding.ts) ───────────
    const [nextRows] = await conn.execute<RowDataPacket[]>(
      'SELECT COALESCE(MAX(id), 0) + 1 AS nextId FROM common_catalogs FOR UPDATE'
    );
    const ownerId = (nextRows as RowDataPacket[])[0].nextId as number;
    console.log(`[FASE 1C] ownerId dinámico → ${ownerId}`);

    // ── Paso 3: common_catalogs ──────────────────────────────────────────────
    await conn.execute<ResultSetHeader>(
      "INSERT INTO common_catalogs (id, category, code, label) VALUES (?, 'FLEET_OWNER', ?, ?)",
      [ownerId, `OWN_U${userId}`, 'PIIC']
    );

    // ── Paso 4: owners ───────────────────────────────────────────────────────
    await conn.execute<ResultSetHeader>(
      'INSERT INTO owners (id, owner_type, suite, label, parent_owner_id) VALUES (?, ?, ?, ?, ?)',
      [ownerId, 'CENTER', 'VIM', 'PIIC', null]
    );

    // ── Paso 5: user_owner_membership ────────────────────────────────────────
    await conn.execute<ResultSetHeader>(
      'INSERT IGNORE INTO user_owner_membership (user_id, owner_id) VALUES (?, ?)',
      [userId, ownerId]
    );

    // ── Paso 6: user_roles ───────────────────────────────────────────────────
    await conn.execute<ResultSetHeader>(
      'INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)',
      [userId, PIIC_ROLE_ID]
    );

    // ── Paso 7: owner_profiles ───────────────────────────────────────────────
    // neighborhood_id: resolve dynamically — if 260301 exists use it, else null
    const [nbRows] = await conn.execute<RowDataPacket[]>(
      'SELECT id FROM neighborhoods WHERE id = ?',
      [260301]
    );
    const neighborhoodId = nbRows.length > 0 ? 260301 : null;
    if (!neighborhoodId) {
      console.warn('[FASE 1C] ⚠️  neighborhood_id=260301 no encontrado — usando NULL');
    }
    await conn.execute<ResultSetHeader>(
      `INSERT INTO owner_profiles
         (owner_id, rfc, razon_social, telefono, calle, numero_exterior, numero_interior, neighborhood_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ownerId,
        PIIC_RFC,
        PIIC_RAZON_SOCIAL,
        PIIC_TELEFONO,
        PIIC_CALLE,
        PIIC_NUM_EXT,
        null,
        neighborhoodId,
      ]
    );

    // ── Paso 8: owner_specialties (junction — INSERT IGNORE si código no existe) ──
    await Promise.all(
      PIIC_SPECIALTIES.map((code) =>
        conn.execute<ResultSetHeader>(
          `INSERT IGNORE INTO owner_specialties (owner_id, catalog_id)
           SELECT ?, id FROM common_catalogs WHERE category = 'SPECIALTY' AND code = ? LIMIT 1`,
          [ownerId, code]
        )
      )
    );

    await conn.commit();
    console.log('[FASE 1C] Transacción committed ✅');

    // ── Verificación post-insert (Acceptance Criteria) ───────────────────────
    console.log('\n── Verificación ─────────────────────────────────────────');

    const [[userRow]] = await conn.execute<RowDataPacket[]>(
      'SELECT id, username, role_id, full_name FROM users WHERE username = ?',
      [PIIC_USERNAME]
    );
    const [[ownerRow]] = await conn.execute<RowDataPacket[]>(
      'SELECT id, owner_type, suite, label FROM owners WHERE id = ?',
      [ownerId]
    );
    const [profileRows] = await conn.execute<RowDataPacket[]>(
      'SELECT owner_id, rfc, razon_social FROM owner_profiles WHERE owner_id = ?',
      [ownerId]
    );
    const [memRows] = await conn.execute<RowDataPacket[]>(
      'SELECT owner_id FROM user_owner_membership WHERE user_id = ? AND owner_id = ?',
      [userId, ownerId]
    );
    const [roleRows] = await conn.execute<RowDataPacket[]>(
      'SELECT role_id FROM user_roles WHERE user_id = ? AND role_id = ?',
      [userId, PIIC_ROLE_ID]
    );
    const [spRows] = await conn.execute<RowDataPacket[]>(
      'SELECT COUNT(*) AS cnt FROM owner_specialties WHERE owner_id = ?',
      [ownerId]
    );

    const userOk = userRow?.username === PIIC_USERNAME && Number(userRow?.role_id) === PIIC_ROLE_ID;
    const ownerOk =
      ownerRow?.owner_type === 'CENTER' && ownerRow?.suite === 'VIM' && ownerRow?.label === 'PIIC';
    const profileOk =
      (profileRows as RowDataPacket[]).length === 1 &&
      (profileRows as RowDataPacket[])[0].rfc === PIIC_RFC;
    const memOk = (memRows as RowDataPacket[]).length === 1;
    const roleOk = (roleRows as RowDataPacket[]).length === 1;
    const spCount = Number((spRows as RowDataPacket[])[0].cnt);

    console.log(
      `[VERIFY] users.Abacaf       → id=${userRow?.id}, role_id=${userRow?.role_id} → ${
        userOk ? '✅' : '❌'
      }`
    );
    console.log(`[VERIFY] common_catalogs    → id=${ownerId}, FLEET_OWNER/'PIIC' → ✅ (committed)`);
    console.log(
      `[VERIFY] owners.PIIC        → id=${ownerRow?.id}, ${ownerRow?.owner_type}/${
        ownerRow?.suite
      } → ${ownerOk ? '✅' : '❌'}`
    );
    console.log(`[VERIFY] user_owner_memb    → ${userId}→${ownerId} → ${memOk ? '✅' : '❌'}`);
    console.log(
      `[VERIFY] user_roles         → ${userId}→role_id=${PIIC_ROLE_ID} → ${roleOk ? '✅' : '❌'}`
    );
    console.log(
      `[VERIFY] owner_profiles     → rfc=${(profileRows as RowDataPacket[])[0]?.rfc} → ${
        profileOk ? '✅' : '❌'
      }`
    );
    console.log(
      `[VERIFY] owner_specialties  → ${spCount} registros (intentados: ${
        PIIC_SPECIALTIES.length
      }) → ${spCount > 0 ? '✅' : '⚠️ (codes may not exist in catalog)'}`
    );

    if (!userOk || !ownerOk || !profileOk || !memOk || !roleOk) {
      throw new Error('Fase 1C falló verificación — revisar datos.');
    }

    console.log('\n✅ FASE 1C COMPLETADA EXITOSAMENTE.');
    console.log(`   Ana Karen (${PIIC_USERNAME}) → user_id=${userId}`);
    console.log(`   Owner PIIC (CENTER/VIM) → owner_id=${ownerId}`);
    console.log(`   RFC: ${PIIC_RFC} | Especialidades insertadas: ${spCount}`);
    console.log(
      `   ⚠️  Credenciales locales: username=${PIIC_USERNAME} / password=${PIIC_PASSWORD}`
    );
    console.log('═══════════════════════════════════════════════════════\n');

    process.exit(0);
  } catch (err) {
    await conn.rollback();
    console.error('❌ Error en Fase 1C — rollback aplicado:', err);
    process.exit(1);
  } finally {
    conn.release();
  }
}

runFase1C();
