#!/bin/bash

# Function to create parameter
create_parameter() {
    aws ssm put-parameter \
        --name "$1" \
        --value "$2" \
        --type SecureString \
        --overwrite
}

# Read values from .env file
while IFS='=' read -r key value
do
    # Skip comments and empty lines
    [[ $key =~ ^#.*$ ]] && continue
    [[ -z $key ]] && continue
    
    # Remove any quotes from the value
    value=$(echo "$value" | tr -d '"' | tr -d "'")
    
    # Create parameter in AWS Parameter Store
    create_parameter "/kinovo/${key,,}" "$value"
    
    echo "Created parameter: /kinovo/${key,,}"
done < .env

echo "All parameters have been created in AWS Parameter Store" 