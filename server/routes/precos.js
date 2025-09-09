/**
 * Rotas de Preços - Sistema de Gestão de Preços em Português
 * 
 * Todas as rotas para gerenciar preços de itens com integração ao Google Sheets.
 * Endpoints: /api/precos/*
 */
const express = require('express');
const GoogleSheetsClient = require('../GoogleSheetsClient');
const LanguageNormalizer = require('../utils/LanguageNormalizer');
const logger = require('../utils/logger');

const router = express.Router();

module.exports = (dataManager) => {
    const googleSheets = new GoogleSheetsClient();
    const languageNormalizer = new LanguageNormalizer();
    
    // GET /api/precos - Obter todos os dados de preços
    router.get('/', async (req, res) => {
        try {
            logger.info('📊 Obtendo dados de preços');
            
            // Primeiro tentar obter dados locais
            const localData = await dataManager.obterTodosPrecos();
            
            // Se não há dados locais, buscar do Google Sheets
            if (!localData.dados || Object.keys(localData.dados.itens || {}).length === 0) {
                logger.info('📋 Dados locais vazios, buscando do Google Sheets...');
                try {
                    const sheetData = await googleSheets.getUpdatedPrices();
                    // Salvar dados do Google Sheets localmente
                    await dataManager.salvarDadosPrecos(sheetData);
                    return res.json({
                        sucesso: true,
                        dados: sheetData,
                        fonte: 'google_sheets'
                    });
                } catch (sheetError) {
                    logger.warn('⚠️ Erro ao buscar Google Sheets, usando dados locais');
                }
            }
            
            res.json({
                sucesso: true,
                dados: localData.dados || { itens: {}, categorias: {} },
                fonte: 'local'
            });
            
        } catch (error) {
            logger.error('❌ Erro ao obter preços:', error);
            res.status(500).json({
                sucesso: false,
                erro: 'Erro ao obter dados de preços',
                mensagem: error.message
            });
        }
    });
    
    // GET /api/precos/sync - Sincronizar com Google Sheets
    router.get('/sync', async (req, res) => {
        try {
            logger.info('🔄 Sincronizando preços com Google Sheets');
            
            const sheetData = await googleSheets.getUpdatedPrices(true); // forçar refresh
            
            // Salvar dados atualizados localmente
            await dataManager.salvarDadosPrecos(sheetData);
            
            res.json({
                sucesso: true,
                dados: sheetData,
                mensagem: `Sincronização concluída: ${sheetData.total_itens} itens atualizados`
            });
            
        } catch (error) {
            logger.error('❌ Erro na sincronização:', error);
            res.status(500).json({
                sucesso: false,
                erro: 'Erro na sincronização com Google Sheets',
                mensagem: error.message
            });
        }
    });
    
    // GET /api/precos/cache-info - Informações do cache do Google Sheets
    router.get('/cache-info', (req, res) => {
        try {
            const cacheInfo = googleSheets.getCacheInfo();
            res.json({
                sucesso: true,
                dados: cacheInfo
            });
        } catch (error) {
            logger.error('❌ Erro ao obter info do cache:', error);
            res.status(500).json({
                sucesso: false,
                erro: 'Erro ao obter informações do cache'
            });
        }
    });
    
    // POST /api/precos/clear-cache - Limpar cache do Google Sheets
    router.post('/clear-cache', (req, res) => {
        try {
            googleSheets.clearCache();
            res.json({
                sucesso: true,
                mensagem: 'Cache limpo com sucesso'
            });
        } catch (error) {
            logger.error('❌ Erro ao limpar cache:', error);
            res.status(500).json({
                sucesso: false,
                erro: 'Erro ao limpar cache'
            });
        }
    });
    
    // GET /api/precos/item/:nome - Obter preço de item específico
    router.get('/item/:nome', async (req, res) => {
        try {
            const nomeItem = decodeURIComponent(req.params.nome);
            logger.info(`🔍 Buscando preço para item: ${nomeItem}`);
            
            const dadosPrecos = await dataManager.obterTodosPrecos();
            
            if (!dadosPrecos.sucesso || !dadosPrecos.dados.itens) {
                return res.status(404).json({
                    sucesso: false,
                    erro: 'Dados de preços não encontrados'
                });
            }
            
            // Normalizar nome do item
            const nomeNormalizado = languageNormalizer.normalizeItemName(nomeItem);
            
            // Procurar item nos dados
            let itemEncontrado = null;
            for (const [id, dados] of Object.entries(dadosPrecos.dados.itens)) {
                if (id === nomeNormalizado || 
                    languageNormalizer.isEquivalent(dados.nome, nomeItem)) {
                    itemEncontrado = { id, ...dados };
                    break;
                }
            }
            
            if (!itemEncontrado) {
                return res.status(404).json({
                    sucesso: false,
                    erro: 'Item não encontrado na base de preços'
                });
            }
            
            res.json({
                sucesso: true,
                dados: itemEncontrado
            });
            
        } catch (error) {
            logger.error('❌ Erro ao buscar preço do item:', error);
            res.status(500).json({
                sucesso: false,
                erro: 'Erro ao buscar preço do item',
                mensagem: error.message
            });
        }
    });
    
    // POST /api/precos/item - Adicionar/atualizar preço de item
    router.post('/item', async (req, res) => {
        try {
            const { nomeItem, preco_min, preco_max, categoria } = req.body;
            
            if (!nomeItem) {
                return res.status(400).json({
                    sucesso: false,
                    erro: 'Nome do item é obrigatório'
                });
            }
            
            logger.info(`💰 Atualizando preço: ${nomeItem}`);
            
            // Normalizar nome do item
            const itemId = nomeItem.toLowerCase().trim().replace(/\s+/g, '_');
            
            const novoItem = {
                nome: nomeItem,
                categoria: categoria || 'OUTROS',
                preco_min: parseFloat(preco_min) || 0,
                preco_max: parseFloat(preco_max) || 0,
                atualizado_em: new Date().toISOString()
            };
            
            // Obter dados atuais
            const dadosAtuais = await dataManager.obterTodosPrecos();
            const dadosPrecos = dadosAtuais.dados || { itens: {}, categorias: {} };
            
            // Adicionar/atualizar item
            dadosPrecos.itens[itemId] = novoItem;
            dadosPrecos.ultima_atualizacao = new Date().toISOString();
            dadosPrecos.total_itens = Object.keys(dadosPrecos.itens).length;
            
            // Adicionar categoria se não existe
            if (categoria && !dadosPrecos.categorias[categoria.toUpperCase()]) {
                dadosPrecos.categorias[categoria.toUpperCase()] = categoria;
            }
            
            // Salvar dados atualizados
            await dataManager.salvarDadosPrecos(dadosPrecos);
            
            res.json({
                sucesso: true,
                dados: novoItem,
                mensagem: 'Preço atualizado com sucesso'
            });
            
        } catch (error) {
            logger.error('❌ Erro ao atualizar preço:', error);
            res.status(500).json({
                sucesso: false,
                erro: 'Erro ao atualizar preço',
                mensagem: error.message
            });
        }
    });
    
    // DELETE /api/precos/item - Remover item dos preços
    router.delete('/item', async (req, res) => {
        try {
            const { nomeItem } = req.body;
            
            if (!nomeItem) {
                return res.status(400).json({
                    sucesso: false,
                    erro: 'Nome do item é obrigatório'
                });
            }
            
            logger.info(`🗑️ Removendo preço: ${nomeItem}`);
            
            // Obter dados atuais
            const dadosAtuais = await dataManager.obterTodosPrecos();
            const dadosPrecos = dadosAtuais.dados || { itens: {}, categorias: {} };
            
            // Normalizar nome do item
            const itemId = nomeItem.toLowerCase().trim().replace(/\s+/g, '_');
            
            // Verificar se item existe
            if (!dadosPrecos.itens[itemId]) {
                return res.status(404).json({
                    sucesso: false,
                    erro: 'Item não encontrado'
                });
            }
            
            // Remover item
            delete dadosPrecos.itens[itemId];
            dadosPrecos.ultima_atualizacao = new Date().toISOString();
            dadosPrecos.total_itens = Object.keys(dadosPrecos.itens).length;
            
            // Salvar dados atualizados
            await dataManager.salvarDadosPrecos(dadosPrecos);
            
            res.json({
                sucesso: true,
                mensagem: 'Item removido com sucesso'
            });
            
        } catch (error) {
            logger.error('❌ Erro ao remover item:', error);
            res.status(500).json({
                sucesso: false,
                erro: 'Erro ao remover item',
                mensagem: error.message
            });
        }
    });
    
    // GET /api/precos/categorias - Obter todas as categorias
    router.get('/categorias', async (req, res) => {
        try {
            const dadosPrecos = await dataManager.obterTodosPrecos();
            
            res.json({
                sucesso: true,
                dados: dadosPrecos.dados?.categorias || {}
            });
            
        } catch (error) {
            logger.error('❌ Erro ao obter categorias:', error);
            res.status(500).json({
                sucesso: false,
                erro: 'Erro ao obter categorias',
                mensagem: error.message
            });
        }
    });
    
    // GET /api/precos/search/:termo - Pesquisar itens por termo
    router.get('/search/:termo', async (req, res) => {
        try {
            const termo = decodeURIComponent(req.params.termo).toLowerCase();
            
            const dadosPrecos = await dataManager.obterTodosPrecos();
            
            if (!dadosPrecos.dados?.itens) {
                return res.json({
                    sucesso: true,
                    dados: []
                });
            }
            
            // Filtrar itens que contenham o termo
            const resultados = [];
            for (const [id, dados] of Object.entries(dadosPrecos.dados.itens)) {
                if (id.includes(termo) || 
                    dados.nome.toLowerCase().includes(termo) ||
                    dados.categoria.toLowerCase().includes(termo)) {
                    resultados.push({ id, ...dados });
                }
            }
            
            res.json({
                sucesso: true,
                dados: resultados
            });
            
        } catch (error) {
            logger.error('❌ Erro na pesquisa:', error);
            res.status(500).json({
                sucesso: false,
                erro: 'Erro na pesquisa',
                mensagem: error.message
            });
        }
    });
    
    return router;
};