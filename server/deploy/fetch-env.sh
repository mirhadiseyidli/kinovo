#!/bin/bash

# Function to get parameter from Parameter Store
get_parameter() {
    aws ssm get-parameter --name "$1" --with-decryption --query Parameter.Value --output text --region us-west-2
}

# Start with a clean .env file
> .env

# Write values line by line
echo "# Server Configuration" >> .env
echo "NODE_ENV=production" >> .env
echo "BACKEND_PORT=$(get_parameter "/kinovo/BACKEND_PORT")" >> .env

echo "" >> .env
echo "# MongoDB Configuration" >> .env
echo "MONGODB_URI=$(get_parameter "/kinovo/MONGODB_URI")" >> .env

echo "" >> .env
echo "# JWT Configuration" >> .env
echo "JWT_ACCESS_SECRET=$(get_parameter "/kinovo/JWT_ACCESS_SECRET")" >> .env
echo "JWT_REFRESH_SECRET=$(get_parameter "/kinovo/JWT_REFRESH_SECRET")" >> .env

echo "" >> .env
echo "# Google" >> .env
echo "GOOGLE_CLIENT_ID=$(get_parameter "/kinovo/GOOGLE_CLIENT_ID")" >> .env
echo "GOOGLE_MAPS_API_KEY=$(get_parameter "/kinovo/GOOGLE_MAPS_API_KEY")" >> .env

echo "" >> .env
echo "# Apple" >> .env
echo "APPLE_TEAM_ID=$(get_parameter "/kinovo/APPLE_TEAM_ID")" >> .env
echo "APPLE_WEATHER_KEY_ID=$(get_parameter "/kinovo/APPLE_WEATHER_KEY_ID")" >> .env
echo "APPLE_BUNDLE_ID=$(get_parameter "/kinovo/APPLE_BUNDLE_ID")" >> .env
echo "APPLE_WEATHER_PRIVATE_KEY=$(get_parameter "/kinovo/APPLE_WEATHER_PRIVATE_KEY")" >> .env
echo "APPLE_CLIENT_ID=$(get_parameter "/kinovo/APPLE_CLIENT_ID")" >> .env

echo "" >> .env
echo "# OpenAI" >> .env
echo "OPENAI_API_KEY=$(get_parameter "/kinovo/OPENAI_API_KEY")" >> .env

echo "" >> .env
echo "# Firebase" >> .env
echo "FIREBASE_PROJECT_ID=$(get_parameter "/kinovo/FIREBASE_PROJECT_ID")" >> .env
echo "FIREBASE_PRIVATE_KEY=$(get_parameter "/kinovo/FIREBASE_PRIVATE_KEY")" >> .env
echo "FIREBASE_CLIENT_EMAIL=$(get_parameter "/kinovo/FIREBASE_CLIENT_EMAIL")" >> .env
echo "FIREBASE_DATABASE_URL=$(get_parameter "/kinovo/FIREBASE_DATABASE_URL")" >> .env
echo "FIREBASE_API_KEY=$(get_parameter "/kinovo/FIREBASE_API_KEY")" >> .env
echo "FIREBASE_STORAGE_BUCKET=$(get_parameter "/kinovo/FIREBASE_STORAGE_BUCKET")" >> .env
echo "FIREBASE_MESSAGING_SENDER_ID=$(get_parameter "/kinovo/FIREBASE_MESSAGING_SENDER_ID")" >> .env
echo "FIREBASE_IOS_CLIENT_ID=$(get_parameter "/kinovo/FIREBASE_IOS_CLIENT_ID")" >> .env
echo "FIREBASE_APP_ID=$(get_parameter "/kinovo/FIREBASE_APP_ID")" >> .env
echo "FIREBASE_PRIVATE_KEY_ID=$(get_parameter "/kinovo/FIREBASE_PRIVATE_KEY_ID")" >> .env
echo "FIREBASE_CLIENT_ID=$(get_parameter "/kinovo/FIREBASE_CLIENT_ID")" >> .env

echo "" >> .env
echo "# SMTP / Email" >> .env
echo "SMTP_HOST=$(get_parameter "/kinovo/SMTP_HOST")" >> .env
echo "SMTP_PORT=$(get_parameter "/kinovo/SMTP_PORT")" >> .env
echo "SMTP_SECURE=$(get_parameter "/kinovo/SMTP_SECURE")" >> .env
echo "SMTP_USER=$(get_parameter "/kinovo/SMTP_USER")" >> .env
echo "SMTP_FROM=$(get_parameter "/kinovo/SMTP_FROM")" >> .env

echo "" >> .env
echo "# Gmail OAuth" >> .env
echo "GMAIL_CLIENT_ID=$(get_parameter "/kinovo/GMAIL_CLIENT_ID")" >> .env
echo "GMAIL_CLIENT_SECRET=$(get_parameter "/kinovo/GMAIL_CLIENT_SECRET")" >> .env
echo "GMAIL_REDIRECT_URI=$(get_parameter "/kinovo/GMAIL_REDIRECT_URI")" >> .env
echo "GMAIL_REFRESH_TOKEN=$(get_parameter "/kinovo/GMAIL_REFRESH_TOKEN")" >> .env

# Lock down permissions
chmod 600 .env