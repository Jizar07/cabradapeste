const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

/**
 * AbuseDetector - Automated fraud and abuse detection system
 * 
 * Features:
 * - Detect unusual activity patterns
 * - Identify price manipulation attempts
 * - Flag duplicate submissions
 * - Time-based anomaly detection
 * - Confidence scoring for transactions
 */
class AbuseDetector {
    constructor(dataPath) {
        this.dataPath = dataPath;
        
        // Data files
        this.abuseActionsFile = path.join(dataPath, 'abuse_actions.json');
        this.workerProfilesFile = path.join(dataPath, 'worker_profiles.json');
        
        // Detection thresholds
        this.THRESHOLDS = {
            // Plant production limits (per hour)
            MAX_PLANTS_PER_HOUR: 500,
            MAX_PLANT_TYPES_PER_HOUR: 10,
            
            // Animal delivery limits
            MAX_ANIMAL_DELIVERIES_PER_DAY: 20,
            MIN_TIME_BETWEEN_DELIVERIES: 5 * 60 * 1000, // 5 minutes in ms
            
            // Financial limits
            MAX_DEPOSITS_PER_DAY: 50,
            SUSPICIOUS_DEPOSIT_AMOUNT: 10000,
            
            // Time-based limits
            MAX_ACTIVITIES_PER_MINUTE: 10,
            MAX_ACTIVITIES_PER_HOUR: 200,
            
            // Pattern detection
            DUPLICATE_TIME_WINDOW: 60 * 1000, // 1 minute for duplicate detection
            SUSPICIOUS_PATTERN_THRESHOLD: 0.7, // 70% confidence for flagging
        };
        
        // Abuse types
        this.ABUSE_TYPES = {
            RATE_LIMIT: 'rate_limit_exceeded',
            DUPLICATE: 'duplicate_submission',
            IMPOSSIBLE_TIMING: 'impossible_timing',
            PRICE_MANIPULATION: 'price_manipulation',
            PATTERN_ANOMALY: 'pattern_anomaly',
            QUANTITY_ANOMALY: 'quantity_anomaly'
        };
        
        logger.info('✅ AbuseDetector initialized');
    }
    
    /**
     * Analyze activity for potential abuse
     */
    async analyzeActivity(activity, workerId) {
        try {
            const detectionResults = {
                is_suspicious: false,
                confidence_score: 1.0, // 1.0 = completely trustworthy, 0.0 = definitely fraudulent
                abuse_types: [],
                details: [],
                recommendations: []
            };
            
            // Load worker history for pattern analysis
            const workerHistory = await this.loadWorkerHistory(workerId);
            
            // Run detection checks
            const checks = [
                this.checkRateLimits(activity, workerHistory),
                this.checkDuplicates(activity, workerHistory),
                this.checkTimingAnomalies(activity, workerHistory),
                this.checkQuantityAnomalies(activity),
                this.checkPriceManipulation(activity),
                this.checkPatternAnomalies(activity, workerHistory)
            ];
            
            // Process all checks
            for (const check of checks) {
                const result = await check;
                if (result.detected) {
                    detectionResults.is_suspicious = true;
                    detectionResults.abuse_types.push(result.type);
                    detectionResults.details.push(result.detail);
                    detectionResults.confidence_score *= (1 - result.severity);
                    
                    if (result.recommendation) {
                        detectionResults.recommendations.push(result.recommendation);
                    }
                }
            }
            
            // Ensure confidence score stays within bounds
            detectionResults.confidence_score = Math.max(0, Math.min(1, detectionResults.confidence_score));
            
            // Log suspicious activity
            if (detectionResults.is_suspicious) {
                await this.logAbuseAction(workerId, activity, detectionResults);
                logger.warn(`⚠️ Suspicious activity detected for ${workerId}:`, detectionResults);
            }
            
            return detectionResults;
            
        } catch (error) {
            logger.error('❌ Abuse detection failed:', error);
            return {
                is_suspicious: false,
                confidence_score: 0.5,
                error: error.message
            };
        }
    }
    
    /**
     * Check rate limits
     */
    async checkRateLimits(activity, history) {
        const result = {
            detected: false,
            type: this.ABUSE_TYPES.RATE_LIMIT,
            severity: 0,
            detail: '',
            recommendation: ''
        };
        
        if (!history.recent_activities) return result;
        
        const now = new Date(activity.timestamp).getTime();
        const oneHourAgo = now - (60 * 60 * 1000);
        const oneMinuteAgo = now - (60 * 1000);
        
        // Count activities in time windows
        const activitiesLastHour = history.recent_activities.filter(a => 
            new Date(a.timestamp).getTime() > oneHourAgo
        );
        
        const activitiesLastMinute = history.recent_activities.filter(a => 
            new Date(a.timestamp).getTime() > oneMinuteAgo
        );
        
        // Check minute rate limit
        if (activitiesLastMinute.length > this.THRESHOLDS.MAX_ACTIVITIES_PER_MINUTE) {
            result.detected = true;
            result.severity = 0.6;
            result.detail = `${activitiesLastMinute.length} activities in last minute (limit: ${this.THRESHOLDS.MAX_ACTIVITIES_PER_MINUTE})`;
            result.recommendation = 'Review for bot/automation usage';
        }
        
        // Check hourly rate limit
        if (activitiesLastHour.length > this.THRESHOLDS.MAX_ACTIVITIES_PER_HOUR) {
            result.detected = true;
            result.severity = Math.max(result.severity, 0.4);
            result.detail = `${activitiesLastHour.length} activities in last hour (limit: ${this.THRESHOLDS.MAX_ACTIVITIES_PER_HOUR})`;
            result.recommendation = 'Investigate unusual activity spike';
        }
        
        // Check plant production rate
        if (activity.type === 'item_add' && activity.details && activity.details.item) {
            const plantsLastHour = activitiesLastHour.filter(a => 
                a.type === 'item_add' && this.isPlantItem(a.details?.item)
            );
            
            const totalPlants = plantsLastHour.reduce((sum, a) => 
                sum + (a.details?.quantity || 0), 0
            );
            
            if (totalPlants > this.THRESHOLDS.MAX_PLANTS_PER_HOUR) {
                result.detected = true;
                result.severity = Math.max(result.severity, 0.7);
                result.detail = `${totalPlants} plants in last hour (limit: ${this.THRESHOLDS.MAX_PLANTS_PER_HOUR})`;
                result.recommendation = 'Verify plant production with game logs';
            }
        }
        
        return result;
    }
    
    /**
     * Check for duplicate submissions
     */
    async checkDuplicates(activity, history) {
        const result = {
            detected: false,
            type: this.ABUSE_TYPES.DUPLICATE,
            severity: 0,
            detail: '',
            recommendation: ''
        };
        
        if (!history.recent_activities) return result;
        
        const activityTime = new Date(activity.timestamp).getTime();
        const windowStart = activityTime - this.THRESHOLDS.DUPLICATE_TIME_WINDOW;
        
        // Find similar activities in time window
        const similarActivities = history.recent_activities.filter(a => {
            const aTime = new Date(a.timestamp).getTime();
            return aTime >= windowStart && 
                   aTime <= activityTime &&
                   a.type === activity.type &&
                   a.details?.item === activity.details?.item &&
                   a.details?.quantity === activity.details?.quantity;
        });
        
        if (similarActivities.length > 0) {
            result.detected = true;
            result.severity = 0.8;
            result.detail = `Duplicate activity within ${this.THRESHOLDS.DUPLICATE_TIME_WINDOW / 1000} seconds`;
            result.recommendation = 'Reject duplicate submission';
        }
        
        return result;
    }
    
    /**
     * Check timing anomalies
     */
    async checkTimingAnomalies(activity, history) {
        const result = {
            detected: false,
            type: this.ABUSE_TYPES.IMPOSSIBLE_TIMING,
            severity: 0,
            detail: '',
            recommendation: ''
        };
        
        // Check animal delivery timing
        if (activity.type === 'deposit' && activity.details?.amount === 160) {
            const lastDelivery = history.recent_activities?.find(a => 
                a.type === 'deposit' && a.details?.amount === 160
            );
            
            if (lastDelivery) {
                const timeDiff = new Date(activity.timestamp).getTime() - 
                                new Date(lastDelivery.timestamp).getTime();
                
                if (timeDiff < this.THRESHOLDS.MIN_TIME_BETWEEN_DELIVERIES) {
                    result.detected = true;
                    result.severity = 0.9;
                    result.detail = `Animal delivery only ${Math.floor(timeDiff / 1000)} seconds after previous (minimum: ${this.THRESHOLDS.MIN_TIME_BETWEEN_DELIVERIES / 1000}s)`;
                    result.recommendation = 'Impossible timing - likely fraudulent';
                }
            }
        }
        
        // Check for future timestamps
        if (new Date(activity.timestamp).getTime() > Date.now()) {
            result.detected = true;
            result.severity = 1.0;
            result.detail = 'Activity timestamp is in the future';
            result.recommendation = 'Invalid timestamp - reject activity';
        }
        
        return result;
    }
    
    /**
     * Check quantity anomalies
     */
    async checkQuantityAnomalies(activity) {
        const result = {
            detected: false,
            type: this.ABUSE_TYPES.QUANTITY_ANOMALY,
            severity: 0,
            detail: '',
            recommendation: ''
        };
        
        if (!activity.details?.quantity) return result;
        
        const quantity = activity.details.quantity;
        
        // Check for unrealistic quantities
        if (activity.type === 'item_add') {
            // Single transaction limits
            if (quantity > 1000) {
                result.detected = true;
                result.severity = 0.7;
                result.detail = `Unusually high quantity: ${quantity} items in single transaction`;
                result.recommendation = 'Verify with game inventory limits';
            }
            
            // Check for suspicious round numbers
            if (quantity > 100 && quantity % 100 === 0) {
                result.severity = Math.max(result.severity, 0.3);
                result.detail += ` Suspicious round number: ${quantity}`;
            }
        }
        
        // Check for negative quantities
        if (quantity < 0) {
            result.detected = true;
            result.severity = 1.0;
            result.detail = `Invalid negative quantity: ${quantity}`;
            result.recommendation = 'Reject invalid data';
        }
        
        return result;
    }
    
    /**
     * Check for price manipulation
     */
    async checkPriceManipulation(activity) {
        const result = {
            detected: false,
            type: this.ABUSE_TYPES.PRICE_MANIPULATION,
            severity: 0,
            detail: '',
            recommendation: ''
        };
        
        // Check deposits for manipulation
        if (activity.type === 'deposit' && activity.details?.amount) {
            const amount = activity.details.amount;
            
            // Check for suspiciously high amounts
            if (amount > this.THRESHOLDS.SUSPICIOUS_DEPOSIT_AMOUNT) {
                result.detected = true;
                result.severity = 0.8;
                result.detail = `Suspicious deposit amount: $${amount}`;
                result.recommendation = 'Manual review required';
            }
            
            // Check for decimal manipulation
            if (amount !== 160 && amount % 1 !== 0) {
                result.severity = Math.max(result.severity, 0.4);
                result.detail += ` Unusual decimal amount: $${amount}`;
            }
        }
        
        return result;
    }
    
    /**
     * Check for pattern anomalies using statistical analysis
     */
    async checkPatternAnomalies(activity, history) {
        const result = {
            detected: false,
            type: this.ABUSE_TYPES.PATTERN_ANOMALY,
            severity: 0,
            detail: '',
            recommendation: ''
        };
        
        if (!history.daily_stats || Object.keys(history.daily_stats).length < 7) {
            return result; // Need at least 7 days of history
        }
        
        // Calculate average daily activity
        const dailyActivities = Object.values(history.daily_stats).map(d => d.activities);
        const avgDaily = dailyActivities.reduce((a, b) => a + b, 0) / dailyActivities.length;
        const stdDev = Math.sqrt(
            dailyActivities.reduce((sq, n) => sq + Math.pow(n - avgDaily, 2), 0) / dailyActivities.length
        );
        
        // Check if today's activity is anomalous
        const today = new Date(activity.timestamp).toISOString().split('T')[0];
        const todayStats = history.daily_stats[today];
        
        if (todayStats && stdDev > 0) {
            const zScore = Math.abs((todayStats.activities - avgDaily) / stdDev);
            
            if (zScore > 3) { // More than 3 standard deviations
                result.detected = true;
                result.severity = Math.min(0.6, zScore / 10);
                result.detail = `Activity ${zScore.toFixed(1)} standard deviations from normal`;
                result.recommendation = 'Unusual pattern detected - investigate';
            }
        }
        
        return result;
    }
    
    /**
     * Load worker history for analysis
     */
    async loadWorkerHistory(workerId) {
        try {
            const profiles = await this.loadJSON(this.workerProfilesFile, { profiles: {} });
            const profile = profiles.profiles[workerId] || {};
            
            // Load recent activities from analyzed data
            const analyzedData = await this.loadJSON(
                path.join(this.dataPath, 'analyzed_data.json'),
                { inventory_changes: [], financial_transactions: [], farm_activities: [] }
            );
            
            const allActivities = [
                ...analyzedData.inventory_changes,
                ...analyzedData.financial_transactions,
                ...analyzedData.farm_activities
            ];
            
            // Filter activities for this worker
            const workerActivities = allActivities.filter(a => {
                const activityWorkerId = this.generateWorkerId(
                    a.real_author || a.author || a.user_id || a.autor || ''
                );
                return activityWorkerId === workerId;
            });
            
            return {
                ...profile,
                recent_activities: workerActivities.slice(-100) // Last 100 activities
            };
            
        } catch (error) {
            logger.error(`Failed to load worker history: ${error.message}`);
            return {};
        }
    }
    
    /**
     * Log abuse action for audit trail
     */
    async logAbuseAction(workerId, activity, detection) {
        try {
            const abuseData = await this.loadJSON(this.abuseActionsFile, {
                actions: [],
                total_ignored: 0,
                total_charged: 0
            });
            
            const action = {
                id: `ABUSE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                worker_id: workerId,
                activity_id: activity.id,
                timestamp: new Date().toISOString(),
                detection: detection,
                status: detection.confidence_score < 0.3 ? 'blocked' : 'flagged',
                reviewed: false
            };
            
            abuseData.actions.push(action);
            
            if (action.status === 'blocked') {
                abuseData.total_ignored++;
            } else {
                abuseData.total_charged++;
            }
            
            abuseData.ultima_atualizacao = new Date().toISOString();
            
            await this.saveJSON(this.abuseActionsFile, abuseData);
            
        } catch (error) {
            logger.error(`Failed to log abuse action: ${error.message}`);
        }
    }
    
    /**
     * Check if item is a plant
     */
    isPlantItem(item) {
        if (!item) return false;
        const plantKeywords = ['plant', 'seed', 'corn', 'wheat', 'tomato', 'potato'];
        return plantKeywords.some(keyword => item.toLowerCase().includes(keyword));
    }
    
    /**
     * Generate worker ID from author string
     */
    generateWorkerId(author) {
        return author.toLowerCase()
            .replace(/[^a-z0-9]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '');
    }
    
    /**
     * Load JSON file
     */
    async loadJSON(filePath, defaultData = {}) {
        try {
            const data = await fs.readFile(filePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            if (error.code === 'ENOENT') {
                return defaultData;
            }
            throw error;
        }
    }
    
    /**
     * Save JSON file
     */
    async saveJSON(filePath, data) {
        await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
    }
}

module.exports = AbuseDetector;