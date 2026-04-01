require('dotenv').config();
const path = require('path');
const fileMetadataStore = require(path.join(__dirname, '..', 'lib', 'file-metadata-store'));
const fs = require('fs');

async function addVideoMetadata() {
  const uid = '0o45kIizIFMdFKNxhOq36IvzEVs2';
  const userDir = path.join('/data/data/com.termux/files/home/cloud-storage/server/uploads/0o45kIizIFMdFKNxhOq36IvzEVs2');
  
  // Find all MP4 files without metadata
  const files = fs.readdirSync(userDir).filter(f => f.endsWith('.mp4'));
  
  for (const file of files) {
    // Check if metadata exists
    const existing = await fileMetadataStore.getFileByFilename(file, uid, 'live');
    if (existing) {
      console.log('✓ Already exists:', file);
      continue;
    }
    
    // Get file stats
    const filePath = path.join(userDir, file);
    const stats = fs.statSync(filePath);
    
    // Extract original name (remove timestamp prefix)
    const parts = file.split('-');
    const originalname = parts.length > 2 ? parts.slice(2).join('-') : file;
    
    // Create metadata
    const metadata = await fileMetadataStore.createFile({
      filename: file,
      originalname: originalname,
      mimetype: 'video/mp4',
      size: stats.size,
      userId: uid,
      path: '/',
      environment: 'live'
    });
    
    console.log('✓ Added metadata:', originalname, `(${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
  }
  
  console.log('\nDone!');
}

addVideoMetadata().catch(console.error);
