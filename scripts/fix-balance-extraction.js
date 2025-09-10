/**
 * Script to fix balance extraction from Discord messages
 * Re-processes financial transactions to extract balance_after values properly
 */

const fs = require('fs').promises;
const path = require('path');

const ANALYZED_DATA_FILE = path.join(__dirname, '../data/analyzed_data.json');
const SALDO_FAZENDA_FILE = path.join(__dirname, '../data/saldo_fazenda.json');

// Import the FarmMessageParser to use updated parsing logic
const FarmMessageParser = require('../server/FarmMessageParser');

async function fixBalanceExtraction() {
    try {
        console.log('🔄 Starting balance extraction fix...');
        
        // Load analyzed data
        const analyzedDataRaw = await fs.readFile(ANALYZED_DATA_FILE, 'utf8');
        const analyzedData = JSON.parse(analyzedDataRaw);
        
        console.log(`📊 Found ${analyzedData.financial_transactions?.length || 0} financial transactions`);
        console.log(`📊 Found ${analyzedData.messages?.length || 0} raw messages`);
        
        let updatedTransactions = 0;
        let latestBalance = null;
        let latestBalanceTimestamp = null;
        
        // Process financial transactions and update balance_after values
        if (analyzedData.financial_transactions) {
            for (const transaction of analyzedData.financial_transactions) {
                if (transaction.raw_message && transaction.raw_message.embeds) {
                    // Re-parse the message to extract balance_after
                    const convertedMessage = FarmMessageParser.convertDiscordMessage(transaction.raw_message);
                    const parsedMessage = FarmMessageParser.parseMessage(convertedMessage);
                    
                    if (parsedMessage.parseSuccess && parsedMessage.balance_after !== undefined) {
                        // Update the transaction with the extracted balance
                        transaction.balance_after = parsedMessage.balance_after;
                        transaction.details = transaction.details || {};
                        transaction.details.balance_after = parsedMessage.balance_after;
                        
                        console.log(`✅ Updated transaction ${transaction.author} ${transaction.type} $${transaction.details.amount} → balance $${parsedMessage.balance_after}`);
                        updatedTransactions++;
                        
                        // Track the latest balance
                        const transactionTime = new Date(transaction.timestamp);
                        if (!latestBalanceTimestamp || transactionTime > latestBalanceTimestamp) {
                            latestBalance = parsedMessage.balance_after;
                            latestBalanceTimestamp = transactionTime;
                        }
                    }
                }
            }
        }
        
        // Also check raw messages for any financial transactions that might not be processed
        if (analyzedData.messages) {
            for (const message of analyzedData.messages) {
                if (message.embeds && message.embeds.some(e => 
                    e.title && (e.title.includes('DEPÓSITO') || e.title.includes('SAQUE'))
                )) {
                    // Re-parse this message
                    const convertedMessage = FarmMessageParser.convertDiscordMessage(message);
                    const parsedMessage = FarmMessageParser.parseMessage(convertedMessage);
                    
                    if (parsedMessage.parseSuccess && parsedMessage.balance_after !== undefined) {
                        console.log(`📝 Found balance in raw message: ${parsedMessage.tipo} $${parsedMessage.valor} → balance $${parsedMessage.balance_after}`);
                        
                        // Track the latest balance
                        const messageTime = new Date(message.timestamp);
                        if (!latestBalanceTimestamp || messageTime > latestBalanceTimestamp) {
                            latestBalance = parsedMessage.balance_after;
                            latestBalanceTimestamp = messageTime;
                        }
                    }
                }
            }
        }
        
        // Update saldo_fazenda.json with the latest balance
        if (latestBalance !== null) {
            let saldoData;
            try {
                const saldoRaw = await fs.readFile(SALDO_FAZENDA_FILE, 'utf8');
                saldoData = JSON.parse(saldoRaw);
            } catch (error) {
                saldoData = {
                    saldo_atual: 0,
                    ultima_atualizacao: null,
                    historico_saldos: []
                };
            }
            
            const previousBalance = saldoData.saldo_atual;
            saldoData.saldo_atual = latestBalance;
            saldoData.ultima_atualizacao = latestBalanceTimestamp.toISOString();
            saldoData.historico_saldos.push({
                saldo_anterior: previousBalance,
                saldo_novo: latestBalance,
                timestamp: latestBalanceTimestamp.toISOString(),
                source: 'Balance extraction fix script'
            });
            
            await fs.writeFile(SALDO_FAZENDA_FILE, JSON.stringify(saldoData, null, 2));
            console.log(`💰 Updated farm balance: $${previousBalance} → $${latestBalance}`);
        }
        
        // Save updated analyzed data
        await fs.writeFile(ANALYZED_DATA_FILE, JSON.stringify(analyzedData, null, 2));
        
        console.log(`\n✅ Balance extraction fix complete!`);
        console.log(`   - Updated ${updatedTransactions} financial transactions`);
        console.log(`   - Latest balance: $${latestBalance}`);
        console.log(`   - Balance timestamp: ${latestBalanceTimestamp?.toISOString()}`);
        
    } catch (error) {
        console.error('❌ Balance extraction fix failed:', error);
        process.exit(1);
    }
}

// Run the fix
fixBalanceExtraction().then(() => {
    console.log('🎉 Balance extraction fix completed successfully!');
    process.exit(0);
}).catch(error => {
    console.error('❌ Fix error:', error);
    process.exit(1);
});