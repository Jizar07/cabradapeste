const express = require('express');
const router = express.Router();

module.exports = (dataManager) => {
    /**
     * GET /api/stock/config - Obter todas as configurações de estoque
     */
    router.get('/config', (req, res) => {
        try {
            const stockData = dataManager.obterConfiguracoesEstoque();
            
            res.json({
                configuracoes: stockData.configuracoes || {},
                avisos: stockData.avisos || [],
                configuracoes_gerais: stockData.configuracoes_gerais || {},
                categorias_disponiveis: stockData.categorias_disponiveis || []
            });
        } catch (error) {
            console.error('Erro ao obter configurações de estoque:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor'
            });
        }
    });

    /**
     * POST /api/stock/config - Adicionar nova configuração de estoque
     */
    router.post('/config', (req, res) => {
        try {
            const { id, nome_exibicao, categoria, maximo, minimo, ativo = true, preco_unitario } = req.body;

            if (!id || !nome_exibicao || !maximo || !minimo) {
                return res.status(400).json({
                    success: false,
                    error: 'ID, nome de exibição, máximo e mínimo são obrigatórios'
                });
            }

            if (parseInt(maximo) <= parseInt(minimo)) {
                return res.status(400).json({
                    success: false,
                    error: 'Quantidade máxima deve ser maior que a mínima'
                });
            }

            const result = dataManager.atualizarConfiguracaoEstoque(id, maximo, minimo, ativo, preco_unitario);
            
            if (result.success) {
                // Emitir evento de atualização
                if (dataManager.io) {
                    dataManager.io.emit('estoque:configuracao-atualizada', {
                        itemId: id,
                        configuracao: {
                            id: id,
                            nome_exibicao: nome_exibicao,
                            categoria: categoria,
                            maximo: parseInt(maximo),
                            minimo: parseInt(minimo),
                            ativo
                        }
                    });
                }

                res.json(result);
            } else {
                res.status(400).json(result);
            }
        } catch (error) {
            console.error('Erro ao adicionar configuração de estoque:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor'
            });
        }
    });

    /**
     * PUT /api/stock/config/:itemId - Atualizar configuração de estoque existente
     */
    router.put('/config/:itemId', (req, res) => {
        try {
            const { itemId } = req.params;
            const { nome_exibicao, categoria, maximo, minimo, ativo = true, preco_unitario } = req.body;

            if (!maximo || !minimo) {
                return res.status(400).json({
                    success: false,
                    error: 'Máximo e mínimo são obrigatórios'
                });
            }

            if (parseInt(maximo) <= parseInt(minimo)) {
                return res.status(400).json({
                    success: false,
                    error: 'Quantidade máxima deve ser maior que a mínima'
                });
            }

            const result = dataManager.atualizarConfiguracaoEstoque(itemId, maximo, minimo, ativo, preco_unitario, nome_exibicao, categoria);
            
            if (result.success) {
                // Emitir evento de atualização
                if (dataManager.io) {
                    // Get the updated configuration from the result
                    const stockData = dataManager.obterConfiguracoesEstoque();
                    const updatedConfig = stockData.configuracoes[itemId];
                    
                    dataManager.io.emit('estoque:configuracao-atualizada', {
                        itemId: itemId,
                        configuracao: updatedConfig
                    });
                }

                res.json(result);
            } else {
                res.status(400).json(result);
            }
        } catch (error) {
            console.error('Erro ao atualizar configuração de estoque:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor'
            });
        }
    });

    /**
     * DELETE /api/stock/config/:itemId - Remover item do controle de estoque
     */
    router.delete('/config/:itemId', (req, res) => {
        try {
            const { itemId } = req.params;
            const result = dataManager.removerConfiguracaoEstoque(itemId);
            
            if (result.success) {
                // Emitir evento de remoção
                if (dataManager.io) {
                    dataManager.io.emit('estoque:configuracao-removida', { itemId });
                }

                res.json(result);
            } else {
                res.status(400).json(result);
            }
        } catch (error) {
            console.error('Erro ao remover configuração de estoque:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor'
            });
        }
    });

    /**
     * GET /api/stock/warnings - Obter avisos ativos de estoque
     */
    router.get('/warnings', (req, res) => {
        try {
            const avisos = dataManager.obterAvisosEstoque();
            const estatisticas = dataManager.obterEstatisticasEstoque();

            res.json({
                success: true,
                data: {
                    avisos,
                    total: avisos.length,
                    criticos: avisos.filter(a => a.prioridade === 'critico').length,
                    estatisticas
                }
            });
        } catch (error) {
            console.error('Erro ao obter avisos de estoque:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor'
            });
        }
    });

    /**
     * POST /api/stock/warnings/:avisoId/seen - Marcar aviso como visto
     */
    router.post('/warnings/:avisoId/seen', (req, res) => {
        try {
            const { avisoId } = req.params;
            const result = dataManager.marcarAvisoComoVisto(avisoId);
            
            if (result.success) {
                res.json(result);
            } else {
                res.status(400).json(result);
            }
        } catch (error) {
            console.error('Erro ao marcar aviso como visto:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor'
            });
        }
    });

    /**
     * POST /api/stock/check - Verificar níveis de estoque manualmente
     */
    router.post('/check', (req, res) => {
        try {
            const result = dataManager.verificarNiveisEstoque();
            res.json(result);
        } catch (error) {
            console.error('Erro ao verificar níveis de estoque:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor'
            });
        }
    });

    /**
     * GET /api/stock/suggestions/:itemId - Obter sugestões de restock para um item
     */
    router.get('/suggestions/:itemId', (req, res) => {
        try {
            const { itemId } = req.params;
            const stockData = dataManager.obterConfiguracoesEstoque();
            const configuracoes = stockData.configuracoes || {};
            const config = configuracoes[itemId];
            
            if (!config) {
                return res.status(404).json({
                    success: false,
                    error: 'Item não encontrado no controle de estoque'
                });
            }

            const quantidadeAtual = dataManager.obterQuantidadeItem(itemId);
            const quantidadeRestock = config.maximo - quantidadeAtual;
            
            res.json({
                success: true,
                data: {
                    item_id: itemId,
                    nome_item: config.nome_exibicao,
                    quantidade_atual: quantidadeAtual,
                    minimo: config.minimo,
                    maximo: config.maximo,
                    quantidade_restock: Math.max(0, quantidadeRestock),
                    status: quantidadeAtual <= config.minimo ? 
                           (quantidadeAtual === 0 ? 'critico' : 'aviso') : 'ok'
                }
            });
        } catch (error) {
            console.error('Erro ao obter sugestões de restock:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor'
            });
        }
    });

    /**
     * GET /api/stock/items - Obter lista de itens do inventário para configuração
     */
    router.get('/items', (req, res) => {
        try {
            const inventario = dataManager.obterInventario();
            const itens = Object.keys(inventario.itens).map(itemId => ({
                id: itemId,
                nome: dataManager.obterMelhorNomeExibicao(itemId),
                quantidade: inventario.itens[itemId].quantidade,
                categoria: dataManager.determinarCategoriaItem(itemId)
            }));

            // Ordenar por categoria e nome
            itens.sort((a, b) => {
                if (a.categoria !== b.categoria) {
                    return a.categoria.localeCompare(b.categoria);
                }
                return a.nome.localeCompare(b.nome);
            });

            res.json({
                success: true,
                data: itens
            });
        } catch (error) {
            console.error('Erro ao obter itens do inventário:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor'
            });
        }
    });

    /**
     * GET /api/stock/cost-summary - Obter resumo de custos de reposição
     */
    router.get('/cost-summary', (req, res) => {
        try {
            const custoResumo = dataManager.calcularCustoReposicaoTotal();
            
            res.json({
                success: true,
                data: custoResumo
            });
        } catch (error) {
            console.error('Erro ao calcular custos de reposição:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor'
            });
        }
    });

    /**
     * GET /api/stock/pricing/:itemId - Obter informações de preço para um item
     */
    router.get('/pricing/:itemId', (req, res) => {
        try {
            const { itemId } = req.params;
            const precoInfo = dataManager.obterPrecoItem(itemId);
            
            res.json({
                success: true,
                data: {
                    item_id: itemId,
                    nome_item: dataManager.obterMelhorNomeExibicao(itemId),
                    ...precoInfo
                }
            });
        } catch (error) {
            console.error('Erro ao obter informações de preço:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor'
            });
        }
    });

    /**
     * PUT /api/stock/config/sync-categories - Toggle category sync setting
     */
    router.put('/config/sync-categories', (req, res) => {
        try {
            const { enabled } = req.body;
            
            // Load current config
            const stockData = dataManager.obterConfiguracoesEstoque();
            
            // Update the setting
            if (!stockData.configuracoes_gerais) {
                stockData.configuracoes_gerais = {};
            }
            stockData.configuracoes_gerais.sincronizar_categorias_inventario = !!enabled;
            
            // Save the updated config
            dataManager.salvarArquivoJson(dataManager.stockManagementFile, stockData);
            
            // Emit event to update frontend
            if (dataManager.io) {
                dataManager.io.emit('estoque:sync-setting-updated', {
                    sincronizar_categorias_inventario: !!enabled
                });
            }
            
            res.json({
                success: true,
                message: enabled ? 
                    'Sincronização de categorias ativada' : 
                    'Sincronização de categorias desativada',
                data: {
                    sincronizar_categorias_inventario: !!enabled
                }
            });
        } catch (error) {
            console.error('Erro ao atualizar configuração de sincronização:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor'
            });
        }
    });

    return router;
};