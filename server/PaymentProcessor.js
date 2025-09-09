const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const logger = require('./utils/logger');

/**
 * PaymentProcessor - Calculates worker payments from analyzed Discord data
 * 
 * This bridges the gap between analyzed_data.json and pagamentos.json
 * by processing worker activities and calculating appropriate payments.
 */
class PaymentProcessor {
    constructor(dataPath) {
        this.dataPath = dataPath;
        this.analyzedDataFile = path.join(dataPath, 'analyzed_data.json');
        this.pagamentosFile = path.join(dataPath, 'pagamentos.json');
        this.usuariosFile = path.join(dataPath, 'usuarios.json');
        this.precosFile = path.join(dataPath, 'precos.json');
        
        // Payment rates - these should match the existing system
        this.paymentRules = {
            // Plant collection payments (based on quantity)
            plantas: {
                base_rate: 0.15, // $0.15 per plant
                minimum_quantity: 1
            },
            // Animal delivery payments (flat rate per delivery)
            animais: {
                base_payment: 60, // $60 per animal delivery
                minimum_animals: 4 // minimum 4 animals per delivery
            },
            // Railway service profits (calculated separately)
            ferroviaria: {
                profit_per_box: 4,
                investor_percentage: 0.20 // 20% to investors
            }
        };
    }

    /**
     * Process all activities and calculate payments
     */
    async processPayments() {
        try {
            logger.info('💰 Starting payment processing...');

            // Load analyzed data
            const analyzedData = await this.loadAnalyzedData();
            if (!analyzedData) return { success: false, error: 'No analyzed data found' };

            // Load existing payments to avoid duplicates
            const existingPayments = await this.loadExistingPayments();
            
            // Load user mapping for worker identification
            const users = await this.loadUsers();
            
            // Process activities and calculate payments
            const newPayments = await this.calculatePayments(analyzedData, existingPayments, users);
            
            // Save new payments
            if (newPayments.length > 0) {
                await this.savePayments(newPayments);
                logger.info(`✅ Payment processing complete: ${newPayments.length} new payments calculated`);
            } else {
                logger.info('📭 No new payments to process');
            }

            return { 
                success: true, 
                processed: newPayments.length,
                payments: newPayments 
            };

        } catch (error) {
            logger.error('❌ Payment processing error:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Load analyzed data from file
     */
    async loadAnalyzedData() {
        try {
            const data = await fs.readFile(this.analyzedDataFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            logger.warn('⚠️ No analyzed data file found');
            return null;
        }
    }

    /**
     * Load existing payments to avoid duplicates
     */
    async loadExistingPayments() {
        try {
            const data = await fs.readFile(this.pagamentosFile, 'utf8');
            const payments = JSON.parse(data);
            return payments.pagamentos || [];
        } catch (error) {
            logger.warn('⚠️ No payments file found, starting fresh');
            return [];
        }
    }

    /**
     * Load users for worker identification
     */
    async loadUsers() {
        try {
            const data = await fs.readFile(this.usuariosFile, 'utf8');
            const usersData = JSON.parse(data);
            return usersData.usuarios || {};
        } catch (error) {
            logger.warn('⚠️ No users file found');
            return {};
        }
    }

    /**
     * Calculate payments from analyzed activities
     */
    async calculatePayments(analyzedData, existingPayments, users) {
        const newPayments = [];
        const existingActivityIds = new Set(
            existingPayments.flatMap(p => 
                p.detalhes?.map(d => d.id_atividade).filter(Boolean) || []
            )
        );

        // Process inventory changes (plant collections)
        for (const activity of analyzedData.inventory_changes || []) {
            if (existingActivityIds.has(activity.id)) continue;

            const payment = this.calculatePlantPayment(activity, users);
            if (payment) {
                newPayments.push(payment);
                logger.info(`🌾 Plant payment calculated: ${payment.usuario_id} - $${payment.valor}`);
            }
        }

        // Process financial transactions (animal deliveries) 
        for (const transaction of analyzedData.financial_transactions || []) {
            if (existingActivityIds.has(transaction.id)) continue;

            const payment = this.calculateAnimalPayment(transaction, users);
            if (payment) {
                newPayments.push(payment);
                logger.info(`🐄 Animal payment calculated: ${payment.usuario_id} - $${payment.valor}`);
            }
        }

        return newPayments;
    }

    /**
     * Calculate payment for plant collection activities
     */
    calculatePlantPayment(activity, users) {
        // Extract worker info from activity
        const workerInfo = this.extractWorkerFromActivity(activity);
        if (!workerInfo) return null;

        const workerId = this.findWorkerById(workerInfo.name, users);
        if (!workerId) return null;

        // Calculate payment based on quantity
        const quantity = activity.details?.quantity || 0;
        const itemName = activity.details?.item || 'Unknown';
        
        if (quantity === 0) return null;

        const payment = quantity * this.paymentRules.plantas.base_rate;

        return {
            id: uuidv4(),
            usuario_id: workerId,
            tipo_servico: 'plantacao',
            valor: payment,
            detalhes: [{
                item: itemName,
                quantidade: quantity,
                valor_unitario: this.paymentRules.plantas.base_rate,
                valor_total: payment,
                timestamp: activity.timestamp,
                id_atividade: activity.id,
                tipo: 'planta_015',
                pago: false
            }],
            timestamp: activity.timestamp,
            data_calculo: new Date().toISOString(),
            pago: false
        };
    }

    /**
     * Calculate payment for animal delivery activities  
     */
    calculateAnimalPayment(transaction, users) {
        // Extract worker info from deposit transaction
        const workerInfo = this.extractWorkerFromTransaction(transaction);
        if (!workerInfo) return null;

        const workerId = this.findWorkerById(workerInfo.name, users);
        if (!workerId) return null;

        // Check if this is an animal delivery (deposit with animal sale action)
        if (transaction.type !== 'deposit') return null;
        
        const amount = transaction.details?.amount || 0;
        if (amount !== 160) return null; // Standard animal delivery amount

        // Calculate worker payment (standard $60 per delivery)
        const workerPayment = this.paymentRules.animais.base_payment;

        return {
            id: uuidv4(),
            usuario_id: workerId,
            tipo_servico: 'animais',
            valor: workerPayment,
            detalhes: [{
                timestamp: transaction.timestamp,
                valor_fazenda: amount,
                pagamento_worker: workerPayment,
                status: 'completa',
                pago: false,
                id_atividade: transaction.id,
                esperado: {
                    animais: 4,
                    racao: 8,
                    deposito: amount
                },
                worker_payment: workerPayment
            }],
            timestamp: transaction.timestamp,
            data_calculo: new Date().toISOString(),
            pago: false
        };
    }

    /**
     * Extract worker information from activity
     */
    extractWorkerFromActivity(activity) {
        // Look for worker name in activity details or raw message
        const content = activity.content || '';
        const rawMessage = activity.raw_message || {};
        
        // Try to extract from embeds
        if (rawMessage.raw_embeds) {
            for (const embed of rawMessage.raw_embeds) {
                if (embed.fields) {
                    for (const field of embed.fields) {
                        if (field.name?.includes('Autor') && field.value) {
                            const match = field.value.match(/([^|]+)/);
                            if (match) {
                                return { name: match[1].trim() };
                            }
                        }
                    }
                }
            }
        }

        return null;
    }

    /**
     * Extract worker information from transaction
     */
    extractWorkerFromTransaction(transaction) {
        // Look for worker name in the "Ação" field
        if (transaction.raw_message?.raw_embeds) {
            for (const embed of transaction.raw_message.raw_embeds) {
                if (embed.fields) {
                    for (const field of embed.fields) {
                        if (field.name?.includes('Ação') && field.value) {
                            // Extract worker name from "Zero Bala vendeu 4 animais no matadouro"
                            const match = field.value.match(/```prolog\n([^v]+)\s+vendeu/);
                            if (match) {
                                return { name: match[1].trim() };
                            }
                        }
                    }
                }
            }
        }

        return null;
    }

    /**
     * Find worker ID by name
     */
    findWorkerById(name, users) {
        for (const [userId, userData] of Object.entries(users)) {
            if (userData.nome === name && userData.funcao === 'trabalhador') {
                return userId;
            }
        }
        return null;
    }

    /**
     * Save new payments to file
     */
    async savePayments(newPayments) {
        try {
            // Load existing payments
            const existingData = await this.loadExistingPayments();
            
            // Merge with new payments
            const allPayments = [...existingData, ...newPayments];
            
            // Save updated payments
            const paymentsData = {
                pagamentos: allPayments,
                total_pagamentos: allPayments.length,
                ultima_atualizacao: new Date().toISOString()
            };

            await fs.writeFile(this.pagamentosFile, JSON.stringify(paymentsData, null, 2));
            logger.info(`💾 Saved ${newPayments.length} new payments to ${this.pagamentosFile}`);

        } catch (error) {
            logger.error('❌ Error saving payments:', error.message);
            throw error;
        }
    }
}

module.exports = PaymentProcessor;