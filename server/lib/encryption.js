const crypto = require('crypto');
const logger = require('./logger');

// Use environment variable for encryption key
// IMPORTANT: Must be set before creating API keys!
const ENCRYPTION_KEY = process.env.API_KEY_ENCRYPTION_KEY;

// Validate encryption key is set
if (!ENCRYPTION_KEY) {
  console.error('FATAL: API_KEY_ENCRYPTION_KEY environment variable is not set!');
  console.error('Generate a secure key with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  process.exit(1);
}

// Validate key format - must be exactly 64 hexadecimal characters (32 bytes)
const HEX_PATTERN = /^[a-fA-F0-9]{64}$/;
if (!HEX_PATTERN.test(ENCRYPTION_KEY)) {
  console.error('FATAL: API_KEY_ENCRYPTION_KEY must be exactly 64 hexadecimal characters');
  console.error('Generate a secure key with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  process.exit(1);
}

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

// Convert hex key to buffer
const getKeyBuffer = (key) => {
  return Buffer.from(key, 'hex');
};

/**
 * Encrypt API key for storage
 */
const encrypt = (text) => {
  try {
    const key = getKeyBuffer(ENCRYPTION_KEY);
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Return IV + encrypted data (IV needed for decryption)
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    logger.error('Encryption error:', error.message);
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

    const key = getKeyBuffer(ENCRYPTION_KEY);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    logger.error('Decryption error:', error.message);
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
