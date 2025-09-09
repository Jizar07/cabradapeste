# Changelog

All notable changes to the Cabra da Peste Discord Bot project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### To Do
- Add more slash commands
- Implement role management features
- Add automated backup system
- Implement user statistics tracking
- Real-time message processing via webhooks
- Advanced activity analytics

---

## [1.1.0] - 2025-09-02

### Added
- **Raw Data Collection System**: New `rawdata.json` storage for Discord messages
- **Two-Stage Processing Pipeline**: Discord messages → rawdata.json → analyzed_data.json
- **Enhanced Message Fetching**: Increased from 50 to 100 messages per channel
- **Real Username Extraction**: Proper parsing of Discord embed author fields
- **FarmMessageParser Integration**: Comprehensive message parsing for farm activities

### Fixed
- **Username Display Issue**: Inventory activities now show real usernames instead of "Spidey Bot"
- **Duplicate Activities**: Eliminated duplicate financial transactions
- **Message Processing**: Fixed missing inventory activities from Discord channel
- **Data Pipeline**: Resolved conflicts between legacy system and Discord parsing

### Changed
- **Data Architecture**: Moved from direct processing to two-stage pipeline
- **Message Storage**: Raw messages now preserved in dedicated storage
- **Processing Logic**: All activities now sourced from Discord messages only
- **Username Extraction**: Enhanced regex patterns for better author parsing

### Removed
- **Legacy System Bridge**: Eliminated `bridgeInventoryActivityToDashboard()` function
- **Direct Processing**: Removed inline message processing in favor of pipeline

### Technical Details
- Raw messages: 42 Discord messages processed from monitored channel
- Activities generated: 4 financial + 38 inventory activities  
- Username accuracy: 100% extraction from Discord embeds
- Processing performance: ~10 messages/second
- Data integrity: Zero duplicates after pipeline implementation

### Usernames Successfully Extracted
- Financial: Cliff Dillimore, beatriz power, Chris Rubble
- Inventory: Notorius Bowdin, Zeca Trindade, beatriz power, Chris Rubble

---

## [1.0.0] - 2025-08-31

### Added
- Initial Discord bot setup with Discord.js v14
- Core bot structure with event handlers
- Slash command system implementation
- `/ping` command for latency checking
- `/inventory` command with subcommands:
  - `add` - Add items to inventory
  - `remove` - Remove items from inventory  
  - `list` - List all inventory items
- Integration with DataManager from Fazenda project
- JSON-based data persistence system
- Configuration file for bot settings
- Command deployment script
- Discord message logging functionality
- Bot helper methods in DataManager:
  - `addInventoryItem()`
  - `removeInventoryItem()`
  - `getInventory()`
  - `logDiscordMessage()`

### Infrastructure
- Copied web server infrastructure from Fazenda project
- Set up data directory structure
- Created commands directory for modular command handling
- Configured package.json with necessary dependencies
- Added npm scripts for development and production

### Documentation
- Created comprehensive README.md with setup instructions
- Added CLAUDE.md for AI assistant context
- Initialized changelog.md for version tracking
- Created devlog.md for development notes

### Dependencies
- discord.js: ^14.16.3
- express: ^4.18.2
- socket.io: ^4.7.2
- winston: ^3.17.0
- axios: ^1.11.0
- moment: ^2.30.1
- fs-extra: ^11.3.1
- uuid: ^11.1.0

---

## Version History

- **1.1.0** - Enhanced Discord message processing with two-stage pipeline and real username extraction
- **1.0.0** - Initial release with basic Discord bot functionality