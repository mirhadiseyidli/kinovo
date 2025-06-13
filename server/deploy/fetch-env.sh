#!/bin/bash

# Function to get parameter from Parameter Store
get_parameter() {
    aws ssm get-parameter --name "$1" --with-decryption --query Parameter.Value --output text
}

# Generate .env file from SSM Parameter Store
cat << EOF > .env
# Server Configuration
NODE_ENV=production
BACKEND_PORT=$(get_parameter "/kinovo/BACKEND_PORT")

# MongoDB Configuration
MONGODB_URI=$(get_parameter "/kinovo/MONGODB_URI")

# JWT Configuration
JWT_ACCESS_SECRET=$(get_parameter "/kinovo/JWT_ACCESS_SECRET")
JWT_REFRESH_SECRET=$(get_parameter "/kinovo/JWT_REFRESH_SECRET")

# Google
GOOGLE_CLIENT_ID=$(get_parameter "/kinovo/GOOGLE_CLIENT_ID")
GOOGLE_MAPS_API_KEY=$(get_parameter "/kinovo/GOOGLE_MAPS_API_KEY")

# Apple
APPLE_TEAM_ID=$(get_parameter "/kinovo/APPLE_TEAM_ID")
APPLE_WEATHER_KEY_ID=$(get_parameter "/kinovo/APPLE_WEATHER_KEY_ID")
APPLE_BUNDLE_ID=$(get_parameter "/kinovo/APPLE_BUNDLE_ID")
APPLE_WEATHER_PRIVATE_KEY=$(get_parameter "/kinovo/APPLE_WEATHER_PRIVATE_KEY")
APPLE_CLIENT_ID=$(get_parameter "/kinovo/APPLE_CLIENT_ID")

# OpenAI
OPENAI_API_KEY=$(get_parameter "/kinovo/OPENAI_API_KEY")

# Firebase
FIREBASE_PROJECT_ID=$(get_parameter "/kinovo/FIREBASE_PROJECT_ID")
FIREBASE_PRIVATE_KEY=$(get_parameter "/kinovo/FIREBASE_PRIVATE_KEY")
FIREBASE_CLIENT_EMAIL=$(get_parameter "/kinovo/FIREBASE_CLIENT_EMAIL")
FIREBASE_DATABASE_URL=$(get_parameter "/kinovo/FIREBASE_DATABASE_URL")
FIREBASE_API_KEY=$(get_parameter "/kinovo/FIREBASE_API_KEY")
FIREBASE_STORAGE_BUCKET=$(get_parameter "/kinovo/FIREBASE_STORAGE_BUCKET")
FIREBASE_MESSAGING_SENDER_ID=$(get_parameter "/kinovo/FIREBASE_MESSAGING_SENDER_ID")
FIREBASE_IOS_CLIENT_ID=$(get_parameter "/kinovo/FIREBASE_IOS_CLIENT_ID")
FIREBASE_APP_ID=$(get_parameter "/kinovo/FIREBASE_APP_ID")
FIREBASE_PRIVATE_KEY_ID=$(get_parameter "/kinovo/FIREBASE_PRIVATE_KEY_ID")
FIREBASE_CLIENT_ID=$(get_parameter "/kinovo/FIREBASE_CLIENT_ID")

# SMTP / Email
SMTP_HOST=$(get_parameter "/kinovo/SMTP_HOST")
SMTP_PORT=$(get_parameter "/kinovo/SMTP_PORT")
SMTP_SECURE=$(get_parameter "/kinovo/SMTP_SECURE")
SMTP_USER=$(get_parameter "/kinovo/SMTP_USER")
SMTP_FROM=$(get_parameter "/kinovo/SMTP_FROM")

# Gmail OAuth
GMAIL_CLIENT_ID=$(get_parameter "/kinovo/GMAIL_CLIENT_ID")
GMAIL_CLIENT_SECRET=$(get_parameter "/kinovo/GMAIL_CLIENT_SECRET")
GMAIL_REDIRECT_URI=$(get_parameter "/kinovo/GMAIL_REDIRECT_URI")
GMAIL_REFRESH_TOKEN=$(get_parameter "/kinovo/GMAIL_REFRESH_TOKEN")
EOF

# Lock down the .env file
chmod 600 .env