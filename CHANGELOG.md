# Changelog

## 2026-03-29 - Folder Support & Physical Storage

### Added

#### 📁 Folder Support
- Upload files to specific folders using `X-Folder-Path` header
- Physical folder structure created automatically on upload
- Files stored in `server/uploads/<user-id>/<FolderName>/`
- Folder metadata stored in Firestore

#### 🗑️ Delete Folder
- Delete folder removes all files (physical + metadata)
- Recursive subfolder deletion
- Auto-detect file location for backward compatibility

#### 📋 API Endpoints
- `POST /api/folders` - Create folder
- `GET /api/folders` - List folders
- `DELETE /api/folders/:id` - Delete folder with contents

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

### Fixed

- Delete now works for files in folders (auto-detect location)
- Download works for files in any folder structure
- File info endpoint handles nested folders

### Documentation

- Updated README.md with folder support documentation
- Added folder endpoints documentation
- Moved test scripts to `tests/` folder
- Added `tests/README.md` for test documentation

### Migration

Existing files with flat structure remain compatible:
- Old files in `uploads/<user-id>/` still accessible
- New files can be uploaded to folders
- Delete/download auto-detect file location

---

## Previous Versions

### Initial Release
- Basic file upload/download
- Multi-tenant storage
- API Key authentication
- Firebase JWT authentication
- Environment isolation (test/live)
