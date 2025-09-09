const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

module.exports = () => {
    
    /**
     * GET /api/discord-logs - Get Discord activities from new system
     */
    router.get('/', async (req, res) => {
        try {
            const limit = parseInt(req.query.limit) || 50;
            const offset = parseInt(req.query.offset) || 0;
            
            // Load data from analyzed_data.json (new system)
            const analyzedDataFile = path.join(__dirname, '../../data/analyzed_data.json');
            let analyzedData;
            
            try {
                const fileContent = fs.readFileSync(analyzedDataFile, 'utf8');
                analyzedData = JSON.parse(fileContent);
            } catch (error) {
                analyzedData = { farm_activities: [], financial_transactions: [], inventory_changes: [] };
            }
            
            // Combine all activities
            const allActivities = [
                ...analyzedData.farm_activities || [],
                ...analyzedData.financial_transactions || [],
                ...analyzedData.inventory_changes || []
            ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            const paginatedActivities = allActivities.slice(offset, offset + limit);
            
            res.json({
                success: true,
                data: {
                    atividades_recentes: paginatedActivities,
                    total_atividades: allActivities.length,
                    ultima_atualizacao: new Date().toISOString()
                }
            });
        } catch (error) {
            console.error('Error fetching Discord logs:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch Discord logs'
            });
        }
    });
    
    return router;
};