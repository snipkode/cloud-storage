/**
 * Test Multiple Upload - Browser Console Script
 * Paste ini di browser console (F12) saat aplikasi berjalan
 */

async function testUpload() {
  // Create test files
  const files = [
    new File(['Test content 1'], 'browser-test1.txt', { type: 'text/plain' }),
    new File(['Test content 2'], 'browser-test2.txt', { type: 'text/plain' }),
    new File(['Test content 3'], 'browser-test3.txt', { type: 'text/plain' })
  ];

  const formData = new FormData();
  files.forEach(file => formData.append('files', file));

  console.log('🚀 Testing multiple upload from browser...');
  console.log('Files:', files.length);

  try {
    const response = await fetch('http://localhost:3000/api/upload-multiple', {
      method: 'POST',
      headers: {
        'X-Environment': 'live',
        'X-Folder-Path': '/browser-test'
        // Don't set Content-Type - browser handles it automatically
      },
      body: formData
    });

    console.log('📡 Status:', response.status);

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ SUCCESS:', data);
    } else {
      console.error('❌ FAILED:', data);
    }
  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

// Run test
testUpload();
