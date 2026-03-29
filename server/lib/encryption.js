const crypto = require('crypto');

// Use environment variable for encryption key
// IMPORTANT: Must be set before creating API keys!
const ENCRYPTION_KEY = process.env.API_KEY_ENCRYPTION_KEY;

// Validate encryption key is set
if (!ENCRYPTION_KEY) {
  console.error('FATAL: API_KEY_ENCRYPTION_KEY environment variable is not set!');
  console.error('Generate a secure key with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  process.exit(1);
}

// Validate key length (should be at least 32 characters for AES-256)
if (ENCRYPTION_KEY.length < 32) {
  console.error('FATAL: API_KEY_ENCRYPTION_KEY must be at least 32 characters long');
  process.exit(1);
}

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

// Ensure key is exactly 32 bytes for AES-256
const getKeyBuffer = (key) => {
  const keyStr = key.slice(0, 32).padEnd(32, '0');
  return Buffer.from(keyStr);
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

    const key = getKeyBuffer(ENCRYPTION_KEY);
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
