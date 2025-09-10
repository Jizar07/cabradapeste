const express = require('express');
const router = express.Router();
const DataAnalyzer = require('../DataAnalyzer');
const path = require('path');

module.exports = (dataManager) => {
    const dataAnalyzer = new DataAnalyzer(path.join(__dirname, '../../data'), dataManager);

    /**
     * GET /api/analyzed-data - Get analyzed farm data
     */
    router.get('/', async (req, res) => {
        try {
            const analyzedData = await dataAnalyzer.getAnalyzedData();
            
            if (!analyzedData) {
                return res.json({
                    success: true,
                    data: {
                        farm_activities: [],
                        financial_transactions: [],
                        inventory_changes: [],
                        user_activities: {},
                        summary: {
                            total_activities: 0,
                            latest_activity: null,
                            activity_types: {},
                            active_users: []
                        }
                    }
                });
            }

            res.json({
                success: true,
                data: analyzedData
            });

        } catch (error) {
            console.error('Error fetching analyzed data:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch analyzed data'
            });
        }
    });

    /**
     * POST /api/analyzed-data/analyze - Trigger data analysis
     */
    router.post('/analyze', async (req, res) => {
        try {
            const result = await dataAnalyzer.analyzeData();
            res.json(result);
        } catch (error) {
            console.error('Error analyzing data:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to analyze data'
            });
        }
    });

    /**
     * GET /api/analyzed-data/summary - Get summary statistics
     */
    router.get('/summary', async (req, res) => {
        try {
            const analyzedData = await dataAnalyzer.getAnalyzedData();
            
            res.json({
                success: true,
                data: analyzedData ? analyzedData.summary : {
                    total_activities: 0,
                    latest_activity: null,
                    activity_types: {},
                    active_users: []
                }
            });

        } catch (error) {
            console.error('Error fetching summary:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch summary'
            });
        }
    });

    return router;
};