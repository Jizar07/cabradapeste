const express = require('express');
const router = express.Router();
const cfx = require('cfx-api');

// Cache server data to avoid too many API calls
let serverCache = {
    data: null,
    lastFetch: 0,
    cacheDuration: 30000 // 30 seconds cache
};

// Default server code (can be configured)
const DEFAULT_SERVER_CODE = "qrbm5v"; // Replace with your server code

module.exports = (dataManager) => {
    
    // GET /api/server-status - Get FiveM server status
    router.get('/', async (req, res) => {
        try {
            const serverCode = req.query.code || process.env.FIVEM_SERVER_CODE || DEFAULT_SERVER_CODE;
            const now = Date.now();
            
            // Check if we have cached data
            if (serverCache.data && 
                serverCache.serverCode === serverCode && 
                (now - serverCache.lastFetch) < serverCache.cacheDuration) {
                return res.json({ 
                    success: true, 
                    cached: true,
                    data: serverCache.data 
                });
            }
            
            // Fetch fresh data
            console.log(`🎮 Fetching server status for: ${serverCode}`);
            
            // Get Cfx.re system status
            const systemStatus = await cfx.fetchStatus();
            
            // Try to get server data
            let serverData = null;
            let serverError = null;
            
            try {
                serverData = await cfx.fetchServer(serverCode);
            } catch (error) {
                serverError = error.message;
                console.warn(`⚠️ Could not fetch server ${serverCode}:`, error.message);
            }
            
            // Build response
            const response = {
                timestamp: new Date().toISOString(),
                serverCode: serverCode,
                system: {
                    online: systemStatus.everythingOk,
                    components: systemStatus.components?.length || 0
                },
                server: null
            };
            
            if (serverData) {
                // Extract player names that match farm users
                const farmUsers = dataManager.obterTodosUsuarios();
                const onlineFarmUsers = [];
                
                if (serverData.players && Array.isArray(serverData.players)) {
                    serverData.players.forEach(player => {
                        // Check if player name matches any farm user
                        const matchedUser = Object.values(farmUsers).find(user => 
                            user.nome.toLowerCase() === player.name.toLowerCase()
                        );
                        
                        if (matchedUser) {
                            onlineFarmUsers.push({
                                gameId: player.id,
                                name: player.name,
                                ping: player.ping,
                                farmUserId: matchedUser.fixo_id,
                                farmRole: matchedUser.funcao
                            });
                        }
                    });
                }
                
                response.server = {
                    online: true,
                    name: serverData.hostname || 'Unknown Server',
                    players: {
                        current: serverData.players?.length || 0,
                        max: serverData.sv_maxclients || 0,
                        list: serverData.players?.slice(0, 10).map(p => ({
                            id: p.id,
                            name: p.name,
                            ping: p.ping
                        })) || []
                    },
                    farmUsersOnline: onlineFarmUsers,
                    map: serverData.mapname || 'Unknown',
                    gameType: serverData.gametype || 'Unknown',
                    resources: serverData.resources?.length || 0
                };
            } else {
                response.server = {
                    online: false,
                    error: serverError || 'Server not found or offline'
                };
            }
            
            // Update cache
            serverCache = {
                data: response,
                serverCode: serverCode,
                lastFetch: now
            };
            
            res.json({ 
                success: true, 
                cached: false,
                data: response 
            });
            
        } catch (error) {
            console.error('Error fetching server status:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Failed to fetch server status',
                details: error.message 
            });
        }
    });
    
    // GET /api/server-status/players - Get detailed player list
    router.get('/players', async (req, res) => {
        try {
            const serverCode = req.query.code || process.env.FIVEM_SERVER_CODE || DEFAULT_SERVER_CODE;
            
            const serverData = await cfx.fetchServer(serverCode);
            
            if (!serverData || !serverData.players) {
                return res.json({ 
                    success: true, 
                    players: [],
                    message: 'No players online or server offline'
                });
            }
            
            // Get all farm users
            const farmUsers = dataManager.obterTodosUsuarios();
            
            // Map players and identify farm users
            const playerList = serverData.players.map(player => {
                const farmUser = Object.values(farmUsers).find(user => 
                    user.nome.toLowerCase() === player.name.toLowerCase()
                );
                
                return {
                    gameId: player.id,
                    name: player.name,
                    ping: player.ping,
                    identifiers: player.identifiers || [],
                    isFarmUser: !!farmUser,
                    farmData: farmUser ? {
                        userId: farmUser.fixo_id,
                        role: farmUser.funcao,
                        active: farmUser.ativo
                    } : null
                };
            });
            
            res.json({ 
                success: true, 
                total: playerList.length,
                farmUsersOnline: playerList.filter(p => p.isFarmUser).length,
                players: playerList 
            });
            
        } catch (error) {
            console.error('Error fetching player list:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Failed to fetch player list',
                details: error.message 
            });
        }
    });
    
    // POST /api/server-status/set-server - Configure which server to monitor
    router.post('/set-server', (req, res) => {
        try {
            const { serverCode } = req.body;
            
            if (!serverCode) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Server code is required' 
                });
            }
            
            // Clear cache to force refresh with new server
            serverCache = {
                data: null,
                lastFetch: 0,
                cacheDuration: 30000
            };
            
            // You could save this to a config file if needed
            process.env.FIVEM_SERVER_CODE = serverCode;
            
            res.json({ 
                success: true, 
                message: `Server code updated to: ${serverCode}`,
                serverCode: serverCode 
            });
            
        } catch (error) {
            console.error('Error setting server code:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Failed to update server code' 
            });
        }
    });
    
    return router;
};