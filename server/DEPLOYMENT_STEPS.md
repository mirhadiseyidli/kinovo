# Deployment Steps - Rate Limiting & Load Balancing

## What We've Built
- **Express rate limiting** via `middleware/rateLimiter.js`
- **Nginx rate limiting** configured in `nginx.conf`
- **Load balancing setup** with upstream servers
- **Deployment scripts** for managing multiple Docker instances

## Files Created/Modified
- `server/middleware/rateLimiter.js` - Express rate limiting middleware
- `server/server.js` - Updated with rate limiters
- `server/nginx.conf` - Complete nginx config with rate limiting & load balancing
- `server/deploy/deploy-loadbalanced.sh` - Deploy multiple instances
- `server/deploy/manage-instances.sh` - Manage running instances

---

## Step-by-Step Deployment

### Step 1: Push Changes to GitHub
```bash
# On your local machine
cd /Users/mirhadi.seyidli/Work/Kinovo

# Add and commit all changes
git add .
git commit -m "Add rate limiting and load balancing support"
git push origin main
```

### Step 2: SSH to Your EC2 Instance
```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
# or use your SSH alias
```

### Step 3: Pull Latest Code
```bash
cd /home/ubuntu/kinovo  # or your project directory
git pull origin main

# Verify files exist
ls -la server/middleware/rateLimiter.js
ls -la server/deploy/*.sh
ls -la server/nginx.conf
```

### Step 4: Install Express Rate Limit Package
```bash
cd server
npm install express-rate-limit

# Verify it's installed
npm list express-rate-limit
```

### Step 5: Make Scripts Executable
```bash
cd deploy
chmod +x deploy-loadbalanced.sh
chmod +x manage-instances.sh
```

### Step 6: Deploy the Application

#### Option A: Deploy Multiple Instances (Load Balanced)
```bash
# This will deploy 3 instances by default
./deploy-loadbalanced.sh

# The script will:
# 1. Stop and remove any existing containers
# 2. Build the Docker image
# 3. Start 3 instances on ports 5002, 5003, 5004
# 4. Run health checks on all instances
# 5. Show you the nginx upstream configuration to use
```

#### Option B: Deploy Single Instance (If Resources Limited)
```bash
# Use the original deploy script
./deploy.sh
```

### Step 7: Update Nginx Configuration

```bash
# Backup current nginx config
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup

# Copy our new nginx config
sudo cp /home/ubuntu/kinovo/server/nginx.conf /etc/nginx/sites-available/default

# OR manually edit to add our changes
sudo nano /etc/nginx/sites-available/default
```

**Important**: If you deployed multiple instances (Step 6A), uncomment the multi-server upstream block in nginx:
```nginx
# Change from:
upstream kinovo_backend {
    server localhost:5002;
}

# To:
upstream kinovo_backend {
    least_conn;
    server localhost:5002 weight=1 max_fails=3 fail_timeout=30s;
    server localhost:5003 weight=1 max_fails=3 fail_timeout=30s;
    server localhost:5004 weight=1 max_fails=3 fail_timeout=30s;
    keepalive 32;
}
```

### Step 8: Test and Reload Nginx
```bash
# Test configuration
sudo nginx -t

# If test passes, reload nginx
sudo nginx -s reload

# Check nginx status
sudo systemctl status nginx
```

### Step 9: Verify Deployment

Check that everything is running:
```bash
# Check instance status
cd /home/ubuntu/kinovo/server/deploy
./manage-instances.sh status

# Output should show:
# ✓ Instance 1 - Port: 5002 - Status: Running - CPU: 2.5% | MEM: 250MB/1GB
# ✓ Instance 2 - Port: 5003 - Status: Running - CPU: 1.8% | MEM: 245MB/1GB
# ✓ Instance 3 - Port: 5004 - Status: Running - CPU: 2.1% | MEM: 248MB/1GB
```

Run health checks:
```bash
./manage-instances.sh health

# Should show:
# ✓ Instance 1 (port 5002): Healthy
# ✓ Instance 2 (port 5003): Healthy
# ✓ Instance 3 (port 5004): Healthy
```

### Step 10: Test Rate Limiting

From your local machine or another server:
```bash
# Test general API rate limit (10 req/sec, burst 20)
for i in {1..25}; do 
  echo -n "Request $i: "
  curl -s -o /dev/null -w "%{http_code}\n" https://kinovo.app/api/health
done
# Should see 200s then 429s after burst limit

# Test auth rate limit (2 req/sec, burst 5)
for i in {1..10}; do
  echo -n "Auth $i: "
  curl -s -o /dev/null -w "%{http_code}\n" https://kinovo.app/api/auth/login
done
# Should see 429s quickly after 5-6 requests
```

---

## Managing Your Instances

### Check Status
```bash
./manage-instances.sh status
```

### View Logs
```bash
# All instances (last 20 lines each)
./manage-instances.sh logs all

# Specific instance (live tail)
./manage-instances.sh logs 2
```

### Scale Up/Down
```bash
# Scale to 2 instances (if memory constrained)
./manage-instances.sh scale 2

# Scale to 5 instances (if you have resources)
./manage-instances.sh scale 5
```

After scaling, update nginx upstream block and reload:
```bash
sudo nano /etc/nginx/sites-available/default
# Add/remove server lines as needed
sudo nginx -s reload
```

### Restart Instances
```bash
# Restart all instances
./manage-instances.sh restart all

# Restart specific instance (zero downtime)
./manage-instances.sh restart 2
```

---

## Monitoring

### Watch Resource Usage
```bash
# Real-time docker stats
docker stats

# Memory usage
free -m

# Check rate limit blocks in nginx
sudo tail -f /var/log/nginx/error.log | grep "limiting"
```

### Check Nginx Metrics
```bash
# Count rate limited IPs
sudo grep "limiting requests" /var/log/nginx/error.log | \
  awk -F'client: ' '{print $2}' | \
  awk '{print $1}' | \
  sort | uniq -c | sort -rn | head -10
```

---

## Rollback If Needed

### Quick Rollback to Single Instance
```bash
# Stop all load balanced instances
cd /home/ubuntu/kinovo/server/deploy
for i in {1..5}; do 
  docker stop kinovo-server-$i 2>/dev/null
  docker rm kinovo-server-$i 2>/dev/null
done

# Deploy single instance
./deploy.sh

# Restore old nginx config
sudo cp /etc/nginx/sites-available/default.backup /etc/nginx/sites-available/default
sudo nginx -s reload
```

---

## Troubleshooting

### If 502 Bad Gateway:
```bash
# Check containers are running
docker ps

# Check specific instance logs
docker logs kinovo-server-1

# Test backend directly
curl http://localhost:5002/api/health
```

### If Rate Limiting Not Working:
```bash
# Check nginx config syntax
sudo nginx -t

# Check if zones are defined
sudo grep -n "limit_req_zone" /etc/nginx/sites-available/default

# Verify Express middleware is loaded
docker logs kinovo-server-1 | grep -i "rate"
```

### If High Memory Usage:
```bash
# Check memory
free -m

# Scale down
./manage-instances.sh scale 2

# Check container memory usage
docker stats --no-stream
```

---

## Expected Resource Usage

For **t2.micro** (1GB RAM):
- System + Nginx: ~400MB
- Per container: ~200-250MB
- **Recommended**: 2 containers max

For **t2.small** (2GB RAM):
- Can comfortably run 4-5 containers

---

## Success Checklist

- [ ] All instances show "Running" status
- [ ] Health checks pass for all instances
- [ ] Can access https://kinovo.app/api/health
- [ ] Rate limiting returns 429 when exceeded
- [ ] Nginx logs show requests distributed across instances
- [ ] Memory usage is stable (< 80% used)
- [ ] No errors in docker logs

---

## Next Steps

1. **Monitor for 24 hours** to ensure stability
2. **Adjust rate limits** based on actual usage:
   - Edit `server/middleware/rateLimiter.js` for Express
   - Edit nginx config for Nginx limits
3. **Set up alerts** for high 429 response rates
4. **Document any IP whitelisting** needs for partners/services