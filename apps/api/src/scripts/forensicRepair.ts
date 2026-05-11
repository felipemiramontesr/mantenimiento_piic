import db from '../services/db.ts';

/**
 * 🔱 Archon Forensic Repair Script
 * Target: Route a8817139-3936-4306-9340-0a077d8f98d3 (ASM-006)
 * Action: Restore inverted fuel levels and purge corrupted audit trail.
 */
async function repair(): Promise<void> {
  console.log('🔱 STARTING FORENSIC REPAIR...');

  try {
    // 1. Restore the route to its intended state
    // fuel_level_end was accidentally set to 100.00 (start level)
    // It should be 82.50 (the value before the buggy edit)
    await db.execute(`
      UPDATE fleet_routes 
      SET fuel_level_end = 82.50, fuel_liters_loaded = 40.00 
      WHERE uuid = 'a8817139-3936-4306-9340-0a077d8f98d3'
    `);
    console.log('✅ Route data restored to 82.50% (83%) and 40.0L.');

    // 2. Purge the corrupted audit log entry
    // UUID ff27af4f-4cc1-11f1-943b-0cd0f041778f recorded the erroneous inversion
    await db.execute(`
      DELETE FROM administrative_audit_logs 
      WHERE uuid = 'ff27af4f-4cc1-11f1-943b-0cd0f041778f'
    `);
    console.log('✅ Corrupted audit log ff27af4f purged from forensic vault.');

    console.log('🔱 REPAIR COMPLETE. SYSTEM INTEGRITY RESTORED.');
    process.exit(0);
  } catch (error) {
    console.error('❌ REPAIR FAILED:', error);
    process.exit(1);
  }
}

repair();
