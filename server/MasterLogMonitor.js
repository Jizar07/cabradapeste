const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const logger = require('./utils/logger');

/**
 * MasterLogMonitor - Monitors webhook_master_log.json and processes entries
 * 
 * This system ensures 100% reliability by:
 * 1. Monitoring the master log file for changes
 * 2. Processing any unprocessed entries
 * 3. Tracking which entries have been processed
 * 4. Never losing any webhook data
 */
class MasterLogMonitor {
    constructor(dataManager, io) {
        this.dataManager = dataManager;
        this.io = io;
        this.dataPath = path.join(__dirname, '..', 'data');
        this.masterLogPath = path.join(this.dataPath, 'webhook_master_log.json');
        this.statusPath = path.join(this.dataPath, 'processing_status.json');
        
        this.lastProcessedId = this.loadLastProcessedId();
        this.isProcessing = false;
        
        this.startMonitoring();
        
        // Process ALL entries on startup to fix the data
        this.processNewEntries();
        
        logger.info('🔍 MasterLogMonitor initialized - watching webhook_master_log.json');
    }
    
    /**
     * Start monitoring the master log file
     */
    startMonitoring() {
        // Watch the master log file for changes
        this.watcher = chokidar.watch(this.masterLogPath, {
            persistent: true,
            ignoreInitial: true
        });
        
        this.watcher.on('change', () => {
            logger.info('📁 Master log file changed - processing new entries');
            this.processNewEntries();
        });
        
        // NO TIMER - ONLY FILE CHANGES TRIGGER PROCESSING
        // Real-time only, no periodic checks
        
        logger.info('👁️ File monitoring started for webhook_master_log.json');
    }
    
    /**
     * Process any new unprocessed entries from master log
     */
    async processNewEntries() {
        if (this.isProcessing) {
            return; // Avoid concurrent processing
        }
        
        this.isProcessing = true;
        
        try {
            const masterLog = this.loadMasterLog();
            if (!masterLog || !masterLog.webhooks) {
                this.isProcessing = false;
                return;
            }
            
            // Find entries that haven't been processed yet
            const newEntries = masterLog.webhooks.filter(w => w.id > this.lastProcessedId);
            
            if (newEntries.length === 0) {
                this.isProcessing = false;
                return;
            }
            
            logger.info(`📊 Processing ${newEntries.length} new webhook entries (from ID ${this.lastProcessedId + 1})`);
            
            let successCount = 0;
            let errorCount = 0;
            
            for (const entry of newEntries) {
                try {
                    const success = await this.processWebhookEntry(entry);
                    if (success) {
                        this.lastProcessedId = entry.id;
                        this.saveLastProcessedId();
                        successCount++;
                        logger.info(`✅ Processed webhook ID ${entry.id}`);
                    } else {
                        errorCount++;
                        logger.warn(`⚠️ Failed to process webhook ID ${entry.id} - will retry later`);
                        break; // Stop processing if we hit an error to maintain order
                    }
                } catch (error) {
                    errorCount++;
                    logger.error(`❌ Error processing webhook ID ${entry.id}:`, error);
                    break; // Stop processing if we hit an error to maintain order
                }
            }
            
            logger.info(`📈 Batch processing complete: ${successCount} success, ${errorCount} errors`);
            
        } catch (error) {
            logger.error('❌ Error in processNewEntries:', error);
        } finally {
            this.isProcessing = false;
        }
    }
    
    /**
     * Process a single webhook entry
     */
    async processWebhookEntry(entry) {
        try {
            const webhookData = entry.raw_webhook;
            if (!webhookData) {
                logger.warn(`⚠️ Webhook entry ${entry.id} has no raw_webhook data`);
                return false;
            }
            
            // Use the same processing logic as WebhookHandler
            const result = this.processWebhookData(webhookData);
            
            if (result && result.success) {
                // Emit real-time updates using the same format as DataManager
                this.io.emit('atividades:atualizado', this.dataManager.obterAtividadesRecentes(20));
                this.io.emit('dashboard:atualizado', this.dataManager.obterEstatisticasDashboard());
                
                return true;
            } else {
                logger.warn(`⚠️ Webhook processing failed for entry ${entry.id}:`, result);
                return false;
            }
            
        } catch (error) {
            logger.error(`❌ Error processing webhook entry ${entry.id}:`, error);
            return false;
        }
    }
    
    /**
     * Convert Discord timestamp to ISO format
     */
    convertDiscordTimestampToISO(dateStr, timeStr) {
        try {
            // dateStr format: DD/MM/YYYY
            // timeStr format: HH:MM:SS
            const [day, month, year] = dateStr.split('/');
            const [hours, minutes, seconds] = timeStr.split(':');
            
            // Create Date object (month is 0-indexed)
            const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 
                                  parseInt(hours), parseInt(minutes), parseInt(seconds));
            
            return date.toISOString();
        } catch (error) {
            logger.warn('Error converting Discord timestamp:', error);
            return new Date().toISOString();
        }
    }
    
    /**
     * Process webhook data using the same logic as WebhookHandler
     */
    processWebhookData(webhookData) {
        try {
            // Handle NEW format (messages array)
            if (webhookData.messages && webhookData.messages.length > 0) {
                let successCount = 0;
                let results = [];
                
                // Process ALL messages in the batch, not just the first one
                for (const message of webhookData.messages) {
                    const content = message.content || '';
                    const baseAuthor = message.author || 'Unknown';
                    
                    // CRITICAL FIX: Split concatenated messages by Discord timestamps
                    const messageParts = content.split(/(?=\[\d{1,2}:\d{2} [AP]M\] REGISTRO - fazenda_86|REGISTRO - fazenda_86)/);
                    
                    for (const messagePart of messageParts) {
                        if (messagePart.trim().length === 0) continue;
                        
                        let result = null;
                        
                        // Use the new CLEAN parsing functions for ALL messages
                        if (messagePart.includes('REMOVER ITEM')) {
                            result = this.parseIndividualRemoval(messagePart, baseAuthor);
                        } else if (messagePart.includes('INSERIR ITEM')) {
                            result = this.parseIndividualInsertion(messagePart, baseAuthor);
                        } else if (messagePart.includes('CAIXA ORGANIZAÇÃO')) {
                            result = this.parseIndividualBalance(messagePart, baseAuthor);
                        }
                        
                        if (result && result.success) {
                            successCount++;
                            results.push(result);
                        }
                    }
                }
                
                // Return success if at least one message was processed
                if (successCount > 0) {
                    return {
                        success: true,
                        message: `Processed ${successCount} messages from batch`,
                        results: results,
                        activity: results[0]?.activity // Return first activity for compatibility
                    };
                } else {
                    return { success: false, message: 'No messages could be processed from batch' };
                }
            }
            
            // Handle OLD format (embeds)
            const embeds = webhookData.embeds || [];
            
            if (embeds.length === 0) {
                return { success: false, message: 'No embeds or messages found in webhook' };
            }
            
            const embed = embeds[0];
            const title = embed.title || '';
            const description = embed.description || '';
            const author = embed.author?.name || 'Unknown';
            
            // Process different types of webhooks using NEW CLEAN parsing functions
            if (title === 'REMOVER ITEM') {
                return this.parseIndividualRemoval(description, author);
            } else if (title === 'INSERIR ITEM') {
                return this.parseIndividualInsertion(description, author);
            } else if (title === 'CAIXA ORGANIZAÇÃO') {
                return this.parseIndividualBalance(description, author);
            } else {
                return { success: false, message: `Unknown webhook type: ${title}` };
            }
            
        } catch (error) {
            logger.error('Error in processWebhookData:', error);
            return { success: false, message: error.message };
        }
    }
    
    /**
     * Process removal from content string (new format)
     */
    processRemovalFromContent(content, author) {
        try {
            const itemMatch = content.match(/Item removido:\s*([^\s]+)\s*x(\d+)/i);
            if (!itemMatch) {
                return { success: false, message: 'Could not parse item removal from content' };
            }
            
            const item = itemMatch[1];
            const quantidade = parseInt(itemMatch[2]);
            
            // Extract CORRECT Discord timestamp from Data: field
            const timestampMatch = content.match(/Data:\s*(\d{2}\/\d{2}\/\d{4})\s*-\s*(\d{2}:\d{2}:\d{2})/);
            const originalTimestamp = timestampMatch ? 
                this.convertDiscordTimestampToISO(timestampMatch[1], timestampMatch[2]) : 
                new Date().toISOString();
            
            // Update inventory first, then register activity (with skipActivity=true to avoid double logging)
            const inventorySuccess = this.dataManager.removerItem(item, quantidade, author, true);
            
            // Register the activity
            const activity = this.dataManager.registrarAtividadeDiscord('remover', {
                item: item,
                quantidade: quantidade,
                autor: author,
                game_date: timestampMatch ? `${timestampMatch[1]} - ${timestampMatch[2]}` : null,
                timestamp: originalTimestamp
            });
            
            return {
                success: true,
                message: 'Item removal processed from content',
                activity: activity,
                action: 'remove',
                item: item,
                quantity: quantidade,
                author: author
            };
            
        } catch (error) {
            return { success: false, message: error.message };
        }
    }
    
    /**
     * Process insertion from content string (new format)
     */
    processInsertionFromContent(content, author) {
        try {
            const itemMatch = content.match(/Item adicionado:\s*([^\s]+)\s*x(\d+)/i);
            if (!itemMatch) {
                return { success: false, message: 'Could not parse item insertion from content' };
            }
            
            const item = itemMatch[1];
            const quantidade = parseInt(itemMatch[2]);
            
            // Extract CORRECT Discord timestamp from Data: field
            const timestampMatch = content.match(/Data:\s*(\d{2}\/\d{2}\/\d{4})\s*-\s*(\d{2}:\d{2}:\d{2})/);
            const originalTimestamp = timestampMatch ? 
                this.convertDiscordTimestampToISO(timestampMatch[1], timestampMatch[2]) : 
                new Date().toISOString();
            
            // Update inventory first, then register activity (with skipActivity=true to avoid double logging)
            const inventorySuccess = this.dataManager.adicionarItem(item, quantidade, author, true);
            
            // Register the activity
            const activity = this.dataManager.registrarAtividadeDiscord('adicionar', {
                item: item,
                quantidade: quantidade,
                autor: author,
                game_date: timestampMatch ? `${timestampMatch[1]} - ${timestampMatch[2]}` : null,
                timestamp: originalTimestamp
            });
            
            return {
                success: true,
                message: 'Item insertion processed from content',
                activity: activity,
                action: 'add',
                item: item,
                quantity: quantidade,
                author: author
            };
            
        } catch (error) {
            return { success: false, message: error.message };
        }
    }
    
    /**
     * Process balance from content string (new format)
     */
    processBalanceFromContent(content, author) {
        try {
            const valueMatch = content.match(/Valor\s+(?:depositado|retirado|sacado):\s*\$?([\d,.]+)/i);
            if (!valueMatch) {
                return { success: false, message: 'Could not parse balance change from content' };
            }
            
            const valor = parseFloat(valueMatch[1].replace(',', ''));
            const isDeposit = content.toLowerCase().includes('depositado');
            
            // Extract CORRECT Discord timestamp from Data: field
            const timestampMatch = content.match(/Data:\s*(\d{2}\/\d{2}\/\d{4})\s*-\s*(\d{2}:\d{2}:\d{2})/);
            const originalTimestamp = timestampMatch ? 
                this.convertDiscordTimestampToISO(timestampMatch[1], timestampMatch[2]) : 
                new Date().toISOString();
            
            // Register the activity
            const activity = this.dataManager.registrarAtividadeDiscord(isDeposit ? 'deposito' : 'saque', {
                item: null,
                quantidade: null,
                valor: valor,
                autor: author,
                game_date: timestampMatch ? `${timestampMatch[1]} - ${timestampMatch[2]}` : null,
                timestamp: originalTimestamp
            });
            
            return {
                success: true,
                message: 'Balance change processed from content',
                activity: activity,
                action: isDeposit ? 'deposit' : 'withdraw',
                amount: valor,
                author: author
            };
            
        } catch (error) {
            return { success: false, message: error.message };
        }
    }
    
    /**
     * Process item removal webhook
     */
    processRemovalWebhook(description, author) {
        try {
            const itemMatch = description.match(/Item removido:\s*([^\s]+)\s*x(\d+)/i);
            if (!itemMatch) {
                return { success: false, message: 'Could not parse item removal' };
            }
            
            const item = itemMatch[1];
            const quantidade = parseInt(itemMatch[2]);
            
            // Extract original Discord timestamp
            const timestampMatch = description.match(/Data:\s*(\d{2}\/\d{2}\/\d{4})\s*-\s*(\d{2}:\d{2}:\d{2})/);
            const originalTimestamp = timestampMatch ? 
                this.convertDiscordTimestampToISO(timestampMatch[1], timestampMatch[2]) : 
                new Date().toISOString();
            
            // Update inventory first, then register activity (with skipActivity=true to avoid double logging)
            const inventorySuccess = this.dataManager.removerItem(item, quantidade, author, true);
            
            // Register the activity
            const activity = this.dataManager.registrarAtividadeDiscord('remover', {
                item: item,
                quantidade: quantidade,
                autor: author,
                game_date: timestampMatch ? `${timestampMatch[1]} - ${timestampMatch[2]}` : null,
                timestamp: originalTimestamp
            });
            
            return {
                success: true,
                message: 'Item removal processed',
                activity: activity,
                action: 'remove',
                item: item,
                quantity: quantidade,
                author: author
            };
            
        } catch (error) {
            return { success: false, message: error.message };
        }
    }
    
    /**
     * Process item insertion webhook
     */
    processInsertionWebhook(description, author) {
        try {
            const itemMatch = description.match(/Item adicionado:\s*([^\s]+)\s*x(\d+)/i);
            if (!itemMatch) {
                return { success: false, message: 'Could not parse item insertion' };
            }
            
            const item = itemMatch[1];
            const quantidade = parseInt(itemMatch[2]);
            
            // Extract original Discord timestamp
            const timestampMatch = description.match(/Data:\s*(\d{2}\/\d{2}\/\d{4})\s*-\s*(\d{2}:\d{2}:\d{2})/);
            const originalTimestamp = timestampMatch ? 
                this.convertDiscordTimestampToISO(timestampMatch[1], timestampMatch[2]) : 
                new Date().toISOString();
            
            // Update inventory first, then register activity (with skipActivity=true to avoid double logging)
            const inventorySuccess = this.dataManager.adicionarItem(item, quantidade, author, true);
            
            // Register the activity
            const activity = this.dataManager.registrarAtividadeDiscord('adicionar', {
                item: item,
                quantidade: quantidade,
                autor: author,
                game_date: timestampMatch ? `${timestampMatch[1]} - ${timestampMatch[2]}` : null,
                timestamp: originalTimestamp
            });
            
            return {
                success: true,
                message: 'Item insertion processed',
                activity: activity,
                action: 'add',
                item: item,
                quantity: quantidade,
                author: author
            };
            
        } catch (error) {
            return { success: false, message: error.message };
        }
    }
    
    /**
     * Process balance/financial webhook
     */
    processBalanceWebhook(description, author) {
        try {
            const valueMatch = description.match(/Valor\s+(?:depositado|retirado):\s*\$?([\d,.-]+)/i);
            if (!valueMatch) {
                return { success: false, message: 'Could not parse balance change' };
            }
            
            const valor = parseFloat(valueMatch[1].replace(',', ''));
            const isDeposit = description.toLowerCase().includes('depositado');
            
            // Extract original Discord timestamp
            const timestampMatch = description.match(/Data:\s*(\d{2}\/\d{2}\/\d{4})\s*-\s*(\d{2}:\d{2}:\d{2})/);
            const originalTimestamp = timestampMatch ? 
                this.convertDiscordTimestampToISO(timestampMatch[1], timestampMatch[2]) : 
                new Date().toISOString();
            
            // Register the activity
            const activity = this.dataManager.registrarAtividadeDiscord(isDeposit ? 'deposito' : 'saque', {
                item: null,
                quantidade: null,
                valor: valor,
                autor: author,
                game_date: timestampMatch ? `${timestampMatch[1]} - ${timestampMatch[2]}` : null,
                timestamp: originalTimestamp
            });
            
            return {
                success: true,
                message: 'Balance change processed',
                activity: activity,
                action: isDeposit ? 'deposit' : 'withdraw',
                amount: valor,
                author: author
            };
            
        } catch (error) {
            return { success: false, message: error.message };
        }
    }
    
    /**
     * Load master log file
     */
    loadMasterLog() {
        try {
            if (!fs.existsSync(this.masterLogPath)) {
                return null;
            }
            
            const logData = fs.readFileSync(this.masterLogPath, 'utf8');
            return JSON.parse(logData);
        } catch (error) {
            logger.error('Error loading master log:', error);
            return null;
        }
    }
    
    /**
     * Load last processed ID
     */
    loadLastProcessedId() {
        try {
            if (!fs.existsSync(this.statusPath)) {
                return 0;
            }
            
            const statusData = fs.readFileSync(this.statusPath, 'utf8');
            const status = JSON.parse(statusData);
            return status.lastProcessedId || 0;
        } catch (error) {
            logger.warn('Could not load processing status, starting from 0');
            return 0;
        }
    }
    
    /**
     * Save last processed ID
     */
    saveLastProcessedId() {
        try {
            const status = {
                lastProcessedId: this.lastProcessedId,
                lastUpdated: new Date().toISOString()
            };
            
            fs.writeFileSync(this.statusPath, JSON.stringify(status, null, 2));
        } catch (error) {
            logger.error('Error saving processing status:', error);
        }
    }
    
    /**
     * Parse individual removal message from batch content
     */
    parseIndividualRemoval(messagePart, baseAuthor) {
        try {
            // Extract item and quantity from this specific message part
            const itemMatch = messagePart.match(/Item removido:\s*([^\s]+)\s*x(\d+)/i);
            if (!itemMatch) {
                return { success: false, message: 'Could not parse item removal' };
            }
            
            const item = itemMatch[1];
            const quantidade = parseInt(itemMatch[2]);
            
            // Extract the CLEAN author from "Autor:" field in this message part
            const authorMatch = messagePart.match(/Autor:\s*([^D]+?)(?:Data:|$)/);
            const cleanAuthor = authorMatch ? authorMatch[1].trim() : baseAuthor;
            
            // Extract CLEAN timestamp from "Data:" field
            const timestampMatch = messagePart.match(/Data:\s*(\d{2}\/\d{2}\/\d{4})\s*-\s*(\d{2}:\d{2}:\d{2})/);
            const originalTimestamp = timestampMatch ? 
                this.convertDiscordTimestampToISO(timestampMatch[1], timestampMatch[2]) : 
                new Date().toISOString();
            
            // Update inventory first, then register activity (with skipActivity=true to avoid double logging)
            const inventorySuccess = this.dataManager.removerItem(item, quantidade, cleanAuthor, true);
            
            // Register the activity with CLEAN data
            const activity = this.dataManager.registrarAtividadeDiscord('remover', {
                item: item,
                quantidade: quantidade,
                autor: cleanAuthor,
                game_date: timestampMatch ? `${timestampMatch[1]} - ${timestampMatch[2]}` : null,
                timestamp: originalTimestamp
            });
            
            return {
                success: true,
                message: 'Individual removal processed',
                activity: activity,
                action: 'remove',
                item: item,
                quantity: quantidade,
                author: cleanAuthor
            };
            
        } catch (error) {
            return { success: false, message: error.message };
        }
    }
    
    /**
     * Parse individual insertion message from batch content
     */
    parseIndividualInsertion(messagePart, baseAuthor) {
        try {
            // Extract item and quantity from this specific message part
            const itemMatch = messagePart.match(/Item adicionado:\s*([^\s]+)\s*x(\d+)/i);
            if (!itemMatch) {
                return { success: false, message: 'Could not parse item insertion' };
            }
            
            const item = itemMatch[1];
            const quantidade = parseInt(itemMatch[2]);
            
            // Extract the CLEAN author from "Autor:" field in this message part
            const authorMatch = messagePart.match(/Autor:\s*([^D]+?)(?:Data:|$)/);
            const cleanAuthor = authorMatch ? authorMatch[1].trim() : baseAuthor;
            
            // Extract CLEAN timestamp from "Data:" field
            const timestampMatch = messagePart.match(/Data:\s*(\d{2}\/\d{2}\/\d{4})\s*-\s*(\d{2}:\d{2}:\d{2})/);
            const originalTimestamp = timestampMatch ? 
                this.convertDiscordTimestampToISO(timestampMatch[1], timestampMatch[2]) : 
                new Date().toISOString();
            
            // Update inventory first, then register activity (with skipActivity=true to avoid double logging)
            const inventorySuccess = this.dataManager.adicionarItem(item, quantidade, cleanAuthor, true);
            
            // Register the activity with CLEAN data
            const activity = this.dataManager.registrarAtividadeDiscord('adicionar', {
                item: item,
                quantidade: quantidade,
                autor: cleanAuthor,
                game_date: timestampMatch ? `${timestampMatch[1]} - ${timestampMatch[2]}` : null,
                timestamp: originalTimestamp
            });
            
            return {
                success: true,
                message: 'Individual insertion processed',
                activity: activity,
                action: 'add',
                item: item,
                quantity: quantidade,
                author: cleanAuthor
            };
            
        } catch (error) {
            return { success: false, message: error.message };
        }
    }
    
    /**
     * Parse individual balance message from batch content
     */
    parseIndividualBalance(messagePart, baseAuthor) {
        try {
            // Check if this is a SAQUE (withdrawal) or DEPÓSITO (deposit)
            const isWithdrawal = messagePart.includes('SAQUE') || messagePart.includes('Valor sacado');
            const isDeposit = messagePart.includes('DEPÓSITO') || messagePart.includes('Valor depositado');
            
            if (!isWithdrawal && !isDeposit) {
                return { success: false, message: 'Not a balance transaction' };
            }
            
            // Extract amount from this specific message part
            const amountPattern = isWithdrawal ? 
                /Valor sacado:\s*\$?([\d,]+\.?\d*)/ : 
                /Valor depositado:\s*\$?([\d,]+\.?\d*)/;
            
            const amountMatch = messagePart.match(amountPattern);
            if (!amountMatch) {
                return { success: false, message: 'Could not parse balance amount' };
            }
            
            const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
            
            // Extract balance after transaction - CRITICAL FOR BALANCE UPDATES
            let balanceAfter = null;
            const balancePattern = isWithdrawal ?
                /Saldo após saque:?\s*\$?([\d,]+\.?\d*)/ :
                /Saldo após depósito:?\s*\$?([\d,]+\.?\d*)/;
            
            const balanceMatch = messagePart.match(balancePattern);
            if (balanceMatch) {
                balanceAfter = parseFloat(balanceMatch[1].replace(/,/g, ''));
                logger.info(`✅ BALANCE EXTRACTED: $${balanceAfter} after ${isWithdrawal ? 'withdrawal' : 'deposit'} of $${amount}`);
            } else {
                logger.warn(`⚠️ Could not extract balance after transaction from: ${messagePart.substring(0, 200)}`);
            }
            
            // Extract clean author from "Autor:" field, avoiding concatenated content
            const authorMatch = messagePart.match(/Autor:\s*([^|D]+?)(?:\s*\||Data:|$)/);
            let cleanAuthor = authorMatch ? authorMatch[1].trim() : 'Unknown';
            
            // For deposits, try to get name from Ação field as fallback
            if (isDeposit && (cleanAuthor === 'Unknown' || cleanAuthor.includes('REGISTRO'))) {
                const acaoMatch = messagePart.match(/Ação:\s*([^|]+?)(?:\s+vendeu|\s*Data:|$)/i);
                if (acaoMatch) {
                    cleanAuthor = acaoMatch[1].trim();
                }
            }
            
            // Extract CLEAN timestamp from "Data:" field
            const timestampMatch = messagePart.match(/Data:\s*(\d{2}\/\d{2}\/\d{4})\s*-\s*(\d{2}:\d{2}:\d{2})/);
            const originalTimestamp = timestampMatch ? 
                this.convertDiscordTimestampToISO(timestampMatch[1], timestampMatch[2]) : 
                new Date().toISOString();
            
            // Register the activity with CLEAN data and proper description
            const activityType = isWithdrawal ? 'saque' : 'deposito';
            
            // Simple description like the original
            const actionDescription = isWithdrawal ? 
                `Sacou do caixa` : 
                `Depositou no caixa`;
                
            const activity = this.dataManager.registrarAtividadeDiscord(activityType, {
                valor: amount,
                autor: cleanAuthor,
                game_date: timestampMatch ? `${timestampMatch[1]} - ${timestampMatch[2]}` : null,
                timestamp: originalTimestamp,
                descricao: null
            });
            
            // UPDATE THE ACTUAL FARM BALANCE IF WE HAVE THE NEW BALANCE
            if (balanceAfter !== null) {
                this.dataManager.atualizarSaldoAtual(balanceAfter);
                logger.info(`💰 BALANCE UPDATED: Farm balance set to $${balanceAfter}`);
            }
            
            return {
                success: true,
                message: `Individual ${isWithdrawal ? 'withdrawal' : 'deposit'} processed`,
                activity: activity,
                action: isWithdrawal ? 'balance_withdrawal' : 'balance_deposit',
                amount: amount,
                balance_after: balanceAfter,
                author: cleanAuthor
            };
            
        } catch (error) {
            return { success: false, message: error.message };
        }
    }
    
    /**
     * Get monitoring status
     */
    getStatus() {
        const masterLog = this.loadMasterLog();
        const totalWebhooks = masterLog ? masterLog.webhooks.length : 0;
        const unprocessed = Math.max(0, totalWebhooks - this.lastProcessedId);
        
        return {
            totalWebhooks: totalWebhooks,
            lastProcessedId: this.lastProcessedId,
            unprocessedCount: unprocessed,
            isMonitoring: !!this.watcher,
            isProcessing: this.isProcessing
        };
    }
    
    /**
     * Stop monitoring
     */
    stop() {
        if (this.watcher) {
            this.watcher.close();
        }
        logger.info('🛑 MasterLogMonitor stopped');
    }
}

module.exports = MasterLogMonitor;