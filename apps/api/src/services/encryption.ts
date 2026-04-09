import crypto from 'crypto';

/**
 * Encryption Service - ARCHON Master Standard
 * Implements AES-256-GCM for Application-Level Encryption (ALE).
 */
export class EncryptionService {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly KEY = process.env.DB_ENCRYPTION_KEY || 'default-secret-archon-key-32-chars-!';

  /**
   * Encrypts a string into base64(iv:tag:ciphertext)
   */
  public static encrypt(text: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(this.ALGORITHM, Buffer.from(this.KEY, 'utf-8'), iv);
    
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
      Buffer.from(this.KEY, 'utf-8'), 
      Buffer.from(ivHex, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    
    let decrypted = decipher.update(contentHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}
