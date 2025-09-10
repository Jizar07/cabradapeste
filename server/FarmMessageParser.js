/**
 * Farm Message Parser Service
 * Adapted from the original DiscordBot TypeScript implementation
 * Single source of truth for parsing Discord farm messages
 */

class FarmMessageParser {
    constructor() {
        // Item name normalization map
        this.itemNameMap = new Map([
            // Animals
            ['cow_female', 'Vaca'],
            ['cow_male', 'Touro'],
            ['pig_female', 'Porca'],
            ['pig_male', 'Porco'],
            ['chicken_female', 'Galinha'],
            ['chicken_male', 'Galo'],
            ['sheep', 'Ovelha'],
            ['donkey_male', 'Burro'],
            ['donkey_female', 'Mula'],
            // Crops
            ['wheat', 'Trigo'],
            ['corn', 'Milho'],
            ['seed', 'Semente'],
            ['bulrush', 'Junco'],
            ['bulrush_seed', 'Semente de Junco'],
            // Materials
            ['wood', 'Madeira'],
            ['iron', 'Ferro'],
            ['coal', 'Carvão'],
            ['cascalho', 'Cascalho'],
            // Containers
            ['box', 'Caixa'],
            ['caixa', 'Caixa'],
            // Tools
            ['wateringcan', 'Regador'],
            ['bucket', 'Balde'],
        ]);
    }

    /**
     * Main parsing function - single entry point for all message parsing
     */
    parseMessage(message) {
        const content = message.content || '';
        const author = this.extractAuthor(message, content);
        
        const base = {
            id: message.id || `msg_${Date.now()}`,
            timestamp: message.timestamp || new Date().toISOString(),
            autor: author,
            content: content,
            parseSuccess: false,
            confidence: 'none'
        };

        // Try different parsing strategies in order of specificity
        let parsed = this.parseInventoryMessage(content, base);
        if (parsed.parseSuccess) return parsed;

        parsed = this.parseFinancialMessage(content, base);
        if (parsed.parseSuccess) return parsed;

        parsed = this.parseSaleMessage(content, base);
        if (parsed.parseSuccess) return parsed;

        // Fallback - create clean display text
        return this.createFallbackActivity(content, base);
    }

    /**
     * Parse inventory-related messages (INSERIR/REMOVER ITEM)
     */
    parseInventoryMessage(content, base) {
        // First check if this is a Discord embed with "BAÚ ORGANIZAÇÃO" title
        if (base.embeds && base.embeds.length > 0) {
            for (const embed of base.embeds) {
                if (embed.title && embed.title.includes('BAÚ ORGANIZAÇÃO')) {
                    // Parse Discord embed inventory message
                    const isAdding = embed.title.includes('INSERIR') || embed.title.includes('ADICIONAR');
                    const isRemoving = embed.title.includes('REMOVER');
                    
                    if (isAdding || isRemoving) {
                        let itemName = '';
                        let quantity = 0;
                        let author = 'Sistema';
                        
                        // Extract from embed fields
                        if (embed.fields) {
                            for (const field of embed.fields) {
                                const fieldName = field.name.toLowerCase();
                                const fieldValue = field.value.replace(/```prolog\n|```/g, '').trim();
                                
                                // Extract author from "Autor:" field
                                if (fieldName.includes('autor')) {
                                    // Remove code block formatting and extract name before |
                                    const cleanValue = fieldValue.replace(/```prolog\n?|```/g, '').trim();
                                    const match = cleanValue.match(/^([^|]+)/);
                                    if (match) {
                                        author = match[1].trim();
                                    }
                                }
                                // Extract item info from "Item removido:" or similar fields
                                else if (fieldName.includes('item') || fieldName.includes('adicionado') || fieldName.includes('removido')) {
                                    // Extract item and quantity like "batatarecheada x1"
                                    const match = fieldValue.match(/([a-zA-Z_]+)\s*x\s*(\d+)/i);
                                    if (match) {
                                        itemName = match[1].trim();
                                        quantity = parseInt(match[2]);
                                    }
                                }
                            }
                        }
                        
                        if (itemName && quantity > 0) {
                            return {
                                ...base,
                                tipo: isAdding ? 'adicionar' : 'remover',
                                categoria: 'inventario',
                                item: this.normalizeItemName(itemName),
                                quantidade: quantity,
                                autor: author,
                                parseSuccess: true,
                                confidence: 'high',
                                displayText: `${author} ${isAdding ? 'adicionou' : 'removeu'} ${quantity}x ${this.normalizeItemName(itemName)}`
                            };
                        }
                    }
                }
            }
        }
        
        // Fallback to text-based patterns
        const patterns = [
            // Format: "INSERIR ITEM ... Item adicionado: X x Y"
            /(?:INSERIR ITEM|inserir item).*?Item adicionado:\s*(.+?)\s*x\s*(\d+)/i,
            // Format: "REMOVER ITEM ... Item removido: X x Y"
            /(?:REMOVER ITEM|remover item).*?Item removido:\s*(.+?)\s*x\s*(\d+)/i,
            // Format: "Item adicionado: X x Y" (without header)
            /Item adicionado:\s*(.+?)\s*x\s*(\d+)/i,
            // Format: "Item removido: X x Y" (without header)
            /Item removido:\s*(.+?)\s*x\s*(\d+)/i,
            // Format: Just "X x Y" with INSERIR/REMOVER context
            /(?:INSERIR|REMOVER).*?([a-zA-Z_]+)\s*x\s*(\d+)/i
        ];

        for (const pattern of patterns) {
            const match = content.match(pattern);
            if (match) {
                const isAdding = content.toLowerCase().includes('inserir') || 
                                content.toLowerCase().includes('adicionado');
                const itemRaw = match[1].trim();
                const quantity = parseInt(match[2]);

                return {
                    ...base,
                    tipo: isAdding ? 'adicionar' : 'remover',
                    categoria: 'inventario',
                    item: this.normalizeItemName(itemRaw),
                    quantidade: quantity,
                    parseSuccess: true,
                    confidence: 'high',
                    displayText: `${base.autor} ${isAdding ? 'adicionou' : 'removeu'} ${quantity}x ${this.normalizeItemName(itemRaw)}`
                };
            }
        }

        return base;
    }

    /**
     * Parse financial messages (CAIXA ORGANIZAÇÃO)
     */
    parseFinancialMessage(content, base) {
        // Check for financial keywords in content OR embeds
        const isFinancialMessage = content.includes('CAIXA ORGANIZAÇÃO') || 
                                  content.includes('DEPÓSITO') || 
                                  content.includes('SAQUE') ||
                                  (base.embeds && base.embeds.some(e => 
                                      e.title && (e.title.includes('DEPÓSITO') || e.title.includes('SAQUE'))
                                  ));
        
        if (!isFinancialMessage) {
            return base;
        }

        let valorTransacao = null;
        let balanceAfter = null;
        let actionDescription = null;
        let tipo = null;

        // First, try to extract from Discord embed fields (most common for bot messages)
        if (base.embeds && base.embeds.length > 0) {
            const embed = base.embeds[0];
            
            if (embed.fields) {
                for (const field of embed.fields) {
                    const fieldName = field.name.toLowerCase();
                    const fieldValue = field.value.replace(/```prolog\n|```/g, '').trim();
                    
                    // Extract transaction amount
                    if (fieldName.includes('valor depositado')) {
                        const match = fieldValue.match(/\$?([0-9.,]+)/);
                        if (match) {
                            valorTransacao = parseFloat(match[1].replace(',', '.'));
                            tipo = 'deposito';
                        }
                    } else if (fieldName.includes('valor sacado')) {
                        const match = fieldValue.match(/\$?([0-9.,]+)/);
                        if (match) {
                            valorTransacao = parseFloat(match[1].replace(',', '.'));
                            tipo = 'saque';
                        }
                    }
                    
                    // Extract balance after transaction 
                    else if (fieldName.includes('saldo após')) {
                        const match = fieldValue.match(/\$?([0-9.,]+)/);
                        if (match) {
                            balanceAfter = parseFloat(match[1].replace(',', '.'));
                        }
                    }
                    
                    // Extract action description
                    else if (fieldName.includes('ação')) {
                        actionDescription = fieldValue.trim();
                    }
                }
            }
        }

        // Fallback to content parsing if embed parsing failed
        if (!valorTransacao) {
            const valueDepositMatch = content.match(/Valor depositado:\s*\$?([\d,\.]+)/i);
            const valueSaqueMatch = content.match(/Valor sacado:\s*\$?([\d,\.]+)/i);
            const actionMatch = content.match(/Ação:\s*([^,\n]+?)(?=Saldo|Data|$)/i);
            
            if (valueDepositMatch) {
                valorTransacao = parseFloat(valueDepositMatch[1].replace(',', '.'));
                tipo = 'deposito';
            } else if (valueSaqueMatch) {
                valorTransacao = parseFloat(valueSaqueMatch[1].replace(',', '.'));
                tipo = 'saque';
            }
            
            if (actionMatch) {
                actionDescription = actionMatch[1].trim();
            }
            
            // Extract "Saldo após depósito" or "Saldo após saque" from content
            if (!balanceAfter) {
                const balanceAfterMatch = content.match(/Saldo após (?:depósito|saque):\s*\$?([\d,\.]+)/i);
                if (balanceAfterMatch) {
                    balanceAfter = parseFloat(balanceAfterMatch[1].replace(',', '.'));
                }
            }
        }
        
        if (valorTransacao && tipo) {
            return {
                ...base,
                tipo: tipo,
                categoria: 'financeiro',
                valor: valorTransacao,
                balance_after: balanceAfter,
                descricao: actionDescription || (tipo === 'deposito' ? 'Depósito' : 'Saque'),
                parseSuccess: true,
                confidence: 'high',
                displayText: `${base.autor} ${tipo === 'deposito' ? 'depositou' : 'sacou'} $${valorTransacao}${actionDescription ? ' - ' + actionDescription : ''}`
            };
        }

        return base;
    }

    /**
     * Parse sale messages (vendeu X animais)
     */
    parseSaleMessage(content, base) {
        const salePattern = /vendeu\s+(\d+)\s+animais?\s+no\s+matadouro/i;
        const match = content.match(salePattern);
        
        if (match) {
            const valueMatch = content.match(/\$?([\d,\.]+)/);
            const animalCount = parseInt(match[1]);
            
            return {
                ...base,
                tipo: 'venda',
                categoria: 'financeiro',
                valor: valueMatch ? parseFloat(valueMatch[1].replace(',', '.')) : undefined,
                descricao: `Vendeu ${animalCount} animal(is) no matadouro`,
                parseSuccess: true,
                confidence: 'high',
                displayText: `${base.autor} vendeu ${animalCount} animal(is)${valueMatch ? ` por $${valueMatch[1]}` : ''}`
            };
        }

        return base;
    }

    /**
     * Create clean fallback display when parsing fails
     */
    createFallbackActivity(content, base) {
        // Try to extract key information even if full parsing fails
        let displayText = content;
        
        // Clean up Discord formatting
        displayText = displayText
            .replace(/```[a-z]*\n?/g, '') // Remove code blocks
            .replace(/\*\*/g, '') // Remove bold
            .replace(/__/g, '') // Remove underline
            .replace(/~~~/g, '') // Remove strikethrough
            .replace(/\n{2,}/g, '\n') // Reduce multiple newlines
            .trim();

        // If message is too long, truncate intelligently
        if (displayText.length > 150) {
            // Try to find a good cut point
            const cutPoint = displayText.indexOf('\n', 100);
            if (cutPoint > 0 && cutPoint < 150) {
                displayText = displayText.substring(0, cutPoint) + '...';
            } else {
                displayText = displayText.substring(0, 150) + '...';
            }
        }

        // Try to guess category based on keywords
        let categoria = 'sistema';
        let confidence = 'low';

        if (content.match(/item|inventario|adicionar|remover/i)) {
            categoria = 'inventario';
            confidence = 'medium';
        } else if (content.match(/\$|dinheiro|deposito|valor|vend/i)) {
            categoria = 'financeiro';
            confidence = 'medium';
        }

        return {
            ...base,
            categoria,
            parseSuccess: false,
            confidence,
            displayText: `${base.autor}: ${displayText}`
        };
    }

    /**
     * Extract author from message and content
     * This is the critical function that was missing!
     */
    extractAuthor(message, content) {
        // Priority 1: From Discord embed fields (most common for bot messages)
        if (message.embeds && message.embeds.length > 0) {
            const embed = message.embeds[0];
            
            if (embed.fields) {
                // Look for "Autor:" field
                for (const field of embed.fields) {
                    if (field.name && field.name.toLowerCase().includes('autor')) {
                        // Extract author from field like "Cliff Dillimore | FIXO: 267"
                        const match = field.value.match(/```prolog\n?([^|\n]+)/);
                        if (match) {
                            const author = match[1].trim();
                            if (author && author.length > 0) {
                                return author;
                            }
                        }
                    }
                }
                
                // Look for "Ação:" field for animal sales
                for (const field of embed.fields) {
                    if (field.name && field.name.toLowerCase().includes('ação')) {
                        // Extract from "beatriz power vendeu 4 animais no matadouro"
                        const match = field.value.match(/```prolog\n?([^\s]+[^v\n]*?)\s+(vendeu|depositou|sacou|comprou)/);
                        if (match) {
                            const author = match[1].trim();
                            if (author && author.length > 0) {
                                return author;
                            }
                        }
                    }
                }
            }
        }

        // Priority 2: Worker name from content text
        const workerMatch = content.match(/Autor:\s*([^,\n]+)/i);
        if (workerMatch) {
            const worker = workerMatch[1].trim();
            if (worker && worker !== 'Unknown' && worker.length > 0) {
                return worker;
            }
        }

        // Priority 3: Message author field (for non-bot messages)
        if (message.author && message.author !== 'Unknown' && !message.author.includes('Bot')) {
            return message.author;
        }

        // Priority 4: Try to extract from other patterns
        const altAuthorMatch = content.match(/^([A-Za-z\s]+?)(?:vendeu|adicionou|removeu|depositou)/i);
        if (altAuthorMatch) {
            return altAuthorMatch[1].trim();
        }

        return 'Sistema';
    }

    /**
     * Normalize item names for consistent display
     */
    normalizeItemName(rawName) {
        if (!rawName) return 'Item';

        // Check map for known items
        const normalized = this.itemNameMap.get(rawName.toLowerCase());
        if (normalized) return normalized;

        // Check for partial matches
        for (const [key, value] of this.itemNameMap) {
            if (rawName.toLowerCase().includes(key)) {
                return value;
            }
        }

        // Default normalization
        return rawName
            .replace(/_/g, ' ')
            .replace(/([a-z])([A-Z])/g, '$1 $2')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    }

    /**
     * Convert raw Discord message to structured format for processing
     */
    convertDiscordMessage(rawMessage) {
        // Extract embed content just like the original BotMessageForwarder
        let extractedContent = rawMessage.content || '';
        const embedContents = [];
        
        if (rawMessage.embeds && rawMessage.embeds.length > 0) {
            for (const embed of rawMessage.embeds) {
                const parts = [];
                
                if (embed.author?.name) {
                    parts.push(`REGISTRO - ${embed.author.name}`);
                }
                
                if (embed.title) {
                    parts.push(embed.title);
                }
                
                if (embed.description) {
                    parts.push(embed.description);
                }
                
                // Process fields - this is where the farm data usually is
                if (embed.fields && embed.fields.length > 0) {
                    for (const field of embed.fields) {
                        // Clean up field values (remove code blocks)
                        const cleanValue = field.value
                            .replace(/```prolog\n|```/g, '')
                            .replace(/`/g, '')
                            .trim();
                        
                        // Clean field name
                        const cleanFieldName = field.name
                            .replace(/`/g, '')
                            .replace(/^:+\s*/, '')
                            .replace(/\s*:+$/, '')
                            .trim();
                        
                        parts.push(`${cleanFieldName}: ${cleanValue}`);
                    }
                }
                
                if (parts.length > 0) {
                    embedContents.push(parts.join('\n'));
                }
            }
            
            // If no regular content but has embed content, use that
            if (!extractedContent && embedContents.length > 0) {
                extractedContent = embedContents.join('\n\n');
            }
        }

        return {
            id: rawMessage.id,
            timestamp: rawMessage.timestamp,
            author: rawMessage.author,
            content: extractedContent,
            embeds: rawMessage.embeds || []
        };
    }
}

module.exports = new FarmMessageParser();