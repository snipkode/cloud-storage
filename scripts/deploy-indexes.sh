#!/bin/bash

# Script to deploy Firestore indexes
# Requires Firebase CLI: npm install -g firebase-tools

echo "🔍 Checking Firebase CLI..."
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found. Install with: npm install -g firebase-tools"
    exit 1
fi

echo "✓ Firebase CLI found"
echo ""
echo "📦 Deploying Firestore indexes..."
firebase deploy --only firestore:indexes

echo ""
echo "✅ Index deployment complete!"
echo ""
echo "📋 To view indexes in Firebase Console:"
echo "   1. Go to https://console.firebase.google.com"
echo "   2. Select your project: e-cloudjus"
echo "   3. Navigate to Firestore Database → Indexes"
