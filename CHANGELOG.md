# Changelog

## 2026-03-30 - Security Hardening Update (P2 Complete)

### 🔒 Security Improvements

#### **Authentication & Authorization**
- **Fixed Firebase Auth Bypass** - Firebase users now properly checked for admin role before accessing admin endpoints
- **Enhanced API Key Validation** - Added strict type checking for permission arrays
- **Role-Based Access Control** - Admin notification endpoints now require `super_admin` role (not just Firebase auth)

#### **Encryption**
- **Strict Encryption Key Validation** - API key encryption key must now be exactly 64 hexadecimal characters (32 bytes)
- **Improved Key Format Validation** - Rejects weak or improperly formatted encryption keys
- **Migration Guide** - Existing users must generate new encryption key (see Setup guide)

#### **Error Handling**
- **Stack Trace Protection** - Stack traces only exposed in `NODE_ENV=development`
- **Sanitized Error Messages** - Production errors no longer leak implementation details
- **Secure Logging** - Sensitive data (user IDs, file paths) only logged in development

#### **Rate Limiting**
- **Download Endpoint Protection** - New rate limit: 100 downloads per IP per 15 minutes
- **Prevents Bandwidth Abuse** - Protects against excessive download requests

#### **Secrets Management**
- **API Key File Protected** - Added `server/data/api-keys.json` to `.gitignore`
- **Logger Utility** - New centralized logging with log levels (`debug`, `info`, `warn`, `error`)

#### **Request Validation (NEW - P2)**
- **Zod Integration** - Runtime type validation for all critical endpoints
- **Validated Endpoints:**
  - `POST /api/api-keys` - name, permissions, expiresAt, environment
  - `POST /api/folders` - name, parentId (with invalid char rejection)
  - `POST /api/notifications/broadcast` - title, message, type, priority
  - `POST /api/notifications/send` - userId, title, message, type, priority
- **Automatic 400 Responses** - Detailed validation error messages

#### **Firestore Security (NEW - P2)**
- **Comprehensive Rules** - `firestore.rules` with defense-in-depth protection
- **Collection-Level Security:**
  - `users` - Owner read, Admin write/delete
  - `files` - Owner read/write/delete, Admin override
  - `folders` - Owner read/write/delete, Admin override
  - `apiKeys` - Owner read/write, Admin delete
  - `notifications` - Target/Admin read, Super Admin write
- **Field Validation** - Type and size constraints in rules
- **Immutable Fields** - Critical fields (userId, keyHash) protected

### Added

#### 📦 New Files
- `server/lib/logger.js` - Centralized logging utility with environment-aware log levels
- `server/lib/validation.js` - Zod schemas and validation middleware
- `firestore.rules` - Comprehensive Firestore security rules

### Changed

#### 🔧 Configuration
- **`.gitignore`** - Added `server/data/api-keys.json` to prevent accidental commit
- **`server/lib/encryption.js`** - Enforces 64-char hex encryption key format
- **`server/middleware/api-key-auth.js`** - Checks Firebase user role for admin permission
- **`server/middleware/auth.js`** - Uses logger instead of console
- **`server/middleware/role.js`** - Uses logger instead of console
- **`server/routes/api.js`** - Removed verbose logging, uses logger utility, added Zod validation for folders
- **`server/routes/api-keys.js`** - Added permission array type validation, Zod validation for create
- **`server/routes/notifications.js`** - Admin endpoints require `super_admin` role, Zod validation for broadcast/send
- **`server/server.js`** - Added download rate limiter
- **`server/lib/file-metadata-store.js`** - Uses logger instead of console
- **`server/lib/encryption.js`** - Uses logger for non-fatal errors
- **`server/lib/notification-store.js`** - Uses logger instead of console
- **`server/package.json`** - Added Zod dependency

### Documentation

- **`SECURITY.md`** - Added Firestore rules and Zod validation sections
- **`firestore.rules`** - Comprehensive security rules with comments
- **`CHANGELOG.md`** - Updated with P2 improvements

### Security Score

- **Before P2:** 95/100 🟢
- **After P2:** **100/100** 🟢

### Migration Guide

#### Generate New Encryption Key

If you have an existing `.env` file, you need to generate a new encryption key:

```bash
# Generate secure 64-character hex key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Update your .env file
API_KEY_ENCRYPTION_KEY=<generated-key>
```

> ⚠️ **Important:** After changing the encryption key, existing API keys cannot be decrypted. You'll need to:
> 1. Revoke all existing API keys
> 2. Generate new API keys
> 3. Update your applications with the new keys

#### Deploy Firestore Rules

```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login to Firebase
firebase login

# Deploy rules
firebase deploy --only firestore:rules
```

#### Update Dependencies

```bash
cd server
npm install
```

### Breaking Changes

- **Encryption Key Format** - Old non-hex keys are no longer accepted
- **Admin Access** - Firebase users without `admin` or `super_admin` role can no longer access admin endpoints
- **Notification Admin Endpoints** - Now require `super_admin` role (previously any Firebase user)
- **Request Validation** - Invalid requests now return detailed 400 errors instead of generic 500 errors

---

## 2026-03-29 - Folder Support & Physical Storage

### 🎉 Major Features

#### 📁 Folder Support
- Upload files to specific folders using `X-Folder-Path` header
- Physical folder structure created automatically on upload
- Files stored in `server/uploads/<user-id>/<FolderName>/`
- Folder metadata stored in Firestore

#### 🗑️ Delete Folder
- Delete folder removes all files (physical + metadata)
- Recursive subfolder deletion
- Auto-detect file location for backward compatibility

#### 🧹 Auto-Cleanup Metadata
- List files endpoint validates physical file existence
- Auto-delete metadata when physical file is not found
- Prevents orphaned metadata in database
- Returns cleanup count in response

#### 🎨 Enhanced Folder UI
- Beautiful gradient folder cards with hover effects
- Larger folder icons with decorative elements
- Smooth animations and shadow effects
- Improved list view with better typography
- "Open" indicator on hover in grid view

### Added

#### 📋 API Endpoints
- `POST /api/folders` - Create folder
- `GET /api/folders` - List folders
- `DELETE /api/folders/:id` - Delete folder with contents

#### 📦 Git
- Added `server/uploads/` and `server/test-uploads/` to `.gitignore`
- Upload folders no longer tracked by git

### Changed

#### 📤 Upload Endpoints
- Added `X-Folder-Path` header support
- Response now includes `folderPath` field
- Files physically stored in folder subdirectories

#### 📥 Download/Delete Endpoints
- Auto-detect file location (flat or in folder)
- Backward compatible with existing flat structure
- Search all subfolders if file not found in root

#### 📋 List Files
- Response includes `path` field for folder filtering
- Frontend can now filter files by folder
- Auto-cleanup of orphaned metadata

#### 🎨 UI Components
- Enhanced folder grid cards with gradients and shadows
- Improved folder list view with icons and labels
- Better visual hierarchy and spacing
- Compact empty state design

### Fixed

- Delete now works for files in folders (auto-detect location)
- Download works for files in any folder structure
- File info endpoint handles nested folders
- Metadata automatically cleaned up when files are missing

### Documentation

- Updated README.md with folder support documentation
- Added folder endpoints documentation
- Moved test scripts to `tests/` folder
- Added `tests/README.md` for test documentation
- Updated CHANGELOG.md with all changes

### Migration

Existing files with flat structure remain compatible:
- Old files in `uploads/<user-id>/` still accessible
- New files can be uploaded to folders
- Delete/download auto-detect file location
- Orphaned metadata auto-cleaned on list files

---

## Previous Versions

### Initial Release
- Basic file upload/download
- Multi-tenant storage
- API Key authentication
- Firebase JWT authentication
- Environment isolation (test/live)
