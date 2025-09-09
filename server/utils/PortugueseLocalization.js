const LanguageNormalizer = require('./LanguageNormalizer');

/**
 * Portuguese Localization System
 * Provides Portuguese display names for items while keeping original IDs
 */
class PortugueseLocalization {
    constructor() {
        this.languageNormalizer = new LanguageNormalizer();
    }

    /**
     * Get the best Portuguese display name for an item
     * @param {string} itemId - The item ID (can be English or Portuguese)
     * @param {object} customDisplayNames - Custom display name overrides
     * @returns {string} Portuguese display name
     */
    getDisplayName(itemId, customDisplayNames = {}) {
        if (!itemId) return itemId;
        
        // First check for custom display name override
        if (customDisplayNames[itemId]) {
            return customDisplayNames[itemId];
        }
        
        // Use LanguageNormalizer to get proper display name
        return this.languageNormalizer.getDisplayName(itemId, customDisplayNames);
    }

    /**
     * Convert English item name to Portuguese if possible
     * @param {string} englishName - English item name
     * @returns {string} Portuguese equivalent or original name
     */
    toPortuguese(englishName) {
        if (!englishName) return englishName;
        return this.languageNormalizer.canonicalToPricing(englishName) || englishName;
    }

    /**
     * Legacy method for backward compatibility
     */
    localize(text) {
        return this.getDisplayName(text);
    }
}

module.exports = PortugueseLocalization;
