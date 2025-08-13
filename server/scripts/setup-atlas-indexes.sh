#!/bin/bash

# One-time setup script for Atlas Vector Search indexes
# Run this once after creating your Atlas cluster

echo "🔍 Setting up Atlas Vector Search Indexes..."

# Check for required environment variables
if [ -z "$ATLAS_PROJECT_ID" ] || [ -z "$ATLAS_CLUSTER_NAME" ]; then
    echo "❌ Missing required environment variables:"
    echo "   ATLAS_PROJECT_ID and ATLAS_CLUSTER_NAME must be set"
    exit 1
fi

# Generate index definition files
echo "📝 Generating index definitions..."
node scripts/setupVectorSearch.js create-files

echo "✅ Index definitions created in scripts/atlas-indexes/"
echo ""
echo "📌 Next steps:"
echo "1. Go to MongoDB Atlas UI"
echo "2. Navigate to your cluster → Atlas Search"
echo "3. Create indexes using the JSON files in scripts/atlas-indexes/"
echo ""
echo "Or use Atlas CLI:"
echo "atlas clusters search indexes create --file scripts/atlas-indexes/event_vector_index.json"
echo "atlas clusters search indexes create --file scripts/atlas-indexes/user_vector_index.json"