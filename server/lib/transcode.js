/**
 * Video transcoding library using ffmpeg
 * Handles on-demand and background transcoding for streaming
 */

const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const { logger } = require('./logger');

// Transcoding configuration
const TRANSCODE_CONFIG = {
  enabled: process.env.TRANSCODE_ENABLED === 'true',
  keepOriginal: process.env.TRANSCODE_KEEP_ORIGINAL !== 'false',
  onlyNonMp4: process.env.TRANSCODE_ONLY_NON_MP4 === 'true',
  quality: process.env.TRANSCODE_QUALITY || '720p',
  cacheDir: process.env.TRANSCODE_CACHE_DIR || path.join(__dirname, '..', 'transcode-cache')
};

// Quality presets for ffmpeg
const QUALITY_PRESETS = {
  '480p': { 
    videoBitrate: '800k', 
    audioBitrate: '128k', 
    resolution: '854x480',
    profile: 'main'
  },
  '720p': { 
    videoBitrate: '2500k', 
    audioBitrate: '192k', 
    resolution: '1280x720',
    profile: 'main'
  },
  '1080p': { 
    videoBitrate: '5000k', 
    audioBitrate: '256k', 
    resolution: '1920x1080',
    profile: 'high'
  }
};

// Ensure cache directory exists
if (TRANSCODE_CONFIG.enabled) {
  try {
    if (!fs.existsSync(TRANSCODE_CONFIG.cacheDir)) {
      fs.mkdirSync(TRANSCODE_CONFIG.cacheDir, { recursive: true });
    }
  } catch (error) {
    logger.error('[Transcode] Failed to create cache directory:', error.message);
  }
}

/**
 * Check if file is a video format that needs transcoding
 */
function needsTranscoding(filename) {
  const ext = path.extname(filename).toLowerCase();
  const mp4Extensions = ['.mp4', '.m4v'];
  
  // Skip if only transcoding non-MP4 and file is already MP4
  if (TRANSCODE_CONFIG.onlyNonMp4 && mp4Extensions.includes(ext)) {
    return false;
  }
  
  // List of video extensions to transcode
  const videoExtensions = [
    '.mp4', '.m4v', '.mkv', '.avi', '.mov', '.wmv', 
    '.flv', '.webm', '.mpeg', '.mpg', '.3gp'
  ];
  
  return videoExtensions.includes(ext);
}

/**
 * Get cached transcoded file path
 */
function getCachedPath(originalPath, quality = '720p') {
  const filename = path.basename(originalPath);
  const safeName = `${path.basename(filename, path.extname(filename))}_${quality}.mp4`;
  return path.join(TRANSCODE_CONFIG.cacheDir, safeName);
}

/**
 * Check if cached version exists
 */
function hasCache(originalPath, quality = '720p') {
  const cachedPath = getCachedPath(originalPath, quality);
  return fs.existsSync(cachedPath);
}

/**
 * Transcode video to MP4 for streaming
 * @param {string} inputPath - Path to original video
 * @param {string} quality - Quality preset (480p, 720p, 1080p)
 * @param {function} callback - Callback(err, outputPath)
 */
function transcode(inputPath, quality = '720p', callback) {
  if (!TRANSCODE_CONFIG.enabled) {
    return callback(new Error('Transcoding is disabled'));
  }

  const preset = QUALITY_PRESETS[quality] || QUALITY_PRESETS['720p'];
  const outputPath = getCachedPath(inputPath, quality);

  // Check if already cached
  if (fs.existsSync(outputPath)) {
    logger.debug(`[Transcode] Using cached: ${outputPath}`);
    return callback(null, outputPath);
  }

  logger.info(`[Transcode] Starting: ${path.basename(inputPath)} -> ${quality}`);

  const startTime = Date.now();

  // Timeout set to 5 minutes (300000ms) for typical videos, can be increased via env
  const timeoutMs = parseInt(process.env.TRANSCODE_TIMEOUT, 10) || 300000;

  ffmpeg(inputPath, { timeout: timeoutMs })
    .videoCodec('libx264')
    .audioCodec('aac')
    .videoBitrate(preset.videoBitrate)
    .audioBitrate(preset.audioBitrate)
    .size(preset.resolution)
    .outputOptions([
      '-preset medium',
      '-crf 23',
      `-profile:v ${preset.profile}`,
      '-level 3.1',
      '-movflags +faststart',
      '-pix_fmt yuv420p'
    ])
    .on('start', (commandLine) => {
      logger.debug(`[Transcode] Command: ${commandLine}`);
    })
    .on('progress', (progress) => {
      const percent = progress.percent ? Math.round(progress.percent) : 0;
      logger.debug(`[Transcode] Progress: ${percent}%`);
    })
    .on('end', () => {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      logger.info(`[Transcode] Complete: ${outputPath} (${duration}s)`);
      callback(null, outputPath);
    })
    .on('error', (err) => {
      logger.error(`[Transcode] Error: ${err.message}`);
      callback(err, null);
    })
    .save(outputPath);
}

/**
 * Transcode video to multiple qualities for adaptive streaming
 * @param {string} inputPath - Path to original video
 * @param {string[]} qualities - Array of quality presets
 * @param {function} callback - Callback(err, outputs)
 */
function transcodeMultiple(inputPath, qualities = ['480p', '720p'], callback) {
  if (!TRANSCODE_CONFIG.enabled) {
    return callback(new Error('Transcoding is disabled'));
  }

  const results = {};
  let completed = 0;
  const errors = [];

  qualities.forEach((quality) => {
    transcode(inputPath, quality, (err, outputPath) => {
      if (err) {
        errors.push({ quality, error: err.message });
      } else {
        results[quality] = outputPath;
      }
      
      completed++;
      if (completed === qualities.length) {
        if (errors.length > 0 && Object.keys(results).length === 0) {
          callback(new Error(`All transcodes failed: ${errors.map(e => e.error).join(', ')}`), null);
        } else {
          callback(null, results, errors);
        }
      }
    });
  });
}

/**
 * Get video metadata using ffprobe
 */
function getVideoMetadata(inputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) {
        reject(err);
      } else {
        resolve({
          duration: metadata.format.duration,
          size: metadata.format.size,
          bitrate: metadata.format.bit_rate,
          codec: metadata.streams.find(s => s.codec_type === 'video')?.codec_name,
          resolution: metadata.streams.find(s => s.codec_type === 'video')?.resolution
        });
      }
    });
  });
}

/**
 * Clean old cached files (older than maxAge ms)
 */
function cleanCache(maxAge = 7 * 24 * 60 * 60 * 1000) {
  if (!fs.existsSync(TRANSCODE_CONFIG.cacheDir)) {
    return;
  }

  const now = Date.now();
  const files = fs.readdirSync(TRANSCODE_CONFIG.cacheDir);
  
  files.forEach((file) => {
    const filePath = path.join(TRANSCODE_CONFIG.cacheDir, file);
    try {
      const stats = fs.statSync(filePath);
      if (now - stats.mtimeMs > maxAge) {
        fs.unlinkSync(filePath);
        logger.debug(`[Transcode] Cleaned cache: ${file}`);
      }
    } catch (error) {
      logger.error(`[Transcode] Cache clean error: ${error.message}`);
    }
  });
}

/**
 * Get cache size in bytes
 */
function getCacheSize() {
  if (!fs.existsSync(TRANSCODE_CONFIG.cacheDir)) {
    return 0;
  }

  const files = fs.readdirSync(TRANSCODE_CONFIG.cacheDir);
  let totalSize = 0;
  
  files.forEach((file) => {
    try {
      const filePath = path.join(TRANSCODE_CONFIG.cacheDir, file);
      totalSize += fs.statSync(filePath).size;
    } catch (error) {
      // Ignore errors
    }
  });
  
  return totalSize;
}

module.exports = {
  TRANSCODE_CONFIG,
  needsTranscoding,
  hasCache,
  transcode,
  transcodeMultiple,
  getVideoMetadata,
  cleanCache,
  getCacheSize,
  getCachedPath
};
