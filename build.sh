#!/usr/bin/env bash
# Exit immediately if a command exits with a non-zero status
set -o errexit

echo "🚀 Installing backend dependencies..."
pip install -r backend/requirements.txt

echo "⚛️ Building frontend application..."
cd frontend
npm install
npm run build
cd ..

echo "✅ Build completed successfully for production deployment!"
