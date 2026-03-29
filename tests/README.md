# Test Scripts

Collection of test scripts for Cloud Storage API.

## Setup

```bash
# Set your API key (get it from UI: Settings → API Keys)
export CLOUD_STORAGE_API_KEY="cs_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

## Available Tests

### 1. Test Memories Upload

Upload test files to `/Memories` folder.

```bash
node tests/test-memories-upload.js
```

**What it tests:**
- Upload multiple files with `X-Folder-Path: /Memories` header
- Auto-create folder `/Memories` if not exists
- Files stored in `server/uploads/<user-id>/Memories/`

---

### 2. Test Browser Upload

Simulate browser upload format with FormData.

```bash
node tests/test-browser-upload.js
```

**What it tests:**
- Single file upload with FormData format
- Browser-like request headers

---

### 3. Test Multiple Upload (Shell)

Upload multiple files using curl (bash script).

```bash
bash tests/test-multiple-upload.sh
```

**What it tests:**
- Multiple file upload with curl
- Multipart/form-data format

---

### 4. Test Upload Browser (Alternative)

Alternative browser upload test.

```bash
node tests/test-upload-browser.js
```

## Expected Output

All tests should return:
- Status: `201 Created`
- Response includes file metadata with `folderPath` field
- Files physically stored in correct folder

Example response:
```json
{
  "message": "2 file(s) uploaded successfully",
  "files": [
    {
      "filename": "1234567890-file.txt",
      "originalname": "file.txt",
      "size": 1024,
      "folderPath": "/Memories"
    }
  ]
}
```

## Troubleshooting

**401 Unauthorized:**
- Check API key is correct
- Ensure API key has `upload` permission

**404 Folder not found:**
- Folder will be auto-created on first upload
- Check `X-Folder-Path` header format (must start with `/`)

**File not found on download:**
- Check file was uploaded to correct environment (test vs live)
- Verify folder path in metadata matches physical location
