#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function setup() {
    console.log('🚀 Discord Bot Template Setup');
    console.log('================================\n');

    // Check if config already exists
    if (fs.existsSync('config.json') && !process.argv.includes('--force')) {
        const overwrite = await question('config.json already exists. Overwrite? (y/N): ');
        if (overwrite.toLowerCase() !== 'y') {
            console.log('Setup cancelled.');
            process.exit(0);
        }
    }

    // Collect information
    const config = {};
    
    console.log('\n📝 Basic Configuration');
    console.log('----------------------');
    
    config.projectName = await question('Project name (my-discord-bot): ') || 'my-discord-bot';
    config.projectDescription = await question('Project description: ') || 'A Discord bot';
    
    console.log('\n🔐 Discord Configuration');
    console.log('------------------------');
    console.log('Get these from https://discord.com/developers/applications');
    
    config.token = await question('Bot Token (required): ');
    while (!config.token) {
        console.log('❌ Bot token is required!');
        config.token = await question('Bot Token: ');
    }
    
    config.clientId = await question('Client/Application ID (required): ');
    while (!config.clientId) {
        console.log('❌ Client ID is required!');
        config.clientId = await question('Client/Application ID: ');
    }
    
    config.guildId = await question('Guild/Server ID (optional, for dev): ') || '';
    
    console.log('\n⚙️  Feature Configuration');
    console.log('------------------------');
    
    config.prefix = await question('Bot prefix (default: !): ') || '!';
    config.webDashboard = (await question('Enable web dashboard? (Y/n): ')).toLowerCase() !== 'n';
    
    if (config.webDashboard) {
        config.webPort = await question('Web server port (4050): ') || '4050';
    }
    
    config.welcomeMessages = (await question('Enable welcome messages? (y/N): ')).toLowerCase() === 'y';
    config.logging = (await question('Enable logging? (Y/n): ')).toLowerCase() !== 'n';
    
    // Create .env file
    console.log('\n📄 Creating configuration files...');
    
    const envContent = `# Discord Bot Configuration
DISCORD_TOKEN=${config.token}
CLIENT_ID=${config.clientId}
GUILD_ID=${config.guildId}

# Web Server Configuration
WEB_SERVER_PORT=${config.webPort || 4050}
WEB_DASHBOARD_ENABLED=${config.webDashboard}

# Bot Settings
BOT_PREFIX=${config.prefix}
PROJECT_NAME=${config.projectName}

# Feature Flags
ENABLE_WELCOME_MESSAGES=${config.welcomeMessages}
ENABLE_LOGGING=${config.logging}
`;
    
    fs.writeFileSync('.env', envContent);
    console.log('✅ Created .env file');
    
    // Create config.json
    const configJson = {
        token: config.token,
        clientId: config.clientId,
        guildId: config.guildId,
        prefix: config.prefix,
        webServerPort: parseInt(config.webPort) || 4050,
        botActivity: config.projectName,
        database: {
            path: "./data"
        },
        channels: {
            logs: "",
            welcome: "",
            commands: ""
        },
        roles: {
            admin: "",
            moderator: "",
            member: ""
        },
        features: {
            welcomeMessages: config.welcomeMessages,
            autoModeration: false,
            loggingEnabled: config.logging,
            webDashboard: config.webDashboard
        }
    };
    
    fs.writeJsonSync('config.json', configJson, { spaces: 2 });
    console.log('✅ Created config.json');
    
    // Update package.json
    const packageJsonPath = 'package.json';
    if (fs.existsSync(packageJsonPath)) {
        const packageJson = fs.readJsonSync(packageJsonPath);
        packageJson.name = config.projectName.toLowerCase().replace(/\s+/g, '-');
        packageJson.description = config.projectDescription;
        
        // Update scripts with project name
        if (packageJson.scripts) {
            packageJson.scripts['logs:bot'] = `pm2 logs ${config.projectName}-bot`;
            packageJson.scripts['logs:web'] = `pm2 logs ${config.projectName}-web`;
        }
        
        fs.writeJsonSync(packageJsonPath, packageJson, { spaces: 2 });
        console.log('✅ Updated package.json');
    }
    
    // Create ecosystem.config.js for PM2
    const ecosystemContent = `module.exports = {
    apps: [
        {
            name: '${config.projectName}-bot',
            script: './bot.js',
            watch: false,
            env: {
                NODE_ENV: 'production'
            }
        }${config.webDashboard ? `,
        {
            name: '${config.projectName}-web',
            script: './server.js',
            watch: false,
            env: {
                NODE_ENV: 'production',
                PORT: ${config.webPort || 4050}
            }
        }` : ''}
    ]
};`;
    
    fs.writeFileSync('ecosystem.config.js', ecosystemContent);
    console.log('✅ Created ecosystem.config.js');
    
    // Create data directory
    fs.ensureDirSync('data');
    console.log('✅ Created data directory');
    
    // Create public directory for web dashboard
    if (config.webDashboard) {
        fs.ensureDirSync('public');
        
        // Create basic index.html
        const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${config.projectName} - Dashboard</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .header {
            background: #5865F2;
            color: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        .card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }
        .status {
            display: inline-block;
            padding: 5px 10px;
            border-radius: 4px;
            background: #43b581;
            color: white;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${config.projectName} Dashboard</h1>
        <p>${config.projectDescription}</p>
    </div>
    
    <div class="card">
        <h2>Status</h2>
        <p><span class="status">Online</span></p>
    </div>
    
    <div class="card">
        <h2>Quick Stats</h2>
        <p>Dashboard is running on port ${config.webPort || 4050}</p>
        <p>Bot is configured and ready to use!</p>
    </div>
    
    <div class="card">
        <h2>Getting Started</h2>
        <ol>
            <li>Install dependencies: <code>npm install</code></li>
            <li>Deploy commands: <code>npm run deploy</code></li>
            <li>Start the bot: <code>npm start</code></li>
        </ol>
    </div>
</body>
</html>`;
        
        fs.writeFileSync('public/index.html', indexHtml);
        console.log('✅ Created web dashboard files');
    }
    
    // Create .gitignore if it doesn't exist
    if (!fs.existsSync('.gitignore')) {
        const gitignoreContent = `# Dependencies
node_modules/

# Environment variables
.env
config.json

# Data files
data/

# Logs
*.log
npm-debug.log*

# PM2
.pm2/

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db`;
        
        fs.writeFileSync('.gitignore', gitignoreContent);
        console.log('✅ Created .gitignore');
    }
    
    console.log('\n✨ Setup Complete!');
    console.log('==================\n');
    
    console.log('Next steps:');
    console.log('1. Install dependencies: npm install');
    console.log('2. Deploy commands: npm run deploy');
    console.log('3. Start the bot: npm start');
    
    if (config.webDashboard) {
        console.log(`4. Access dashboard at: http://localhost:${config.webPort || 4050}`);
    }
    
    console.log('\n📚 For more information, check README.md');
    
    rl.close();
}

// Run setup
setup().catch(error => {
    console.error('❌ Setup failed:', error);
    rl.close();
    process.exit(1);
});