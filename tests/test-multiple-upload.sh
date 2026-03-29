#!/bin/bash

# Test script for multiple file upload endpoint
# Usage: ./test-multiple-upload.sh [API_KEY] [SERVER_URL]

# Generate a valid test API key (cs_test_ + 48 hex chars)
TEST_API_KEY="cs_test_$(openssl rand -hex 24 2>/dev/null || head -c 48 /dev/urandom | xxd -p | head -c 48)"
LIVE_API_KEY="cs_live_$(openssl rand -hex 24 2>/dev/null || head -c 48 /dev/urandom | xxd -p | head -c 48)"

API_KEY="${1:-$TEST_API_KEY}"
SERVER_URL="${2:-http://localhost:3000}"
UPLOAD_DIR="./test-files"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Multiple Upload Endpoint Test ===${NC}"
echo "Server: $SERVER_URL"
echo "API Key: $API_KEY"
echo "Generated Test Key: $TEST_API_KEY"
echo ""

# Create test directory and sample files
mkdir -p "$UPLOAD_DIR"

echo "Creating test files..."

# Create test file 1 (text)
echo "This is test file 1 content" > "$UPLOAD_DIR/test1.txt"

# Create test file 2 (text)
echo "This is test file 2 content with more data" > "$UPLOAD_DIR/test2.txt"

# Create test file 3 (JSON)
echo '{"name": "test", "value": 123}' > "$UPLOAD_DIR/test3.json"

# Create test file 4 (small binary-like)
head -c 1024 /dev/urandom > "$UPLOAD_DIR/test4.bin" 2>/dev/null || dd if=/dev/urandom of="$UPLOAD_DIR/test4.bin" bs=1024 count=1 2>/dev/null

echo ""
echo -e "${GREEN}Test files created:${NC}"
ls -lh "$UPLOAD_DIR"
echo ""

# Test 1: Upload multiple files
echo -e "${YELLOW}Test 1: Upload multiple files${NC}"
echo "Endpoint: POST /api/upload-multiple"
echo ""

curl -X POST "$SERVER_URL/api/upload-multiple" \
  -H "X-API-Key: $API_KEY" \
  -H "X-Folder-Path: /test-folder" \
  -F "files=@$UPLOAD_DIR/test1.txt" \
  -F "files=@$UPLOAD_DIR/test2.txt" \
  -F "files=@$UPLOAD_DIR/test3.json" \
  -F "files=@$UPLOAD_DIR/test4.bin" \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -s

echo ""
echo ""

# Test 2: Upload with test environment
echo -e "${YELLOW}Test 2: Upload multiple files to test environment${NC}"
echo "Endpoint: POST /api/upload-multiple"
echo "Header: X-Environment: test"
echo ""

curl -X POST "$SERVER_URL/api/upload-multiple" \
  -H "X-API-Key: $API_KEY" \
  -H "X-Environment: test" \
  -H "X-Folder-Path: /test-env-folder" \
  -F "files=@$UPLOAD_DIR/test1.txt" \
  -F "files=@$UPLOAD_DIR/test2.txt" \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -s

echo ""
echo ""

# Test 3: Upload single file (should also work)
echo -e "${YELLOW}Test 3: Upload single file (for comparison)${NC}"
echo "Endpoint: POST /api/upload"
echo ""

curl -X POST "$SERVER_URL/api/upload" \
  -H "X-API-Key: $API_KEY" \
  -H "X-Folder-Path: /single-folder" \
  -F "file=@$UPLOAD_DIR/test1.txt" \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -s

echo ""
echo ""

# Test 4: List files to verify upload
echo -e "${YELLOW}Test 4: List files to verify uploads${NC}"
echo "Endpoint: GET /api/files"
echo ""

curl -X GET "$SERVER_URL/api/files" \
  -H "X-API-Key: $API_KEY" \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -s

echo ""
echo ""

# Cleanup
echo -e "${YELLOW}Cleanup:${NC}"
rm -rf "$UPLOAD_DIR"
echo "Test files removed"

echo ""
echo -e "${GREEN}=== Test Complete ===${NC}"
