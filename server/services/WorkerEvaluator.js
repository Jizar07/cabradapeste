const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

/**
 * WorkerEvaluator - Comprehensive worker performance evaluation and rating system
 * 
 * Features:
 * - Consistency score based on activity patterns
 * - Reliability score from task completion
 * - Efficiency score from items processed per hour
 * - Honesty score from cross-validation
 * - Overall 1-5 star rating system
 * - Performance trend tracking
 */
class WorkerEvaluator {
    constructor(dataPath) {
        this.dataPath = dataPath;
        
        // Data files
        this.workerProfilesFile = path.join(dataPath, 'worker_profiles.json');
        this.performanceMetricsFile = path.join(dataPath, 'performance_metrics.json');
        this.workerRatingsFile = path.join(dataPath, 'worker_ratings.json');
        this.abuseActionsFile = path.join(dataPath, 'abuse_actions.json');
        
        // Evaluation weights
        this.WEIGHTS = {
            consistency: 0.25,
            reliability: 0.25,
            efficiency: 0.25,
            honesty: 0.25
        };
        
        // Performance benchmarks
        this.BENCHMARKS = {
            // Consistency benchmarks
            MIN_ACTIVE_DAYS: 7,
            CONSISTENT_ACTIVITY_THRESHOLD: 0.7, // 70% of days active
            
            // Reliability benchmarks
            MIN_COMPLETION_RATE: 0.8, // 80% task completion
            
            // Efficiency benchmarks (items per hour)
            EXCELLENT_EFFICIENCY: 50,
            GOOD_EFFICIENCY: 30,
            AVERAGE_EFFICIENCY: 15,
            POOR_EFFICIENCY: 5,
            
            // Honesty benchmarks
            MAX_ABUSE_RATIO: 0.05, // Max 5% flagged activities
            TRUST_DECAY_RATE: 0.1 // Trust decreases by 10% per abuse
        };
        
        logger.info('✅ WorkerEvaluator initialized');
    }
    
    /**
     * Evaluate worker performance and generate rating
     */
    async evaluateWorker(workerId) {
        try {
            logger.info(`📊 Evaluating worker: ${workerId}`);
            
            // Load worker data
            const profile = await this.loadWorkerProfile(workerId);
            const abuseHistory = await this.loadAbuseHistory(workerId);
            const metrics = await this.loadPerformanceMetrics(workerId);
            
            // Calculate individual scores
            const scores = {
                consistency: this.calculateConsistencyScore(profile),
                reliability: this.calculateReliabilityScore(profile, metrics),
                efficiency: this.calculateEfficiencyScore(profile, metrics),
                honesty: this.calculateHonestyScore(profile, abuseHistory)
            };
            
            // Calculate weighted overall score
            const overallScore = this.calculateOverallScore(scores);
            
            // Generate star rating (1-5)
            const starRating = this.calculateStarRating(overallScore);
            
            // Analyze performance trends
            const trends = this.analyzePerformanceTrends(metrics);
            
            // Generate recommendations
            const recommendations = this.generateRecommendations(scores, trends);
            
            // Create evaluation report
            const evaluation = {
                worker_id: workerId,
                evaluation_date: new Date().toISOString(),
                scores: {
                    ...scores,
                    overall: overallScore
                },
                star_rating: starRating,
                trends: trends,
                recommendations: recommendations,
                statistics: this.generateStatistics(profile, metrics),
                badges: this.awardBadges(scores, profile)
            };
            
            // Save evaluation
            await this.saveEvaluation(workerId, evaluation);
            
            logger.info(`✅ Worker evaluation complete: ${workerId} - ${starRating} stars`);
            return evaluation;
            
        } catch (error) {
            logger.error(`❌ Worker evaluation failed: ${error.message}`);
            return {
                error: error.message,
                worker_id: workerId,
                star_rating: 0
            };
        }
    }
    
    /**
     * Calculate consistency score
     */
    calculateConsistencyScore(profile) {
        if (!profile.daily_stats || Object.keys(profile.daily_stats).length === 0) {
            return 0;
        }
        
        const days = Object.keys(profile.daily_stats);
        const totalDays = days.length;
        
        // Not enough history
        if (totalDays < this.BENCHMARKS.MIN_ACTIVE_DAYS) {
            return 0.5; // Neutral score for new workers
        }
        
        // Calculate date range
        const sortedDates = days.sort();
        const firstDate = new Date(sortedDates[0]);
        const lastDate = new Date(sortedDates[sortedDates.length - 1]);
        const dayRange = Math.ceil((lastDate - firstDate) / (1000 * 60 * 60 * 24)) + 1;
        
        // Calculate consistency ratio
        const consistencyRatio = totalDays / dayRange;
        
        // Calculate activity variance
        const activities = days.map(d => profile.daily_stats[d].activities);
        const avgActivities = activities.reduce((a, b) => a + b, 0) / activities.length;
        const variance = activities.reduce((sum, a) => sum + Math.pow(a - avgActivities, 2), 0) / activities.length;
        const coefficientOfVariation = Math.sqrt(variance) / (avgActivities || 1);
        
        // Lower CV means more consistent
        const varianceScore = Math.max(0, 1 - coefficientOfVariation);
        
        // Combine consistency metrics
        const score = (consistencyRatio * 0.6 + varianceScore * 0.4);
        
        return Math.min(1, Math.max(0, score));
    }
    
    /**
     * Calculate reliability score
     */
    calculateReliabilityScore(profile, metrics) {
        // Check task completion rate
        const totalTasks = metrics.assigned_tasks || 0;
        const completedTasks = metrics.completed_tasks || 0;
        
        if (totalTasks === 0) {
            // No assigned tasks, base on activity completion
            const totalActivities = profile.total_activities || 0;
            if (totalActivities === 0) return 0.5;
            
            // Use activity consistency as proxy
            return Math.min(1, totalActivities / 100); // Scale up to 100 activities
        }
        
        const completionRate = completedTasks / totalTasks;
        
        // Check for on-time delivery
        const onTimeDeliveries = metrics.on_time_deliveries || 0;
        const totalDeliveries = metrics.total_deliveries || completedTasks;
        const onTimeRate = totalDeliveries > 0 ? onTimeDeliveries / totalDeliveries : 1;
        
        // Combine reliability metrics
        const score = (completionRate * 0.7 + onTimeRate * 0.3);
        
        return Math.min(1, Math.max(0, score));
    }
    
    /**
     * Calculate efficiency score
     */
    calculateEfficiencyScore(profile, metrics) {
        if (!profile.daily_stats || Object.keys(profile.daily_stats).length === 0) {
            return 0;
        }
        
        // Calculate average items per hour
        let totalHours = 0;
        let totalItems = 0;
        
        Object.values(profile.daily_stats).forEach(day => {
            // Assume 8 hour work day or actual hours if tracked
            const hours = day.hours_worked || 8;
            totalHours += hours;
            totalItems += day.items || 0;
        });
        
        if (totalHours === 0) return 0;
        
        const itemsPerHour = totalItems / totalHours;
        
        // Score based on benchmarks
        let score;
        if (itemsPerHour >= this.BENCHMARKS.EXCELLENT_EFFICIENCY) {
            score = 1.0;
        } else if (itemsPerHour >= this.BENCHMARKS.GOOD_EFFICIENCY) {
            score = 0.8 + (itemsPerHour - this.BENCHMARKS.GOOD_EFFICIENCY) / 
                    (this.BENCHMARKS.EXCELLENT_EFFICIENCY - this.BENCHMARKS.GOOD_EFFICIENCY) * 0.2;
        } else if (itemsPerHour >= this.BENCHMARKS.AVERAGE_EFFICIENCY) {
            score = 0.6 + (itemsPerHour - this.BENCHMARKS.AVERAGE_EFFICIENCY) / 
                    (this.BENCHMARKS.GOOD_EFFICIENCY - this.BENCHMARKS.AVERAGE_EFFICIENCY) * 0.2;
        } else if (itemsPerHour >= this.BENCHMARKS.POOR_EFFICIENCY) {
            score = 0.4 + (itemsPerHour - this.BENCHMARKS.POOR_EFFICIENCY) / 
                    (this.BENCHMARKS.AVERAGE_EFFICIENCY - this.BENCHMARKS.POOR_EFFICIENCY) * 0.2;
        } else {
            score = itemsPerHour / this.BENCHMARKS.POOR_EFFICIENCY * 0.4;
        }
        
        return Math.min(1, Math.max(0, score));
    }
    
    /**
     * Calculate honesty score
     */
    calculateHonestyScore(profile, abuseHistory) {
        const totalActivities = profile.total_activities || 0;
        
        if (totalActivities === 0) {
            return 1.0; // Start with full trust
        }
        
        // Count abuse incidents
        const abuseCount = abuseHistory.length;
        const abuseRatio = abuseCount / totalActivities;
        
        // Start with perfect score
        let score = 1.0;
        
        // Deduct for abuse ratio
        if (abuseRatio > this.BENCHMARKS.MAX_ABUSE_RATIO) {
            score -= (abuseRatio - this.BENCHMARKS.MAX_ABUSE_RATIO) * 10; // Heavy penalty
        }
        
        // Apply decay for each abuse incident
        score -= abuseCount * this.BENCHMARKS.TRUST_DECAY_RATE;
        
        // Check for recent improvements
        const recentAbuseCount = abuseHistory.filter(a => {
            const daysSince = (Date.now() - new Date(a.timestamp).getTime()) / (1000 * 60 * 60 * 24);
            return daysSince <= 7;
        }).length;
        
        if (recentAbuseCount === 0 && abuseCount > 0) {
            // Bonus for recent good behavior
            score += 0.1;
        }
        
        return Math.min(1, Math.max(0, score));
    }
    
    /**
     * Calculate overall score
     */
    calculateOverallScore(scores) {
        return Object.keys(scores).reduce((total, key) => {
            return total + (scores[key] * this.WEIGHTS[key]);
        }, 0);
    }
    
    /**
     * Calculate star rating (1-5)
     */
    calculateStarRating(overallScore) {
        if (overallScore >= 0.9) return 5;
        if (overallScore >= 0.75) return 4;
        if (overallScore >= 0.6) return 3;
        if (overallScore >= 0.4) return 2;
        return 1;
    }
    
    /**
     * Analyze performance trends
     */
    analyzePerformanceTrends(metrics) {
        const trends = {
            overall: 'stable',
            consistency: 'stable',
            efficiency: 'stable',
            quality: 'stable'
        };
        
        if (!metrics.historical_scores || metrics.historical_scores.length < 2) {
            return trends;
        }
        
        // Compare recent scores to historical average
        const recent = metrics.historical_scores.slice(-3);
        const historical = metrics.historical_scores.slice(0, -3);
        
        if (historical.length > 0) {
            const recentAvg = recent.reduce((a, b) => a + b.overall, 0) / recent.length;
            const historicalAvg = historical.reduce((a, b) => a + b.overall, 0) / historical.length;
            
            const change = (recentAvg - historicalAvg) / historicalAvg;
            
            if (change > 0.1) trends.overall = 'improving';
            else if (change < -0.1) trends.overall = 'declining';
        }
        
        return trends;
    }
    
    /**
     * Generate recommendations
     */
    generateRecommendations(scores, trends) {
        const recommendations = [];
        
        // Consistency recommendations
        if (scores.consistency < 0.6) {
            recommendations.push({
                category: 'consistency',
                priority: 'high',
                message: 'Increase daily activity consistency',
                action: 'Set daily activity targets'
            });
        }
        
        // Reliability recommendations
        if (scores.reliability < 0.7) {
            recommendations.push({
                category: 'reliability',
                priority: 'high',
                message: 'Improve task completion rate',
                action: 'Focus on completing assigned tasks'
            });
        }
        
        // Efficiency recommendations
        if (scores.efficiency < 0.5) {
            recommendations.push({
                category: 'efficiency',
                priority: 'medium',
                message: 'Increase productivity',
                action: 'Optimize work processes'
            });
        }
        
        // Honesty recommendations
        if (scores.honesty < 0.8) {
            recommendations.push({
                category: 'honesty',
                priority: 'critical',
                message: 'Address flagged activities',
                action: 'Review and correct suspicious submissions'
            });
        }
        
        // Trend-based recommendations
        if (trends.overall === 'declining') {
            recommendations.push({
                category: 'performance',
                priority: 'high',
                message: 'Performance declining',
                action: 'Schedule performance review'
            });
        }
        
        return recommendations;
    }
    
    /**
     * Generate statistics
     */
    generateStatistics(profile, metrics) {
        return {
            total_activities: profile.total_activities || 0,
            active_days: Object.keys(profile.daily_stats || {}).length,
            total_items_processed: Object.values(profile.items_processed || {})
                .reduce((a, b) => a + b, 0),
            average_daily_activities: profile.daily_stats ? 
                Object.values(profile.daily_stats)
                    .reduce((sum, d) => sum + d.activities, 0) / 
                Object.keys(profile.daily_stats).length : 0,
            most_processed_item: this.getMostProcessedItem(profile.items_processed || {}),
            total_earnings: metrics.total_earnings || 0,
            paid_earnings: metrics.paid_earnings || 0,
            pending_earnings: (metrics.total_earnings || 0) - (metrics.paid_earnings || 0)
        };
    }
    
    /**
     * Award badges based on performance
     */
    awardBadges(scores, profile) {
        const badges = [];
        
        // Performance badges
        if (scores.overall >= 0.9) {
            badges.push({ id: 'elite', name: '⭐ Elite Performer', description: '90%+ overall score' });
        }
        
        if (scores.consistency >= 0.9) {
            badges.push({ id: 'consistent', name: '📅 Consistency Master', description: '90%+ consistency' });
        }
        
        if (scores.efficiency >= 0.9) {
            badges.push({ id: 'efficient', name: '⚡ Speed Demon', description: '90%+ efficiency' });
        }
        
        if (scores.honesty === 1.0) {
            badges.push({ id: 'trusted', name: '✅ Fully Trusted', description: 'Perfect honesty score' });
        }
        
        // Activity milestones
        const totalActivities = profile.total_activities || 0;
        if (totalActivities >= 1000) {
            badges.push({ id: 'veteran', name: '🎖️ Veteran', description: '1000+ activities' });
        } else if (totalActivities >= 500) {
            badges.push({ id: 'experienced', name: '💼 Experienced', description: '500+ activities' });
        } else if (totalActivities >= 100) {
            badges.push({ id: 'active', name: '🏃 Active Worker', description: '100+ activities' });
        }
        
        return badges;
    }
    
    /**
     * Get most processed item
     */
    getMostProcessedItem(itemsProcessed) {
        if (!itemsProcessed || Object.keys(itemsProcessed).length === 0) {
            return null;
        }
        
        return Object.entries(itemsProcessed)
            .sort((a, b) => b[1] - a[1])[0];
    }
    
    /**
     * Load worker profile
     */
    async loadWorkerProfile(workerId) {
        try {
            const profiles = await this.loadJSON(this.workerProfilesFile, { profiles: {} });
            return profiles.profiles[workerId] || {};
        } catch (error) {
            logger.error(`Failed to load worker profile: ${error.message}`);
            return {};
        }
    }
    
    /**
     * Load abuse history
     */
    async loadAbuseHistory(workerId) {
        try {
            const abuseData = await this.loadJSON(this.abuseActionsFile, { actions: [] });
            return abuseData.actions.filter(a => a.worker_id === workerId);
        } catch (error) {
            logger.error(`Failed to load abuse history: ${error.message}`);
            return [];
        }
    }
    
    /**
     * Load performance metrics
     */
    async loadPerformanceMetrics(workerId) {
        try {
            const metrics = await this.loadJSON(this.performanceMetricsFile, { metrics: {} });
            return metrics.metrics[workerId] || {};
        } catch (error) {
            logger.error(`Failed to load performance metrics: ${error.message}`);
            return {};
        }
    }
    
    /**
     * Save evaluation
     */
    async saveEvaluation(workerId, evaluation) {
        try {
            const ratings = await this.loadJSON(this.workerRatingsFile, { ratings: {} });
            
            if (!ratings.ratings[workerId]) {
                ratings.ratings[workerId] = {
                    history: [],
                    current: null
                };
            }
            
            // Add to history
            ratings.ratings[workerId].history.push(evaluation);
            
            // Keep only last 30 evaluations
            if (ratings.ratings[workerId].history.length > 30) {
                ratings.ratings[workerId].history = ratings.ratings[workerId].history.slice(-30);
            }
            
            // Set as current
            ratings.ratings[workerId].current = evaluation;
            
            // Update metrics with historical scores
            const metrics = await this.loadJSON(this.performanceMetricsFile, { metrics: {} });
            if (!metrics.metrics[workerId]) {
                metrics.metrics[workerId] = {};
            }
            
            metrics.metrics[workerId].historical_scores = ratings.ratings[workerId].history.map(e => ({
                date: e.evaluation_date,
                overall: e.scores.overall
            }));
            
            // Save both files
            await this.saveJSON(this.workerRatingsFile, ratings);
            await this.saveJSON(this.performanceMetricsFile, metrics);
            
        } catch (error) {
            logger.error(`Failed to save evaluation: ${error.message}`);
        }
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

module.exports = WorkerEvaluator;