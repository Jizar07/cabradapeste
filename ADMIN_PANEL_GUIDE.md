# Admin Panel Guide - Cabra da Peste Bot

## 🔧 Accessing the Admin Panel

1. Start your web server: `npm run web`
2. Open http://localhost:4050 in your browser
3. Navigate to the **Admin** tab in the top navigation

## 📋 Admin Panel Features

### 1. Bot Configuration
- **Token**: Your Discord bot token from Developer Portal
- **Client ID**: Application ID from Discord
- **Guild ID**: Your Discord server ID
- **Prefix**: Command prefix (default: `!`)
- **Server Port**: Web server port (default: 4050)

### 2. Bot Features Toggle
- ✅ **Welcome Messages**: Auto-greet new members
- ✅ **System Logs**: Enable detailed logging
- ✅ **Inventory Tracking**: Monitor farm inventory changes
- ✅ **Channel Monitoring**: Watch specific channels for farm data
- ❌ **Auto Moderation**: Automatic message filtering

### 3. Discord Channel Configuration
- **Logs Channel**: Where bot sends system logs
- **Welcome Channel**: Where new member messages appear
- **Commands Channel**: Preferred channel for bot commands
- **Inventory Channel**: Main channel for inventory notifications

### 4. Role Configuration
- **Admin Role**: Full bot permissions
- **Moderator Role**: Limited admin permissions  
- **Member Role**: Basic user permissions

### 5. Channel Monitoring System

This is the core feature for farm management:

#### Adding Channels to Monitor
1. Get the Channel ID from Discord:
   - Right-click the channel → Copy ID
   - Enable Developer Mode in Discord if needed
2. Enter the Channel ID and a friendly name
3. Click **Add Channel**

#### Monitored Channel Types
- **Inventory Logs**: Tracks item additions/removals
- **User Activity**: Monitors worker activities
- **Payment Logs**: Records salary/payment information
- **General Farm**: Any farm-related announcements

#### What Gets Tracked
The bot automatically detects and processes:

- 📦 **Inventory Messages**: 
  - "BAÚ ORGANIZAÇÃO - REMOVER ITEM"
  - "BAÚ ORGANIZAÇÃO - INSERIR ITEM"
  - Automatically updates web dashboard inventory

- 👥 **User Activities**:
  - Worker hiring/firing
  - Role changes
  - Activity logs

- 💰 **Payment Messages**:
  - Salary payments
  - Bonus distributions
  - Financial transactions

## 🔄 How Channel Monitoring Works

1. **Bot Listens**: Monitors all configured channels in real-time
2. **Message Analysis**: Uses keywords and embed patterns to identify farm activities
3. **Data Extraction**: Pulls relevant information (items, quantities, users, amounts)
4. **Database Update**: Automatically updates inventory, users, and payments
5. **Dashboard Sync**: Changes appear instantly in the web dashboard

## 💾 Configuration Persistence

- Bot settings saved to: `config.json`
- Admin settings saved to: `admin-config.json`
- All changes are automatically saved
- Settings persist between bot restarts

## 🚀 Setup Workflow

1. **Configure Bot**: Add token, client ID, guild ID
2. **Set Channels**: Add important Discord channel IDs
3. **Add Monitoring**: Add channels where farm activities happen
4. **Save Settings**: Click "Save Configuration"
5. **Restart Bot**: Run `pm2 restart cabra-bot` to apply changes

## 🔍 Monitoring Active Channels

The admin panel shows:
- ✅ **Active channels**: Currently being monitored
- 📊 **Channel status**: Enabled/disabled toggle
- 📅 **Added date**: When channel was added to monitoring
- 🗑️ **Remove option**: Delete channel from monitoring

## 🛠️ Troubleshooting

### Bot Not Responding
- Check token is correct
- Verify bot has permissions in Discord server
- Ensure guild ID matches your Discord server

### Channels Not Being Monitored  
- Verify channel IDs are correct
- Check channel is enabled in monitoring list
- Ensure bot has read permissions in that channel

### Data Not Updating
- Check if channel monitoring is enabled
- Verify message format matches expected patterns
- Check bot logs for processing errors

## 🔐 Security Notes

- Keep your bot token private and secure
- Don't share admin-config.json file
- Only give admin panel access to trusted users
- Regularly review monitored channels list

## 📈 Next Steps

Once configured, your farm management system will automatically:
- Track all inventory changes from Discord
- Update worker status and activities  
- Monitor payment distributions
- Provide real-time dashboard data
- Generate analytics and reports

The admin panel gives you complete control over what gets monitored and how the bot behaves in your Discord server.