# PM2 Quick Start Guide

PM2 is installed and configured for managing both the Discord bot and web server.

## 🚀 Quick Commands

### Start Everything
```bash
npm start
# or
pm2 start ecosystem.config.js
```

### View Status
```bash
npm run status
# or
pm2 status
```

### View Logs
```bash
# All logs
npm run logs

# Bot logs only
npm run logs:bot

# Web server logs only  
npm run logs:web
```

### Stop Everything
```bash
npm stop
# or
pm2 stop all
```

### Restart Everything
```bash
npm restart
# or
pm2 restart all
```

## 📊 PM2 Dashboard

### Check Status
```bash
pm2 status
```
Shows:
- App name (cabra-bot, cabra-web)
- Status (online/stopped/errored)
- CPU usage
- Memory usage
- Uptime
- Restarts count

### Monitor in Real-time
```bash
pm2 monit
```
Interactive dashboard showing:
- Real-time logs
- CPU/Memory metrics
- Process information

## 🔧 Individual Process Management

### Start specific process
```bash
pm2 start cabra-bot
pm2 start cabra-web
```

### Stop specific process
```bash
pm2 stop cabra-bot
pm2 stop cabra-web
```

### Restart specific process
```bash
pm2 restart cabra-bot
pm2 restart cabra-web
```

### Delete process from PM2
```bash
pm2 delete cabra-bot
pm2 delete cabra-web
```

## 📝 Log Management

### View last 100 lines
```bash
pm2 logs --lines 100
```

### Clear logs
```bash
pm2 flush
```

### Log files location
- Bot errors: `./logs/bot-error.log`
- Bot output: `./logs/bot-out.log`
- Web errors: `./logs/web-error.log`
- Web output: `./logs/web-out.log`

## 🔄 Auto-start on System Boot

### Enable auto-start
```bash
pm2 startup
# Follow the command it gives you
pm2 save
```

### Disable auto-start
```bash
pm2 unstartup
```

## 🛠️ Development Mode

For development with auto-restart on file changes:

### Bot development
```bash
npm run dev:bot
```

### Web development
```bash
npm run dev:web
```

## 📊 Useful PM2 Commands

```bash
# List all processes
pm2 list

# Show detailed info about a process
pm2 info cabra-bot

# Reset restart counter
pm2 reset cabra-bot

# Update PM2
pm2 update

# Kill PM2 daemon
pm2 kill

# Generate startup script
pm2 startup

# Save current process list
pm2 save

# Resurrect saved processes
pm2 resurrect
```

## ⚠️ Troubleshooting

### If bot won't start
1. Check logs: `pm2 logs cabra-bot --lines 50`
2. Verify config.json has correct token
3. Check Guild ID is set

### If web server won't start
1. Check logs: `pm2 logs cabra-web --lines 50`
2. Verify port 4050 is not in use
3. Check data directory exists

### If PM2 daemon issues
```bash
pm2 kill
pm2 start ecosystem.config.js
```

## 🎯 Current Configuration

- **Bot Name**: cabra-bot
- **Web Name**: cabra-web
- **Web Port**: 4050
- **Auto-restart**: Enabled
- **Max Memory**: 1GB per process
- **Logs**: Timestamped in ./logs/

## First Time Setup

1. Make sure config.json has your Guild ID
2. Start everything: `npm start`
3. Check status: `pm2 status`
4. View logs: `pm2 logs`
5. Save for auto-start: `pm2 save`