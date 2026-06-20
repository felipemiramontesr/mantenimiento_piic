import dotenv from 'dotenv';
import path from 'path';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

dotenv.config({ path: path.join(__dirname, '../../../../.env') });

// ─── VIM_PIIC_Supercumulos_Seed ──────────────────────────────────────────────
// FC: VIM_PIIC_Supercumulos_Seed · V.78.101.306
// 3 Supercúmulos PRIVATE en Universo PIIC (VIM) — datos 100% realistas
// §2.2: AES en placas · numeroSerie · circulationCardNumber + blind index

const PIIC_CENTER_OWNER_ID = 9042;

export const UNIT_IDS = [
  'PIIC-101',
  'PIIC-201',
  'PIIC-202',
  'PIIC-301',
  'PIIC-302',
  'PIIC-303',
] as const;

export interface UnitDef {
  id: string;
  brandId: number;
  modelId: number;
  year: number;
  fuelTypeId: number;
  transmisionId: number;
  engineTypeId: number;
  tireBrandId: number;
  terrainTypeId: number;
  operationalUseId: number;
  odometer: number;
  tireSpec: string;
  placasRaw: string;
  numeroSerieRaw: string;
  circulationRaw: string;
}

export interface SupCumDef {
  label: string;
  rfc: string;
  razonSocial: string;
  telefono: string;
  calle: string;
  numExt: string;
  neighborhoodId: number;
  units: UnitDef[];
}

export const SUPERCUMULOS: SupCumDef[] = [
  {
    // ── Supercúmulo A — 1 unidad ──────────────────────────────────────────────
    label: 'Carlos Valenzuela',
    rfc: 'VAGC780315MHS',
    razonSocial: 'Carlos Armando Valenzuela Grijalva',
    telefono: '6621840293',
    calle: 'Blvd. Luis Encinas Johnson',
    numExt: '246',
    neighborhoodId: 260301, // Hermosillo Centro
    units: [
      {
        id: 'PIIC-101',
        brandId: 23, // Nissan
        modelId: 525, // NP300/Frontier
        year: 2021,
        fuelTypeId: 11, // Gasolina
        transmisionId: 31, // Manual
        engineTypeId: 1026, // L4 2.5L DOHC Multipunto
        tireBrandId: 243, // MICHELIN
        terrainTypeId: 271, // High Terrain (H/T)
        operationalUseId: 236, // Ciudad/Carretera
        odometer: 45320,
        tireSpec: 'LT265/70R17',
        placasRaw: 'SNA-123-X',
        numeroSerieRaw: '3N6CD13S0MK801234',
        circulationRaw: 'TC-2021-A-456789',
      },
    ],
  },
  {
    // ── Supercúmulo B — 2 unidades ────────────────────────────────────────────
    label: 'Roberto Zazueta',
    rfc: 'ZAMR820907H56',
    razonSocial: 'Roberto Elías Zazueta Manríquez',
    telefono: '6621953847',
    calle: 'Calle Rosales',
    numExt: '105',
    neighborhoodId: 260302, // 5 de Mayo
    units: [
      {
        id: 'PIIC-201',
        brandId: 24, // Ford
        modelId: 538, // Ranger
        year: 2020,
        fuelTypeId: 10, // Diésel
        transmisionId: 30, // Automática
        engineTypeId: 1024, // L4 2.8L Turbo Intercooled
        tireBrandId: 266, // BRIDGESTONE
        terrainTypeId: 269, // All-Terrain (A/T)
        operationalUseId: 236, // Ciudad/Carretera
        odometer: 67890,
        tireSpec: 'LT255/70R18',
        placasRaw: 'SOA-456-Y',
        numeroSerieRaw: '8AFCR3JM0L7234567',
        circulationRaw: 'TC-2020-B-789012',
      },
      {
        id: 'PIIC-202',
        brandId: 32, // Chevrolet
        modelId: 543, // Silverado 1500
        year: 2019,
        fuelTypeId: 11, // Gasolina
        transmisionId: 30, // Automática
        engineTypeId: 1026, // L4 2.5L DOHC Multipunto
        tireBrandId: 268, // Goodyear
        terrainTypeId: 271, // High Terrain (H/T)
        operationalUseId: 237, // Transporte de Personal
        odometer: 89150,
        tireSpec: 'P275/55R20',
        placasRaw: 'SNA-789-Z',
        numeroSerieRaw: '3GCPCREH9KG156781',
        circulationRaw: 'TC-2019-B-345678',
      },
    ],
  },
  {
    // ── Supercúmulo C — 3 unidades ────────────────────────────────────────────
    label: 'Transportes Noroeste',
    rfc: 'TSN060814MH8',
    razonSocial: 'Transportes y Servicios del Noroeste S.A. de C.V.',
    telefono: '6623012748',
    calle: 'Blvd. García Morales',
    numExt: '1200',
    neighborhoodId: 260303, // Country Club
    units: [
      {
        id: 'PIIC-301',
        brandId: 33, // RAM
        modelId: 556, // Ram 1500
        year: 2022,
        fuelTypeId: 11, // Gasolina
        transmisionId: 30, // Automática
        engineTypeId: 1027, // V8 6.4L HEMI MDS
        tireBrandId: 265, // PIRELLI
        terrainTypeId: 271, // High Terrain (H/T)
        operationalUseId: 236, // Ciudad/Carretera
        odometer: 28400,
        tireSpec: 'P285/55R20',
        placasRaw: 'SNB-111-A',
        numeroSerieRaw: '1C6RR7LT2NS234561',
        circulationRaw: 'TC-2022-C-112233',
      },
      {
        id: 'PIIC-302',
        brandId: 24, // Ford
        modelId: 533, // F-150/Lobo
        year: 2018,
        fuelTypeId: 11, // Gasolina
        transmisionId: 30, // Automática
        engineTypeId: 1026, // L4 2.5L DOHC Multipunto
        tireBrandId: 243, // MICHELIN
        terrainTypeId: 269, // All-Terrain (A/T)
        operationalUseId: 238, // Carga Ligera (Utilitario)
        odometer: 112650,
        tireSpec: 'P265/60R20',
        placasRaw: 'SOB-222-B',
        numeroSerieRaw: '1FTEW1CP2JFB34567',
        circulationRaw: 'TC-2018-C-445566',
      },
      {
        id: 'PIIC-303',
        brandId: 23, // Nissan
        modelId: 525, // NP300/Frontier
        year: 2020,
        fuelTypeId: 10, // Diésel
        transmisionId: 31, // Manual
        engineTypeId: 1024, // L4 2.8L Turbo Intercooled
        tireBrandId: 266, // BRIDGESTONE
        terrainTypeId: 269, // All-Terrain (A/T)
        operationalUseId: 236, // Ciudad/Carretera
        odometer: 54780,
        tireSpec: 'LT265/70R17',
        placasRaw: 'SNB-333-C',
        numeroSerieRaw: '3N6CD13S5LK901234',
        circulationRaw: 'TC-2020-C-778899',
      },
    ],
  },
];

async function runSeed(): Promise<void> {
  console.log('══════════════════════════════════════════════════════════');
  console.log('VIM_PIIC_Supercumulos_Seed | 3 Supercúmulos PRIVATE · 6 Fleet Units');
  console.log('══════════════════════════════════════════════════════════');

  const db = (await import('../services/db')).default;
  const EncryptionService = (await import('../services/encryption')).default;
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    // ── Cleanup idempotente ───────────────────────────────────────────────────
    console.log('[CLEANUP] Limpiando registros previos del seed...');
    const idPH = UNIT_IDS.map(() => '?').join(',');

    const [existingUnits] = await conn.execute<RowDataPacket[]>(
      `SELECT DISTINCT ownerId FROM fleet_units WHERE id IN (${idPH})`,
      [...UNIT_IDS]
    );
    await conn.execute(`DELETE FROM fleet_units WHERE id IN (${idPH})`, [...UNIT_IDS]);

    const prevOwnerIds = (existingUnits as RowDataPacket[]).map((r) => r.ownerId as number);
    await Promise.all(
      prevOwnerIds.map(async (oid) => {
        await conn.execute('DELETE FROM owner_service_links WHERE privado_owner_id = ?', [oid]);
        await conn.execute('DELETE FROM owner_profiles WHERE owner_id = ?', [oid]);
        await conn.execute('DELETE FROM owners WHERE id = ?', [oid]);
      })
    );

    // Cleanup adicional por RFC para registros huérfanos
    const rfcs = SUPERCUMULOS.map((s) => s.rfc);
    const rfcPH = rfcs.map(() => '?').join(',');
    const [byRfc] = await conn.execute<RowDataPacket[]>(
      `SELECT owner_id FROM owner_profiles WHERE rfc IN (${rfcPH})`,
      rfcs
    );
    await Promise.all(
      (byRfc as RowDataPacket[]).map(async (row) => {
        const oid = row.owner_id as number;
        await conn.execute('DELETE FROM fleet_units WHERE ownerId = ?', [oid]);
        await conn.execute('DELETE FROM owner_service_links WHERE privado_owner_id = ?', [oid]);
        await conn.execute('DELETE FROM owner_profiles WHERE owner_id = ?', [oid]);
        await conn.execute('DELETE FROM owners WHERE id = ?', [oid]);
      })
    );
    console.log('[CLEANUP] Completado ✅');

    // owners.id sin AUTO_INCREMENT — asignación explícita MAX(id)+N
    const [maxRow] = await conn.execute<RowDataPacket[]>(
      'SELECT COALESCE(MAX(id), 0) + 1 AS nextId FROM owners FOR UPDATE'
    );
    const firstOwnerId = Number((maxRow as RowDataPacket[])[0].nextId);
    const ownerIds = SUPERCUMULOS.map((_, idx) => firstOwnerId + idx);

    // ── Paso 1: owners (paralelo) ─────────────────────────────────────────────
    await Promise.all(
      SUPERCUMULOS.map((sc, idx) =>
        conn.execute<ResultSetHeader>(
          'INSERT INTO owners (id, owner_type, suite, label, parent_owner_id) VALUES (?, ?, ?, ?, NULL)',
          [ownerIds[idx], 'PRIVATE', 'VIM', sc.label]
        )
      )
    );
    console.log(`[SEED] owners creados → ids=${ownerIds.join(',')}`);

    // ── Paso 2: owner_profiles (paralelo) ────────────────────────────────────
    await Promise.all(
      SUPERCUMULOS.map((sc, idx) =>
        conn.execute<ResultSetHeader>(
          `INSERT INTO owner_profiles
             (owner_id, rfc, razon_social, telefono, calle, numero_exterior, neighborhood_id)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            ownerIds[idx],
            sc.rfc,
            sc.razonSocial,
            sc.telefono,
            sc.calle,
            sc.numExt,
            sc.neighborhoodId,
          ]
        )
      )
    );
    console.log(`[SEED] owner_profiles → rfcs=${SUPERCUMULOS.map((s) => s.rfc).join(' · ')}`);

    // ── Paso 3: owner_service_links → PIIC CENTER (paralelo) ─────────────────
    await Promise.all(
      ownerIds.map((oid) =>
        conn.execute<ResultSetHeader>(
          'INSERT INTO owner_service_links (privado_owner_id, centro_owner_id) VALUES (?, ?)',
          [oid, PIIC_CENTER_OWNER_ID]
        )
      )
    );
    console.log(
      `[SEED] owner_service_links → ${ownerIds.join(',')} → PIIC(${PIIC_CENTER_OWNER_ID})`
    );

    // ── Paso 4: fleet_units con AES §2.2 (paralelo) ──────────────────────────
    const unitInserts = SUPERCUMULOS.flatMap((sc, idx) =>
      sc.units.map((unit) => {
        const encPlacas = EncryptionService.encrypt(unit.placasRaw);
        const encSerie = EncryptionService.encrypt(unit.numeroSerieRaw);
        const encCirc = EncryptionService.encrypt(unit.circulationRaw);
        const hashPlacas = EncryptionService.generateBlindIndex(unit.placasRaw);
        const hashSerie = EncryptionService.generateBlindIndex(unit.numeroSerieRaw);

        return conn.execute<ResultSetHeader>(
          `INSERT INTO fleet_units
             (id, ownerId, assetTypeId, brandId, modelId, year,
              fuelTypeId, transmisionId, engineTypeId,
              tireBrandId, terrainTypeId, tireSpec, operationalUseId,
              placas, numeroSerie, circulationCardNumber,
              placasHash, numeroSerieHash,
              odometer, currentReading, status, is_active)
           VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Disponible', 1)`,
          [
            unit.id,
            ownerIds[idx],
            unit.brandId,
            unit.modelId,
            unit.year,
            unit.fuelTypeId,
            unit.transmisionId,
            unit.engineTypeId,
            unit.tireBrandId,
            unit.terrainTypeId,
            unit.tireSpec,
            unit.operationalUseId,
            encPlacas,
            encSerie,
            encCirc,
            hashPlacas,
            hashSerie,
            unit.odometer,
            unit.odometer,
          ]
        );
      })
    );
    await Promise.all(unitInserts);
    console.log(`[SEED] fleet_units → ${UNIT_IDS.join(' · ')}`);

    await conn.commit();
    console.log('\n[SEED] Transacción committed ✅');

    // ── Verificación post-seed (Acceptance Criteria) ──────────────────────────
    console.log('\n── Verificación ─────────────────────────────────────────');

    const [ownerRows] = await conn.execute<RowDataPacket[]>(
      "SELECT COUNT(*) AS cnt FROM owners WHERE owner_type='PRIVATE' AND suite='VIM'"
    );
    const ownerCnt = Number((ownerRows as RowDataPacket[])[0].cnt);

    const [profileRows] = await conn.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS cnt FROM owner_profiles op
       JOIN owners o ON o.id = op.owner_id WHERE o.owner_type='PRIVATE'`
    );
    const profileCnt = Number((profileRows as RowDataPacket[])[0].cnt);

    const [linkRows] = await conn.execute<RowDataPacket[]>(
      'SELECT COUNT(*) AS cnt FROM owner_service_links WHERE centro_owner_id = ?',
      [PIIC_CENTER_OWNER_ID]
    );
    const linkCnt = Number((linkRows as RowDataPacket[])[0].cnt);

    const [unitRows] = await conn.execute<RowDataPacket[]>(
      `SELECT id, ownerId, placas, placasHash, numeroSerieHash
       FROM fleet_units WHERE id IN (${idPH})`,
      [...UNIT_IDS]
    );
    const unitCnt = (unitRows as RowDataPacket[]).length;

    const allAES = (unitRows as RowDataPacket[]).every(
      (u) =>
        typeof u.placas === 'string' &&
        u.placas.includes(':') &&
        typeof u.placasHash === 'string' &&
        (u.placasHash as string).startsWith('SVR-') &&
        typeof u.numeroSerieHash === 'string' &&
        (u.numeroSerieHash as string).startsWith('SVR-')
    );

    const [distRows] = await conn.execute<RowDataPacket[]>(
      `SELECT COUNT(fu.id) AS uc FROM owners o
       LEFT JOIN fleet_units fu ON fu.ownerId = o.id
       WHERE o.owner_type='PRIVATE' AND o.suite='VIM'
       GROUP BY o.id ORDER BY uc`
    );
    const dist = (distRows as RowDataPacket[]).map((r) => Number(r.uc)).sort((a, b) => a - b);
    const distOk = JSON.stringify(dist) === JSON.stringify([1, 2, 3]);

    console.log(`[SC1] PRIVATE owners → ${ownerCnt} → ${ownerCnt >= 3 ? '✅' : '❌'}`);
    console.log(
      `[SC2] Profiles=${profileCnt} · Links=${linkCnt} → ${
        profileCnt >= 3 && linkCnt >= 3 ? '✅' : '❌'
      }`
    );
    console.log(`[SC3] Distribución [${dist.join(',')}] → ${distOk ? '✅' : '❌'}`);
    console.log(`[SC4] AES+BlindIndex → ${allAES ? '✅' : '❌'}`);
    console.log(`[TOTAL] 6 fleet_units → ${unitCnt} → ${unitCnt === 6 ? '✅' : '❌'}`);

    if (ownerCnt < 3 || profileCnt < 3 || linkCnt < 3 || !distOk || !allAES || unitCnt !== 6) {
      throw new Error('Verificación post-seed fallida — revisar consola.');
    }

    console.log('\n✅ VIM_PIIC_Supercumulos_Seed COMPLETADO');
    console.log('   SC-A: Carlos Valenzuela       → PIIC-101');
    console.log('   SC-B: Roberto Zazueta         → PIIC-201, PIIC-202');
    console.log('   SC-C: Transportes Noroeste    → PIIC-301, PIIC-302, PIIC-303');
    console.log('   ⚠️  PROD: ejecutar en u701509674_Mant_piic vía CI/CD o phpMyAdmin');
    console.log('══════════════════════════════════════════════════════════\n');

    process.exit(0);
  } catch (err) {
    await conn.rollback();
    console.error('❌ Error en VIM_PIIC_Supercumulos_Seed — rollback:', err);
    process.exit(1);
  } finally {
    conn.release();
  }
}

runSeed();
