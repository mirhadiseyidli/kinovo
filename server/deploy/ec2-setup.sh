#!/bin/bash

# Update system
sudo yum update -y

# Install Docker
sudo yum install -y docker
sudo service docker start
sudo usermod -a -G docker ec2-user

# Install Nginx
sudo amazon-linux-extras install nginx1 -y
sudo service nginx start
sudo systemctl enable nginx

# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Install certbot for SSL
sudo yum install -y certbot python3-certbot-nginx

# Create app directory
mkdir -p /home/ec2-user/kinovo-server
cd /home/ec2-user/kinovo-server

# Create necessary directories
mkdir -p logs
mkdir -p ssl

# Set proper permissions
sudo chown -R ec2-user:ec2-user /home/ec2-user/kinovo-server 