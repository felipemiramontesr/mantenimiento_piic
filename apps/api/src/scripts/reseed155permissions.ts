/* eslint-disable */
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../../../../.env') });
import db from '../services/db';

async function run() {
  const [result]: any = await db.execute(`
    INSERT IGNORE INTO cosmonaut_role_permissions (role_id, permission_id)
    SELECT cr.id, p.id
    FROM cosmonaut_roles cr
    JOIN permissions p ON (
      (cr.name = 'Mecánico' AND p.slug IN (
        'maint:record:view:any','maint:record:create','maint:record:edit:own',
        'maint:template:view','maint:forecast:view',
        'workorder:view:any','workorder:create','workorder:edit:own',
        'workorder:close','workorder:task:manage',
        'fleet:unit:view:any','fleet:catalog:view',
        'notifications:view:own','document:file:download'
      )) OR
      (cr.name = 'Supervisor' AND p.slug IN (
        'maint:record:view:any','maint:record:create','maint:record:edit:any',
        'maint:record:delete:any','maint:template:view','maint:template:manage',
        'maint:forecast:view','maint:report:export',
        'workorder:view:any','workorder:create','workorder:edit:any',
        'workorder:close','workorder:task:manage','workorder:delete',
        'fleet:unit:view:any','fleet:unit:edit:any','fleet:catalog:view',
        'intelligence:recall:view','intelligence:scorecard:view',
        'alert:view:any','alert:manage:own',
        'users:collaborator:view','servicecenters:view','areas:view',
        'notifications:view:own','document:file:upload','document:file:download'
      )) OR
      (cr.name = 'Operador' AND p.slug IN (
        'fleet:unit:view:any','fleet:unit:node:view','fleet:catalog:view',
        'route:record:view:any','route:record:create',
        'route:checklist:submit','route:checklist:view',
        'alert:view:own','workorder:view:own','workorder:create',
        'geolocation:view:own','notifications:view:own',
        'users:collaborator:edit:own','users:profile-image:manage'
      )) OR
      (cr.name = 'Auditor' AND p.slug IN (
        'fleet:unit:view:any','fleet:unit:export',
        'maint:record:view:any','maint:report:export',
        'finance:dashboard:view:any','finance:transaction:view:any','finance:report:export',
        'intelligence:tco:view','intelligence:tco:export','intelligence:report:export',
        'admin:audit:view','security:audit:view',
        'workorder:view:any','alert:view:any',
        'notifications:view:own','document:file:download'
      ))
    )
    WHERE cr.tenant_id IS NULL
  `);
  console.log('Rows inserted:', (result as any).affectedRows);

  const [roles]: any = await db.execute(
    'SELECT id, name FROM cosmonaut_roles WHERE tenant_id IS NULL ORDER BY id'
  );
  for (const r of roles as any[]) {
    const [perms]: any = await db.execute(
      'SELECT COUNT(*) AS cnt FROM cosmonaut_role_permissions WHERE role_id = ?',
      [r.id]
    );
    console.log(`  ${r.name}: ${(perms as any[])[0].cnt} permisos`);
  }
  console.log('\n✅ Reseed completado.');
  process.exit(0);
}

run().catch((e) => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
