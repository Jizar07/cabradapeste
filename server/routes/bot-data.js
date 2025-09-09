const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const router = express.Router();

module.exports = (dataManager, io) => {
    const botDataFile = path.join(__dirname, '../../data/bot_data.json');

    /**
     * POST /api/bot-data/channel-logs - Process bot messages directly (NEW SYSTEM)
     */
    router.post('/channel-logs', async (req, res) => {
        try {
            console.log('🔥🔥🔥 NEW SYSTEM: Channel logs received from bot 🔥🔥🔥');
            console.log('🔥 REAL-TIME TEST: About to emit Socket.io events');
            
            const { channelId, messages } = req.body;
            
            // CRITICAL: Log all incoming data for transaction debugging
            console.log('🚨 TRANSACTION DEBUG: Full request body:', JSON.stringify(req.body, null, 2));
            
            if (channelId !== '1404583987778949130') {
                console.log('❌ REJECTED: Invalid channel ID:', channelId);
                return res.status(400).json({ success: false, error: 'Invalid channel ID' });
            }
            
            if (!messages || !Array.isArray(messages)) {
                console.log('❌ REJECTED: Invalid messages array:', typeof messages, Array.isArray(messages));
                return res.status(400).json({ success: false, error: 'Messages array is required' });
            }
            
            console.log(`💾💾💾 NEW SYSTEM: Processing ${messages.length} messages from bot 💾💾💾`);
            
            // Log each message for debugging
            messages.forEach((msg, idx) => {
                console.log(`📨 Message ${idx + 1}:`, {
                    id: msg.id,
                    author: msg.author,
                    hasContent: !!msg.content,
                    hasEmbeds: !!(msg.raw_embeds && msg.raw_embeds.length > 0),
                    timestamp: msg.timestamp
                });
                
                if (msg.raw_embeds && msg.raw_embeds.length > 0) {
                    msg.raw_embeds.forEach((embed, embIdx) => {
                        console.log(`  🔗 Embed ${embIdx + 1}:`, {
                            title: embed.title,
                            fieldsCount: embed.fields ? embed.fields.length : 0
                        });
                        if (embed.fields) {
                            embed.fields.forEach((field, fieldIdx) => {
                                console.log(`    📋 Field ${fieldIdx + 1}:`, {
                                    name: field.name,
                                    value: field.value.substring(0, 100) + '...'
                                });
                            });
                        }
                    });
                }
            });
            
            // Load existing data
            let botData;
            try {
                const existing = await fs.readFile(botDataFile, 'utf8');
                botData = JSON.parse(existing);
            } catch (error) {
                botData = {
                    raw_messages: [],
                    last_updated: null,
                    total_messages: 0,
                    channel_id: "1404583987778949130"
                };
            }

            // Add new messages
            botData.raw_messages = [...botData.raw_messages, ...messages];
            botData.total_messages = botData.raw_messages.length;
            botData.last_updated = new Date().toISOString();
            botData.source = 'discord_bot';

            // Save updated data
            await fs.writeFile(botDataFile, JSON.stringify(botData, null, 2));
            console.log(`✅✅✅ NEW SYSTEM: Saved ${messages.length} messages to bot_data.json (total: ${botData.total_messages}) ✅✅✅`);

            // Trigger analysis
            let analyzedData = null;
            try {
                const DataAnalyzer = require('../DataAnalyzer');
                const dataAnalyzer = new DataAnalyzer(path.join(__dirname, '../../data'));
                const result = await dataAnalyzer.analyzeData();
                console.log(`🔍🔍🔍 NEW SYSTEM: Analysis completed: ${result.processed || 0} activities 🔍🔍🔍`);
                
                // Get the analyzed data for real-time updates
                analyzedData = await dataAnalyzer.getAnalyzedData();
                if (analyzedData) {
                    console.log(`📊 Analyzed data loaded: ${analyzedData.financial_transactions?.length || 0} financial, ${analyzedData.inventory_changes?.length || 0} inventory, ${analyzedData.farm_activities?.length || 0} farm`);
                } else {
                    console.warn('⚠️ No analyzed data returned from analyzer');
                }

                // Process payments from analyzed data
                const PaymentProcessor = require('../PaymentProcessor');
                const paymentProcessor = new PaymentProcessor(path.join(__dirname, '../../data'));
                const paymentResult = await paymentProcessor.processPayments();
                if (paymentResult.success) {
                    console.log(`💰💰💰 NEW SYSTEM: Payment processing completed: ${paymentResult.processed || 0} new payments 💰💰💰`);
                } else {
                    console.error('❌ Payment processing failed:', paymentResult.error);
                }
                
            } catch (error) {
                console.error('❌ Analysis failed:', error.message);
                console.error('❌ Analysis stack:', error.stack);
            }

            // 🤖 AUTO-TRIGGER WORKER PROCESSING (NEW: True Automation!)
            if (messages.length > 0 && dataManager) {
                console.log('🤖 AUTO-PROCESSING: Triggering automatic worker processing for', messages.length, 'new activities');
                
                // Process activities in background (non-blocking)
                setImmediate(async () => {
                    try {
                        const automationResult = await dataManager.processAllDashboardActivities();
                        if (automationResult.success && io) {
                            console.log('✅ AUTO-PROCESSING: Successfully processed', automationResult.stats.activities_processed, 'activities');
                            io.emit('automation:complete', automationResult.stats);
                            io.emit('usuarios:atualizado', dataManager.obterTodosUsuarios());
                        }
                    } catch (error) {
                        console.error('❌ AUTO-PROCESSING ERROR:', error.message);
                    }
                });
            }

            // Emit real-time update with actual data
            if (io) {
                console.log('🚀 EMITTING bot_data:updated event');
                io.emit('bot_data:updated', {
                    new_messages: messages.length,
                    total_messages: botData.total_messages
                });
                
                if (analyzedData) {
                    console.log('🚀 EMITTING atividades:atualizado event with real data');
                    io.emit('atividades:atualizado', {
                        source: 'bot_data',
                        new_activities: messages.length,
                        atividades: analyzedData.financial_transactions
                            .concat(analyzedData.inventory_changes)
                            .concat(analyzedData.farm_activities)
                            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                            .slice(0, 10) // Send latest 10 activities
                    });
                } else {
                    console.log('🚀 EMITTING atividades:atualizado event (fallback)');
                    io.emit('atividades:atualizado', {
                        source: 'bot_data',
                        new_activities: messages.length
                    });
                }
            } else {
                console.log('❌ NO IO INSTANCE AVAILABLE');
            }

            res.json({
                success: true,
                message: `NEW SYSTEM: Processed ${messages.length} messages`,
                processed: messages.length
            });

        } catch (error) {
            console.error('❌❌❌ NEW SYSTEM ERROR:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * POST /api/bot-data/save - Save raw bot data
     */
    router.post('/save', async (req, res) => {
        try {
            const { messages, source } = req.body;
            
            if (!messages || !Array.isArray(messages)) {
                return res.status(400).json({
                    success: false,
                    error: 'Messages array is required'
                });
            }

            // Load existing data
            let botData;
            try {
                const existing = await fs.readFile(botDataFile, 'utf8');
                botData = JSON.parse(existing);
            } catch (error) {
                botData = {
                    raw_messages: [],
                    last_updated: null,
                    total_messages: 0,
                    channel_id: "1404583987778949130"
                };
            }

            // Add new messages
            botData.raw_messages = [...botData.raw_messages, ...messages];
            botData.total_messages = botData.raw_messages.length;
            botData.last_updated = new Date().toISOString();
            botData.source = source || 'unknown';

            // Save updated data
            await fs.writeFile(botDataFile, JSON.stringify(botData, null, 2));

            // 🤖 AUTO-TRIGGER WORKER PROCESSING (NEW: True Automation!)
            if (messages.length > 0 && dataManager) {
                console.log('🤖 AUTO-PROCESSING: Triggering automatic worker processing for', messages.length, 'new activities');
                
                // Process activities in background (non-blocking)
                setImmediate(async () => {
                    try {
                        const automationResult = await dataManager.processAllDashboardActivities();
                        if (automationResult.success && io) {
                            console.log('✅ AUTO-PROCESSING: Successfully processed', automationResult.stats.activities_processed, 'activities');
                            io.emit('automation:complete', automationResult.stats);
                            io.emit('usuarios:atualizado', dataManager.obterTodosUsuarios());
                        }
                    } catch (error) {
                        console.error('❌ AUTO-PROCESSING ERROR:', error.message);
                    }
                });
            }

            // Emit real-time update
            if (io) {
                console.log('🚀 EMITTING bot_data:updated event');
                io.emit('bot_data:updated', {
                    new_messages: messages.length,
                    total_messages: botData.total_messages
                });
                
                console.log('🚀 EMITTING atividades:atualizado event');
                io.emit('atividades:atualizado', {
                    source: 'bot_data',
                    new_activities: messages.length
                });
            } else {
                console.log('❌ NO IO INSTANCE AVAILABLE');
            }

            console.log(`📦 Saved ${messages.length} raw messages to bot_data.json`);

            res.json({
                success: true,
                message: `Saved ${messages.length} messages`,
                total_messages: botData.total_messages
            });

        } catch (error) {
            console.error('Error saving bot data:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to save bot data'
            });
        }
    });

    /**
     * GET /api/bot-data - Get raw bot data
     */
    router.get('/', async (req, res) => {
        try {
            const data = await fs.readFile(botDataFile, 'utf8');
            const botData = JSON.parse(data);

            res.json({
                success: true,
                data: botData
            });

        } catch (error) {
            res.json({
                success: true,
                data: {
                    raw_messages: [],
                    last_updated: null,
                    total_messages: 0,
                    channel_id: "1404583987778949130"
                }
            });
        }
    });

    /**
     * DELETE /api/bot-data/clear - Clear all raw data
     */
    router.delete('/clear', async (req, res) => {
        try {
            const emptyData = {
                raw_messages: [],
                last_updated: null,
                total_messages: 0,
                channel_id: "1404583987778949130"
            };

            await fs.writeFile(botDataFile, JSON.stringify(emptyData, null, 2));

            res.json({
                success: true,
                message: 'Bot data cleared'
            });

        } catch (error) {
            console.error('Error clearing bot data:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to clear bot data'
            });
        }
    });

    return router;
};