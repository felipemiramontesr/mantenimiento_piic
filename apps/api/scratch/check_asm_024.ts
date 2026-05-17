import { FastifyBaseLogger } from 'fastify';
import FleetService from '../src/services/fleetService';

const mockLogger = {
  info: console.log,
  error: console.error,
} as unknown as FastifyBaseLogger;

async function run() {
  const units = await FleetService.getAllUnits(mockLogger);
  const asm = units.find(u => u.id === 'ASM-024');
  console.log('ASM-024 details:');
  console.log(JSON.stringify(asm, null, 2));
  process.exit(0);
}

run();
