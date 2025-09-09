const { Client, GatewayIntentBits, Collection, Events, ActivityType } = require('discord.js');
const fs = require('fs');
const path = require('path');
const DataManager = require('./server/DataManager');

class DiscordBot {
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
            
            const config = require('./config.json');
            const activityName = config.botActivity || 'Discord Bot';
            readyClient.user.setActivity(activityName, { type: ActivityType.Playing });
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
            // Ignore bot's own messages
            if (message.author.id === this.client.user?.id) return;
            
            // Process message data
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

            // Log message if logging is enabled
            const config = require('./config.json');
            if (config.features?.loggingEnabled) {
                await this.dataManager.logDiscordMessage(messageData);
            }
        });

        this.client.on(Events.GuildMemberAdd, (member) => {
            console.log(`👋 New member joined: ${member.user.tag}`);
            // Add welcome message logic here if enabled in config
        });

        this.client.on(Events.GuildMemberRemove, (member) => {
            console.log(`👋 Member left: ${member.user.tag}`);
        });

        this.client.on(Events.Error, (error) => {
            console.error('Discord client error:', error);
        });
    }

    async start() {
        const config = require('./config.json');
        
        if (!config.token) {
            console.error('❌ Bot token not found in config.json');
            console.error('Please run: npm run setup');
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
const bot = new DiscordBot();
bot.start();

module.exports = DiscordBot;