#!/bin/bash

# Function to get parameter from Parameter Store with error handling
get_parameter() {
    local param_name=$1
    local value
    
    value=$(aws ssm get-parameter \
        --name "$param_name" \
        --with-decryption \
        --query "Parameter.Value" \
        --output text \
        --region us-west-2 2>&1)
    
    if [ $? -ne 0 ]; then
        echo "Error fetching parameter $param_name: $value" >&2
        return 1
    fi
    
    echo "$value"
}

# Start with a clean .env file
> .env

# Write values line by line with error checking
echo "# Server Configuration" >> .env
echo "NODE_ENV=production" >> .env
BACKEND_PORT=$(get_parameter "/kinovo/BACKEND_PORT") && echo "BACKEND_PORT=$BACKEND_PORT" >> .env

echo "" >> .env
echo "# MongoDB Configuration" >> .env
MONGODB_URI=$(get_parameter "/kinovo/MONGODB_URI") && echo "MONGODB_URI=$MONGODB_URI" >> .env

echo "" >> .env
echo "# JWT Configuration" >> .env
JWT_ACCESS_SECRET=$(get_parameter "/kinovo/JWT_ACCESS_SECRET") && echo "JWT_ACCESS_SECRET=$JWT_ACCESS_SECRET" >> .env
JWT_REFRESH_SECRET=$(get_parameter "/kinovo/JWT_REFRESH_SECRET") && echo "JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET" >> .env

echo "" >> .env
echo "# Google" >> .env
GOOGLE_CLIENT_ID=$(get_parameter "/kinovo/GOOGLE_CLIENT_ID") && echo "GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID" >> .env
GOOGLE_MAPS_API_KEY=$(get_parameter "/kinovo/GOOGLE_MAPS_API_KEY") && echo "GOOGLE_MAPS_API_KEY=$GOOGLE_MAPS_API_KEY" >> .env

echo "" >> .env
echo "# Apple" >> .env
APPLE_TEAM_ID=$(get_parameter "/kinovo/APPLE_TEAM_ID") && echo "APPLE_TEAM_ID=$APPLE_TEAM_ID" >> .env
APPLE_WEATHER_KEY_ID=$(get_parameter "/kinovo/APPLE_WEATHER_KEY_ID") && echo "APPLE_WEATHER_KEY_ID=$APPLE_WEATHER_KEY_ID" >> .env
APPLE_BUNDLE_ID=$(get_parameter "/kinovo/APPLE_BUNDLE_ID") && echo "APPLE_BUNDLE_ID=$APPLE_BUNDLE_ID" >> .env
APPLE_WEATHER_PRIVATE_KEY=$(get_parameter "/kinovo/APPLE_WEATHER_PRIVATE_KEY") && echo "APPLE_WEATHER_PRIVATE_KEY=$APPLE_WEATHER_PRIVATE_KEY" >> .env
APPLE_CLIENT_ID=$(get_parameter "/kinovo/APPLE_CLIENT_ID") && echo "APPLE_CLIENT_ID=$APPLE_CLIENT_ID" >> .env

echo "" >> .env
echo "# APNs Push Notifications" >> .env
APNS_KEY_ID=$(get_parameter "/kinovo/APNS_KEY_ID") && echo "APNS_KEY_ID=$APNS_KEY_ID" >> .env
APNS_PRIVATE_KEY=$(get_parameter "/kinovo/APNS_PRIVATE_KEY") && echo "APNS_PRIVATE_KEY=$APNS_PRIVATE_KEY" >> .env

echo "" >> .env
echo "# OpenAI" >> .env
OPENAI_API_KEY=$(get_parameter "/kinovo/OPENAI_API_KEY") && echo "OPENAI_API_KEY=$OPENAI_API_KEY" >> .env

# Firebase environment variables removed - using APNs directly

echo "" >> .env
echo "# SMTP / Email" >> .env
SMTP_HOST=$(get_parameter "/kinovo/SMTP_HOST") && echo "SMTP_HOST=$SMTP_HOST" >> .env
SMTP_PORT=$(get_parameter "/kinovo/SMTP_PORT") && echo "SMTP_PORT=$SMTP_PORT" >> .env
SMTP_SECURE=$(get_parameter "/kinovo/SMTP_SECURE") && echo "SMTP_SECURE=$SMTP_SECURE" >> .env
SMTP_USER=$(get_parameter "/kinovo/SMTP_USER") && echo "SMTP_USER=$SMTP_USER" >> .env
SMTP_FROM=$(get_parameter "/kinovo/SMTP_FROM") && echo "SMTP_FROM=$SMTP_FROM" >> .env

echo "" >> .env
echo "# Gmail OAuth" >> .env
GMAIL_CLIENT_ID=$(get_parameter "/kinovo/GMAIL_CLIENT_ID") && echo "GMAIL_CLIENT_ID=$GMAIL_CLIENT_ID" >> .env
GMAIL_CLIENT_SECRET=$(get_parameter "/kinovo/GMAIL_CLIENT_SECRET") && echo "GMAIL_CLIENT_SECRET=$GMAIL_CLIENT_SECRET" >> .env
GMAIL_REDIRECT_URI=$(get_parameter "/kinovo/GMAIL_REDIRECT_URI") && echo "GMAIL_REDIRECT_URI=$GMAIL_REDIRECT_URI" >> .env
GMAIL_REFRESH_TOKEN=$(get_parameter "/kinovo/GMAIL_REFRESH_TOKEN") && echo "GMAIL_REFRESH_TOKEN=$GMAIL_REFRESH_TOKEN" >> .env

# Lock down permissions
chmod 600 .env

echo "Environment variables have been fetched and written to .env"