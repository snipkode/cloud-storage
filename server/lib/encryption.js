const crypto = require('crypto');

// Use environment variable for encryption key, or generate a secure random one
const ENCRYPTION_KEY = process.env.API_KEY_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

/**
 * Encrypt API key for storage
 */
const encrypt = (text) => {
  try {
    const key = Buffer.from(ENCRYPTION_KEY.slice(0, 32).padEnd(32, '0'));
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Return IV + encrypted data (IV needed for decryption)
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    return null;
  }
};

/**
 * Decrypt API key for display
 */
const decrypt = (encryptedText) => {
  try {
    if (!encryptedText || !encryptedText.includes(':')) {
      return null;
    }
    
    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    const key = Buffer.from(ENCRYPTION_KEY.slice(0, 32).padEnd(32, '0'));
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    return null;
  }
};

/**
 * Generate secure random encryption key (run once to set env var)
 */
const generateEncryptionKey = () => {
  return crypto.randomBytes(32).toString('hex');
};

module.exports = {
  encrypt,
  decrypt,
  generateEncryptionKey
};
