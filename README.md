# Cabra da Peste Discord Bot

A Discord bot with inventory management, data tracking, and web dashboard integration.

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Create Discord Application & Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name
3. Go to the "Bot" section
4. Click "Add Bot"
5. Copy the bot token (you'll need this)
6. Under "Privileged Gateway Intents", enable:
   - Server Members Intent
   - Message Content Intent
   - Presence Intent

### 3. Configure the Bot

Edit `config.json` and add your bot details:

```json
{
  "token": "YOUR_BOT_TOKEN_HERE",
  "clientId": "YOUR_CLIENT_ID_HERE",
  "guildId": "YOUR_GUILD_ID_HERE"
}
```

- **token**: Your bot token from step 2
- **clientId**: Found in Discord Developer Portal > General Information > Application ID
- **guildId**: Right-click your Discord server > Copy Server ID (Developer Mode must be enabled)

### 4. Invite Bot to Server

1. In Discord Developer Portal, go to OAuth2 > URL Generator
2. Select scopes: `bot` and `applications.commands`
3. Select bot permissions:
   - Send Messages
   - Embed Links
   - Read Message History
   - Use Slash Commands
   - Manage Messages
4. Copy the generated URL and open it in your browser
5. Select your server and authorize

### 5. Deploy Commands

```bash
node deploy-commands.js
```

### 6. Start the Bot

```bash
npm start
```

Or for development with auto-restart:
```bash
npm run dev
```

## Available Commands

- `/ping` - Check bot latency
- `/inventory add <item> <quantity>` - Add items to inventory
- `/inventory remove <item> <quantity>` - Remove items from inventory
- `/inventory list` - List all inventory items

## Discord Channel Monitoring

The bot automatically monitors configured Discord channels for farm activities:
- **Financial activities**: CAIXA ORGANIZAÇÃO (deposits/withdrawals)
- **Inventory activities**: BAÚ ORGANIZAÇÃO (item add/remove)
- **Real username extraction**: Extracts actual usernames from Discord embeds
- **Dashboard integration**: Activities appear on web dashboard in real-time

## Running Both Bot and Web Server

To run the Discord bot:
```bash
npm run bot
```

To run the web server (port 4050):
```bash
npm run web
```

To run both simultaneously, you can use two terminal windows or use a process manager like PM2.

## File Structure

```
Cabra da Peste/
├── bot.js              # Main Discord bot file
├── server.js           # Web server
├── config.json         # Bot configuration
├── deploy-commands.js  # Command deployment script
├── commands/           # Bot commands
│   ├── ping.js
│   └── inventory.js
├── server/            # Server modules
│   ├── DataManager.js # Data management system
│   ├── routes/        # API routes
│   └── utils/         # Utilities
├── data/              # Data storage (JSON files)
│   ├── rawdata.json       # Raw Discord messages
│   ├── analyzed_data.json # Processed activities
│   ├── inventario.json    # Inventory data
│   └── usuarios.json      # User data
└── client/            # Web interface (if needed)
```

## Troubleshooting

### Bot won't start
- Check that your token is correct in `config.json`
- Ensure all required intents are enabled in Discord Developer Portal

### Commands not showing
- Run `node deploy-commands.js` again
- Wait a few minutes for Discord to update
- Make sure clientId and guildId are correct

### Permission errors
- Ensure the bot has proper permissions in your Discord server
- Check that the bot role is high enough in the role hierarchy

## Development Notes

### Data Processing Pipeline

The bot uses a two-stage data processing system:

1. **Raw Data Collection** (`rawdata.json`):
   - Bot fetches up to 100 recent Discord messages from monitored channels
   - Stores raw message data including embeds, timestamps, and authors
   - Automatically deduplicates messages

2. **Activity Processing** (`analyzed_data.json`):
   - FarmMessageParser processes raw messages 
   - Extracts real usernames from Discord embed fields
   - Categorizes activities: financial (CAIXA) vs inventory (BAÚ)
   - Creates structured activity records for dashboard

### Key Features

- **Real Username Extraction**: Parses "Autor: Username | FIXO: 12345" format
- **Activity Categorization**: Financial vs inventory activities 
- **Dashboard Integration**: Web interface displays processed activities
- **Portuguese Localization**: All UI and data labels in Portuguese
- **Duplicate Prevention**: Smart deduplication at both raw and processed levels

All data is stored in JSON files in the `data/` directory.