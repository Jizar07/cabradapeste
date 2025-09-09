const fs = require('fs').promises;
const path = require('path');
const logger = require('./utils/logger');

class DataAnalyzer {
    constructor(dataPath) {
        this.dataPath = dataPath;
        this.botDataFile = path.join(dataPath, 'bot_data.json');
        this.analyzedDataFile = path.join(dataPath, 'analyzed_data.json');
        this.saldoFazendaFile = path.join(dataPath, 'saldo_fazenda.json');
    }

    /**
     * Analyze raw bot data and save processed results
     */
    async analyzeData() {
        try {
            logger.info('🔍 Starting data analysis...');

            // Load raw bot data
            const rawData = await this.loadBotData();
            if (!rawData.raw_messages.length) {
                logger.info('📭 No raw messages to analyze');
                return { success: true, processed: 0 };
            }

            // Process and categorize messages
            const processed = await this.processMessages(rawData.raw_messages);

            // Save analyzed data
            await this.saveAnalyzedData(processed);

            // Update farm balance from financial transactions
            await this.updateFarmBalance(processed.financial_transactions);

            logger.info(`✅ Analysis complete: ${processed.summary.total_activities} activities processed`);
            return { success: true, processed: processed.summary.total_activities };

        } catch (error) {
            logger.error('❌ Data analysis error:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Load raw bot data
     */
    async loadBotData() {
        try {
            const data = await fs.readFile(this.botDataFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            logger.warn('⚠️ Bot data file not found, returning empty data');
            return { raw_messages: [], last_updated: null, total_messages: 0 };
        }
    }

    /**
     * Process raw messages into categorized data
     */
    async processMessages(messages) {
        console.log(`🚨 ANALYZER DEBUG: Starting to process ${messages.length} raw messages`);
        
        // Load existing analyzed data
        const existingData = await this.getAnalyzedData();

        // Start with existing data structure
        const processed = existingData ? {
            ...existingData,
            last_analyzed: new Date().toISOString()
        } : {
            farm_activities: [],
            financial_transactions: [],
            inventory_changes: [],
            user_activities: {},
            summary: {
                total_activities: 0,
                latest_activity: null,
                activity_types: {},
                active_users: []
            },
            last_analyzed: new Date().toISOString()
        };

        let processedCount = 0;
        let skippedCount = 0;

        for (const message of messages) {
            console.log(`🔍 Processing message ID: ${message.id}, Author: ${message.author}`);
            const activity = this.parseMessage(message);
            if (activity) {
                processedCount++;
                console.log(`✅ Parsed activity: ${activity.type} - ${activity.details?.item || 'financial'} x${activity.details?.quantity || activity.details?.amount}`);
                
                // Categorize activity
                this.categorizeActivity(activity, processed);
                
                // Update user activities
                this.updateUserActivity(activity, processed);
                
                // Update summary
                this.updateSummary(activity, processed);
            } else {
                skippedCount++;
                console.log(`❌ SKIPPED message ID: ${message.id} - could not parse activity`);
                console.log(`❌ Message content:`, message.content?.substring(0, 200));
                console.log(`❌ Message embeds:`, message.raw_embeds ? `${message.raw_embeds.length} embeds` : 'no embeds');
            }
        }

        console.log(`🚨 ANALYZER SUMMARY: Processed ${processedCount}/${messages.length} total, Skipped ${skippedCount}`);
        console.log(`📊 Final counts: Financial: ${processed.financial_transactions.length}, Inventory: ${processed.inventory_changes.length}, Farm: ${processed.farm_activities.length}`);

        return processed;
    }

    /**
     * Parse individual message into activity
     */
    parseMessage(message) {
        try {
            const { content, author, gameTimestamp, raw_embeds } = message;
            
            // Extract activity type from embeds first, then content
            let activityType = 'unknown';
            let details = {};
            let realAuthor = author;

            // Parse Captain Hook embeds
            if (raw_embeds && raw_embeds.length > 0) {
                const embed = raw_embeds[0];
                const title = embed.title || '';
                
                if (title.includes('INSERIR ITEM')) {
                    activityType = 'item_add';
                    details = this.parseEmbedItemActivity(embed, 'add');
                    realAuthor = this.extractAuthorFromEmbed(embed);
                } else if (title.includes('REMOVER ITEM')) {
                    activityType = 'item_remove';
                    details = this.parseEmbedItemActivity(embed, 'remove');
                    realAuthor = this.extractAuthorFromEmbed(embed);
                } else if (title.includes('DEPÓSITO')) {
                    activityType = 'deposit';
                    details = this.parseEmbedFinancialActivity(embed, 'deposit');
                    realAuthor = this.extractAuthorFromEmbed(embed);
                } else if (title.includes('SAQUE')) {
                    activityType = 'withdrawal';
                    details = this.parseEmbedFinancialActivity(embed, 'withdrawal');
                    realAuthor = this.extractAuthorFromEmbed(embed);
                }
            }
            // Fallback to content parsing
            else if (content.includes('INSERIR ITEM') || content.includes('Item adicionado:')) {
                activityType = 'item_add';
                details = this.parseItemActivity(content, 'add');
            } else if (content.includes('REMOVER ITEM') || content.includes('Item removido:')) {
                activityType = 'item_remove';
                details = this.parseItemActivity(content, 'remove');
            } else if (content.includes('DEPÓSITO')) {
                activityType = 'deposit';
                details = this.parseFinancialActivity(content, 'deposit');
            } else if (content.includes('SAQUE')) {
                activityType = 'withdrawal';
                details = this.parseFinancialActivity(content, 'withdrawal');
            }

            return {
                id: message.id || `${Date.now()}_${Math.random()}`,
                type: activityType,
                author: realAuthor,
                content: content,
                gameTimestamp: gameTimestamp,
                timestamp: message.timestamp || new Date().toISOString(),
                details: details,
                raw_message: message
            };

        } catch (error) {
            logger.warn('⚠️ Failed to parse message:', error.message);
            return null;
        }
    }

    /**
     * Parse item activity (add/remove)
     */
    parseItemActivity(content, action) {
        const details = { action };
        
        // Extract item and quantity
        const itemMatch = content.match(/(\d+)x?\s+(.+?)(?:\s|$)/);
        if (itemMatch) {
            details.quantity = parseInt(itemMatch[1]);
            details.item = itemMatch[2].trim();
        }

        return details;
    }

    /**
     * Parse financial activity (deposit/withdrawal)
     */
    parseFinancialActivity(content, action) {
        const details = { action };
        
        // Extract amount
        const amountMatch = content.match(/\$?([\d,]+(?:\.\d{2})?)/);
        if (amountMatch) {
            details.amount = parseFloat(amountMatch[1].replace(',', ''));
        }

        return details;
    }

    /**
     * Categorize activity into appropriate arrays
     */
    categorizeActivity(activity, processed) {
        switch (activity.type) {
            case 'item_add':
            case 'item_remove':
                processed.inventory_changes.push(activity);
                break;
            case 'deposit':
            case 'withdrawal':
                processed.financial_transactions.push(activity);
                break;
            default:
                processed.farm_activities.push(activity);
        }
    }

    /**
     * Update user activity tracking
     */
    updateUserActivity(activity, processed) {
        const username = activity.author;
        if (!processed.user_activities[username]) {
            processed.user_activities[username] = {
                total_activities: 0,
                activity_types: {},
                last_activity: null
            };
        }

        processed.user_activities[username].total_activities++;
        processed.user_activities[username].activity_types[activity.type] = 
            (processed.user_activities[username].activity_types[activity.type] || 0) + 1;
        processed.user_activities[username].last_activity = activity.timestamp;
    }

    /**
     * Update summary statistics
     */
    updateSummary(activity, processed) {
        processed.summary.total_activities++;
        processed.summary.activity_types[activity.type] = 
            (processed.summary.activity_types[activity.type] || 0) + 1;
        
        if (!processed.summary.latest_activity || activity.timestamp > processed.summary.latest_activity) {
            processed.summary.latest_activity = activity.timestamp;
        }

        // Update active users
        if (!processed.summary.active_users.includes(activity.author)) {
            processed.summary.active_users.push(activity.author);
        }
    }

    /**
     * Save analyzed data to file
     */
    async saveAnalyzedData(processed) {
        await fs.writeFile(this.analyzedDataFile, JSON.stringify(processed, null, 2));
        logger.info('💾 Analyzed data saved');
    }

    /**
     * Get analyzed data
     */
    async getAnalyzedData() {
        try {
            const data = await fs.readFile(this.analyzedDataFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            logger.warn('⚠️ Analyzed data file not found');
            return null;
        }
    }

    /**
     * Parse embed item activity
     */
    parseEmbedItemActivity(embed, action) {
        const details = { action };
        
        if (embed.fields) {
            for (const field of embed.fields) {
                if (field.name.includes('Item removido:') || field.name.includes('Item adicionado:')) {
                    // Extract from prolog format: ```prolog\ntrigo x200\n```
                    const match = field.value.match(/```prolog\n(.+?)\s+x(\d+)\n```/);
                    if (match) {
                        details.item = match[1];
                        details.quantity = parseInt(match[2]);
                    }
                }
            }
        }
        
        return details;
    }

    /**
     * Parse embed financial activity
     */
    parseEmbedFinancialActivity(embed, action) {
        const details = { action };
        
        if (embed.fields) {
            for (const field of embed.fields) {
                if (field.name.includes('Valor depositado:') || field.name.includes('Valor sacado:')) {
                    // Extract from prolog format: ```prolog\n$160.0\n```
                    const match = field.value.match(/```prolog\n\$?([\d.]+)\n```/);
                    if (match) {
                        details.amount = parseFloat(match[1]);
                    }
                } else if (field.name.includes('Saldo após')) {
                    // Extract balance from prolog format: ```prolog\n$3040.7\n```
                    const match = field.value.match(/```prolog\n\$?([\d.]+)\n```/);
                    if (match) {
                        details.balance_after = parseFloat(match[1]);
                    }
                }
            }
        }
        
        return details;
    }

    /**
     * Extract real author from embed fields
     */
    extractAuthorFromEmbed(embed) {
        if (embed.fields) {
            for (const field of embed.fields) {
                if (field.name.includes('Autor:')) {
                    // Extract from prolog format: ```prolog\nZero Bala | FIXO: 74829\n```
                    const match = field.value.match(/```prolog\n(.+?)\s+\|\s+FIXO:/);
                    if (match) {
                        return match[1];
                    }
                }
            }
        }
        return 'Captain Hook'; // fallback
    }

    /**
     * Delete a transaction from both bot_data and analyzed_data
     */
    async deleteTransaction(transactionId) {
        try {
            console.log(`🗑️ Deleting transaction: ${transactionId}`);
            
            // Load bot data
            let botData = await this.loadBotData();
            let deletedFromBotData = false;
            
            // Find and remove from bot_data.json
            if (botData.raw_messages) {
                const originalLength = botData.raw_messages.length;
                botData.raw_messages = botData.raw_messages.filter(msg => msg.id !== transactionId);
                deletedFromBotData = botData.raw_messages.length < originalLength;
                
                if (deletedFromBotData) {
                    botData.total_messages = botData.raw_messages.length;
                    botData.last_updated = new Date().toISOString();
                    await fs.writeFile(this.botDataFile, JSON.stringify(botData, null, 2));
                    console.log(`✅ Deleted transaction ${transactionId} from bot_data.json`);
                }
            }
            
            // Load analyzed data
            let analyzedData = await this.getAnalyzedData();
            let deletedFromAnalyzed = false;
            
            if (analyzedData) {
                // Remove from all activity arrays
                const categories = ['financial_transactions', 'inventory_changes', 'farm_activities'];
                
                for (const category of categories) {
                    if (analyzedData[category]) {
                        const originalLength = analyzedData[category].length;
                        analyzedData[category] = analyzedData[category].filter(activity => activity.id !== transactionId);
                        if (analyzedData[category].length < originalLength) {
                            deletedFromAnalyzed = true;
                            console.log(`✅ Deleted transaction ${transactionId} from ${category}`);
                        }
                    }
                }
                
                if (deletedFromAnalyzed) {
                    // Update summary
                    const totalActivities = 
                        (analyzedData.financial_transactions?.length || 0) +
                        (analyzedData.inventory_changes?.length || 0) +
                        (analyzedData.farm_activities?.length || 0);
                    
                    analyzedData.summary.total_activities = totalActivities;
                    analyzedData.last_analyzed = new Date().toISOString();
                    
                    await fs.writeFile(this.analyzedDataFile, JSON.stringify(analyzedData, null, 2));
                    console.log(`✅ Updated analyzed_data.json after deletion`);
                }
            }
            
            return { 
                success: true, 
                deleted: deletedFromBotData || deletedFromAnalyzed,
                deletedFromBotData,
                deletedFromAnalyzed 
            };
            
        } catch (error) {
            console.error('❌ Error deleting transaction:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Update farm balance from financial transactions
     */
    async updateFarmBalance(financialTransactions) {
        try {
            // Load current balance data
            let saldoData;
            try {
                const data = await fs.readFile(this.saldoFazendaFile, 'utf8');
                saldoData = JSON.parse(data);
            } catch (error) {
                saldoData = {
                    saldo_atual: 0,
                    ultima_atualizacao: null,
                    historico_saldos: []
                };
            }

            // Find transactions with balance_after data
            const balanceTransactions = financialTransactions
                .filter(t => t.details && t.details.balance_after !== undefined)
                .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

            if (balanceTransactions.length === 0) {
                return; // No balance updates to process
            }

            // Update balance from most recent transaction
            const latestTransaction = balanceTransactions[balanceTransactions.length - 1];
            const newBalance = latestTransaction.details.balance_after;
            const previousBalance = saldoData.saldo_atual;

            if (newBalance !== previousBalance) {
                // Add to history
                saldoData.historico_saldos.push({
                    saldo_anterior: previousBalance,
                    saldo_novo: newBalance,
                    timestamp: latestTransaction.timestamp
                });

                // Update current balance
                saldoData.saldo_atual = newBalance;
                saldoData.ultima_atualizacao = latestTransaction.timestamp;

                // Save updated balance
                await fs.writeFile(this.saldoFazendaFile, JSON.stringify(saldoData, null, 2));
                logger.info(`💰 Farm balance updated: $${previousBalance} → $${newBalance}`);
            }

        } catch (error) {
            logger.error('❌ Failed to update farm balance:', error.message);
        }
    }

    /**
     * Get analyzed data from file
     */
    async getAnalyzedData() {
        try {
            const data = await fs.readFile(this.analyzedDataFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            logger.warn('⚠️ No analyzed data file found');
            return null;
        }
    }
}

module.exports = DataAnalyzer;