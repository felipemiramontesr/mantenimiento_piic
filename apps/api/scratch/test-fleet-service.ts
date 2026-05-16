import FleetService from '../src/services/fleetService';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../../.env') });

const mockLogger: any = {
  info: (m: string) => console.log('INFO:', m),
  error: (m: string) => console.error('ERROR:', m),
};

async function test() {
  console.log('--- BACKEND AUDIT: FleetService.getAllUnits ---');
  try {
    const units = await FleetService.getAllUnits(mockLogger);
    console.log('Units fetched:', units.length);
    if (units.length > 0) {
      console.log('First Unit ID:', units[0].id);
      console.log('First Unit Health Status:', units[0].healthStatus);
    } else {
      console.warn('WARNING: No units returned from service!');
    }
  } catch (err: any) {
    console.error('Service Call Failed:', err.message);
  }
}

test();
