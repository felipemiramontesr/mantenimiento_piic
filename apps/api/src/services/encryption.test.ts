import { describe, it, expect } from 'vitest';
import EncryptionService from './encryption';

describe('EncryptionService (ARCHON CORE)', () => {
  it('should encrypt and decrypt a string correctly', () => {
    const originalText = 'PIIC_TACTICAL_DATA_2026';
    const encrypted = EncryptionService.encrypt(originalText);

    expect(encrypted).not.to.equal(originalText);
    expect(encrypted).to.contain(':'); // iv:tag:content format

    const decrypted = EncryptionService.decrypt(encrypted);
    expect(decrypted).to.equal(originalText);
  });

  it('should return original text if malformed encrypted string is provided', () => {
    const malformed = 'invalid_format_string';
    const decrypted = EncryptionService.decrypt(malformed);
    expect(decrypted).to.equal(malformed);
  });

  it('should generate unique IVs for same input', () => {
    const text = 'pinnacle_standard';
    const enc1 = EncryptionService.encrypt(text);
    const enc2 = EncryptionService.encrypt(text);

    expect(enc1).not.to.equal(enc2);
  });

  it('should fallback to utf-8 strategy if key is not a 64-char hex', () => {
    const originalKey = process.env.DB_ENCRYPTION_KEY;
    process.env.DB_ENCRYPTION_KEY = 'exact32charspinnaclearchon_12345'; // length=32 utf8

    const text = 'Fallback Strategy Payload';
    const encrypted = EncryptionService.encrypt(text);
    const decrypted = EncryptionService.decrypt(encrypted);

    expect(decrypted).to.equal(text);

    // Restore environment
    process.env.DB_ENCRYPTION_KEY = originalKey;
  });

  it('should use default hardcoded key if env var is missing', () => {
    const originalKey = process.env.DB_ENCRYPTION_KEY;
    delete process.env.DB_ENCRYPTION_KEY; // Force undefined

    const text = 'Fallback Default Key Payload';
    const encrypted = EncryptionService.encrypt(text);
    const decrypted = EncryptionService.decrypt(encrypted);

    expect(decrypted).to.equal(text);

    // Restore environment
    process.env.DB_ENCRYPTION_KEY = originalKey;
  });

  it('should generate deterministic blind index for same input', () => {
    const text = 'Sovereign Identity 2026';
    const index1 = EncryptionService.generateBlindIndex(text);
    const index2 = EncryptionService.generateBlindIndex(text);

    expect(index1).to.equal(index2);
    expect(index1).not.to.equal(text);
    expect(index1).to.have.lengthOf(20); // 'SVR-' + 16 chars hex
    expect(index1).to.match(/^SVR-/);
  });

  it('should return input string if decryption process fails (e.g. key mismatch or corruption)', () => {
    // Total destruction of the encrypted string to ensure decryption failure
    const corrupted = 'iv-bad:tag-bad:payload-bad';

    const result = EncryptionService.decrypt(corrupted);
    expect(result).to.equal(corrupted);
  });
});
