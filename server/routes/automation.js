const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

module.exports = (dataManager) => {
    /**
     * POST /api/automation/process-dashboard
     * Process all dashboard activities automatically
     */
    router.post('/process-dashboard', async (req, res) => {
        try {
            logger.info('🤖 API: Processing dashboard activities...');
            
            const result = await dataManager.processAllDashboardActivities();
            
            if (result.success) {
                res.json({
                    success: true,
                    message: 'Dashboard activities processed successfully',
                    stats: result.stats
                });
            } else {
                res.status(400).json({
                    success: false,
                    error: result.error || 'Processing failed'
                });
            }
        } catch (error) {
            logger.error('API Error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /api/automation/worker/:workerId/evaluate
     * Evaluate a specific worker's performance
     */
    router.get('/worker/:workerId/evaluate', async (req, res) => {
        try {
            const { workerId } = req.params;
            logger.info(`📊 API: Evaluating worker ${workerId}...`);
            
            const evaluation = await dataManager.evaluateWorkerPerformance(workerId);
            
            if (evaluation.error) {
                res.status(400).json({
                    success: false,
                    error: evaluation.error
                });
            } else {
                res.json({
                    success: true,
                    evaluation: evaluation
                });
            }
        } catch (error) {
            logger.error('API Error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * POST /api/automation/worker/:workerId/check-abuse
     * Check a worker's activity for abuse
     */
    router.post('/worker/:workerId/check-abuse', async (req, res) => {
        try {
            const { workerId } = req.params;
            const { activity } = req.body;
            
            logger.info(`🔍 API: Checking abuse for worker ${workerId}...`);
            
            const result = await dataManager.checkActivityForAbuse(activity, workerId);
            
            res.json({
                success: true,
                abuse_check: result
            });
        } catch (error) {
            logger.error('API Error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * POST /api/automation/worker/:workerId/auto-pay
     * Generate automated payment with receipt
     */
    router.post('/worker/:workerId/auto-pay', async (req, res) => {
        try {
            const { workerId } = req.params;
            const { serviceType = 'todos' } = req.body;
            
            logger.info(`💰 API: Auto-paying worker ${workerId} for ${serviceType}...`);
            
            const result = await dataManager.generateAutomatedPayment(workerId, serviceType);
            
            if (result.success) {
                res.json({
                    success: true,
                    payment: result.payment,
                    receipt: result.receipt
                });
            } else {
                res.status(400).json({
                    success: false,
                    error: result.error,
                    abuse_check: result.abuse_check
                });
            }
        } catch (error) {
            logger.error('API Error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /api/automation/worker/:workerId/status
     * Get worker automation status
     */
    router.get('/worker/:workerId/status', async (req, res) => {
        try {
            const { workerId } = req.params;
            
            logger.info(`📊 API: Getting automation status for ${workerId}...`);
            
            const status = await dataManager.getWorkerAutomationStatus(workerId);
            
            if (status.error) {
                res.status(400).json({
                    success: false,
                    error: status.error
                });
            } else {
                res.json({
                    success: true,
                    status: status
                });
            }
        } catch (error) {
            logger.error('API Error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /api/automation/workers/ratings
     * Get all worker ratings
     */
    router.get('/workers/ratings', async (req, res) => {
        try {
            logger.info('📊 API: Getting all worker ratings...');
            
            const fs = require('fs');
            const path = require('path');
            const ratingsFile = path.join(__dirname, '../../data/worker_ratings.json');
            
            if (fs.existsSync(ratingsFile)) {
                const ratings = JSON.parse(fs.readFileSync(ratingsFile, 'utf8'));
                
                // Transform ratings for frontend display
                const workerRatings = Object.entries(ratings.ratings || {}).map(([workerId, data]) => ({
                    worker_id: workerId,
                    current_rating: data.current?.star_rating || 0,
                    performance_score: data.current?.scores?.overall || 0,
                    badges: data.current?.badges || [],
                    last_evaluation: data.current?.evaluation_date || null,
                    trend: data.current?.trends?.overall || 'stable'
                }));
                
                res.json({
                    success: true,
                    ratings: workerRatings,
                    total: workerRatings.length
                });
            } else {
                res.json({
                    success: true,
                    ratings: [],
                    total: 0
                });
            }
        } catch (error) {
            logger.error('API Error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /api/automation/abuse/report
     * Get abuse detection report
     */
    router.get('/abuse/report', async (req, res) => {
        try {
            logger.info('📊 API: Getting abuse report...');
            
            const fs = require('fs');
            const path = require('path');
            const abuseFile = path.join(__dirname, '../../data/abuse_actions.json');
            
            if (fs.existsSync(abuseFile)) {
                const abuseData = JSON.parse(fs.readFileSync(abuseFile, 'utf8'));
                
                // Group by worker
                const workerAbuse = {};
                abuseData.actions.forEach(action => {
                    if (!workerAbuse[action.worker_id]) {
                        workerAbuse[action.worker_id] = {
                            worker_id: action.worker_id,
                            total_incidents: 0,
                            blocked: 0,
                            flagged: 0,
                            recent_incidents: []
                        };
                    }
                    
                    workerAbuse[action.worker_id].total_incidents++;
                    if (action.status === 'blocked') {
                        workerAbuse[action.worker_id].blocked++;
                    } else {
                        workerAbuse[action.worker_id].flagged++;
                    }
                    
                    // Keep last 5 incidents
                    workerAbuse[action.worker_id].recent_incidents.push({
                        timestamp: action.timestamp,
                        types: action.detection.abuse_types,
                        confidence: action.detection.confidence_score,
                        status: action.status
                    });
                    
                    if (workerAbuse[action.worker_id].recent_incidents.length > 5) {
                        workerAbuse[action.worker_id].recent_incidents.shift();
                    }
                });
                
                res.json({
                    success: true,
                    report: Object.values(workerAbuse),
                    total_ignored: abuseData.total_ignored || 0,
                    total_charged: abuseData.total_charged || 0
                });
            } else {
                res.json({
                    success: true,
                    report: [],
                    total_ignored: 0,
                    total_charged: 0
                });
            }
        } catch (error) {
            logger.error('API Error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    return router;
};