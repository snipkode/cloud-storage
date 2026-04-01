require('dotenv').config();
const path = require('path');
const fileMetadataStore = require(path.join(__dirname, 'lib', 'file-metadata-store'));
const fs = require('fs');

async function fixMissingMetadata() {
  const uploadsDir = path.join(__dirname, 'uploads');
  
  if (!fs.existsSync(uploadsDir)) {
    console.error('Uploads directory not found:', uploadsDir);
    return;
  }

  // Get all user directories
  const userDirs = fs.readdirSync(uploadsDir);
  
  let totalFixed = 0;
  let totalSkipped = 0;

  for (const userDir of userDirs) {
    const uid = userDir;
    const fullPath = path.join(uploadsDir, userDir);
    
    if (!fs.statSync(fullPath).isDirectory()) continue;

    console.log(`\n📁 Checking user: ${uid}`);

    // Find all video files
    const files = fs.readdirSync(fullPath).filter(f => 
      f.endsWith('.mp4') || f.endsWith('.mkv') || f.endsWith('.avi') || f.endsWith('.mov')
    );

    for (const file of files) {
      // Check if metadata exists
      const existing = await fileMetadataStore.getFileByFilename(file, uid, 'live');
      
      if (existing) {
        console.log(`  ✓ ${file}`);
        totalSkipped++;
        continue;
      }

      // Get file stats
      const filePath = path.join(fullPath, file);
      const stats = fs.statSync(filePath);

      // Extract original name (remove timestamp prefix if present)
      const parts = file.split('-');
      const originalname = parts.length > 2 ? parts.slice(2).join('-') : file;

      // Determine mimetype
      const ext = path.extname(file).toLowerCase();
      const mimetypes = {
        '.mp4': 'video/mp4',
        '.mkv': 'video/x-matroska',
        '.avi': 'video/x-msvideo',
        '.mov': 'video/quicktime'
      };

      // Create metadata
      const metadata = await fileMetadataStore.createFile({
        filename: file,
        originalname: originalname,
        mimetype: mimetypes[ext] || 'application/octet-stream',
        size: stats.size,
        userId: uid,
        path: '/',
        environment: 'live'
      });

      console.log(`  ➕ Added: ${originalname} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
      totalFixed++;
    }
  }

  console.log(`\n✅ Done! Fixed ${totalFixed} file(s), ${totalSkipped} file(s) already had metadata`);
}

fixMissingMetadata().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
