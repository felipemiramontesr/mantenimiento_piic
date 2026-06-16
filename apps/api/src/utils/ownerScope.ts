import { RowDataPacket } from 'mysql2';
import db from '../services/db';

async function getDescendantOwnerIds(centroOwnerId: number): Promise<number[]> {
  const [rows] = await db.execute<RowDataPacket[]>(
    'SELECT id FROM owners WHERE parent_owner_id = ? AND owner_type = ?',
    [centroOwnerId, 'PRIVATE']
  );
  return rows.map((r) => r.id as number);
}

export default getDescendantOwnerIds;
