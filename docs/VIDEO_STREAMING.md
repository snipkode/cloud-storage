# Video Streaming & Transcoding

## Overview

Fitur video streaming dengan HTTP Range support dan optional transcoding untuk optimasi playback di browser.

## Features

### 1. HTTP Range Streaming
- Support partial content (HTTP 206)
- Enable video seeking/scrubbing
- Efficient bandwidth usage

### 2. Transcoding (Optional)
- Convert non-MP4 videos to MP4 (H.264 + AAC)
- Multiple quality options: 480p, 720p, 1080p
- Background transcoding on upload
- On-demand transcoding for first stream
- Cached transcoded versions

### 3. Quality Selector
- Auto quality selection
- Manual quality switch (480p, 720p, 1080p, Original)
- Real-time quality switching
- Visual indicator for transcoding status

## API Endpoints

### Stream Video
```
GET /api/stream/:filename
Headers:
  Authorization: Bearer <firebase_token>
Query Params:
  quality: 480p|720p|1080p (optional, default: 720p)
  environment: test|live (optional)

Response: Video stream with Accept-Ranges support
```

### Get Available Qualities
```
GET /api/stream/:filename/qualities
Headers:
  Authorization: Bearer <firebase_token>

Response:
{
  "filename": "video.mp4",
  "original": {
    "quality": "original",
    "available": true,
    "duration": 120.5,
    "resolution": "1920x1080",
    "codec": "h264"
  },
  "transcoded": [
    { "quality": "480p", "available": true, "cached": true },
    { "quality": "720p", "available": true, "cached": true },
    { "quality": "1080p", "available": false, "cached": false }
  ],
  "transcodingEnabled": true
}
```

## Configuration

Add to `server/.env`:

```env
# Enable/disable transcoding
TRANSCODE_ENABLED=true

# Keep original file after transcoding
TRANSCODE_KEEP_ORIGINAL=true

# Only transcode non-MP4 files (saves resources)
TRANSCODE_ONLY_NON_MP4=true

# Default quality: 480p, 720p, 1080p
TRANSCODE_QUALITY=720p

# Optional: Custom cache directory
# TRANSCODE_CACHE_DIR=/path/to/transcode-cache
```

## Installation

### 1. Install Node.js Dependencies
```bash
cd server
npm install
```

### 2. Install FFmpeg

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install ffmpeg
```

**macOS:**
```bash
brew install ffmpeg
```

**Windows:**
1. Download from https://ffmpeg.org/download.html
2. Extract to `C:\ffmpeg`
3. Add `C:\ffmpeg\bin` to PATH environment variable
4. Restart terminal/command prompt

**Verify Installation:**
```bash
ffmpeg -version
```

## Storage Impact

| Scenario | Storage Usage |
|----------|---------------|
| MP4 upload (transcoding disabled for MP4) | 1x (original only) |
| MKV upload with transcoding | ~1.5-2x (original + transcode) |
| MKV upload, delete original | ~0.8x (transcoded smaller) |

### Example:
- Original MKV (1 GB, 10 Mbps) → Transcoded MP4 (400 MB, 3 Mbps, 720p)
- Total: 1.4 GB with original, 400 MB without original

## How It Works

### Upload Flow
```
1. User uploads video (any format)
2. Server saves original file
3. If TRANSCODE_ENABLED && needsTranscoding:
   - Start background transcoding to 720p
   - Upload completes immediately
   - Transcoding runs asynchronously
4. Transcoded file cached for future streams
```

### Streaming Flow
```
1. User opens video preview
2. VideoPlayer fetches available qualities
3. If quality cached:
   - Stream transcoded version
4. If not cached:
   - Stream original
   - Start background transcoding
   - Next stream uses cached version
```

## VideoPlayer Component Usage

```jsx
import { VideoPlayer } from './components/VideoPlayer';

<VideoPlayer
  src={videoUrl}
  filename={videoFilename}
  onDownload={handleDownload}
  enableStreaming={true}
  apiBase="http://localhost:3000"
/>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| src | string | - | Original video URL (fallback) |
| filename | string | - | Video filename for streaming endpoint |
| onDownload | function | - | Download handler |
| enableStreaming | boolean | true | Enable HTTP streaming |
| apiBase | string | '' | API base URL |

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Space / K | Play/Pause |
| F | Fullscreen |
| M | Mute |
| ← | Seek back 5s |
| → | Seek forward 5s |
| ↑ | Volume up |
| ↓ | Volume down |

## Troubleshooting

### "ffmpeg not found"
```bash
# Check if ffmpeg is installed
ffmpeg -version

# If not found, install (see Installation section)
```

### Transcoding fails
```
Check server logs for details:
- Unsupported codec
- Corrupted source file
- Insufficient disk space
```

### Streaming 401 Unauthorized
- Ensure user is logged in
- Token is automatically handled by VideoPlayer
- Check Firebase authentication

### Quality selector not showing
- Only shows when TRANSCODE_ENABLED=true
- Requires at least one transcoded quality available
- Check `/api/stream/:filename/qualities` endpoint

## Performance Tips

1. **Enable TRANSCODE_ONLY_NON_MP4**: Skip transcoding for already-compatible formats
2. **Use 720p as default**: Good balance of quality and bandwidth
3. **Pre-transcode popular videos**: Upload during off-peak hours
4. **Monitor cache directory size**: Implement cleanup if needed

## Cache Management

Clean old transcoded files:
```javascript
const transcodeLib = require('./lib/transcode');

// Clean files older than 7 days (default)
transcodeLib.cleanCache();

// Clean files older than 30 days
transcodeLib.cleanCache(30 * 24 * 60 * 60 * 1000);

// Get cache size
const size = transcodeLib.getCacheSize();
console.log(`Cache size: ${(size / 1024 / 1024).toFixed(2)} MB`);
```
