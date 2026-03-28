const crypto = require('crypto');

/**
 * Generate secure API key
 * Format: cs_{env}_{random_string}
 * env: live | test
 */
const generateApiKey = (environment = 'live') => {
  const prefix = `cs_${environment}`;
  const randomBytes = crypto.randomBytes(24).toString('hex');
  return `${prefix}_${randomBytes}`;
};

/**
 * Hash API key for storage (one-way)
 */
const hashApiKey = (apiKey) => {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
};

/**
 * Generate key ID for reference
 */
const generateKeyId = () => {
  return 'key_' + crypto.randomBytes(8).toString('hex');
};

/**
 * Get the last 4 characters of API key for display
 */
const maskApiKey = (apiKey) => {
  if (!apiKey || apiKey.length < 8) return '****';
  return `cs_***...${apiKey.slice(-4)}`;
};

/**
 * Validate API key format
 */
const isValidApiKeyFormat = (apiKey) => {
  const pattern = /^cs_(live|test)_[a-f0-9]{48}$/;
  return pattern.test(apiKey);
};

module.exports = {
  generateApiKey,
  hashApiKey,
  generateKeyId,
  maskApiKey,
  isValidApiKeyFormat
};
