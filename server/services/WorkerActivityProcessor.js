const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

/**
 * WorkerActivityProcessor - Automated worker management from dashboard activities
 * 
 * Features:
 * - Auto-detect new workers from Discord activities
 * - Process activities and calculate earnings automatically
 * - Maintain worker profiles and activity history
 * - Real-time synchronization with dashboard data
 */
class WorkerActivityProcessor {
    constructor(dataPath, dataManager) {
        this.dataPath = dataPath;
        this.dataManager = dataManager;
        
        // Data files
        this.analyzedDataFile = path.join(dataPath, 'analyzed_data.json');
        this.workerProfilesFile = path.join(dataPath, 'worker_profiles.json');
        this.usuariosFile = path.join(dataPath, 'usuarios.json');
        this.pagamentosFile = path.join(dataPath, 'pagamentos.json');
        
        // Pricing configuration
        this.PLANT_PRICES = {
            premium: ['corn', 'bulrush', 'trigo', 'milho', 'junco'],
            premium_price: 0.15,
            regular_price: 0.20
        };
        
        this.ANIMAL_DELIVERY_PRICE = 160; // $160 per delivery (4 animals)
        
        logger.info('✅ WorkerActivityProcessor initialized');
    }
    
    /**
     * Process all dashboard activities and update worker data
     */
    async processAllActivities() {
        try {
            logger.info('🔄 Starting automated activity processing...');
            
            // Load current data
            const analyzedData = await this.loadJSON(this.analyzedDataFile);
            const workerProfiles = await this.loadJSON(this.workerProfilesFile, { profiles: {} });
            const usuarios = await this.loadJSON(this.usuariosFile, { usuarios: {} });
            
            // Track processing statistics
            const stats = {
                new_workers: 0,
                activities_processed: 0,
                earnings_calculated: 0,
                services_detected: {
                    plantacao: 0,
                    animais: 0,
                    financeiro: 0
                }
            };
            
            // Process all activity types
            const allActivities = [
                ...(analyzedData.inventory_changes || []),
                ...(analyzedData.financial_transactions || []),
                ...(analyzedData.farm_activities || [])
            ];
            
            logger.info(`📊 Processing ${allActivities.length} total activities`);
            
            for (const activity of allActivities) {
                try {
                    // Extract worker information
                    const workerInfo = this.extractWorkerInfo(activity);
                    if (!workerInfo.id) continue;
                    
                    // Auto-register new worker if needed
                    if (!usuarios.usuarios[workerInfo.id]) {
                        await this.registerNewWorker(workerInfo, usuarios);
                        stats.new_workers++;
                    }
                    
                    // Update worker profile
                    await this.updateWorkerProfile(workerInfo.id, activity, workerProfiles);
                    
                    // Process activity for earnings
                    const earnings = await this.calculateActivityEarnings(activity);
                    if (earnings.amount > 0) {
                        await this.recordEarnings(workerInfo.id, activity, earnings);
                        stats.earnings_calculated += earnings.amount;
                        stats.services_detected[earnings.service_type]++;
                    }
                    
                    stats.activities_processed++;
                    
                } catch (error) {
                    logger.warn(`⚠️ Failed to process activity: ${error.message}`);
                }
            }
            
            // Save updated data
            await this.saveJSON(this.usuariosFile, usuarios);
            await this.saveJSON(this.workerProfilesFile, workerProfiles);
            
            // Emit real-time updates
            if (this.dataManager && this.dataManager.io) {
                this.dataManager.io.emit('workers:updated', { stats, timestamp: new Date().toISOString() });
            }
            
            logger.info(`✅ Activity processing complete:`, stats);
            return { success: true, stats };
            
        } catch (error) {
            logger.error('❌ Activity processing failed:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Extract worker information from activity
     */
    extractWorkerInfo(activity) {
        let workerName = null;
        let fixoId = null;
        
        // Try to extract from Discord embed fields first
        if (activity.raw_message && activity.raw_message.raw_embeds) {
            const embed = activity.raw_message.raw_embeds[0];
            if (embed && embed.fields) {
                // Look for "Autor:" field with "Name | FIXO: ID" format
                const autorField = embed.fields.find(f => f.name && f.name.includes('Autor'));
                if (autorField && autorField.value) {
                    const autorMatch = autorField.value.match(/```prolog\n(.+?)\s*\|\s*FIXO:\s*(\d+)\n```/);
                    if (autorMatch) {
                        workerName = autorMatch[1].trim();
                        fixoId = autorMatch[2];
                    }
                }
                
                // If not found in Autor, try "Ação:" field for animal deliveries
                if (!workerName) {
                    const acaoField = embed.fields.find(f => f.name && f.name.includes('Ação'));
                    if (acaoField && acaoField.value) {
                        // Extract from "Name vendeu X animais no matadouro"
                        const acaoMatch = acaoField.value.match(/```prolog\n(.+?)\s+vendeu\s+\d+\s+animais/);
                        if (acaoMatch) {
                            workerName = acaoMatch[1].trim();
                            // Try to find FIXO ID in content field
                            if (activity.content) {
                                const fixoMatch = activity.content.match(/FIXO:\s*(\d+)/);
                                if (fixoMatch) {
                                    fixoId = fixoMatch[1];
                                }
                            }
                        }
                    }
                }
            }
        }
        
        // Fallback to content parsing if embed extraction failed
        if (!workerName && activity.content) {
            const contentMatch = activity.content.match(/Autor::\s*(.+?)\s*\|\s*FIXO:\s*(\d+)/);
            if (contentMatch) {
                workerName = contentMatch[1].trim();
                fixoId = contentMatch[2];
            }
        }
        
        // Final fallback to old method
        if (!workerName) {
            const author = activity.real_author || activity.author || activity.user_id || activity.autor || 'unknown';
            workerName = author;
            fixoId = null;
        }
        
        return {
            id: fixoId || this.generateWorkerId(workerName), // Use FIXO ID as the actual ID
            name: workerName,
            fixo_id: fixoId,
            full_name: fixoId ? `${workerName} | FIXO: ${fixoId}` : workerName,
            discord_id: workerName
        };
    }
    
    /**
     * Generate consistent worker ID from author string
     */
    generateWorkerId(author) {
        // Remove special characters and spaces, convert to lowercase
        return author.toLowerCase()
            .replace(/[^a-z0-9]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '');
    }
    
    /**
     * Register new worker automatically
     */
    async registerNewWorker(workerInfo, usuarios) {
        logger.info(`👤 Registering new worker: ${workerInfo.name} (FIXO: ${workerInfo.fixo_id})`);
        
        // Only register if we have a valid FIXO ID
        if (!workerInfo.fixo_id) {
            logger.warn(`❌ Cannot register worker ${workerInfo.name} - no FIXO ID found`);
            return null;
        }
        
        const newUser = {
            nome: workerInfo.name,
            fixo_id: workerInfo.fixo_id,
            funcao: 'trabalhador',
            ativo: true,
            origem: 'discord_automation',
            criado_em: new Date().toISOString(),
            auto_registered: true,
            first_activity: new Date().toISOString()
        };
        
        // Use FIXO ID as the key in usuarios object
        usuarios.usuarios[workerInfo.fixo_id] = newUser;
        
        logger.info(`✅ Worker registered: ${workerInfo.name} (FIXO: ${workerInfo.fixo_id})`);
        return newUser;
    }
    
    /**
     * Update worker profile with activity data
     */
    async updateWorkerProfile(workerId, activity, workerProfiles) {
        if (!workerProfiles.profiles[workerId]) {
            workerProfiles.profiles[workerId] = {
                id: workerId,
                total_activities: 0,
                first_activity: activity.timestamp,
                last_activity: activity.timestamp,
                activity_types: {},
                items_processed: {},
                daily_stats: {}
            };
        }
        
        const profile = workerProfiles.profiles[workerId];
        
        // Update activity counts
        profile.total_activities++;
        profile.last_activity = activity.timestamp;
        
        // Track activity types
        const activityType = activity.type || 'unknown';
        profile.activity_types[activityType] = (profile.activity_types[activityType] || 0) + 1;
        
        // Track items processed
        if (activity.details && activity.details.item) {
            const item = activity.details.item;
            profile.items_processed[item] = (profile.items_processed[item] || 0) + (activity.details.quantity || 1);
        }
        
        // Update daily statistics
        const date = new Date(activity.timestamp).toISOString().split('T')[0];
        if (!profile.daily_stats[date]) {
            profile.daily_stats[date] = {
                activities: 0,
                earnings: 0,
                items: 0
            };
        }
        profile.daily_stats[date].activities++;
        if (activity.details && activity.details.quantity) {
            profile.daily_stats[date].items += activity.details.quantity;
        }
        
        return profile;
    }
    
    /**
     * Calculate earnings from activity
     */
    async calculateActivityEarnings(activity) {
        const earnings = {
            amount: 0,
            service_type: 'unknown',
            details: {}
        };
        
        // Plant services
        if (activity.type === 'item_add' && activity.details && activity.details.item) {
            const item = activity.details.item.toLowerCase();
            const quantity = activity.details.quantity || 0;
            
            // Check if it's a plant item
            const isPlant = this.isPlantItem(item);
            if (isPlant) {
                const isPremium = this.PLANT_PRICES.premium.some(p => item.includes(p));
                const pricePerUnit = isPremium ? this.PLANT_PRICES.premium_price : this.PLANT_PRICES.regular_price;
                
                earnings.amount = quantity * pricePerUnit;
                earnings.service_type = 'plantacao';
                earnings.details = {
                    item: activity.details.item,
                    quantity,
                    price_per_unit: pricePerUnit,
                    is_premium: isPremium
                };
            }
        }
        
        // Animal deliveries (deposits of $160)
        else if (activity.type === 'deposit' && activity.details && activity.details.amount === 160) {
            earnings.amount = this.ANIMAL_DELIVERY_PRICE;
            earnings.service_type = 'animais';
            earnings.details = {
                delivery_count: 1,
                animals_delivered: 4,
                standard_payment: true
            };
        }
        
        // Financial contributions
        else if (activity.type === 'deposit' && activity.details && activity.details.amount && activity.details.amount !== 160) {
            // Non-animal deposits are tracked but not paid as earnings
            earnings.amount = 0; // No payment for regular deposits
            earnings.service_type = 'financeiro';
            earnings.details = {
                contribution: activity.details.amount,
                type: 'deposit'
            };
        }
        
        return earnings;
    }
    
    /**
     * Check if item is a plant
     */
    isPlantItem(item) {
        const plantKeywords = [
            'corn', 'bulrush', 'trigo', 'milho', 'junco', 'wheat',
            'tomate', 'tomato', 'batata', 'potato', 'cenoura', 'carrot',
            'alface', 'lettuce', 'couve', 'cabbage', 'pimentao', 'pepper',
            'melancia', 'watermelon', 'abobora', 'pumpkin', 'pepino', 'cucumber',
            'repolho', 'espinafre', 'spinach', 'cebola', 'onion', 'alho', 'garlic',
            'morango', 'strawberry', 'beringela', 'eggplant', 'brocolis', 'broccoli',
            'couve_flor', 'cauliflower', 'maca', 'apple', 'oregano',
            'black_berry', 'blackberry', 'mushroom', 'cogumelo',
            'black_currant', 'blackcurrant', 'sage', 'seed', 'plant'
        ];
        
        const itemLower = item.toLowerCase();
        return plantKeywords.some(keyword => itemLower.includes(keyword));
    }
    
    /**
     * Record earnings in payment system
     */
    async recordEarnings(workerId, activity, earnings) {
        if (earnings.amount <= 0) return;
        
        try {
            const pagamentos = await this.loadJSON(this.pagamentosFile, { pagamentos: [] });
            
            // Check if payment already exists for this activity
            const existingPayment = pagamentos.pagamentos.find(p => 
                p.atividade_id === activity.id && p.usuario_id === workerId
            );
            
            if (!existingPayment) {
                const payment = {
                    id: `PAY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    usuario_id: workerId,
                    atividade_id: activity.id,
                    tipo_servico: earnings.service_type,
                    valor: earnings.amount,
                    detalhes: [earnings.details],
                    timestamp: activity.timestamp,
                    pago: false,
                    auto_processed: true,
                    processed_at: new Date().toISOString()
                };
                
                pagamentos.pagamentos.push(payment);
                await this.saveJSON(this.pagamentosFile, pagamentos);
                
                logger.info(`💰 Recorded earnings: ${workerId} - $${earnings.amount} (${earnings.service_type})`);
            }
            
        } catch (error) {
            logger.error(`Failed to record earnings: ${error.message}`);
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

module.exports = WorkerActivityProcessor;