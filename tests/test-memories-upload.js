/**
 * Test upload to /Memories folder
 * Run with: node tests/test-memories-upload.js
 * See tests/README.md for more details
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// Configuration
const API_URL = 'http://localhost:3000/api/upload-multiple';
const FOLDER_PATH = '/Memories';

// You need to provide your API key or token
const API_KEY = process.env.CLOUD_STORAGE_API_KEY || 'cs_live_99c2578db8b0d6bf1d65828433543d4c86568c31cf0f3182';

// Create test files if they don't exist
const testDir = path.join(__dirname, 'test-uploads');
if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir, { recursive: true });
}

const testFiles = [
  { name: 'memory-test1.txt', content: 'Memory test content 1' },
  { name: 'memory-test2.txt', content: 'Memory test content 2' }
];

// Create test files
testFiles.forEach(file => {
  const filePath = path.join(testDir, file.name);
  fs.writeFileSync(filePath, file.content);
  console.log(`Created test file: ${file.name}`);
});

// Build multipart form data manually
const boundary = '----WebKitFormBoundary' + Math.random().toString(36).slice(2);
let body = '';

testFiles.forEach(file => {
  const filePath = path.join(testDir, file.name);
  const content = fs.readFileSync(filePath, 'utf8');
  
  body += `--${boundary}\r\n`;
  body += `Content-Disposition: form-data; name="files"; filename="${file.name}"\r\n`;
  body += `Content-Type: text/plain\r\n\r\n`;
  body += content + '\r\n';
});

body += `--${boundary}--\r\n`;

const url = new URL(API_URL);
const options = {
  hostname: url.hostname,
  port: url.port || 80,
  path: url.pathname,
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'X-API-Key': API_KEY,
    'X-Folder-Path': FOLDER_PATH,
    'X-Environment': 'live',
    'Content-Type': `multipart/form-data; boundary=${boundary}`,
    'Content-Length': Buffer.byteLength(body)
  }
};

console.log('\n🚀 Testing upload to /Memories folder...\n');
console.log('Endpoint:', API_URL);
console.log('Folder Path:', FOLDER_PATH);
console.log('Files:', testFiles.length);
console.log('API Key:', API_KEY ? 'Provided' : '❌ Not provided (set CLOUD_STORAGE_API_KEY env var)');
console.log('');

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('📡 Response status:', res.statusCode);
    try {
      const response = JSON.parse(data);
      if (res.statusCode === 201) {
        console.log('✅ Upload successful!\n');
        console.log('Response:', JSON.stringify(response, null, 2));
      } else {
        console.log('❌ Upload failed!\n');
        console.log('Response:', JSON.stringify(response, null, 2));
      }
    } catch (e) {
      console.log('Response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Request error:', e.message);
  console.error('\nMake sure the server is running on http://localhost:3000');
});

req.write(body);
req.end();
