const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

module.exports = function(dataManager) {
    const simpleConfigFile = path.join(__dirname, '../../simple-admin-config.json');

    // Load simple admin configuration
    function loadSimpleConfig() {
        try {
            if (fs.existsSync(simpleConfigFile)) {
                return JSON.parse(fs.readFileSync(simpleConfigFile, 'utf8'));
            }
        } catch (error) {
            console.error('Error loading simple admin config:', error);
        }

        return {
            watchedChannels: [],
            commands: [
                { name: 'ping', description: 'Check bot latency', enabled: true },
                { name: 'inventory', description: 'Manage farm inventory', enabled: true }
            ]
        };
    }

    // Save simple admin configuration
    function saveSimpleConfig(config) {
        try {
            fs.writeFileSync(simpleConfigFile, JSON.stringify(config, null, 2));
            return true;
        } catch (error) {
            console.error('Error saving simple admin config:', error);
            return false;
        }
    }

    // GET /api/admin/simple-config
    router.get('/simple-config', (req, res) => {
        try {
            const config = loadSimpleConfig();
            res.json(config);
        } catch (error) {
            console.error('Error getting simple config:', error);
            res.status(500).json({ error: 'Failed to load configuration' });
        }
    });

    // POST /api/admin/simple-config
    router.post('/simple-config', (req, res) => {
        try {
            const { watchedChannels, commands } = req.body;
            
            const config = {
                watchedChannels: watchedChannels || [],
                commands: commands || [],
                lastUpdated: new Date().toISOString()
            };

            if (saveSimpleConfig(config)) {
                // Update bot to watch these channels
                if (dataManager && watchedChannels) {
                    const channelIds = watchedChannels.map(ch => ch.id);
                    dataManager.setWatchedChannels(channelIds);
                    console.log(`📺 Bot now watching ${channelIds.length} channels:`, channelIds);
                }

                res.json({ 
                    success: true, 
                    message: 'Settings saved successfully'
                });
            } else {
                res.status(500).json({ 
                    success: false, 
                    message: 'Failed to save configuration' 
                });
            }
        } catch (error) {
            console.error('Error saving simple config:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Failed to save configuration',
                error: error.message 
            });
        }
    });

    return router;
};