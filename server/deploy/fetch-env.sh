#!/bin/bash

# Function to get parameter from Parameter Store
get_parameter() {
    aws ssm get-parameter --name "$1" --with-decryption --query Parameter.Value --output text
}

# Fetch all environment variables
cat << EOF > .env
# Server Configuration
NODE_ENV=production
BACKEND_PORT=5002

# MongoDB Configuration
MONGODB_URI=$(get_parameter "/kinovo/mongodb-uri")

# JWT Configuration
JWT_SECRET=$(get_parameter "/kinovo/jwt-secret")
JWT_REFRESH_SECRET=$(get_parameter "/kinovo/jwt-refresh-secret")

# Google OAuth
GOOGLE_CLIENT_ID=$(get_parameter "/kinovo/google-client-id")
GOOGLE_CLIENT_SECRET=$(get_parameter "/kinovo/google-client-secret")
GOOGLE_CALLBACK_URL=$(get_parameter "/kinovo/google-callback-url")

# Firebase Admin
FIREBASE_PROJECT_ID=$(get_parameter "/kinovo/firebase-project-id")
FIREBASE_PRIVATE_KEY=$(get_parameter "/kinovo/firebase-private-key")
FIREBASE_CLIENT_EMAIL=$(get_parameter "/kinovo/firebase-client-email")

# OpenAI
OPENAI_API_KEY=$(get_parameter "/kinovo/openai-api-key")

# Email Configuration
SMTP_HOST=$(get_parameter "/kinovo/smtp-host")
SMTP_PORT=$(get_parameter "/kinovo/smtp-port")
SMTP_USER=$(get_parameter "/kinovo/smtp-user")
SMTP_PASS=$(get_parameter "/kinovo/smtp-pass")

# AWS Configuration
AWS_ACCESS_KEY_ID=$(get_parameter "/kinovo/aws-access-key")
AWS_SECRET_ACCESS_KEY=$(get_parameter "/kinovo/aws-secret-key")
AWS_REGION=$(get_parameter "/kinovo/aws-region")
AWS_S3_BUCKET=$(get_parameter "/kinovo/aws-s3-bucket")

# Slack Integration
SLACK_BOT_TOKEN=$(get_parameter "/kinovo/slack-bot-token")
SLACK_SIGNING_SECRET=$(get_parameter "/kinovo/slack-signing-secret")

# Weather API
WEATHER_API_KEY=$(get_parameter "/kinovo/weather-api-key")
EOF

# Set proper permissions
chmod 600 .env 