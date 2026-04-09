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
});
