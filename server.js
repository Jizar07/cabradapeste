const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');
const DataManager = require('./server/DataManager');

class WebServer {
    constructor() {
        this.app = express();
        this.server = http.createServer(this.app);
        this.io = new Server(this.server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            }
        });
        this.dataManager = new DataManager('./data', this.io);
        this.port = process.env.PORT || 4051;
        this.setupMiddleware();
        this.setupRoutes();
        this.setupSocketHandlers();
    }

    setupMiddleware() {
        this.app.use(cors());
        this.app.use(express.json({ limit: '50mb' }));
        this.app.use(express.static(path.join(__dirname, 'client/build')));
    }

    setupRoutes() {
        // Channel logs from Discord bot - REMOVE OLD SYSTEM
        // const channelLogsRouter = require('./server/routes/channel-logs')();
        // this.app.use('/api/webhook', channelLogsRouter);
        

        // API routes - properly pass dataManager to routes that need it
        this.app.use('/api/dashboard', require('./server/routes/dashboard')(this.dataManager));
        this.app.use('/api/inventario', require('./server/routes/inventory')(this.dataManager));
        this.app.use('/api/inventory', require('./server/routes/inventory')(this.dataManager));
        this.app.use('/api/usuarios', require('./server/routes/users')(this.dataManager));
        this.app.use('/api/users', require('./server/routes/users')(this.dataManager));
        this.app.use('/api/precos', require('./server/routes/precos')(this.dataManager));
        this.app.use('/api/pricing', require('./server/routes/pricing')(this.dataManager));
        this.app.use('/api/managers', require('./server/routes/managers')(this.dataManager));
        this.app.use('/api/gerentes', require('./server/routes/managers')(this.dataManager));
        this.app.use('/api/ferroviaria', require('./server/routes/ferroviaria')(this.dataManager));
        this.app.use('/api/analytics', require('./server/routes/analytics')(this.dataManager));
        this.app.use('/api/stock', require('./server/routes/stock')(this.dataManager));
        this.app.use('/api/item-links', require('./server/routes/itemLinks'));
        this.app.use('/api/discord-logs', require('./server/routes/discord-logs')());
        this.app.use('/api/localization', require('./server/routes/localization'));
        this.app.use('/api/server-proxy', require('./server/routes/server-proxy'));
        this.app.use('/api/known-players', require('./server/routes/known-players'));
        this.app.use('/api/payments', require('./server/routes/payments')());
        
        
        // New simplified data system
        this.app.use('/api/bot-data', require('./server/routes/bot-data')(this.dataManager, this.io));
        this.app.use('/api/analyzed-data', require('./server/routes/analyzed-data')(this.dataManager));

        // Automation endpoints
        this.app.use('/api/automation', require('./server/routes/automation')(this.dataManager));

        // Admin panel endpoints
        this.app.use('/api/admin', require('./server/routes/admin')(this.dataManager));

        // Serve React app
        this.app.get('*', (req, res) => {
            res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
        });
    }

    getMessageTitle(messageType) {
        switch (messageType) {
            case 'REMOVER ITEM':
                return 'REMOVER ITEM';
            case 'INSERIR ITEM':
                return 'INSERIR ITEM';
            case 'CAIXA ORGANIZAÇÃO':
                return 'CAIXA ORGANIZAÇÃO';
            default:
                return messageType;
        }
    }

    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            console.log('Client connected:', socket.id);
            
            socket.on('disconnect', () => {
                console.log('Client disconnected:', socket.id);
            });
        });
    }


    start() {
        this.server.listen(this.port, () => {
            console.log(`Server running on port ${this.port}`);
            
            console.log('✅ New simplified bot data system active');
        });
    }
}

const webServer = new WebServer();
webServer.start();