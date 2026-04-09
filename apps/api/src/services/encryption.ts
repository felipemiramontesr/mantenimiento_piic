import crypto from 'crypto';

/**
 * Encryption Service - ARCHON Master Standard
 * Implements AES-256-GCM for Application-Level Encryption (ALE).
 */
export class EncryptionService {
  private static readonly ALGORITHM = 'aes-256-gcm';

  private static getKey(): Buffer {
    const rawKey = process.env.DB_ENCRYPTION_KEY || 'default-secret-archon-key-32-chars-!';
    const key = rawKey.trim();
    
    // If the key is a 64-char hex string, it represents 32 bytes
    if (/^[0-9a-fA-F]{64}$/.test(key)) {
      return Buffer.from(key, 'hex');
    }
    // Otherwise assume it's a 32-char string
    return Buffer.from(key, 'utf-8');
  }

  /**
   * Encrypts a string into iv:tag:ciphertext
   */
  public static encrypt(text: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(this.ALGORITHM, this.getKey(), iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag().toString('hex');
    
    // Format: iv:tag:ciphertext
    return `${iv.toString('hex')}:${tag}:${encrypted}`;
  }

  /**
   * Decrypts a base64 string (iv:tag:ciphertext)
   */
  public static decrypt(encryptedText: string): string {
    const [ivHex, tagHex, contentHex] = encryptedText.split(':');
    
    if (!ivHex || !tagHex || !contentHex) {
      return encryptedText; // Not encrypted or malformed
    }

    const decipher = crypto.createDecipheriv(
      this.ALGORITHM, 
      this.getKey(), 
      Buffer.from(ivHex, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    
    let decrypted = decipher.update(contentHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}
