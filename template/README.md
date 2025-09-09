# Discord Bot Template

A powerful, production-ready Discord bot template with slash commands, web dashboard, and data management system.

## Features

- ✅ **Discord.js v14** with slash command support
- 📊 **Web Dashboard** with real-time updates (optional)
- 💾 **JSON-based Data Storage** with caching
- 🔧 **PM2 Process Management** for production
- 📝 **Comprehensive Logging** with Winston
- 🎯 **Event-driven Architecture**
- 🚀 **Quick Setup Script** for easy configuration
- 🔥 **Hot Reload** in development with nodemon

## Quick Start

### Prerequisites
- Node.js v16.9.0 or higher
- Discord Bot Token ([Get one here](https://discord.com/developers/applications))

### Installation

1. **Clone or download this template**
```bash
git clone <template-url> my-discord-bot
cd my-discord-bot
```

2. **Run the setup script**
```bash
npm run setup
```

The setup script will:
- Ask for your Discord bot credentials
- Configure features (web dashboard, logging, etc.)
- Create all necessary configuration files
- Set up the project structure

3. **Install dependencies**
```bash
npm install
```

4. **Deploy slash commands**
```bash
npm run deploy
```

5. **Start the bot**
```bash
npm start
```

## Project Structure

```
discord-bot-template/
├── bot.js                 # Main bot file
├── server.js             # Web dashboard server
├── deploy-commands.js    # Command deployment script
├── setup.js             # Interactive setup script
├── ecosystem.config.js   # PM2 configuration
├── config.json          # Bot configuration (created by setup)
├── .env                 # Environment variables (created by setup)
├── commands/            # Slash commands directory
│   ├── ping.js         # Example: Ping command
│   ├── help.js         # Example: Help command
│   └── info.js         # Example: Info command
├── server/             # Server modules
│   └── DataManager.js  # Data management system
├── data/               # Data storage (JSON files)
└── public/             # Web dashboard files
```

## Available Scripts

- `npm start` - Start bot with PM2
- `npm run dev` - Start bot with nodemon (development)
- `npm run web` - Start web server only
- `npm run deploy` - Deploy slash commands to Discord
- `npm run setup` - Run interactive setup
- `npm run logs` - View PM2 logs
- `npm stop` - Stop all PM2 processes

## Configuration

### config.json
Created automatically by the setup script. Contains:
- Discord bot token and IDs
- Feature flags
- Web server settings
- Database configuration

### Environment Variables (.env)
Alternative to config.json for sensitive data:
```env
DISCORD_TOKEN=your_token_here
CLIENT_ID=your_client_id
GUILD_ID=your_guild_id
WEB_SERVER_PORT=4050
```

## Creating Commands

Create new slash commands in the `commands/` directory:

```javascript
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mycommand')
        .setDescription('My custom command'),
    async execute(interaction, dataManager) {
        // Command logic here
        await interaction.reply('Command executed!');
    },
};
```

## Data Management

The built-in DataManager provides easy data persistence:

```javascript
// In your command or event handler
const dataManager = require('./server/DataManager');

// Save data
dataManager.saveData('users', { users: [...] });

// Load data
const users = dataManager.loadData('users');

// Add entry
dataManager.addEntry('logs', { event: 'user_joined', ... });

// Query data
const results = dataManager.query('users', { role: 'admin' });
```

## Web Dashboard

If enabled during setup, access the dashboard at `http://localhost:4050`

The dashboard provides:
- Bot status and statistics
- Real-time activity monitoring
- Data management interface
- Configuration options

## Production Deployment

### Using PM2

```bash
# Start in production
npm start

# View logs
npm run logs

# Restart
npm run restart

# Stop
npm stop
```

### Auto-start on system boot

```bash
npm run pm2:startup
npm run pm2:save
```

## Customization

### Adding Features

1. **New Commands**: Add `.js` files to `commands/`
2. **Event Handlers**: Modify `bot.js` `setupEventHandlers()`
3. **API Routes**: Add routes in `server.js`
4. **Data Types**: Extend `DataManager.js`

### Theming

Edit `public/index.html` for dashboard styling and layout.

## Common Issues

### Commands not showing up
- Run `npm run deploy` after adding new commands
- For global commands, wait up to 1 hour for Discord to update
- Check bot has necessary permissions in your server

### Bot not starting
- Verify token in config.json is correct
- Check Node.js version is 16.9.0 or higher
- Ensure all dependencies are installed

### Web dashboard not working
- Check if port is already in use
- Verify `webDashboard` is enabled in config
- Check firewall settings for the port

## Support

For issues or questions:
1. Check the documentation above
2. Review example commands in `commands/`
3. Check Discord.js documentation: https://discord.js.org

## License

MIT - Feel free to use this template for any project!

## Contributing

Contributions are welcome! Feel free to submit issues and enhancement requests.

---

Made with ❤️ for the Discord bot development community