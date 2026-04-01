require('dotenv').config();
const fileMetadataStore = require('./lib/file-metadata-store');
const fs = require('fs');
const path = require('path');

async function addMetadata() {
  const uid = '0o45kIizIFMdFKNxhOq36IvzEVs2';
  const filename = '1774889607094-482411448-lv_7614211833532042512_20260322100108.mp4';
  const originalname = 'lv_7614211833532042512_20260322100108.mp4';
  const filePath = path.join('/data/data/com.termux/files/home/cloud-storage/server/uploads/0o45kIizIFMdFKNxhOq36IvzEVs2', filename);
  
  const stats = fs.statSync(filePath);
  
  const metadata = await fileMetadataStore.createFile({
    filename,
    originalname,
    mimetype: 'video/mp4',
    size: stats.size,
    userId: uid,
    path: '/',
    environment: 'live'
  });
  
  console.log('✓ Metadata created:', metadata.id);
}
addMetadata().catch(console.error);
