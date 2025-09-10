#!/usr/bin/env node

const path = require('path');
const fs = require('fs').promises;
const DataManager = require('../server/DataManager');

/**
 * Script to extract FIXO IDs from analyzed data and automatically create workers
 */

async function extractAndAddWorkers() {
    try {
        console.log('🔍 Starting worker extraction and creation...');
        
        const dataManager = new DataManager('./data');
        
        // Read analyzed data
        const analyzedDataPath = path.join(__dirname, '../data/analyzed_data.json');
        const rawData = await fs.readFile(analyzedDataPath, 'utf8');
        const analyzedData = JSON.parse(rawData);
        
        const extractedUsers = new Map();
        
        // Process messages to extract FIXO IDs
        if (analyzedData.messages) {
            console.log(`📨 Processing ${analyzedData.messages.length} messages...`);
            
            for (const message of analyzedData.messages) {
                if (message.embeds && message.embeds.length > 0) {
                    for (const embed of message.embeds) {
                        if (embed.fields) {
                            for (const field of embed.fields) {
                                if (field.name.includes('Autor:')) {
                                    // Extract from prolog format: ```prolog\nZero Bala | FIXO: 74829\n```
                                    const match = field.value.match(/```prolog\n(.+?)\s+\|\s+FIXO:\s*(\d+)\n```/);
                                    if (match) {
                                        const name = match[1];
                                        const fixoId = match[2];
                                        
                                        if (!extractedUsers.has(fixoId)) {
                                            extractedUsers.set(fixoId, name);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        
        console.log(`👥 Found ${extractedUsers.size} unique users with FIXO IDs`);
        
        // Get current users
        const existingUsers = dataManager.obterTodosUsuarios();
        let createdCount = 0;
        
        // Add missing users
        for (const [fixoId, name] of extractedUsers) {
            if (!existingUsers[fixoId]) {
                console.log(`➕ Creating worker: ${name} (FIXO: ${fixoId})`);
                
                const newUser = {
                    id: fixoId,
                    nome: name,
                    funcao: 'trabalhador',
                    ativo: true,
                    data_criacao: new Date().toISOString(),
                    ultima_atividade: new Date().toISOString(),
                    fixo_id: fixoId
                };
                
                dataManager.adicionarUsuario(fixoId, newUser);
                createdCount++;
            } else {
                console.log(`✅ User already exists: ${name} (FIXO: ${fixoId})`);
            }
        }
        
        console.log(`🎉 Successfully created ${createdCount} new workers!`);
        console.log(`📊 Total users in system: ${Object.keys(dataManager.obterTodosUsuarios()).length}`);
        
    } catch (error) {
        console.error('❌ Error extracting and adding workers:', error);
    }
}

// Run the script
if (require.main === module) {
    extractAndAddWorkers();
}

module.exports = extractAndAddWorkers;