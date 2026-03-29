# Changelog

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
