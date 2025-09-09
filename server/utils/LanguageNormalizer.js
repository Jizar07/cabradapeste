const fs = require('fs');
const path = require('path');

class LanguageNormalizer {
    constructor() {
        // Translation dictionary: Portuguese -> English (canonical)
        this.ptToEn = {
            // Grains/Cereals
            "trigo": "wheat",
            "milho": "corn", 
            "arroz": "rice",
            "aveia": "oats",
            "cevada": "barley",
            
            // Planting service mapping - All plant types use this service pricing
            "plantacoes_por_semente_plantada": "plantacoes_por_semente_plantada",
            "plantacao": "plantacoes_por_semente_plantada",
            "plantacoes": "plantacoes_por_semente_plantada",
            "colheita": "plantacoes_por_semente_plantada",
            "cultivo": "plantacoes_por_semente_plantada",
            "harvest": "plantacoes_por_semente_plantada",
            "crops": "plantacoes_por_semente_plantada",
            "planted_crops": "plantacoes_por_semente_plantada",
            "plant_service": "plantacoes_por_semente_plantada",
            
            // Fruits
            "maça": "apple",
            "maca": "apple", 
            "laranja": "orange",
            "banana": "banana",
            "uva": "grape",
            "limao": "lemon",
            "limão": "lemon",
            "morango": "strawberry",
            "pera": "pear",
            "pessego": "peach",
            "pêssego": "peach",
            
            // Vegetables
            "batata": "potato",
            "cenoura": "carrot",
            "tomate": "tomato",
            "cebola": "onion",
            "alface": "lettuce",
            "repolho": "cabbage",
            "brocolis": "broccoli",
            "brócolis": "broccoli",
            
            // Seeds
            "semente": "seed",
            "sementes": "seeds",
            "trigo_seed": "wheat_seed",
            "milho_seed": "corn_seed",
            "semente_trigo": "wheat_seed",
            "semente_milho": "corn_seed",
            "junco_seed": "bulrush_seed",
            "semente_junco": "bulrush_seed",
            
            // Animals
            "vaca": "cow",
            "touro": "bull",
            "porco": "pig",
            "galinha": "chicken",
            "galo": "rooster",
            "ovelha": "sheep",
            "cabra": "goat",
            "cavalo": "horse",
            "burro": "donkey",
            
            // Animal Products
            "leite": "milk",
            "leite_de_cabra": "leite_de_cabra",
            "leite_de_ovelha": "leite_de_ovelha", 
            "leite_de_vaca": "leite_de_vaca",
            "leite_de_porco": "leite_de_porco",
            "leite_de_mula": "leite_de_mula",
            "ovos": "eggs",
            "ovo": "egg",
            "carne": "meat",
            "carne_de_porco": "carne_de_porco",
            "crina_de_galo": "crina_de_galo",
            "la_de_ovelha": "la_de_ovelha",
            "couro_de_mula": "couro_de_mula",
            "buchada_de_bode": "buchada_de_bode",
            "queijo": "cheese",
            "manteiga": "butter",
            
            // Tools/Equipment
            "machado": "axe",
            "enxada": "hoe",
            "pa": "shovel",
            "pá": "shovel",
            "foice": "scythe",
            "martelo": "hammer",
            
            // Containers  
            "saco": "bag",
            "balde": "bucket",
            "cesto": "basket",
            "mochila": "mochila_20kg",
            "satchel": "mochila_20kg",
            "caixa_rustica": "caixa_rustica",
            "caixa rustica": "caixa_rustica",
            
            // Materials/Resources
            "bulrush": "junco",
            "junco": "junco",
            "carvao": "carvao",
            "salitre": "salitre",
            "enxofre": "enxofre",
            "cigarro": "cigarett",
            "cigarette": "cigarett",
            
            // Tools/Equipment (extended)
            "regador": "wateringcan",
            "wateringcan_empty": "wateringcan_empty",
            "wateringcan_full": "wateringcan_full",
            
            // Animal products (extended)
            "porcao": "portion",
            "porção": "portion",
            "common_portion": "racao_comum",
            "racao": "feed",
            "ração": "feed",
            
            // Animal breeds/variants
            "sheep_male": "sheep_male", 
            "sheep_female": "sheep_female",
            "ovelha_macho": "sheep_male",
            "ovelha_femea": "sheep_female",
            
            // Common prefixes/suffixes
            "feminino": "female",
            "macho": "male",
            "femea": "female",
            "fêmea": "female",
        };
        
        // Reverse mapping: English -> Portuguese  
        this.enToPt = {};
        for (const [k, v] of Object.entries(this.ptToEn)) {
            this.enToPt[v] = k;
        }
        
        // Item variations and aliases
        this.aliases = {
            // Common variations
            "wheat": ["trigo", "wheat", "wheat_grain"],
            "corn": ["milho", "corn", "corn_grain", "maize"],
            "milk": ["leite", "milk", "leite_vaca"],
            "eggs": ["ovos", "eggs", "ovo", "egg"],
            "cow_female": ["vaca", "cow_female", "vaca_femea", "cow_femea"],
            "cow_male": ["touro", "cow_male", "touro_macho", "bull"],
            "pig_female": ["porca", "pig_female", "porco_femea"],
            "pig_male": ["porco", "pig_male", "porco_macho"],
            "chicken_female": ["galinha", "chicken_female", "galinha_femea"],
            "chicken_male": ["galo", "chicken_male", "galo_macho", "rooster"],
            
            // Seeds
            "wheat_seed": ["trigo_seed", "wheat_seed", "semente_trigo"],
            "corn_seed": ["milho_seed", "corn_seed", "semente_milho"],
            
            // Processed items
            "milk_cabra": ["leite_cabra", "goat_milk", "milk_goat"],
            "caixaanimal": ["caixa_animal", "animal_box", "caixaanimal"],
            "caixadeverduras": ["caixa_verduras", "vegetable_box", "caixadeverduras"],
            "caixa_rustica": ["caixa_rustica", "caixa rustica", "Caixa Rustica", "rustic_box"],
            "mochila_20kg": ["mochila_20kg", "mochila", "satchel", "bag_20kg", "backpack"],
            
            // Mining materials (same category as Salitre/Enxofre)
            "carvao": ["carvao", "Carvao", "coal", "charcoal_mining"],
            "salitre": ["salitre", "Salitre", "saltpeter"],
            "enxofre": ["enxofre", "Enxofre", "sulfur"],
            
            // Tools/Equipment variations
            "wateringcan": ["regador", "wateringcan", "watering_can"],
            "wateringcan_empty": ["regador_vazio", "wateringcan_empty", "empty_wateringcan"],
            "wateringcan_full": ["regador_cheio", "wateringcan_full", "full_wateringcan"],
            
            // Animal products
            "racao_comum": ["racao_comum", "common_portion", "porção_comum", "porcao_comum"],
            "racao_de_ovelha": ["racao_de_ovelha", "common_portion_sheep", "sheep_portion", "porcao_ovelha", "sheep_feed"],
            "racao_de_cabra": ["racao_de_cabra", "common_portion_goat", "goat_portion", "porcao_cabra", "goat_feed"],
            "racao_de_galinha": ["racao_de_galinha", "common_portion_chicken", "chicken_portion", "porcao_galinha", "chicken_feed"],
            "racao_de_mula": ["racao_de_mula", "common_portion_donkey", "donkey_portion", "porcao_mula", "donkey_feed", "mule_feed"],
            "racao_de_porco": ["racao_de_porco", "common_portion_pig", "pig_portion", "porcao_porco", "pig_feed"],
            "racao_de_vaca": ["racao_de_vaca", "common_portion_cow", "cow_portion", "porcao_vaca", "cow_feed"],
            "racao_de_bode": ["racao_de_bode", "common_portion_goat_male", "bode_portion", "porcao_bode", "buck_feed"],
            
            // Animals with gender
            "sheep_male": ["ovelha_macho", "sheep_male", "carneiro"],
            "sheep_female": ["ovelha_femea", "sheep_female", "ovelha"],
            
            // Planting service - Map all plant varieties to the service pricing
            "plantacoes_por_semente_plantada": [
                "plantacoes_por_semente_plantada", "planted_crops", "plant_service",
                "plantacao", "plantacoes", "crops", "planted_seed", "planted_seeds",
                "trigo_plantado", "milho_plantado", "batata_plantada", "cenoura_plantada",
                "wheat_grown", "corn_grown", "potato_grown", "carrot_grown",
                "colheita", "harvest", "cultivo", "cultivation",
                "wheat", "corn", "potato", "carrot", "tomato", "onion", "lettuce",
                "trigo", "milho", "batata", "cenoura", "tomate", "cebola", "alface"
            ],
        };
        
        // Build reverse alias mapping
        this.aliasToCanonical = {};
        for (const [canonical, aliases] of Object.entries(this.aliases)) {
            for (const alias of aliases) {
                this.aliasToCanonical[alias.toLowerCase()] = canonical.toLowerCase();
            }
        }

        // Discord to Price List mapping for direct translation
        this.discordToPriceList = {
            // Common items
            "cigarett": "cigarro",
            "cornseed": "semente_milho", 
            "bulrush_seed": "semente_junco",
            "junco_seed": "semente_junco",
            
            // Animals
            "goat_male": "bode",
            "goat_female": "cabra", 
            "chicken_female": "galinha",
            "chicken_male": "galo",
            "pig_male": "porco",
            "pig_female": "porca",
            "cow_male": "touro",
            "cow_female": "vaca",
            "sheep_female": "ovelha",
            "sheep_male": "carneiro",
            "donkey_male": "burro",
            "donkey_female": "mula",
            
            // Animal products
            "milk_goat": "leite_de_cabra",
            "milk_cow": "leite_de_vaca", 
            "milk_sheep": "leite_de_ovelha",
            "milk_pig": "leite_de_porco",
            "milk_donkey": "leite_de_mula",
            
            // Feed
            "common_portion_goat": "racao_de_cabra",
            "common_portion_chicken": "racao_de_galinha",
            "common_portion_sheep": "racao_de_ovelha",
            "common_portion_donkey": "racao_de_mula",
            "common_portion_pig": "racao_de_porco",
            "common_portion_cow": "racao_de_vaca",
            "common_portion": "racao_comum",
            
            // Tools
            "wateringcan": "regador",
            "wateringcan_empty": "regador_vazio",
            "wateringcan_full": "regador_cheio",
            
            // Materials
            "bulrush": "junco",
            
            // Containers
            "rustic_box": "caixa_rustica",
            "animal_box": "caixaanimal",
            "vegetable_box": "caixadeverduras",
            "bag_20kg": "mochila_20kg",
            
            // Raw materials
            "coal": "carvao",
            "saltpeter": "salitre",
            "sulfur": "enxofre"
        };
    }

    /**
     * Remove accents and normalize text for comparison
     * @param {string} text - Text to normalize
     * @returns {string} - Normalized text without accents
     */
    removeAccents(text) {
        if (!text || typeof text !== 'string') return text;
        
        return text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove accents
            .trim();
    }

    /**
     * Check if two strings are equivalent ignoring accents and case
     * @param {string} str1 - First string
     * @param {string} str2 - Second string
     * @returns {boolean} - True if strings are equivalent
     */
    isEquivalent(str1, str2) {
        return this.removeAccents(str1) === this.removeAccents(str2);
    }

    /**
     * Find best match in a collection ignoring accents
     * @param {string} target - Target string to match
     * @param {Array|Object} collection - Collection to search in
     * @returns {string|null} - Best match or null
     */
    findAccentInsensitiveMatch(target, collection) {
        if (!target) return null;
        
        const targetNormalized = this.removeAccents(target);
        const items = Array.isArray(collection) ? collection : Object.keys(collection);
        
        for (const item of items) {
            if (this.removeAccents(item) === targetNormalized) {
                return item;
            }
        }
        
        return null;
    }
    
    normalizeItemName(itemName) {
        if (!itemName) {
            return itemName;
        }
        
        const itemLower = itemName.toLowerCase().trim();
        
        // First check Discord to price list direct mapping (with accent insensitive)
        let match = this.findAccentInsensitiveMatch(itemLower, this.discordToPriceList);
        if (match) {
            return this.discordToPriceList[match];
        }
        
        // Check if it's already a known alias (with accent insensitive)
        match = this.findAccentInsensitiveMatch(itemLower, this.aliasToCanonical);
        if (match) {
            return this.aliasToCanonical[match];
        }
        
        // Check direct Portuguese to English translation (with accent insensitive)
        match = this.findAccentInsensitiveMatch(itemLower, this.ptToEn);
        if (match) {
            const canonical = this.ptToEn[match];
            // Check if canonical form has aliases
            if (this.aliases[canonical]) {
                return canonical;
            }
            return canonical;
        }
        
        // Check if it's already English and has aliases
        if (this.aliases[itemLower]) {
            return itemLower;
        }
        
        // Try to handle compound names (with underscores)
        if (itemLower.includes("_")) {
            const parts = itemLower.split("_");
            const normalizedParts = [];
            for (const part of parts) {
                if (this.ptToEn[part]) {
                    normalizedParts.push(this.ptToEn[part]);
                } else {
                    normalizedParts.push(part);
                }
            }
            
            const candidate = normalizedParts.join("_");
            if (this.aliases[candidate]) {
                return candidate;
            }
            return candidate;
        }
        
        // Return original if no normalization found
        return itemName.toLowerCase();
    }
    
    getAllVariations(canonicalName) {
        const canonicalLower = canonicalName.toLowerCase();
        const variations = new Set([canonicalLower]);
        
        // Add aliases if they exist
        if (this.aliases[canonicalLower]) {
            for (const alias of this.aliases[canonicalLower]) {
                variations.add(alias.toLowerCase());
            }
        }
        
        // Add Portuguese translation if it exists
        if (this.enToPt[canonicalLower]) {
            variations.add(this.enToPt[canonicalLower]);
        }
        
        return Array.from(variations);
    }
    
    findPriceMatch(itemName, priceDict, forWorkerEarnings = false) {
        if (!itemName || !priceDict) {
            return null;
        }
        
        // For worker earnings calculation
        if (forWorkerEarnings) {
            // Seeds earn workers $0 (they are our costs, not worker earnings)
            if (this.isSeedItem(itemName)) {
                return { min_price: 0.0, max_price: 0.0, custom_farmer: 0.0, custom_buy: null, custom_sell: null };
            }
            
            // Plants/crops use planting service pricing
            if (this.isPlantCropItem(itemName)) {
                const plantingKeys = ["plantacoes_por_semente_plantada", "plantações_por_semente_plantada", 
                                   "plantações_por_semente_plantada", "planted_crops", "plant_service"];
                for (const key of plantingKeys) {
                    if (priceDict[key]) {
                        return priceDict[key];
                    }
                }
            }
        }
        
        // For non-worker earnings (costs, sales, etc.) - check if seed should use seed pricing
        if (this.isSeedItem(itemName)) {
            const seedKeys = ["seeds", "semente", "sementes", "seed_cost"];
            for (const key of seedKeys) {
                if (priceDict[key]) {
                    return priceDict[key];
                }
            }
        }
        
        // Check if this is a plant/crop item that should use planting service pricing
        if (this.isPlantCropItem(itemName)) {
            const plantingKeys = ["plantacoes_por_semente_plantada", "plantações_por_semente_plantada", 
                               "plantações_por_semente_plantada", "planted_crops", "plant_service"];
            for (const key of plantingKeys) {
                if (priceDict[key]) {
                    return priceDict[key];
                }
            }
        }
        
        // Normalize the item name
        const normalized = this.normalizeItemName(itemName);
        
        // Try exact match first
        if (priceDict[normalized]) {
            return priceDict[normalized];
        }
        
        // Try all variations
        const variations = this.getAllVariations(normalized);
        for (const variation of variations) {
            if (priceDict[variation]) {
                return priceDict[variation];
            }
        }
        
        // Try accent-insensitive search in price_dict keys
        let match = this.findAccentInsensitiveMatch(normalized, priceDict);
        if (match) {
            return priceDict[match];
        }
        
        // Check if any variation matches with accent-insensitive search
        for (const variation of variations) {
            match = this.findAccentInsensitiveMatch(variation, priceDict);
            if (match) {
                return priceDict[match];
            }
        }
        
        return null;
    }
    
    normalizeInventory(inventoryDict) {
        const normalizedInventory = {};
        
        for (const [itemName, data] of Object.entries(inventoryDict)) {
            const normalizedName = this.normalizeItemName(itemName);
            
            // If multiple items normalize to the same name, combine them
            if (normalizedInventory[normalizedName]) {
                // Combine quantities
                normalizedInventory[normalizedName].quantity += data.quantity || 0;
                // Keep the most recent timestamp
                const existingTime = normalizedInventory[normalizedName].last_updated || '';
                const newTime = data.last_updated || '';
                if (newTime > existingTime) {
                    normalizedInventory[normalizedName].last_updated = newTime;
                }
            } else {
                normalizedInventory[normalizedName] = { ...data };
            }
        }
        
        return normalizedInventory;
    }
    
    isSeedItem(itemName) {
        if (!itemName) {
            return false;
        }
            
        const itemLower = itemName.toLowerCase().trim();
        
        // Seed identifiers
        const seedTerms = ["seed", "seeds", "semente", "sementes", "_seed", "seed_"];
        
        // Check if item contains seed terms
        for (const seedTerm of seedTerms) {
            if (itemLower.includes(seedTerm)) {
                return true;
            }
        }
                
        return false;
    }
    
    isPlantCropItem(itemName) {
        if (!itemName) {
            return false;
        }
            
        // Seeds are NOT counted as plants for worker earnings
        if (this.isSeedItem(itemName)) {
            return false;
        }
            
        const itemLower = itemName.toLowerCase().trim();
        
        // Exclude processed items that contain plant names but aren't raw plants
        const excludedPatterns = [
            "juice", "suco", "_juice", "_suco", "food", "comida", "cigarette", "cigarro",
            "bag", "saco", "processed", "cooked", "prepared"
        ];
        
        // Check if item contains any excluded patterns
        for (const pattern of excludedPatterns) {
            if (itemLower.includes(pattern)) {
                return false;
            }
        }
        
        // Common plant/crop names that workers deposit from farming service
        const plantItems = [
            // Portuguese plant names - RAW ONLY
            "trigo", "milho", "arroz", "aveia", "cevada", "batata", "cenoura", 
            "tomate", "cebola", "alface", "repolho", "brocolis", "brócolis",
            "maça", "maca", "laranja", "banana", "uva", "limao", "limão", 
            "morango", "pera", "pessego", "pêssego",
            
            // English plant names - RAW ONLY
            "wheat", "corn", "rice", "oats", "barley", "potato", "carrot",
            "tomato", "onion", "lettuce", "cabbage", "broccoli",
            "apple", "orange", "banana", "grape", "lemon", "strawberry", "pear", "peach",
            
            // Harvest/crop related terms (but not processed items)
            "colheita", "plantacao", "plantacoes", "cultivo", 
            "harvest", "crops", "planted", "grown",
            
            // Important materials for crafting
            "junco", "oregano"
        ];
        
        // Check if item name contains any plant/crop terms
        for (const plant of plantItems) {
            if (itemLower.includes(plant)) {
                return true;
            }
        }
                
        return false;
    }

    // Convert Discord item names to price list canonical IDs
    discordToCanonical(discordItemName) {
        if (!discordItemName) {
            return discordItemName;
        }

        const itemLower = discordItemName.toLowerCase().trim();
        
        // Direct Discord to price list mapping first
        if (this.discordToPriceList[itemLower]) {
            return this.discordToPriceList[itemLower];
        }

        // Fall back to general normalization
        return this.normalizeItemName(discordItemName);
    }

    // Get display name from custom_item_names.json or fallback to canonical ID
    getDisplayName(canonicalId, customNames = {}) {
        if (!canonicalId) return canonicalId;
        
        // Check for custom name first
        if (customNames[canonicalId]) {
            return customNames[canonicalId];
        }
        
        // Try to find a Portuguese equivalent for better display
        const portugueseName = this.canonicalToPricing(canonicalId);
        if (portugueseName && portugueseName !== canonicalId) {
            // Check if Portuguese version has a custom name
            if (customNames[portugueseName]) {
                return customNames[portugueseName];
            }
            // Use Portuguese name as basis for display
            return this.generateDisplayName(portugueseName);
        }
        
        // Generate a readable display name from canonical ID
        return this.generateDisplayName(canonicalId);
    }

    generateDisplayName(canonicalId) {
        if (!canonicalId) return canonicalId;
        
        // Convert underscores to spaces and capitalize first letter of each word
        return canonicalId
            .replace(/_/g, ' ')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    // Convert canonical ID to pricing key (reverse lookup)
    canonicalToPricing(canonicalId) {
        if (!canonicalId) {
            return canonicalId;
        }

        const canonicalLower = canonicalId.toLowerCase().trim();
        
        // Check if this canonical ID is an English name that maps to Portuguese
        if (this.discordToPriceList[canonicalLower]) {
            return this.discordToPriceList[canonicalLower];  // Return the Portuguese pricing key
        }
        
        // If not found in direct mapping, return the canonical ID unchanged
        return canonicalId;
    }
}

module.exports = LanguageNormalizer;