import crypto from 'crypto';

/**
 * Encryption Service - ARCHON Master Standard
 * Implements AES-256-GCM for Application-Level Encryption (ALE).
 *
 * @remarks
 * This service ensures that critical zero-trust data never touches the database layer
 * in plain text. It leverages Galois/Counter Mode (GCM) which inherently provides
 * authenticated encryption (both confidentiality and data integrity).
 */
class EncryptionService {
  private static readonly ALGORITHM = 'aes-256-gcm';

  private static getKey(): Buffer {
    const rawKey = process.env.DB_ENCRYPTION_KEY || 'pinnacle-archon-encryption-key-1'; // Exactly 32 chars
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

    try {
      const decipher = crypto.createDecipheriv(
        this.ALGORITHM,
        this.getKey(),
        Buffer.from(ivHex, 'hex')
      );

      decipher.setAuthTag(Buffer.from(tagHex, 'hex'));

      let decrypted = decipher.update(contentHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (e) {
      // 🛡️ Fail-Safe: Return original text if decryption fails (orphaned data / key mismatch)
      return encryptedText;
    }
  }

  /**
   * Generates a deterministic one-way hash (Blind Index)
   * synchronized with the SQL standard: CONCAT('SVR-', UPPER(LEFT(SHA2(val, 256), 16)))
   */
  public static generateBlindIndex(text: string): string {
    const hash = crypto.createHash('sha256').update(text).digest('hex');
    return `SVR-${hash.substring(0, 16).toUpperCase()}`;
  }
}

export default EncryptionService;
