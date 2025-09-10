/**
 * Migration script to convert user IDs from name_surname format to FIXO numbers
 * This updates usuarios.json to use FIXO IDs as the primary key
 */

const fs = require('fs').promises;
const path = require('path');

const ANALYZED_DATA_FILE = path.join(__dirname, '../data/analyzed_data.json');
const USUARIOS_FILE = path.join(__dirname, '../data/usuarios.json');

async function migrateUserIds() {
    try {
        console.log('🔄 Starting user ID migration to FIXO numbers...');
        
        // Load analyzed data to extract FIXO mappings
        const analyzedDataRaw = await fs.readFile(ANALYZED_DATA_FILE, 'utf8');
        const analyzedData = JSON.parse(analyzedDataRaw);
        
        // Load current usuarios data
        const usuariosRaw = await fs.readFile(USUARIOS_FILE, 'utf8');
        const usuariosData = JSON.parse(usuariosRaw);
        
        // Build mapping of names to FIXO IDs from activities
        const nameToFixoMap = new Map();
        
        // Process all activities to find FIXO mappings
        const allActivities = [
            ...(analyzedData.financial_transactions || []),
            ...(analyzedData.inventory_changes || []),
            ...(analyzedData.farm_activities || [])
        ];
        
        // Also check raw messages from the messages array
        const rawMessages = analyzedData.messages || [];
        
        for (const message of rawMessages) {
            if (message.embeds) {
                for (const embed of message.embeds) {
                    if (embed.fields) {
                        for (const field of embed.fields) {
                            if (field.name && field.name.includes('Autor')) {
                                // Extract from author field like "Santiago Bowdin | FIXO: 71809"
                                const match = field.value.match(/```prolog\n([^|]+)\s*\|\s*FIXO:\s*(\d+)/);
                                if (match) {
                                    const authorName = match[1].trim();
                                    const fixoId = match[2];
                                    
                                    // Store mapping
                                    nameToFixoMap.set(authorName.toLowerCase(), fixoId);
                                    
                                    // Also try to match with underscore format
                                    const underscoreName = authorName.toLowerCase().replace(/\s+/g, '_');
                                    nameToFixoMap.set(underscoreName, fixoId);
                                    
                                    console.log(`📋 Found mapping: "${authorName}" → FIXO ${fixoId}`);
                                }
                            }
                        }
                    }
                }
            }
        }
        
        for (const activity of allActivities) {
            if (activity.raw_message && activity.raw_message.embeds) {
                for (const embed of activity.raw_message.embeds) {
                    if (embed.fields) {
                        for (const field of embed.fields) {
                            if (field.name && field.name.includes('Autor')) {
                                // Extract from author field like "Santiago Bowdin | FIXO: 71809"
                                const match = field.value.match(/```prolog\n([^|]+)\s*\|\s*FIXO:\s*(\d+)/);
                                if (match) {
                                    const authorName = match[1].trim();
                                    const fixoId = match[2];
                                    
                                    // Store mapping
                                    nameToFixoMap.set(authorName.toLowerCase(), fixoId);
                                    
                                    // Also try to match with underscore format
                                    const underscoreName = authorName.toLowerCase().replace(/\s+/g, '_');
                                    nameToFixoMap.set(underscoreName, fixoId);
                                    
                                    console.log(`📋 Found mapping: "${authorName}" → FIXO ${fixoId}`);
                                }
                            }
                        }
                    }
                }
            }
        }
        
        console.log(`📊 Found ${nameToFixoMap.size} name-to-FIXO mappings`);
        
        // Create new usuarios structure with FIXO IDs
        const newUsuarios = {
            usuarios: {},
            funcoes: {
                gerente: [],
                trabalhador: []
            }
        };
        
        // Migrate each user
        let migratedCount = 0;
        let skippedCount = 0;
        
        for (const [oldId, userData] of Object.entries(usuariosData.usuarios)) {
            // Try to find FIXO ID for this user
            let fixoId = null;
            
            // Check if user already has fixo_id stored
            if (userData.fixo_id) {
                fixoId = userData.fixo_id;
            } else {
                // Try to match by name or old ID
                const nameLower = userData.nome.toLowerCase();
                fixoId = nameToFixoMap.get(nameLower) || nameToFixoMap.get(oldId);
            }
            
            if (fixoId) {
                // Use FIXO ID as the new user ID
                newUsuarios.usuarios[fixoId] = {
                    ...userData,
                    id: fixoId,
                    fixo_id: fixoId,
                    old_id: oldId, // Keep reference to old ID
                    migrated_at: new Date().toISOString()
                };
                
                // Update funcoes arrays
                if (userData.funcao === 'gerente') {
                    newUsuarios.funcoes.gerente.push(fixoId);
                } else {
                    newUsuarios.funcoes.trabalhador.push(fixoId);
                }
                
                console.log(`✅ Migrated: ${userData.nome} (${oldId} → ${fixoId})`);
                migratedCount++;
            } else {
                // Keep user with old ID but mark as unmigrated
                console.log(`⚠️  No FIXO ID found for: ${userData.nome} (${oldId})`);
                newUsuarios.usuarios[oldId] = {
                    ...userData,
                    needs_fixo_migration: true
                };
                
                // Update funcoes arrays with old ID
                if (userData.funcao === 'gerente') {
                    newUsuarios.funcoes.gerente.push(oldId);
                } else {
                    newUsuarios.funcoes.trabalhador.push(oldId);
                }
                
                skippedCount++;
            }
        }
        
        // Backup original file
        const backupFile = USUARIOS_FILE.replace('.json', '_backup_' + Date.now() + '.json');
        await fs.writeFile(backupFile, usuariosRaw);
        console.log(`💾 Backup saved to: ${backupFile}`);
        
        // Save migrated data
        await fs.writeFile(USUARIOS_FILE, JSON.stringify(newUsuarios, null, 2));
        console.log(`\n✅ Migration complete!`);
        console.log(`   - Migrated: ${migratedCount} users`);
        console.log(`   - Skipped: ${skippedCount} users (no FIXO ID found)`);
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

// Run migration
migrateUserIds().then(() => {
    console.log('🎉 User ID migration completed successfully!');
    process.exit(0);
}).catch(error => {
    console.error('❌ Migration error:', error);
    process.exit(1);
});