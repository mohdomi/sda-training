// config/secrets.js
const crypto = require('crypto');

class SecretsManager {
  constructor() {
    this.encryptionKey = process.env.ENCRYPTION_KEY || this.generateKey();
    this.algorithm = 'aes-256-gcm';
  }

  generateKey() {
    return crypto.randomBytes(32).toString('hex');
  }

  encrypt(text) {
    // NOTE: spec used crypto.createCipher(), which was removed in Node 22.
    // Same aes-256-gcm + AAD contract, implemented with createCipheriv.
    const key = Buffer.from(this.encryptionKey, 'hex').length === 32
      ? Buffer.from(this.encryptionKey, 'hex')
      : crypto.createHash('sha256').update(this.encryptionKey).digest();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);
    cipher.setAAD(Buffer.from('sda-training', 'utf8'));

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  decrypt(encryptedData) {
    const key = Buffer.from(this.encryptionKey, 'hex').length === 32
      ? Buffer.from(this.encryptionKey, 'hex')
      : crypto.createHash('sha256').update(this.encryptionKey).digest();
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      key,
      Buffer.from(encryptedData.iv, 'hex')
    );
    decipher.setAAD(Buffer.from('sda-training', 'utf8'));
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));

    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  validateSecrets() {
    const requiredSecrets = [
      'JWT_SECRET',
      'MONGODB_URI',
      'POSTGRES_PASSWORD',
      'REDIS_URL'
    ];

    const missingSecrets = requiredSecrets.filter(secret => !process.env[secret]);

    if (missingSecrets.length > 0) {
      throw new Error(`Missing required secrets: ${missingSecrets.join(', ')}`);
    }

    return true;
  }

  getSecret(name, defaultValue = null) {
    const value = process.env[name];
    if (!value && !defaultValue) {
      throw new Error(`Secret ${name} is required but not found`);
    }
    return value || defaultValue;
  }
}

module.exports = new SecretsManager();
