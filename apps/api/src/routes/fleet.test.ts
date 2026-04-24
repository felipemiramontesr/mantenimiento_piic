import { describe, it, expect } from 'vitest';
import { toSnakeCase, toCamelCase } from '../utils/mappers';
import EncryptionService from '../services/encryption';

// ⚡ ARCHON LOGIC CERTIFICATION
// Automated verification of mapping and data boundaries

describe('Fleet Logic Ecosystem', () => {
  describe('Data Mappers (DRY Compliance)', () => {
    it('should correctly convert camelCase to snake_case', () => {
      const input = {
        assetType: 'Vehiculo',
        numeroSerie: 'SN123',
        protocolStartDate: '2026-04-16',
      };

      const expected = {
        asset_type: 'Vehiculo',
        numero_serie: 'SN123',
        protocol_start_date: '2026-04-16',
      };

      expect(toSnakeCase(input)).toEqual(expected);
    });

    it('should correctly convert snake_case to camelCase', () => {
      const input = {
        asset_type: 'Vehiculo',
        numero_serie: 'SN123',
      };

      const expected = {
        assetType: 'Vehiculo',
        numeroSerie: 'SN123',
      };

      expect(toCamelCase(input)).toEqual(expected);
    });
  });

  describe('Protocolo Sentinel (Security v.11.0.0)', () => {
    it('should encrypt and decrypt sensitive fields correctly', () => {
      const secret = 'MOTOR-SECRET-123';
      const encrypted = EncryptionService.encrypt(secret);

      expect(encrypted).toContain(':'); // Should have iv:tag:cipher format
      expect(EncryptionService.decrypt(encrypted)).toBe(secret);
    });

    it('should handle plain text gracefully (Legacy Support)', () => {
      const plainText = 'LEGACY-MOTOR-123';
      // If it doesn't match iv:tag:cipher, it should return original text
      expect(EncryptionService.decrypt(plainText)).toBe(plainText);
    });

    it('should maintain data integrity through the encryption cycle', () => {
      const rawMotor = 'V8-HEMI-6.4';
      const encrypted = EncryptionService.encrypt(rawMotor);
      const decrypted = EncryptionService.decrypt(encrypted);

      expect(decrypted).toBe(rawMotor);
      expect(encrypted).not.toBe(rawMotor);
    });
  });
});
