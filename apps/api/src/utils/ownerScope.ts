import { RowDataPacket } from 'mysql2';
import db from '../services/db';

async function getDescendantOwnerIds(centroOwnerId: number): Promise<number[]> {
  const [rows] = await db.execute<RowDataPacket[]>(
    'SELECT o.id FROM owners o JOIN owner_types_catalog otc ON otc.id = o.owner_type_id WHERE o.parent_owner_id = ? AND otc.code = ?',
    [centroOwnerId, 'PRIVATE']
  );
  return rows.map((r) => r.id as number);
}

export default getDescendantOwnerIds;
