const { Client, GatewayIntentBits, Collection, Events, ActivityType } = require('discord.js');
const fs = require('fs');
const path = require('path');
const DataManager = require('./server/DataManager');

class CabraDaPesteBot {
    constructor() {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildPresences,
                GatewayIntentBits.GuildVoiceStates
            ]
        });

        this.dataManager = new DataManager('./data');
        this.commands = new Collection();
        this.loadCommands();
        this.setupEventHandlers();
    }

    loadCommands() {
        const commandsPath = path.join(__dirname, 'commands');
        
        if (!fs.existsSync(commandsPath)) {
            fs.mkdirSync(commandsPath, { recursive: true });
            console.log('Commands directory created');
        }

        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            const command = require(filePath);
            
            if ('data' in command && 'execute' in command) {
                this.commands.set(command.data.name, command);
                console.log(`✅ Loaded command: ${command.data.name}`);
            } else {
                console.log(`⚠️ Command at ${filePath} is missing required "data" or "execute" property.`);
            }
        }
    }

    setupEventHandlers() {
        this.client.once(Events.ClientReady, (readyClient) => {
            console.log(`✅ Bot logged in as ${readyClient.user.tag}`);
            console.log(`📊 Connected to ${readyClient.guilds.cache.size} servers`);
            
            readyClient.user.setActivity('Cabra da Peste', { type: ActivityType.Playing });
            
            // Load monitoring channels from admin config
            this.loadMonitoringChannels();
            this.loadAdminChannelConfig();
        });

        this.client.on(Events.InteractionCreate, async (interaction) => {
            if (!interaction.isChatInputCommand()) return;

            const command = this.commands.get(interaction.commandName);

            if (!command) {
                console.error(`No command matching ${interaction.commandName} was found.`);
                return;
            }

            try {
                await command.execute(interaction, this.dataManager);
            } catch (error) {
                console.error(`Error executing command ${interaction.commandName}:`, error);
                
                const errorReply = {
                    content: 'There was an error while executing this command!',
                    ephemeral: true
                };

                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(errorReply);
                } else {
                    await interaction.reply(errorReply);
                }
            }
        });

        this.client.on(Events.MessageCreate, async (message) => {
            // Only ignore messages from this bot itself, not other bots like Spidey Bot
            if (message.author.id === this.client.user?.id) return;
            
            // Process message for channel monitoring and farm management
            const messageData = {
                id: message.id,
                author: message.author.username,
                content: message.content,
                timestamp: message.createdAt,
                channelId: message.channel.id,
                guildId: message.guild?.id,
                embeds: message.embeds ? message.embeds.map(embed => ({
                    title: embed.title,
                    description: embed.description,
                    fields: embed.fields?.map(field => ({
                        name: field.name,
                        value: field.value,
                        inline: field.inline
                    }))
                })) : []
            };

            // Only process messages from monitored channels
            if (this.dataManager.isChannelMonitored && this.dataManager.isChannelMonitored(message.channel.id)) {
                console.log(`📺 Processing message from monitored channel: ${message.channel.id}`);
                
                // Process through DataManager channel monitoring system
                if (this.dataManager.processChannelMessage) {
                    await this.dataManager.processChannelMessage(messageData);
                } else {
                    // Fallback to basic logging
                    await this.dataManager.logDiscordMessage(messageData);
                }
            } else {
                // Channel not monitored - skip processing
                console.log(`⏭️ Skipping message from unmonitored channel: ${message.channel.id}`);
            }
        });

        this.client.on(Events.GuildMemberAdd, (member) => {
            console.log(`👋 New member joined: ${member.user.tag}`);
            // Add welcome message logic here
        });

        this.client.on(Events.GuildMemberRemove, (member) => {
            console.log(`👋 Member left: ${member.user.tag}`);
        });

        this.client.on(Events.Error, (error) => {
            console.error('Discord client error:', error);
        });
    }

    loadMonitoringChannels() {
        try {
            const fs = require('fs');
            const path = require('path');
            const adminConfigPath = path.join(__dirname, 'admin-config.json');
            
            if (fs.existsSync(adminConfigPath)) {
                const adminConfig = JSON.parse(fs.readFileSync(adminConfigPath, 'utf8'));
                const channels = adminConfig.channels?.monitoring || [];
                
                if (this.dataManager.updateMonitoringChannels) {
                    this.dataManager.updateMonitoringChannels(channels);
                    console.log(`📺 Loaded ${channels.length} monitoring channels`);
                    
                    channels.forEach(channel => {
                        if (channel.enabled) {
                            console.log(`   🟢 ${channel.name} (${channel.id})`);
                        } else {
                            console.log(`   🔴 ${channel.name} (${channel.id}) - Disabled`);
                        }
                    });
                } else {
                    console.log('⚠️ DataManager monitoring not available');
                }
            } else {
                console.log('📺 No admin config found, monitoring channels not loaded');
            }
        } catch (error) {
            console.error('❌ Error loading monitoring channels:', error.message);
        }
    }

    loadAdminChannelConfig() {
        try {
            const fs = require('fs');
            const path = require('path');
            const simpleAdminConfigPath = path.join(__dirname, 'simple-admin-config.json');
            
            if (fs.existsSync(simpleAdminConfigPath)) {
                const adminConfig = JSON.parse(fs.readFileSync(simpleAdminConfigPath, 'utf8'));
                const watchedChannels = adminConfig.watchedChannels || [];
                
                if (watchedChannels.length > 0) {
                    const channelIds = watchedChannels.map(ch => ch.id);
                    if (this.dataManager.setWatchedChannels) {
                        this.dataManager.setWatchedChannels(channelIds);
                        console.log(`🎯 Loaded ${channelIds.length} watched channels from admin panel:`);
                        watchedChannels.forEach(channel => {
                            console.log(`   📺 ${channel.name || 'Channel'} (${channel.id})`);
                        });
                        
                        // Fetch recent messages from watched channels
                        setTimeout(() => this.fetchRecentMessages(channelIds), 2000);
                    }
                } else {
                    console.log('📺 No channels configured in admin panel yet');
                }
            } else {
                console.log('📺 No admin panel config found, use admin panel to add channels');
            }
        } catch (error) {
            console.error('❌ Error loading admin channel config:', error.message);
        }
    }

    async fetchRecentMessages(channelIds) {
        console.log('🔄 Fetching recent messages from monitored channels...');
        
        for (const channelId of channelIds) {
            try {
                const channel = await this.client.channels.fetch(channelId);
                if (!channel) {
                    console.warn(`⚠️ Could not fetch channel: ${channelId}`);
                    continue;
                }
                
                console.log(`📨 Fetching recent messages from channel: ${channel.name || channelId}`);
                
                // Fetch last 100 messages from the channel
                const messages = await channel.messages.fetch({ limit: 100 });
                console.log(`📨 Found ${messages.size} recent messages in ${channel.name || channelId}`);
                
                // Store raw messages to rawdata.json first
                await this.storeRawMessages(Array.from(messages.values()));
                
                // Process each message (in reverse order - oldest first)
                const sortedMessages = Array.from(messages.values()).reverse();
                let processedCount = 0;
                
                for (const message of sortedMessages) {
                    // Don't process our own messages
                    if (message.author.id === this.client.user?.id) continue;
                    
                    const messageData = {
                        id: message.id,
                        author: message.author.username,
                        content: message.content,
                        timestamp: message.createdAt,
                        channelId: message.channel.id,
                        guildId: message.guild?.id,
                        embeds: message.embeds ? message.embeds.map(embed => ({
                            title: embed.title,
                            description: embed.description,
                            fields: embed.fields?.map(field => ({
                                name: field.name,
                                value: field.value,
                                inline: field.inline
                            }))
                        })) : []
                    };
                    
                    // Process through DataManager
                    if (this.dataManager.processChannelMessage) {
                        await this.dataManager.processChannelMessage(messageData);
                    } else {
                        await this.dataManager.logDiscordMessage(messageData);
                    }
                    processedCount++;
                }
                
                console.log(`✅ Processed ${processedCount} messages from ${channel.name || channelId}`);
                
            } catch (error) {
                console.error(`❌ Error fetching messages from channel ${channelId}:`, error.message);
            }
        }
        
        console.log('🎉 Finished fetching recent messages from all monitored channels');
        
        // Process raw data to analyzed data
        await this.processRawDataToAnalyzed();
    }
    
    async storeRawMessages(messages) {
        try {
            const fs = require('fs').promises;
            const path = require('path');
            
            // Load existing raw data or create new
            const rawDataPath = path.join(__dirname, 'data', 'rawdata.json');
            let rawData = {};
            
            try {
                const existingData = await fs.readFile(rawDataPath, 'utf8');
                rawData = JSON.parse(existingData);
            } catch (error) {
                console.log('📝 Creating new rawdata.json file');
                rawData = {
                    messages: [],
                    last_updated: new Date().toISOString()
                };
            }
            
            // Ensure messages array exists
            if (!rawData.messages) {
                rawData.messages = [];
            }
            
            // Add new messages (avoid duplicates)
            const existingIds = new Set(rawData.messages.map(m => m.id));
            
            for (const message of messages) {
                if (!existingIds.has(message.id)) {
                    rawData.messages.push({
                        id: message.id,
                        author: message.author.username,
                        content: message.content,
                        timestamp: message.createdTimestamp ? new Date(message.createdTimestamp).toISOString() : new Date().toISOString(),
                        channelId: message.channel.id,
                        guildId: message.guild?.id,
                        embeds: message.embeds ? message.embeds.map(embed => ({
                            title: embed.title,
                            description: embed.description,
                            fields: embed.fields?.map(field => ({
                                name: field.name,
                                value: field.value,
                                inline: field.inline
                            }))
                        })) : []
                    });
                }
            }
            
            // Sort by timestamp (newest first)
            rawData.messages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            // Keep only last 1000 messages
            if (rawData.messages.length > 1000) {
                rawData.messages = rawData.messages.slice(0, 1000);
            }
            
            rawData.last_updated = new Date().toISOString();
            
            await fs.writeFile(rawDataPath, JSON.stringify(rawData, null, 2));
            console.log(`📝 Stored ${messages.length} raw messages to rawdata.json`);
            
        } catch (error) {
            console.error('❌ Error storing raw messages:', error);
        }
    }
    
    async processRawDataToAnalyzed() {
        try {
            const fs = require('fs').promises;
            const path = require('path');
            
            // Load raw data
            const rawDataPath = path.join(__dirname, 'data', 'rawdata.json');
            const rawData = JSON.parse(await fs.readFile(rawDataPath, 'utf8'));
            
            console.log(`🔄 Processing ${rawData.messages.length} raw messages to analyzed data...`);
            
            // Process each raw message through the DataManager system
            for (const rawMessage of rawData.messages) {
                await this.dataManager.logDiscordMessage(rawMessage);
            }
            
            console.log('✅ Processed all raw messages to analyzed_data.json');
            
        } catch (error) {
            console.error('❌ Error processing raw data:', error);
        }
    }

    async start() {
        const config = require('./config.json');
        
        if (!config.token) {
            console.error('❌ Bot token not found in config.json');
            process.exit(1);
        }

        try {
            await this.client.login(config.token);
        } catch (error) {
            console.error('❌ Failed to login:', error);
            process.exit(1);
        }
    }
}

// Start the bot
const bot = new CabraDaPesteBot();
bot.start();

module.exports = CabraDaPesteBot;