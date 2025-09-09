# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project: Cabra da Peste Discord Bot

This is a Discord bot with inventory management and web dashboard integration, based on the Fazenda project architecture.

## Commands

### Development
- `npm install` - Install dependencies
- `npm start` or `npm run bot` - Start the Discord bot
- `npm run dev` - Start bot with nodemon (auto-restart on changes)
- `npm run web` - Start the web server (port 8086)
- `node deploy-commands.js` - Deploy slash commands to Discord

### Setup Requirements
1. Configure `config.json` with Discord bot token, clientId, and guildId
2. Enable required intents in Discord Developer Portal
3. Deploy commands before first run

## Architecture

### Core Components
- **bot.js** - Main Discord bot entry point with event handlers
- **server.js** - Express web server for dashboard (optional)
- **server/DataManager.js** - Central data management system (handles all JSON file operations)
- **commands/** - Discord slash commands (modular structure)

### Data Storage
All data stored in JSON files under `data/`:
- `rawdata.json` - Raw Discord messages from monitored channels
- `analyzed_data.json` - Processed Discord activities (financial & inventory)
- `inventario.json` - Inventory items and quantities
- `usuarios.json` - User data and roles
- `precos.json` - Pricing information

### Discord Message Processing Pipeline
1. **Raw Collection**: Bot fetches Discord messages → `rawdata.json`
2. **Processing**: FarmMessageParser processes raw messages → `analyzed_data.json`
3. **Dashboard**: Web interface reads from `analyzed_data.json`

### Key Features
- Slash command system using Discord.js v14
- Discord channel monitoring and message parsing
- Real-time inventory and financial activity tracking
- FarmMessageParser extracts usernames from Discord embeds
- Web dashboard with live activity feeds
- Portuguese localization support
- Dual data processing (rawdata.json → analyzed_data.json)

## Important Notes
- Bot requires Discord.js v14+ with Gateway Intents
- DataManager uses Portuguese naming conventions (legacy from Fazenda)
- All Discord bot methods are wrappers around DataManager methods
- Web server and bot can run independently or together