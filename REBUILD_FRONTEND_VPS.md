# Rebuild Frontend on VPS - Fix 404 Errors

## Problem
404 errors for Next.js static assets (`/_next/static/chunks/*.js`, CSS files, fonts) indicate the frontend build is outdated or missing.

## Solution: Rebuild Frontend

### Step 1: SSH into VPS
```bash
ssh root@srv1188766.hostinger.com
```

### Step 2: Navigate to Frontend and Clean Build
```bash
cd /var/www/ventech/frontend

# Remove old build
rm -rf .next

# Remove node_modules (optional, but recommended if having issues)
# rm -rf node_modules
```

### Step 3: Install Dependencies (if node_modules was removed)
```bash
npm install
```

### Step 4: Build Frontend
```bash
npm run build
```

### Step 5: Restart PM2
```bash
pm2 restart ventech-frontend
```

### Step 6: Check PM2 Status
```bash
pm2 status
pm2 logs ventech-frontend --lines 30
```

## Quick One-Liner
```bash
cd /var/www/ventech/frontend && rm -rf .next && npm run build && pm2 restart ventech-frontend
```

## Verify Build
After rebuilding, check that the `.next` folder exists:
```bash
ls -la /var/www/ventech/frontend/.next
```

## If Issues Persist

### Check Nginx Configuration
Make sure Nginx is serving the frontend correctly:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Check File Permissions
```bash
chown -R www-data:www-data /var/www/ventech/frontend
chmod -R 755 /var/www/ventech/frontend
```

### Check PM2 Configuration
```bash
pm2 describe ventech-frontend
```

## Common Causes
1. **Build folder missing**: `.next` folder was deleted or not generated
2. **Outdated build**: Code was updated but build wasn't regenerated
3. **Cache issues**: Browser or CDN cache showing old assets
4. **Nginx misconfiguration**: Not serving static files correctly

