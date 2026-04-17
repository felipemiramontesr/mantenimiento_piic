import { describe, it, expect } from 'vitest';
import { toSnakeCase } from '../utils/mappers';
import EncryptionService from '../services/encryption';

// 🔱 ARCHON LOGIC CERTIFICATION (v.16.5.12)
// Automated verification of mapping and data boundaries for the expanded Fleet Identity.

describe('Fleet Incorporation Certification', () => {
  it('should verify parity between Frontend Payload and Database Schema (Snake Case)', () => {
    const industrialPayload = {
      assetType: 'Vehiculo',
      tag: 'FL001',
      marca: 'Toyota',
      modelo: 'Hilux',
      year: 2024,
      color: 'Blanco Glaciar',
      description: 'Unidad de supervisión de obra con equipo de radiocomunicación.',
      odometer: 0,
      maintenanceFrequency: 'Mensual',
      centroMantenimiento: 'PIIC',
      status: 'Disponible',
    };

    const snakeData = toSnakeCase(industrialPayload as Record<string, unknown>);

    expect(snakeData).toHaveProperty('asset_type', 'Vehiculo');
    expect(snakeData).toHaveProperty('color', 'Blanco Glaciar');
    expect(snakeData).toHaveProperty(
      'description',
      'Unidad de supervisión de obra con equipo de radiocomunicación.'
    );
    expect(snakeData).toHaveProperty('maintenance_frequency', 'Mensual');
    expect(snakeData).toHaveProperty('centro_mantenimiento', 'PIIC');
  });

  it('should certify that Encryption handles the expanded metadata without corruption', () => {
    const rawNote = 'Nota técnica sensible: Motor con ajuste pendiente.';
    const encrypted = EncryptionService.encrypt(rawNote);
    const decrypted = EncryptionService.decrypt(encrypted);

    expect(decrypted).toBe(rawNote);
    expect(encrypted).not.toBe(rawNote);
  });
});
