const express = require('express');
const router = express.Router();

/**
 * Routes para gerenciamento de localização portuguesa
 */

module.exports = (dataManager) => {
    
    /**
     * GET /api/localization/translations
     * Obter todas as traduções disponíveis
     */
    router.get('/translations', (req, res) => {
        try {
            const translations = dataManager.localization.getAllTranslations();
            const customOverrides = dataManager.displayNames.display_names;
            
            res.json({
                success: true,
                data: {
                    built_in_translations: translations,
                    custom_overrides: customOverrides,
                    total_translations: Object.keys(translations).length,
                    total_overrides: Object.keys(customOverrides).length
                }
            });
        } catch (error) {
            console.error('Error getting translations:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao obter traduções'
            });
        }
    });
    
    /**
     * POST /api/localization/override
     * Criar ou atualizar override manual de tradução
     */
    router.post('/override', (req, res) => {
        try {
            const { itemId, displayName } = req.body;
            
            if (!itemId || !displayName) {
                return res.status(400).json({
                    success: false,
                    error: 'itemId e displayName são obrigatórios'
                });
            }
            
            // Use existing method to set custom display name
            const success = dataManager.definirNomeCustomizado(itemId, displayName);
            
            if (success) {
                res.json({
                    success: true,
                    message: `Override criado: ${itemId} -> ${displayName}`,
                    data: {
                        itemId,
                        displayName,
                        preview: dataManager.obterMelhorNomeExibicao(itemId)
                    }
                });
                
                // Emit update if socket available
                if (dataManager.io) {
                    dataManager.io.emit('localization:updated', {
                        itemId,
                        displayName
                    });
                }
            } else {
                res.status(500).json({
                    success: false,
                    error: 'Erro ao salvar override'
                });
            }
        } catch (error) {
            console.error('Error creating override:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor'
            });
        }
    });
    
    /**
     * DELETE /api/localization/override/:itemId
     * Remover override manual
     */
    router.delete('/override/:itemId', (req, res) => {
        try {
            const { itemId } = req.params;
            
            const success = dataManager.removerNomeCustomizado(itemId);
            
            if (success) {
                res.json({
                    success: true,
                    message: `Override removido para: ${itemId}`,
                    data: {
                        itemId,
                        new_display_name: dataManager.obterMelhorNomeExibicao(itemId)
                    }
                });
                
                // Emit update if socket available
                if (dataManager.io) {
                    dataManager.io.emit('localization:updated', {
                        itemId,
                        removed: true
                    });
                }
            } else {
                res.status(404).json({
                    success: false,
                    error: 'Override não encontrado'
                });
            }
        } catch (error) {
            console.error('Error removing override:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor'
            });
        }
    });
    
    /**
     * GET /api/localization/preview/:itemId
     * Visualizar como um item será exibido
     */
    router.get('/preview/:itemId', (req, res) => {
        try {
            const { itemId } = req.params;
            
            const displayName = dataManager.obterMelhorNomeExibicao(itemId);
            const customOverride = dataManager.obterNomeCustomizado(itemId);
            const builtInTranslation = dataManager.localization.translations[itemId.toLowerCase()];
            
            res.json({
                success: true,
                data: {
                    itemId,
                    current_display_name: displayName,
                    has_custom_override: !!customOverride,
                    custom_override: customOverride,
                    has_built_in_translation: !!builtInTranslation,
                    built_in_translation: builtInTranslation,
                    fallback_formatting: dataManager.localization.normalizeAndFormat(itemId)
                }
            });
        } catch (error) {
            console.error('Error previewing item:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao visualizar item'
            });
        }
    });
    
    /**
     * POST /api/localization/bulk-update
     * Atualização em lote de traduções
     */
    router.post('/bulk-update', (req, res) => {
        try {
            const { overrides } = req.body;
            
            if (!overrides || typeof overrides !== 'object') {
                return res.status(400).json({
                    success: false,
                    error: 'overrides deve ser um objeto com pares itemId: displayName'
                });
            }
            
            const results = {
                success: [],
                failed: []
            };
            
            Object.entries(overrides).forEach(([itemId, displayName]) => {
                try {
                    if (dataManager.definirNomeCustomizado(itemId, displayName)) {
                        results.success.push({ itemId, displayName });
                    } else {
                        results.failed.push({ itemId, displayName, error: 'Falha ao salvar' });
                    }
                } catch (error) {
                    results.failed.push({ itemId, displayName, error: error.message });
                }
            });
            
            res.json({
                success: true,
                message: `Processados ${results.success.length} sucessos, ${results.failed.length} falhas`,
                data: results
            });
            
            // Emit bulk update if socket available
            if (dataManager.io) {
                dataManager.io.emit('localization:bulk-updated', results);
            }
        } catch (error) {
            console.error('Error bulk updating:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor'
            });
        }
    });
    
    return router;
};