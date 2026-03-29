/**
 * Test script untuk multiple upload endpoint
 * Paste ini di browser console (F12) saat aplikasi client berjalan
 */

// Test upload multiple files
async function testMultipleUpload() {
  // Get token dari auth store (paste token manual jika perlu)
  const token = prompt('Paste your JWT token dari localStorage atau auth store:');
  
  if (!token) {
    console.error('❌ Token tidak diberikan');
    return;
  }

  // Create test files
  const files = [
    new File(['Test file 1 content'], 'test1.txt', { type: 'text/plain' }),
    new File(['Test file 2 content'], 'test2.txt', { type: 'text/plain' }),
    new File(['Test file 3 content'], 'test3.txt', { type: 'text/plain' })
  ];

  const formData = new FormData();
  files.forEach(file => formData.append('files', file));

  const folderPath = '/test-from-browser';

  console.log('🚀 Testing multiple upload...');
  console.log('Endpoint:', 'http://localhost:3000/api/upload-multiple');
  console.log('Files:', files.length);
  console.log('Folder Path:', folderPath);

  try {
    const response = await fetch('http://localhost:3000/api/upload-multiple', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Environment': 'live',
        'X-Folder-Path': folderPath
        // Note: Don't set Content-Type header, browser will set it automatically with boundary
      },
      body: formData
    });

    console.log('📡 Response status:', response.status);

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Upload successful!');
      console.log('Response:', data);
    } else {
      console.error('❌ Upload failed:', data);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run test
testMultipleUpload();
