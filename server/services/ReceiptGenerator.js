const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

/**
 * ReceiptGenerator - Advanced receipt generation for payments
 * 
 * Features:
 * - Detailed transaction breakdown
 * - Discord-formatted receipts
 * - Activity audit trail
 * - Performance metrics inclusion
 * - Multi-format support (text, Discord, JSON)
 */
class ReceiptGenerator {
    constructor(dataPath) {
        this.dataPath = dataPath;
        
        // Data files
        this.usuariosFile = path.join(dataPath, 'usuarios.json');
        this.workerRatingsFile = path.join(dataPath, 'worker_ratings.json');
        
        logger.info('✅ ReceiptGenerator initialized');
    }
    
    /**
     * Generate comprehensive payment receipt
     */
    async generatePaymentReceipt(paymentData, format = 'discord') {
        try {
            const { usuario_id, valor, tipo_servico, detalhes, timestamp } = paymentData;
            
            // Load user data
            const usuarios = await this.loadJSON(this.usuariosFile, { usuarios: {} });
            const user = usuarios.usuarios[usuario_id] || { nome: 'Unknown Worker' };
            
            // Load worker rating
            const ratings = await this.loadJSON(this.workerRatingsFile, { ratings: {} });
            const rating = ratings.ratings[usuario_id]?.current;
            
            // Generate receipt based on format
            let receipt;
            switch (format) {
                case 'discord':
                    receipt = await this.generateDiscordReceipt(paymentData, user, rating);
                    break;
                case 'text':
                    receipt = await this.generateTextReceipt(paymentData, user, rating);
                    break;
                case 'json':
                    receipt = await this.generateJSONReceipt(paymentData, user, rating);
                    break;
                default:
                    receipt = await this.generateDiscordReceipt(paymentData, user, rating);
            }
            
            logger.info(`📄 Receipt generated for ${usuario_id} - $${valor}`);
            return receipt;
            
        } catch (error) {
            logger.error(`❌ Receipt generation failed: ${error.message}`);
            return this.generateErrorReceipt(paymentData);
        }
    }
    
    /**
     * Generate Discord-formatted receipt
     */
    async generateDiscordReceipt(paymentData, user, rating) {
        const { valor, tipo_servico, detalhes, timestamp, id } = paymentData;
        
        let receipt = '```\n';
        receipt += '╔════════════════════════════════════════╗\n';
        receipt += '║         💰 PAYMENT RECEIPT 💰          ║\n';
        receipt += '╠════════════════════════════════════════╣\n';
        
        // Header information
        receipt += `║ Receipt ID: ${(id || 'N/A').substring(0, 27).padEnd(27)}║\n`;
        receipt += `║ Date: ${new Date(timestamp).toLocaleString('pt-BR').padEnd(33)}║\n`;
        receipt += '╠════════════════════════════════════════╣\n';
        
        // Worker information
        receipt += '║ WORKER INFORMATION                     ║\n';
        receipt += `║  Name: ${user.nome.substring(0, 32).padEnd(32)}║\n`;
        receipt += `║  ID: ${user.id.substring(0, 34).padEnd(34)}║\n`;
        
        // Add rating if available
        if (rating) {
            const stars = '⭐'.repeat(rating.star_rating);
            receipt += `║  Rating: ${stars.padEnd(30)}║\n`;
            receipt += `║  Performance: ${(rating.scores.overall * 100).toFixed(1)}%`.padEnd(40) + '║\n';
        }
        
        receipt += '╠════════════════════════════════════════╣\n';
        
        // Service details
        receipt += '║ SERVICE DETAILS                        ║\n';
        receipt += `║  Type: ${this.getServiceTypeName(tipo_servico).padEnd(32)}║\n`;
        
        if (detalhes && detalhes.length > 0) {
            receipt += '║                                        ║\n';
            receipt += '║  Items/Activities:                     ║\n';
            
            // Group items by type
            const itemGroups = this.groupDetailsByItem(detalhes);
            let lineCount = 0;
            const maxLines = 15;
            
            for (const [itemName, itemData] of Object.entries(itemGroups)) {
                if (lineCount >= maxLines) {
                    receipt += `║  ... and ${Object.keys(itemGroups).length - lineCount} more items`.padEnd(40) + '║\n';
                    break;
                }
                
                const itemLine = `   ${itemName}: ${itemData.quantity}x @ $${itemData.unit_price.toFixed(2)} = $${itemData.total.toFixed(2)}`;
                if (itemLine.length <= 37) {
                    receipt += `║${itemLine.padEnd(40)}║\n`;
                } else {
                    receipt += `║${itemLine.substring(0, 37)}...║\n`;
                }
                lineCount++;
            }
            
            // Summary statistics
            const totalItems = detalhes.reduce((sum, d) => sum + (d.quantidade || 0), 0);
            receipt += '║                                        ║\n';
            receipt += `║  Total Items: ${totalItems.toString().padEnd(25)}║\n`;
        }
        
        receipt += '╠════════════════════════════════════════╣\n';
        
        // Payment summary
        receipt += '║ PAYMENT SUMMARY                        ║\n';
        receipt += `║  Subtotal: $${valor.toFixed(2).padEnd(27)}║\n`;
        
        // Add any deductions or bonuses
        const finalAmount = await this.calculateFinalAmount(paymentData, rating);
        if (finalAmount.deductions > 0) {
            receipt += `║  Deductions: -$${finalAmount.deductions.toFixed(2).padEnd(24)}║\n`;
        }
        if (finalAmount.bonuses > 0) {
            receipt += `║  Bonuses: +$${finalAmount.bonuses.toFixed(2).padEnd(27)}║\n`;
        }
        
        receipt += '║                                        ║\n';
        receipt += `║  TOTAL PAID: $${finalAmount.total.toFixed(2).padEnd(25)}║\n`;
        
        receipt += '╠════════════════════════════════════════╣\n';
        
        // Verification and notes
        receipt += '║ VERIFICATION                           ║\n';
        receipt += `║  Status: ✅ Processed                  ║\n`;
        receipt += `║  Method: Auto-payment                  ║\n`;
        
        // Add performance notes if available
        if (rating && rating.recommendations && rating.recommendations.length > 0) {
            receipt += '║                                        ║\n';
            receipt += '║  Performance Notes:                    ║\n';
            const topRec = rating.recommendations[0];
            const recText = topRec.message.substring(0, 35);
            receipt += `║   • ${recText.padEnd(35)}║\n`;
        }
        
        receipt += '╠════════════════════════════════════════╣\n';
        receipt += '║ 🌾 Fazenda Management System v2.0      ║\n';
        receipt += '║ 📋 Keep this receipt for your records  ║\n';
        receipt += '╚════════════════════════════════════════╝\n';
        receipt += '```';
        
        return receipt;
    }
    
    /**
     * Generate text receipt
     */
    async generateTextReceipt(paymentData, user, rating) {
        const { valor, tipo_servico, detalhes, timestamp, id } = paymentData;
        
        let receipt = '';
        receipt += '===========================================\n';
        receipt += '         PAYMENT RECEIPT\n';
        receipt += '===========================================\n\n';
        
        receipt += `Receipt ID: ${id || 'N/A'}\n`;
        receipt += `Date: ${new Date(timestamp).toLocaleString('pt-BR')}\n\n`;
        
        receipt += 'WORKER INFORMATION\n';
        receipt += '-----------------\n';
        receipt += `Name: ${user.nome}\n`;
        receipt += `ID: ${user.id}\n`;
        
        if (rating) {
            receipt += `Rating: ${rating.star_rating} stars\n`;
            receipt += `Performance Score: ${(rating.scores.overall * 100).toFixed(1)}%\n`;
        }
        
        receipt += '\nSERVICE DETAILS\n';
        receipt += '---------------\n';
        receipt += `Service Type: ${this.getServiceTypeName(tipo_servico)}\n\n`;
        
        if (detalhes && detalhes.length > 0) {
            receipt += 'Items/Activities:\n';
            const itemGroups = this.groupDetailsByItem(detalhes);
            
            for (const [itemName, itemData] of Object.entries(itemGroups)) {
                receipt += `  - ${itemName}: ${itemData.quantity} units @ $${itemData.unit_price.toFixed(2)} = $${itemData.total.toFixed(2)}\n`;
            }
            
            const totalItems = detalhes.reduce((sum, d) => sum + (d.quantidade || 0), 0);
            receipt += `\nTotal Items: ${totalItems}\n`;
        }
        
        receipt += '\nPAYMENT SUMMARY\n';
        receipt += '---------------\n';
        
        const finalAmount = await this.calculateFinalAmount(paymentData, rating);
        receipt += `Subtotal: $${valor.toFixed(2)}\n`;
        
        if (finalAmount.deductions > 0) {
            receipt += `Deductions: -$${finalAmount.deductions.toFixed(2)}\n`;
        }
        if (finalAmount.bonuses > 0) {
            receipt += `Bonuses: +$${finalAmount.bonuses.toFixed(2)}\n`;
        }
        
        receipt += `\nTOTAL PAID: $${finalAmount.total.toFixed(2)}\n`;
        
        receipt += '\n===========================================\n';
        receipt += 'Fazenda Management System v2.0\n';
        receipt += 'Keep this receipt for your records\n';
        
        return receipt;
    }
    
    /**
     * Generate JSON receipt
     */
    async generateJSONReceipt(paymentData, user, rating) {
        const { valor, tipo_servico, detalhes, timestamp, id } = paymentData;
        
        const finalAmount = await this.calculateFinalAmount(paymentData, rating);
        const itemGroups = detalhes ? this.groupDetailsByItem(detalhes) : {};
        
        const receipt = {
            receipt_id: id || 'N/A',
            timestamp: timestamp,
            formatted_date: new Date(timestamp).toLocaleString('pt-BR'),
            
            worker: {
                id: user.id,
                name: user.nome,
                role: user.funcao || 'trabalhador'
            },
            
            rating: rating ? {
                stars: rating.star_rating,
                overall_score: rating.scores.overall,
                badges: rating.badges || []
            } : null,
            
            service: {
                type: tipo_servico,
                type_name: this.getServiceTypeName(tipo_servico),
                items: itemGroups,
                total_items: detalhes ? detalhes.reduce((sum, d) => sum + (d.quantidade || 0), 0) : 0
            },
            
            payment: {
                subtotal: valor,
                deductions: finalAmount.deductions,
                bonuses: finalAmount.bonuses,
                total: finalAmount.total,
                currency: 'USD'
            },
            
            verification: {
                status: 'processed',
                method: 'auto-payment',
                system_version: 'v2.0'
            },
            
            metadata: {
                generated_at: new Date().toISOString(),
                generator: 'ReceiptGenerator',
                format: 'json'
            }
        };
        
        return JSON.stringify(receipt, null, 2);
    }
    
    /**
     * Generate error receipt
     */
    generateErrorReceipt(paymentData) {
        const { usuario_id, valor, timestamp } = paymentData;
        
        return `\`\`\`
💰 PAYMENT RECEIPT (SIMPLIFIED)
================================
Worker: ${usuario_id || 'Unknown'}
Amount: $${valor || 0}
Date: ${timestamp ? new Date(timestamp).toLocaleString('pt-BR') : 'N/A'}
Status: ✅ Processed

Note: Full receipt details unavailable
================================
Fazenda Management System
\`\`\``;
    }
    
    /**
     * Group details by item
     */
    groupDetailsByItem(detalhes) {
        const groups = {};
        
        for (const detail of detalhes) {
            const itemName = detail.item || detail.tipo || 'Unknown';
            const quantity = detail.quantidade || 1;
            const unitPrice = detail.valor_unitario || (detail.valor / quantity) || 0;
            
            if (!groups[itemName]) {
                groups[itemName] = {
                    quantity: 0,
                    unit_price: unitPrice,
                    total: 0
                };
            }
            
            groups[itemName].quantity += quantity;
            groups[itemName].total += (quantity * unitPrice);
        }
        
        return groups;
    }
    
    /**
     * Calculate final amount with bonuses/deductions
     */
    async calculateFinalAmount(paymentData, rating) {
        const { valor } = paymentData;
        let deductions = 0;
        let bonuses = 0;
        
        // Apply performance-based bonuses
        if (rating && rating.star_rating === 5) {
            bonuses = valor * 0.1; // 10% bonus for 5-star workers
        } else if (rating && rating.star_rating === 4) {
            bonuses = valor * 0.05; // 5% bonus for 4-star workers
        }
        
        // Apply deductions for poor performance
        if (rating && rating.star_rating === 1) {
            deductions = valor * 0.1; // 10% deduction for 1-star workers
        }
        
        // Check for abuse flags
        if (paymentData.abuse_flags && paymentData.abuse_flags.length > 0) {
            deductions += valor * 0.2; // 20% deduction for flagged activities
        }
        
        const total = valor + bonuses - deductions;
        
        return {
            subtotal: valor,
            deductions: deductions,
            bonuses: bonuses,
            total: Math.max(0, total) // Ensure non-negative
        };
    }
    
    /**
     * Get service type display name
     */
    getServiceTypeName(tipo_servico) {
        const serviceNames = {
            'plantacao': '🌱 Plant Services',
            'animais': '🐄 Animal Delivery',
            'financeiro': '💰 Financial Contribution',
            'todos': '📦 Mixed Services',
            'unknown': '❓ Other Services'
        };
        
        return serviceNames[tipo_servico] || serviceNames['unknown'];
    }
    
    /**
     * Generate batch receipt for multiple payments
     */
    async generateBatchReceipt(payments, format = 'discord') {
        try {
            const receipts = [];
            let totalAmount = 0;
            
            for (const payment of payments) {
                const receipt = await this.generatePaymentReceipt(payment, 'json');
                const receiptData = JSON.parse(receipt);
                receipts.push(receiptData);
                totalAmount += receiptData.payment.total;
            }
            
            if (format === 'discord') {
                return this.formatBatchReceiptDiscord(receipts, totalAmount);
            } else {
                return {
                    batch_id: `BATCH_${Date.now()}`,
                    payment_count: receipts.length,
                    total_amount: totalAmount,
                    receipts: receipts
                };
            }
            
        } catch (error) {
            logger.error(`Batch receipt generation failed: ${error.message}`);
            return null;
        }
    }
    
    /**
     * Format batch receipt for Discord
     */
    formatBatchReceiptDiscord(receipts, totalAmount) {
        let receipt = '```\n';
        receipt += '╔════════════════════════════════════════╗\n';
        receipt += '║       💰 BATCH PAYMENT RECEIPT 💰      ║\n';
        receipt += '╠════════════════════════════════════════╣\n';
        receipt += `║ Batch ID: BATCH_${Date.now()}`.substring(0, 40).padEnd(40) + '║\n';
        receipt += `║ Total Payments: ${receipts.length.toString().padEnd(23)}║\n`;
        receipt += `║ Total Amount: $${totalAmount.toFixed(2).padEnd(24)}║\n`;
        receipt += '╠════════════════════════════════════════╣\n';
        receipt += '║ PAYMENT BREAKDOWN                      ║\n';
        
        for (const r of receipts.slice(0, 10)) {
            const line = ` ${r.worker.name}: $${r.payment.total.toFixed(2)}`;
            receipt += `║${line.padEnd(40)}║\n`;
        }
        
        if (receipts.length > 10) {
            receipt += `║  ... and ${receipts.length - 10} more payments`.padEnd(40) + '║\n';
        }
        
        receipt += '╠════════════════════════════════════════╣\n';
        receipt += '║ ✅ All payments processed successfully ║\n';
        receipt += '╚════════════════════════════════════════╝\n';
        receipt += '```';
        
        return receipt;
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
}

module.exports = ReceiptGenerator;