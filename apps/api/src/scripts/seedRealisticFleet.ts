/* eslint-disable no-restricted-syntax, no-await-in-loop */
import dotenv from 'dotenv';
import path from 'path';

import { RowDataPacket, ResultSetHeader } from 'mysql2';

dotenv.config({ path: path.join(__dirname, '../../../../.env') });

// ─── FASE 1 ─── Owner PIIC (CENTER/VIM) + Membresía GrayMan ──────────────────

async function runFase1(): Promise<void> {
  console.log('═══════════════════════════════════════════════════════');
  console.log('VIM_Universe_PIIC_Seed | FASE 1 — Scaffolding VIM');
  console.log('═══════════════════════════════════════════════════════');

  const db = (await import('../services/db')).default;
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    // ── Idempotent cleanup (orden FK: fleet_units → membership → owners) ──
    console.log('[CLEANUP] Eliminando datos previos de PIIC owner...');
    const [fuDel] = await conn.execute<ResultSetHeader>(
      'DELETE FROM fleet_units WHERE ownerId = 100'
    );
    const [memDel] = await conn.execute<ResultSetHeader>(
      'DELETE FROM user_owner_membership WHERE user_id = 4 AND owner_id = 100'
    );
    const [ownerDel] = await conn.execute<ResultSetHeader>('DELETE FROM owners WHERE id = 100');
    console.log(
      `[CLEANUP] fleet_units: ${fuDel.affectedRows} eliminadas | memberships: ${memDel.affectedRows} eliminadas | owners: ${ownerDel.affectedRows} eliminadas`
    );

    // ── INSERT owner PIIC (id=100, CENTER/VIM) ────────────────────────────
    console.log('[FASE 1] Insertando owner PIIC (id=100, CENTER/VIM)...');
    await conn.execute('INSERT INTO owners (id, owner_type, suite, label) VALUES (?, ?, ?, ?)', [
      100,
      'CENTER',
      'VIM',
      'PIIC',
    ]);

    // ── INSERT membership GrayMan (user_id=4) → PIIC (owner_id=100) ──────
    console.log('[FASE 1] Vinculando GrayMan (user_id=4) a owner PIIC (100)...');
    await conn.execute(
      'INSERT INTO user_owner_membership (user_id, owner_id) VALUES (?, ?)',
      [4, 100]
    );

    await conn.commit();
    console.log('[FASE 1] Transacción committed.');

    // ── Verificación post-insert (Acceptance Criteria Fase 1) ────────────
    console.log('\n── Verificación ────────────────────────────────────────');

    const [[ownerRow]] = await conn.execute<RowDataPacket[]>(
      'SELECT id, owner_type, suite, label FROM owners WHERE id = 100'
    );
    const [memRows] = await conn.execute<RowDataPacket[]>(
      'SELECT user_id, owner_id FROM user_owner_membership WHERE user_id = 4 AND owner_id = 100'
    );

    const ownerOk =
      ownerRow &&
      ownerRow.id === 100 &&
      ownerRow.owner_type === 'CENTER' &&
      ownerRow.suite === 'VIM' &&
      ownerRow.label === 'PIIC';
    const memOk = (memRows as RowDataPacket[]).length === 1;

    console.log(
      `[VERIFY] owners WHERE id=100 → id=${ownerRow?.id}, type=${ownerRow?.owner_type}, suite=${
        ownerRow?.suite
      }, label=${ownerRow?.label} → ${ownerOk ? '✅ OK' : '❌ FAIL'}`
    );
    console.log(
      `[VERIFY] membership GrayMan→PIIC → count=${(memRows as RowDataPacket[]).length} → ${
        memOk ? '✅ OK' : '❌ FAIL'
      }`
    );

    if (!ownerOk || !memOk) {
      throw new Error('Fase 1 falló verificación — revisar datos.');
    }

    console.log('\n✅ FASE 1 COMPLETADA EXITOSAMENTE.');
    console.log('   Owner PIIC (CENTER/VIM, id=100) listo.');
    console.log('   GrayMan (user_id=4) vinculado a PIIC.');
    console.log('═══════════════════════════════════════════════════════\n');

    process.exit(0);
  } catch (err) {
    await conn.rollback();
    console.error('❌ Error en Fase 1 — rollback aplicado:', err);
    process.exit(1);
  } finally {
    conn.release();
  }
}

runFase1();
