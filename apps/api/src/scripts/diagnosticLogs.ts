import db from '../services/db';

async function diagnose(): Promise<void> {
  const [rows] = await db.query(`
    SELECT 
      uuid, 
      snapshot_before, 
      snapshot_after, 
      reason, 
      created_at 
    FROM administrative_audit_logs 
    WHERE entity_type = 'route_log' 
    ORDER BY created_at DESC 
    LIMIT 5
  `);

  console.log('🔱 ARCHON LOG DIAGNOSTIC');
  console.log('=========================');

  (rows as Record<string, unknown>[]).forEach((row) => {
    const before = JSON.parse(row.snapshot_before as string);
    const after = JSON.parse(row.snapshot_after as string);

    console.log(`Log UUID: ${row.uuid}`);
    console.log(`Created: ${row.created_at}`);
    console.log(`Reason: ${row.reason}`);
    console.log(`Liters: ${before?.fuel_liters_loaded} -> ${after?.fuel_liters_loaded}`);
    console.log(`Level Start: ${before?.fuel_level_start} -> ${after?.fuel_level_start}`);
    console.log(`Level End: ${before?.fuel_level_end} -> ${after?.fuel_level_end}`);
    console.log('-------------------------');
  });

  process.exit(0);
}

diagnose();
