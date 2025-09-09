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
        
        const config = require('./config.json');
        this.port = process.env.PORT || config.webServerPort || 4050;
        
        this.setupMiddleware();
        this.setupRoutes();
        this.setupSocketHandlers();
    }

    setupMiddleware() {
        this.app.use(cors());
        this.app.use(express.json({ limit: '50mb' }));
        this.app.use(express.static(path.join(__dirname, 'public')));
    }

    setupRoutes() {
        // Basic API routes
        this.app.get('/api/health', (req, res) => {
            res.json({ status: 'ok', timestamp: new Date() });
        });

        // Data API routes
        this.app.get('/api/data/:type', (req, res) => {
            const { type } = req.params;
            try {
                const data = this.dataManager.loadData(type);
                res.json(data);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.post('/api/data/:type', (req, res) => {
            const { type } = req.params;
            try {
                this.dataManager.saveData(type, req.body);
                res.json({ success: true });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // Serve frontend
        this.app.get('*', (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'index.html'));
        });
    }

    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            console.log('Client connected:', socket.id);
            
            socket.on('disconnect', () => {
                console.log('Client disconnected:', socket.id);
            });

            socket.on('data:update', (data) => {
                // Broadcast data updates to all clients
                socket.broadcast.emit('data:changed', data);
            });
        });
    }

    start() {
        const config = require('./config.json');
        
        if (!config.features?.webDashboard) {
            console.log('Web dashboard is disabled in config');
            return;
        }

        this.server.listen(this.port, () => {
            console.log(`✅ Web server running on port ${this.port}`);
            console.log(`📊 Dashboard: http://localhost:${this.port}`);
        });
    }
}

// Only start if run directly (not imported)
if (require.main === module) {
    const webServer = new WebServer();
    webServer.start();
}

module.exports = WebServer;