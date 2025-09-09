const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const ItemNormalizer = require('./utils/ItemNormalizer');
const moment = require('moment');
const logger = require('./utils/logger');
const PortugueseLocalization = require('./utils/PortugueseLocalization');

/**
 * DataManager - Sistema de Gerenciamento de Dados para Fazenda Web
 * 
 * Sistema completamente independente da aplicação desktop.
 * Foca apenas nos 4 módulos principais:
 * - Dashboard: Visão geral e estatísticas
 * - Inventário: Gestão de itens e estoque
 * - Usuários: Gestão de usuários e permissões
 * - Preços: Gestão de preços e categorias
 * 
 * Todos os dados são armazenados em arquivos JSON em português.
 */
class DataManager {
    constructor(dataPath = './data', io = null) {
        this.dataPath = dataPath;
        // Arquivos de dados em português - sistema independente
        this.inventarioFile = path.join(dataPath, 'inventario.json');
        this.usuariosFile = path.join(dataPath, 'usuarios.json');
        this.precosFile = path.join(dataPath, 'precos.json');
        this.displayNamesFile = path.join(dataPath, 'custom_display_names.json');
        // UPDATED: Use analyzed_data.json instead of deprecated atividades_discord.json
        this.discordFile = path.join(dataPath, 'analyzed_data.json');
        this.analyzedDataFile = path.join(dataPath, 'analyzed_data.json');
        this.saldoFazendaFile = path.join(dataPath, 'saldo_fazenda.json');
        this.pagamentosFile = path.join(dataPath, 'pagamentos.json');
        this.ferroviariaFile = path.join(dataPath, 'ferroviaria.json');
        this.pagamentosGerentesFile = path.join(dataPath, 'pagamentos_gerentes.json');
        this.stockManagementFile = path.join(dataPath, 'stock_management.json');
        this.io = io;
        
        // Initialize Portuguese localization system
        this.localization = new PortugueseLocalization();
        
        // Load previous Discord message ID for editing
        try {
            const discordMessageFile = path.join(this.dataPath, 'ultima_mensagem_discord.json');
            this.ultimaMensagemDiscord = this.carregarArquivoJson(discordMessageFile);
            if (this.ultimaMensagemDiscord && this.ultimaMensagemDiscord.messageId) {
                logger.info(`🔄 Loaded existing Discord message ID: ${this.ultimaMensagemDiscord.messageId}`);
            } else {
                logger.info('📝 No previous Discord message ID found, will create new message');
                this.ultimaMensagemDiscord = null;
            }
        } catch (error) {
            logger.warn('⚠️ Failed to load Discord message ID:', error.message);
            this.ultimaMensagemDiscord = null;
        }
        
        this.criarDiretoriosDados();
        this.carregarDadosIniciais();
    }
    
    /**
     * Cria diretórios de dados se não existirem
     */
    criarDiretoriosDados() {
        if (!fs.existsSync(this.dataPath)) {
            fs.mkdirSync(this.dataPath, { recursive: true });
            logger.info('Diretório de dados criado: ' + this.dataPath);
        }
    }
    
    /**
     * Carrega dados iniciais dos arquivos JSON
     * Sistema completamente independente da aplicação desktop
     */
    carregarDadosIniciais() {
        // Carregar inventário com estrutura em português
        this.inventario = this.carregarArquivoJson(this.inventarioFile, {
            itens: {},
            historico_transacoes: [],
            ultima_atualizacao: new Date().toISOString()
        });
        
        // Carregar usuários com estrutura em português
        this.usuarios = this.carregarArquivoJson(this.usuariosFile, {
            usuarios: {},
            funcoes: {
                gerente: [],
                trabalhador: []
            }
        });
        
        // Carregar preços com estrutura vazia - deixar Google Sheets definir as categorias reais
        this.precos = this.carregarArquivoJson(this.precosFile, {
            itens: {},
            categorias: {},
            ultima_atualizacao: new Date().toISOString(),
            total_itens: 0
        });
        
        // Carregar atividades recentes do Discord - arquivo dedicado para dashboard
        // UPDATED: Use analyzed_data.json instead of deprecated atividades_discord.json
        this.atividadesFile = path.join(this.dataPath, 'analyzed_data.json');
        // UPDATED: Load analyzed_data.json with new structure
        const analyzedData = this.carregarArquivoJson(this.atividadesFile, {
            farm_activities: [],
            financial_transactions: [],
            inventory_changes: [],
            last_updated: new Date().toISOString()
        });
        
        // Convert new structure to old format for backward compatibility
        this.atividades = {
            atividades_recentes: this.convertAnalyzedDataToActivities(analyzedData),
            ultima_atualizacao: analyzedData.last_updated || new Date().toISOString(),
            total_atividades: this.countTotalActivities(analyzedData)
        };

        // Carregar nomes customizados dos itens
        this.customDisplayNames = this.carregarArquivoJson(this.displayNamesFile, {
            display_names: {},
            ultima_atualizacao: new Date().toISOString()
        });
        // Keep backward compatibility
        this.displayNames = this.customDisplayNames;
        
        // Store reference to analyzed data for direct access
        this.analyzedData = analyzedData;
        
        // Carregar atividades do Discord
        this.discord = this.carregarArquivoJson(this.discordFile, {
            atividades_recentes: [],
            ultima_atualizacao: new Date().toISOString(),
            total_atividades: 0
        });
        
        // Carregar saldo da fazenda
        this.balanceData = this.carregarArquivoJson(this.saldoFazendaFile, {
            saldo_atual: 0,
            ultima_atualizacao: new Date().toISOString(),
            historico_saldos: []
        });
        
        // Carregar pagamentos
        this.pagamentos = this.carregarArquivoJson(this.pagamentosFile, {
            pagamentos: [],
            total_pagamentos: 0,
            ultima_atualizacao: new Date().toISOString()
        });
        
        // Carregar dados da ferroviaria
        this.ferroviaria = this.carregarArquivoJson(this.ferroviariaFile, {
            investidores: {},
            caixas_depositos: [],
            entregas: [],
            configuracao: {
                valor_por_entrega: 1000,
                caixas_por_entrega: 250,
                capacidade_maxima_trem: 1000,
                entregas_por_refill: 4,
                custo_por_caixa: 1, // Legacy default
                custo_caixa_animal: 0, // Current cost for animal boxes (was $0.61)
                custo_caixa_verduras: 0, // Current cost for plant boxes (was $1.30)
                tempo_por_entrega_minutos: 10,
                valor_venda_normal_caixa: 2
            },
            ultima_atualizacao: new Date().toISOString()
        });

        // Carregar ações de abuso (ignorar/cobrar)
        this.abuseActionsFile = path.join(this.dataPath, 'abuse_actions.json');
        this.abuseActions = this.carregarArquivoJson(this.abuseActionsFile, {
            actions: [],
            total_ignored: 0,
            total_charged: 0,
            ultima_atualizacao: new Date().toISOString()
        });

        // Carregar accountability dos gerentes
        this.gerentesAccountabilityFile = path.join(this.dataPath, 'gerentes_accountability.json');
        this.gerentesAccountability = this.carregarArquivoJson(this.gerentesAccountabilityFile, {
            transacoes: [],
            expectativas: [],
            reconciliacao: [],
            creditos: {},
            performance: {},
            payment_log: [],  // Track all payments made
            last_payment_dates: {},  // Track last payment date for each manager
            ultima_atualizacao: new Date().toISOString()
        });

        // Carregar gestão de estoque
        this.stockManagement = this.carregarArquivoJson(this.stockManagementFile, {
            configuracoes: {},
            avisos: [],
            configuracoes_gerais: {
                verificar_automaticamente: true,
                notificar_dashboard: true,
                manter_historico_avisos: true,
                dias_manter_historico: 30
            },
            ultima_atualizacao: new Date().toISOString()
        });
        
        // AUTO-FIX: Reset erroneous negative balances on startup
        setTimeout(() => {
            try {
                const result = this.resetErroneousNegativeBalances();
                if (result.resetCount > 0) {
                    console.log(`🔧 AUTO-FIXED ${result.resetCount} negative manager balances caused by broken accountability system`);
                }
            } catch (error) {
                console.error('Error during auto-fix of negative balances:', error);
            }
        }, 2000); // Wait 2 seconds for system to fully initialize
    }
    
    /**
     * Carrega arquivo JSON ou cria com dados padrão
     * @param {string} caminhoArquivo - Caminho do arquivo
     * @param {object} dadosPadrao - Dados padrão se arquivo não existe
     * @returns {object} Dados carregados
     */
    carregarArquivoJson(caminhoArquivo, dadosPadrao = {}) {
        try {
            if (fs.existsSync(caminhoArquivo)) {
                const dados = JSON.parse(fs.readFileSync(caminhoArquivo, 'utf8'));
                logger.info(`Arquivo carregado: ${path.basename(caminhoArquivo)}`);
                return dados;
            } else {
                fs.writeFileSync(caminhoArquivo, JSON.stringify(dadosPadrao, null, 2));
                logger.info(`Arquivo criado com dados padrão: ${path.basename(caminhoArquivo)}`);
                return dadosPadrao;
            }
        } catch (error) {
            logger.error(`Erro ao carregar arquivo ${caminhoArquivo}:`, error);
            return dadosPadrao;
        }
    }
    
    /**
     * Salva dados no arquivo JSON
     * @param {string} caminhoArquivo - Caminho do arquivo
     * @param {object} dados - Dados para salvar
     * @returns {boolean} Sucesso da operação
     */
    salvarArquivoJson(caminhoArquivo, dados) {
        try {
            console.log(`📂 [SAVE FILE] Attempting to save file: ${caminhoArquivo}`);
            fs.writeFileSync(caminhoArquivo, JSON.stringify(dados, null, 2));
            console.log(`✅ [SAVE FILE] Successfully saved: ${path.basename(caminhoArquivo)}`);
            logger.info(`Arquivo salvo: ${path.basename(caminhoArquivo)}`);
            return true;
        } catch (error) {
            console.error(`❌ [SAVE FILE] Error saving file ${caminhoArquivo}:`, error);
            logger.error(`Erro ao salvar arquivo ${caminhoArquivo}:`, error);
            return false;
        }
    }

    // ================================
    // CONVERSÃO DE DADOS: analyzed_data.json → formato legado
    // ================================
    
    /**
     * Convert analyzed_data.json structure to legacy atividades_recentes format
     * @param {Object} analyzedData - Data from analyzed_data.json
     * @returns {Array} Activities in legacy format
     */
    convertAnalyzedDataToActivities(analyzedData) {
        const activities = [];
        
        // Process farm activities
        if (analyzedData.farm_activities && Array.isArray(analyzedData.farm_activities)) {
            analyzedData.farm_activities.forEach(activity => {
                activities.push(this.convertActivityToLegacyFormat(activity));
            });
        }
        
        // Process financial transactions  
        if (analyzedData.financial_transactions && Array.isArray(analyzedData.financial_transactions)) {
            analyzedData.financial_transactions.forEach(activity => {
                activities.push(this.convertActivityToLegacyFormat(activity));
            });
        }
        
        // Process inventory changes
        if (analyzedData.inventory_changes && Array.isArray(analyzedData.inventory_changes)) {
            analyzedData.inventory_changes.forEach(activity => {
                activities.push(this.convertActivityToLegacyFormat(activity));
            });
        }
        
        // Sort by timestamp (newest first)
        return activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }
    
    /**
     * Convert single activity to legacy format
     * @param {Object} activity - Activity from analyzed_data.json
     * @returns {Object} Activity in legacy format
     */
    convertActivityToLegacyFormat(activity) {
        // Extract author name from various possible fields
        let authorName = 'Sistema';
        
        if (activity.author && activity.author !== 'Captain Hook') {
            authorName = activity.author;
        }
        
        // Try to extract from embed fields if available
        if (activity.raw_message?.raw_embeds?.[0]?.fields) {
            const fields = activity.raw_message.raw_embeds[0].fields;
            const acaoField = fields.find(f => f.name.includes('Ação:'));
            const autorField = fields.find(f => f.name.includes('Autor:'));
            
            if (acaoField && acaoField.value) {
                const match = acaoField.value.match(/```prolog\n(.+?)\s+(vendeu|depositou|sacou|comprou)/);
                if (match) authorName = match[1];
            } else if (autorField && autorField.value) {
                const match = autorField.value.match(/```prolog\n(.+?)\s+\|/);
                if (match) authorName = match[1];
            }
        }
        
        // Map activity types to Portuguese
        let tipo = activity.type || 'unknown';
        let categoria = 'inventario';
        
        if (activity.type === 'deposit') {
            tipo = 'deposito';
            categoria = 'financeiro';
        } else if (activity.type === 'withdrawal') {
            tipo = 'saque';
            categoria = 'financeiro';
        } else if (activity.type === 'item_add') {
            tipo = 'adicionar';
            categoria = 'inventario';
        } else if (activity.type === 'item_remove') {
            tipo = 'remover';
            categoria = 'inventario';
        }
        
        return {
            id: activity.id,
            tipo: tipo,
            categoria: categoria,
            autor: authorName,
            item: activity.details?.item || null,
            quantidade: activity.details?.quantity || activity.details?.amount || null,
            valor: activity.details?.amount || null,
            timestamp: activity.timestamp,
            data_formatada: this.formatGameTimestamp(activity.timestamp),
            descricao: activity.content || `${tipo} action`
        };
    }
    
    /**
     * Count total activities from analyzed_data.json
     * @param {Object} analyzedData - Data from analyzed_data.json
     * @returns {Number} Total count of activities
     */
    countTotalActivities(analyzedData) {
        let total = 0;
        if (analyzedData.farm_activities) total += analyzedData.farm_activities.length;
        if (analyzedData.financial_transactions) total += analyzedData.financial_transactions.length;
        if (analyzedData.inventory_changes) total += analyzedData.inventory_changes.length;
        return total;
    }
    
    /**
     * Format timestamp to game format (DD/MM/YYYY - HH:mm:ss)
     * @param {string} timestamp - ISO timestamp
     * @returns {string} Formatted timestamp
     */
    formatGameTimestamp(timestamp) {
        try {
            const date = new Date(timestamp);
            return date.toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit', 
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            }).replace(',', ' -');
        } catch (error) {
            return timestamp || new Date().toISOString();
        }
    }
    
    // ================================
    // MÓDULO: INVENTÁRIO
    // ================================
    
    /**
     * Obtém todos os dados do inventário
     * @returns {object} Dados do inventário
     */
    obterInventario() {
        const itensComDisplayNames = {};
        
        // Adicionar display names aos itens
        Object.entries(this.inventario.itens || {}).forEach(([itemId, itemData]) => {
            itensComDisplayNames[itemId] = {
                ...itemData,
                displayName: this.obterMelhorNomeExibicao(itemId)
            };
        });
        
        return {
            itens: itensComDisplayNames,
            ultima_atualizacao: this.inventario.ultima_atualizacao,
            total_itens: Object.keys(this.inventario.itens || {}).length,
            total_quantidade: Object.values(this.inventario.itens || {})
                .reduce((soma, item) => soma + (item.quantidade || 0), 0)
        };
    }
    
    /**
     * Adiciona item ao inventário
     * @param {string} nomeItem - Nome do item
     * @param {number} quantidade - Quantidade a adicionar
     * @param {string} autor - Autor da transação
     * @returns {boolean} Sucesso da operação
     */
    adicionarItem(nomeItem, quantidade, autor = 'Sistema') {
        try {
            const id = nomeItem.toLowerCase().replace(/\s+/g, '_');
            
            if (!this.inventario.itens[id]) {
                this.inventario.itens[id] = {
                    nome: nomeItem,
                    quantidade: 0,
                    criado_em: new Date().toISOString(),
                    atualizado_em: new Date().toISOString()
                };
            }
            
            this.inventario.itens[id].quantidade += quantidade;
            this.inventario.itens[id].atualizado_em = new Date().toISOString();
            
            // Registrar transação
            this.registrarTransacao('adicionar', id, nomeItem, quantidade, autor);
            
            this.inventario.ultima_atualizacao = new Date().toISOString();
            const result = this.salvarArquivoJson(this.inventarioFile, this.inventario);
            
            // Verificar se precisa de avisos de estoque
            this.verificarEstoqueAposAlteracao(id);
            
            return result;
        } catch (error) {
            logger.error('Erro ao adicionar item:', error);
            return false;
        }
    }
    
    /**
     * Remove item do inventário
     * @param {string} nomeItem - Nome do item
     * @param {number} quantidade - Quantidade a remover
     * @param {string} autor - Autor da transação
     * @returns {boolean} Sucesso da operação
     */
    removerItem(nomeItem, quantidade, autor = 'Sistema') {
        try {
            const id = nomeItem.toLowerCase().replace(/\s+/g, '_');
            
            if (!this.inventario.itens[id] || this.inventario.itens[id].quantidade < quantidade) {
                logger.warn(`Estoque insuficiente para ${nomeItem}. Disponível: ${this.inventario.itens[id]?.quantidade || 0}, Solicitado: ${quantidade}`);
                return false;
            }
            
            this.inventario.itens[id].quantidade -= quantidade;
            this.inventario.itens[id].atualizado_em = new Date().toISOString();
            
            // Remove item se quantidade for 0
            if (this.inventario.itens[id].quantidade <= 0) {
                delete this.inventario.itens[id];
            }
            
            // Registrar transação
            this.registrarTransacao('remover', id, nomeItem, quantidade, autor);
            
            this.inventario.ultima_atualizacao = new Date().toISOString();
            const result = this.salvarArquivoJson(this.inventarioFile, this.inventario);
            
            // Verificar se precisa de avisos de estoque
            this.verificarEstoqueAposAlteracao(id);
            
            return result;
        } catch (error) {
            logger.error('Erro ao remover item:', error);
            return false;
        }
    }
    
    /**
     * Registra transação no histórico
     * @param {string} acao - Tipo da ação (adicionar/remover)
     * @param {string} itemId - ID do item
     * @param {string} nomeItem - Nome do item
     * @param {number} quantidade - Quantidade
     * @param {string} autor - Autor da transação
     */
    registrarTransacao(acao, itemId, nomeItem, quantidade, autor) {
        const transacao = {
            id: uuidv4(),
            acao: acao,
            item_id: itemId,
            nome_item: nomeItem,
            quantidade: quantidade,
            autor: autor,
            timestamp: new Date().toISOString(),
            data_formatada: moment().format('DD/MM/YYYY - HH:mm:ss')
        };
        
        this.inventario.historico_transacoes.push(transacao);
    }
    
    /**
     * Obtém histórico de transações
     * @param {number} limite - Limite de transações
     * @param {number} offset - Offset para paginação
     * @returns {object} Histórico de transações
     */
    obterHistoricoTransacoes(limite = 100, offset = 0) {
        try {
            const transacoes = [...(this.inventario.historico_transacoes || [])];
            transacoes.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            return {
                transacoes: transacoes.slice(offset, offset + limite),
                total: transacoes.length,
                tem_mais: offset + limite < transacoes.length
            };
        } catch (error) {
            logger.error('Erro ao obter histórico de transações:', error);
            return { transacoes: [], total: 0, tem_mais: false };
        }
    }

    // ================================
    // MÓDULO: USUÁRIOS
    // ================================
    
    /**
     * Obtém todos os usuários
     * @returns {object} Dados dos usuários
     */
    obterTodosUsuarios() {
        return this.usuarios.usuarios || {};
    }
    
    /**
     * Adiciona novo usuário
     * @param {string} id - ID do usuário
     * @param {string} nome - Nome do usuário
     * @param {string} funcao - Função (gerente/trabalhador)
     * @returns {boolean} Sucesso da operação
     */
    adicionarUsuario(id, userData) {
        try {
            if (this.usuarios.usuarios[id]) {
                logger.warn(`Usuário ${id} já existe`);
                return false;
            }
            
            // Handle both old and new format
            if (typeof userData === 'string') {
                // Old format: adicionarUsuario(id, nome, funcao)
                const nome = userData;
                const funcao = arguments[2] || 'trabalhador';
                userData = {
                    nome: nome,
                    funcao: funcao,
                    criado_em: new Date().toISOString(),
                    ativo: true
                };
            } else {
                // New format: adicionarUsuario(id, userData)
                userData = {
                    ...userData,
                    criado_em: userData.criado_em || new Date().toISOString(),
                    ativo: userData.ativo !== undefined ? userData.ativo : true,
                    funcao: userData.funcao || 'trabalhador'
                };
            }
            
            this.usuarios.usuarios[id] = userData;
            
            // Adicionar à lista de funções
            if (!this.usuarios.funcoes[userData.funcao].includes(id)) {
                this.usuarios.funcoes[userData.funcao].push(id);
            }
            
            return this.salvarArquivoJson(this.usuariosFile, this.usuarios);
        } catch (error) {
            logger.error('Erro ao adicionar usuário:', error);
            return false;
        }
    }
    
    /**
     * Atualiza função do usuário
     * @param {string} id - ID do usuário
     * @param {string} novaFuncao - Nova função
     * @returns {boolean} Sucesso da operação
     */
    atualizarFuncaoUsuario(id, novaFuncao) {
        try {
            if (!this.usuarios.usuarios[id]) {
                logger.warn(`Usuário ${id} não encontrado`);
                return false;
            }
            
            const funcaoAntiga = this.usuarios.usuarios[id].funcao;
            
            // Remover da função antiga
            this.usuarios.funcoes[funcaoAntiga] = this.usuarios.funcoes[funcaoAntiga]
                .filter(userId => userId !== id);
            
            // Adicionar à nova função
            if (!this.usuarios.funcoes[novaFuncao].includes(id)) {
                this.usuarios.funcoes[novaFuncao].push(id);
            }
            
            this.usuarios.usuarios[id].funcao = novaFuncao;
            this.usuarios.usuarios[id].atualizado_em = new Date().toISOString();
            
            return this.salvarArquivoJson(this.usuariosFile, this.usuarios);
        } catch (error) {
            logger.error('Erro ao atualizar função do usuário:', error);
            return false;
        }
    }
    
    /**
     * Remove usuário
     * @param {string} id - ID do usuário
     * @returns {boolean} Sucesso da operação
     */
    removerUsuario(id) {
        try {
            if (!this.usuarios.usuarios[id]) {
                logger.warn(`Usuário ${id} não encontrado`);
                return false;
            }
            
            const funcao = this.usuarios.usuarios[id].funcao;
            
            // Remover da lista de funções
            this.usuarios.funcoes[funcao] = this.usuarios.funcoes[funcao]
                .filter(userId => userId !== id);
            
            // Remover usuário
            delete this.usuarios.usuarios[id];
            
            return this.salvarArquivoJson(this.usuariosFile, this.usuarios);
        } catch (error) {
            logger.error('Erro ao remover usuário:', error);
            return false;
        }
    }
    
    /**
     * Atualiza a função de um usuário
     * @param {string} id - ID do usuário
     * @param {string} novaFuncao - Nova função (gerente ou trabalhador)
     * @returns {boolean} Sucesso da operação
     */
    atualizarFuncaoUsuario(id, novaFuncao) {
        try {
            if (!this.usuarios.usuarios[id]) {
                logger.warn(`Usuário ${id} não encontrado`);
                return false;
            }
            
            const funcaoAnterior = this.usuarios.usuarios[id].funcao;
            
            // Remover da função anterior
            this.usuarios.funcoes[funcaoAnterior] = this.usuarios.funcoes[funcaoAnterior]
                .filter(userId => userId !== id);
            
            // Adicionar à nova função
            if (!this.usuarios.funcoes[novaFuncao]) {
                this.usuarios.funcoes[novaFuncao] = [];
            }
            this.usuarios.funcoes[novaFuncao].push(id);
            
            // Atualizar usuário
            this.usuarios.usuarios[id].funcao = novaFuncao;
            
            return this.salvarArquivoJson(this.usuariosFile, this.usuarios);
        } catch (error) {
            logger.error('Erro ao atualizar função do usuário:', error);
            return false;
        }
    }

    // ================================
    // MÓDULO: PREÇOS
    // ================================
    
    /**
     * Obtém todos os preços
     * @returns {object} Dados dos preços formatados
     */
    obterTodosPrecos() {
        return {
            sucesso: true,
            dados: this.precos,
            total_itens: Object.keys(this.precos.itens || {}).length
        };
    }
    
    /**
     * Salva dados completos de preços (para integração Google Sheets)
     * @param {object} dadosPrecos - Dados completos dos preços
     * @returns {boolean} Sucesso da operação
     */
    salvarDadosPrecos(dadosPrecos) {
        try {
            this.precos = {
                ...dadosPrecos,
                ultima_atualizacao: new Date().toISOString()
            };
            
            const sucesso = this.salvarArquivoJson(this.precosFile, this.precos);
            
            if (sucesso && this.io) {
                this.io.emit('precos:atualizado', this.precos);
            }
            
            return sucesso;
        } catch (error) {
            logger.error('Erro ao salvar dados de preços:', error);
            return false;
        }
    }
    
    /**
     * Atualiza preço de um item
     * @param {string} nomeItem - Nome do item
     * @param {object} dadosPreco - Dados do preço (preco_min, preco_max, categoria)
     * @returns {boolean} Sucesso da operação
     */
    atualizarPrecoItem(nomeItem, dadosPreco) {
        try {
            const id = nomeItem.toLowerCase().replace(/\s+/g, '_');
            
            this.precos.itens[id] = {
                nome: nomeItem,
                preco_min: dadosPreco.preco_min || 0,
                preco_max: dadosPreco.preco_max || 0,
                categoria: dadosPreco.categoria || 'OUTROS',
                atualizado_em: new Date().toISOString(),
                ...dadosPreco
            };
            
            return this.salvarArquivoJson(this.precosFile, this.precos);
        } catch (error) {
            logger.error('Erro ao atualizar preço:', error);
            return false;
        }
    }
    
    /**
     * Remove preço de um item
     * @param {string} nomeItem - Nome do item
     * @returns {boolean} Sucesso da operação
     */
    removerPrecoItem(nomeItem) {
        try {
            const id = nomeItem.toLowerCase().replace(/\s+/g, '_');
            
            if (!this.precos.itens[id]) {
                logger.warn(`Preço para ${nomeItem} não encontrado`);
                return false;
            }
            
            delete this.precos.itens[id];
            return this.salvarArquivoJson(this.precosFile, this.precos);
        } catch (error) {
            logger.error('Erro ao remover preço:', error);
            return false;
        }
    }

    // ================================
    // MÓDULO: DASHBOARD - ANALYTICS
    // ================================
    
    /**
     * Obtém estatísticas para o dashboard
     * @returns {object} Estatísticas gerais
     */
    obterEstatisticasDashboard() {
        try {
            const inventario = this.obterInventario();
            const usuarios = this.obterTodosUsuarios();
            const transacoes = this.inventario.historico_transacoes || [];
            
            // Estatísticas de inventário
            const estatisticasInventario = {
                total_itens: inventario.total_itens,
                total_quantidade: inventario.total_quantidade,
                ultima_atualizacao: inventario.ultima_atualizacao
            };
            
            // Estatísticas de usuários
            const estatisticasUsuarios = {
                total_usuarios: Object.keys(usuarios).length,
                gerentes: this.usuarios.funcoes.gerente.length,
                trabalhadores: this.usuarios.funcoes.trabalhador.length
            };
            
            // Estatísticas de atividade
            const hoje = moment().startOf('day');
            const transacoesHoje = transacoes.filter(t => 
                moment(t.timestamp).isSame(hoje, 'day')
            );
            
            const estatisticasAtividade = {
                total_transacoes: transacoes.length,
                transacoes_hoje: transacoesHoje.length,
                ultima_hora: transacoes.filter(t => 
                    moment(t.timestamp).isAfter(moment().subtract(1, 'hour'))
                ).length
            };
            
            // Estatísticas financeiras
            const estatisticasFinanceiras = this.obterEstatisticasFinanceiras();
            
            return {
                inventario: estatisticasInventario,
                usuarios: estatisticasUsuarios,
                atividade: estatisticasAtividade,
                financeiro: {
                    saldo_atual: estatisticasFinanceiras.saldo_atual,
                    total_depositos: estatisticasFinanceiras.total_depositos,
                    total_saques: estatisticasFinanceiras.total_saques,
                    transacoes_financeiras: estatisticasFinanceiras.total_transacoes,
                    transacoes_hoje: estatisticasFinanceiras.transacoes_hoje
                },
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            logger.error('Erro ao obter estatísticas do dashboard:', error);
            return {};
        }
    }
    
    // ================================
    // MÓDULO: ATIVIDADES DISCORD
    // ================================
    
    /**
     * Registra atividade do Discord para dashboard
     * @param {string} tipo - Tipo da atividade (adicionar/remover/deposito/saque)
     * @param {object} dados - Dados da atividade
     * @returns {boolean} Sucesso da operação
     */
    registrarAtividadeDiscord(tipo, dados) {
        try {
            const atividade = {
                id: uuidv4(),
                tipo: tipo,
                item: dados.item || null,
                quantidade: dados.quantidade || null,
                valor: dados.valor || null,
                autor: dados.autor || 'Desconhecido',
                displayName: dados.displayName || null,
                descricao: this.formatarDescricaoAtividade(tipo, dados),
                timestamp: dados.timestamp || new Date().toISOString(),
                data_formatada: dados.timestamp ? moment(dados.timestamp).format('DD/MM/YYYY - HH:mm:ss') : moment().format('DD/MM/YYYY - HH:mm:ss'),
                categoria: this.obterCategoriaAtividade(tipo),
                icone: this.obterIconeAtividade(tipo)
            };
            
            // Check for exact duplicate - same item ID, quantity, author, and timestamp TO THE SECOND
            const isDuplicate = this.atividades.atividades_recentes.some(existing => {
                return existing.tipo === atividade.tipo &&
                       existing.item === atividade.item &&
                       existing.quantidade === atividade.quantidade &&
                       existing.valor === atividade.valor &&
                       existing.autor === atividade.autor &&
                       existing.timestamp === atividade.timestamp;
            });
            
            if (isDuplicate) {
                logger.warn(`Duplicate activity detected and ignored: ${tipo} ${dados.item || 'financial'} x${dados.quantidade || dados.valor} by ${dados.autor}`);
                return true; // Return success to avoid errors but don't save
            }
            
            logger.info(`✅ SAVING NEW ACTIVITY: ${tipo} ${dados.item || 'financial'} x${dados.quantidade || dados.valor} by ${dados.autor}`);
            
            // Adicionar ao início da lista (mais recente primeiro)
            this.atividades.atividades_recentes.unshift(atividade);
            
            // Manter últimas 2000 atividades para histórico completo (cerca de 2-3 meses)
            if (this.atividades.atividades_recentes.length > 2000) {
                this.atividades.atividades_recentes = this.atividades.atividades_recentes.slice(0, 2000);
            }
            
            this.atividades.ultima_atualizacao = new Date().toISOString();
            this.atividades.total_atividades = this.atividades.atividades_recentes.length;
            
            const sucesso = true; // Activities are now managed by dashboard system
            
            // Emitir atualizações em tempo real
            if (sucesso && this.io) {
                this.io.emit('atividades:atualizado', this.obterAtividadesRecentes(20));
                this.io.emit('dashboard:atualizado', this.obterEstatisticasDashboard());
            }
            
            return sucesso;
        } catch (error) {
            logger.error('Erro ao registrar atividade Discord:', error);
            return false;
        }
    }
    
    
    /**
     * Obtém atividades recentes do Discord
     * @param {number} limite - Limite de atividades
     * @param {number} offset - Offset para paginação
     * @returns {object} Atividades recentes
     */
    obterAtividadesRecentes(limite = 20, offset = 0) {
        try {
            const atividades = [...(this.atividades.atividades_recentes || [])];
            
            // Sort by timestamp descending (most recent first)
            atividades.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            // Add current display names to each activity using the complete global naming system
            const atividadesComDisplayNames = atividades.map(atividade => {
                let displayName = null;
                if (atividade.item) {
                    // Use the complete global naming system
                    displayName = this.obterMelhorNomeExibicao(atividade.item);
                }
                return {
                    ...atividade,
                    displayName: displayName
                };
            });
            
            return {
                atividades: atividadesComDisplayNames.slice(offset, offset + limite),
                total: atividades.length,
                tem_mais: offset + limite < atividades.length,
                ultima_atualizacao: this.atividades.ultima_atualizacao
            };
        } catch (error) {
            logger.error('Erro ao obter atividades recentes:', error);
            return { atividades: [], total: 0, tem_mais: false };
        }
    }
    
    /**
     * Formata descrição da atividade para exibição
     * @param {string} tipo - Tipo da atividade
     * @param {object} dados - Dados da atividade
     * @returns {string} Descrição formatada
     */
    formatarDescricaoAtividade(tipo, dados) {
        switch (tipo) {
            case 'adicionar':
                return `Adicionou ${dados.quantidade}x ${dados.item}`;
            case 'remover':
                return `Removeu ${dados.quantidade}x ${dados.item}`;
            case 'deposito':
                return `Depositou $${dados.valor} no caixa`;
            case 'saque':
                return `Sacou $${dados.valor} do caixa`;
            default:
                return `Atividade: ${tipo}`;
        }
    }
    
    /**
     * Obtém categoria da atividade
     * @param {string} tipo - Tipo da atividade
     * @returns {string} Categoria
     */
    obterCategoriaAtividade(tipo) {
        switch (tipo) {
            case 'adicionar':
            case 'remover':
                return 'inventario';
            case 'deposito':
            case 'saque':
                return 'financeiro';
            default:
                return 'geral';
        }
    }
    
    /**
     * Obtém ícone da atividade
     * @param {string} tipo - Tipo da atividade
     * @returns {string} Ícone
     */
    obterIconeAtividade(tipo) {
        switch (tipo) {
            case 'adicionar':
                return '📦';
            case 'remover':
                return '📤';
            case 'deposito':
                return '💰';
            case 'saque':
                return '💸';
            default:
                return '📋';
        }
    }

    /**
     * Emite atualizações em tempo real via Socket.IO
     */
    emitirAtualizacoesTempoReal() {
        if (!this.io) return;
        
        try {
            this.io.emit('inventario:atualizado', this.obterInventario());
            this.io.emit('usuarios:atualizado', this.obterTodosUsuarios());
            this.io.emit('dashboard:atualizado', this.obterEstatisticasDashboard());
            this.io.emit('atividades:atualizado', this.obterAtividadesRecentes(20));
            logger.info('Atualizações em tempo real enviadas');
        } catch (error) {
            logger.error('Erro ao emitir atualizações em tempo real:', error);
        }
    }

    /**
     * Check if an activity belongs to a specific user
     */
    isUserActivity(atividade, userId, userName) {
        if (!atividade || !atividade.autor) {
            return false;
        }
        
        // Direct match by user ID (FIXO ID)
        if (atividade.autor === userId) {
            return true;
        }
        
        // Fallback match by username (for imported data)
        if (userName && atividade.autor.toLowerCase() === userName.toLowerCase()) {
            return true;
        }
        
        return false;
    }

    /**
     * Despagar uma transação específica
     */
    despagarTransacao(userId, serviceType, activityId) {
        try {
            logger.info(`Despagando transação: user=${userId}, service=${serviceType}, activity=${activityId}`);
            
            // Find and update the activity
            const atividades = this.atividades.atividades_recentes || [];
            const atividadeIndex = atividades.findIndex(a => a.id === activityId);
            
            if (atividadeIndex === -1) {
                return { sucesso: false, erro: 'Atividade não encontrada' };
            }
            
            // Mark as unpaid
            atividades[atividadeIndex].pago = false;
            
            // Update pagamentos.json
            if (this.pagamentos && this.pagamentos.pagamentos) {
                this.pagamentos.pagamentos = this.pagamentos.pagamentos.filter(p => 
                    !(p.usuario_id === userId && p.atividade_id === activityId)
                );
                this.salvarArquivoJson(this.pagamentosFile, this.pagamentos);
            }
            
            // Save activities
            // WARNING: atividades are now read-only from analyzed_data.json
            // Data is managed by the bot data pipeline
            console.warn('⚠️ Attempted to save activities - now managed by bot pipeline');
            // this.salvarArquivoJson(this.atividadesFile, this.atividades);
            
            // Emit real-time updates
            if (this.io) {
                this.io.emit('usuarios:atualizado', this.obterTodosUsuarios());
                this.io.emit('atividades:atualizado', this.obterAtividadesRecentes(50));
                this.io.emit('dashboard:atualizado', this.obterEstatisticasDashboard());
                logger.info('Real-time updates emitted for individual unpay');
            }
            
            logger.info(`Transação despaga com sucesso: ${activityId}`);
            return { sucesso: true, atividade_id: activityId };
            
        } catch (error) {
            logger.error('Erro ao despagar transação:', error);
            return { sucesso: false, erro: error.message };
        }
    }

    /**
     * Despagar todas as transações de um serviço
     */
    despagarTodasTransacoes(userId, serviceType) {
        try {
            logger.info(`Despagando todas as transações: user=${userId}, service=${serviceType}`);
            
            const userData = this.usuarios.usuarios[userId];
            if (!userData) {
                return { sucesso: false, erro: 'Usuário não encontrado' };
            }
            
            // Get user activities
            const atividades = this.atividades.atividades_recentes || [];
            let updatedCount = 0;
            
            // Find activities for this user and service type
            atividades.forEach(atividade => {
                const isUserActivity = this.isUserActivity(atividade, userId, userData.nome);
                
                if (isUserActivity && atividade.pago) {
                    // Determine if this activity belongs to the specified service
                    let belongsToService = false;
                    
                    if (serviceType === 'plantacao') {
                        // Check if it's a plant item
                        const itemLower = (atividade.item || '').toLowerCase();
                        const plantasPagas015 = ['corn', 'bulrush', 'trigo', 'milho', 'junco', 'plantacoes_por_semente_plantada'];
                        const plantasConhecidas = [
                            'tomate', 'batata', 'cenoura', 'alface', 'couve', 'pimentao', 
                            'melancia', 'abobora', 'pepino', 'repolho', 'espinafre', 'cebola',
                            'alho', 'morango', 'beringela', 'brocolis', 'couve_flor', 'maca', 'apple',
                            'oregano', 'black_berry', 'blackberry', 'parasol_mushroom', 'mushroom',
                            'oleander_sage', 'black_currant', 'blackcurrant'
                        ];
                        
                        belongsToService = plantasPagas015.some(planta => itemLower.includes(planta)) ||
                                         plantasConhecidas.some(planta => itemLower.includes(planta));
                    } else if (serviceType === 'animais') {
                        belongsToService = (atividade.tipo === 'deposito' && atividade.categoria === 'financeiro');
                    }
                    
                    if (belongsToService) {
                        atividade.pago = false;
                        updatedCount++;
                    }
                }
            });
            
            // Remove all payments for this user and service type
            if (this.pagamentos && this.pagamentos.pagamentos) {
                this.pagamentos.pagamentos = this.pagamentos.pagamentos.filter(p => 
                    !(p.usuario_id === userId && p.tipo_servico === serviceType)
                );
                this.salvarArquivoJson(this.pagamentosFile, this.pagamentos);
            }
            
            // Save activities
            // WARNING: atividades are now read-only from analyzed_data.json
            // Data is managed by the bot data pipeline
            console.warn('⚠️ Attempted to save activities - now managed by bot pipeline');
            // this.salvarArquivoJson(this.atividadesFile, this.atividades);
            
            // Emit real-time updates
            if (this.io && updatedCount > 0) {
                this.io.emit('usuarios:atualizado', this.obterTodosUsuarios());
                this.io.emit('atividades:atualizado', this.obterAtividadesRecentes(50));
                this.io.emit('dashboard:atualizado', this.obterEstatisticasDashboard());
                logger.info('Real-time updates emitted for despagar todas transações');
            }
            
            logger.info(`${updatedCount} transações despagas para usuário ${userId}, serviço ${serviceType}`);
            return { sucesso: true, transacoes_despagadas: updatedCount };
            
        } catch (error) {
            logger.error('Erro ao despagar todas as transações:', error);
            return { sucesso: false, erro: error.message };
        }
    }

    /**
     * Obtém nome de exibição customizado para um item
     * @param {string} itemId - ID do item
     * @returns {string} Nome customizado ou null se não existe
     */
    obterNomeCustomizado(itemId) {
        return this.displayNames.display_names[itemId] || null;
    }

    /**
     * Define nome de exibição customizado para um item
     * @param {string} itemId - ID do item
     * @param {string} displayName - Nome de exibição customizado
     * @returns {boolean} Sucesso da operação
     */
    definirNomeCustomizado(itemId, displayName) {
        try {
            this.displayNames.display_names[itemId] = displayName.trim();
            this.displayNames.ultima_atualizacao = new Date().toISOString();
            
            const success = this.salvarArquivoJson(this.displayNamesFile, this.displayNames);
            
            if (success && this.io) {
                // Emitir atualização em tempo real para refreshar dashboard
                this.io.emit('display-names:atualizado', this.displayNames.display_names);
                this.io.emit('dashboard:atualizado', this.obterEstatisticasDashboard());
            }
            
            return success;
        } catch (error) {
            logger.error('Erro ao definir nome customizado:', error);
            return false;
        }
    }

    /**
     * Remove nome de exibição customizado para um item
     * @param {string} itemId - ID do item
     * @returns {boolean} Sucesso da operação
     */
    removerNomeCustomizado(itemId) {
        try {
            delete this.displayNames.display_names[itemId];
            this.displayNames.ultima_atualizacao = new Date().toISOString();
            
            const success = this.salvarArquivoJson(this.displayNamesFile, this.displayNames);
            
            if (success && this.io) {
                this.io.emit('display-names:atualizado', this.displayNames.display_names);
                this.io.emit('dashboard:atualizado', this.obterEstatisticasDashboard());
            }
            
            return success;
        } catch (error) {
            logger.error('Erro ao remover nome customizado:', error);
            return false;
        }
    }

    /**
     * Obtém todos os nomes customizados
     * @returns {object} Mapeamento de itemId -> displayName
     */
    obterTodosNomesCustomizados() {
        return { ...this.displayNames.display_names };
    }

    /**
     * Extrai o ID do usuário (FIXO ID) do campo autor
     * @param {string} autor - String do autor contendo FIXO ID
     * @returns {string|null} ID do usuário ou null
     */
    extrairIdUsuario(autor) {
        if (!autor) return null;
        const fixoMatch = autor.match(/FIXO:\s*(\d+)/);
        return fixoMatch ? fixoMatch[1] : null;
    }

    /**
     * Análise Completa de Transações do Usuário
     * Sistema forense detalhado para rastrear O QUE saiu vs O QUE entrou
     * @param {string} userId - ID do usuário
     * @returns {Object} Análise completa de transações categorizadas
     */
    obterAnalisesTransacoes(userId) {
        try {
            console.log(`🔍 Analisando transações detalhadas do usuário: ${userId}`);
            
            // Get all activities for this user
            const todasAtividades = this.discord.atividades_recentes || [];
            const atividadesUsuario = todasAtividades.filter(atividade => {
                const autorId = this.extrairIdUsuario(atividade.autor);
                return autorId === userId;
            });

            console.log(`📊 Encontradas ${atividadesUsuario.length} atividades para análise`);
            
            // Debug: Show sample activities to understand the data
            if (atividadesUsuario.length > 0) {
                console.log(`📋 Primeiras 3 atividades:`, atividadesUsuario.slice(0, 3).map(a => ({
                    item: a.item,
                    tipo: a.tipo,
                    quantidade: a.quantidade,
                    timestamp: a.timestamp
                })));
            }

            // Categorization rules based on CLAUDE.md
            const categorizarItem = (item, tipo) => {
                if (!item || typeof item !== 'string') {
                    return 'unknown';
                }
                const itemLower = item.toLowerCase();
                
                // Seeds (what goes OUT - input for farming)
                const sementes = ['seed', 'semente', '_seed'];
                if (sementes.some(seed => itemLower.includes(seed))) {
                    return 'seeds_out';
                }
                
                // Animals (what goes OUT - for animal services)
                const animais = ['cow', 'sheep', 'goat', 'donkey', 'chicken', 'pig', 'carneiro', 'ovelha', 'bode', 'cabra', 'galo', 'galinha', 'porco', 'porca', 'vaca', 'touro', 'mula', 'burro'];
                if (animais.some(animal => itemLower.includes(animal)) || itemLower.includes('_male') || itemLower.includes('_female')) {
                    return 'animals_out';
                }
                
                // Feed/Racao (what goes OUT - to feed animals)
                if (itemLower.includes('racao') || itemLower.includes('feed') || 
                    itemLower.includes('common_portion') || itemLower.includes('common portion')) {
                    return 'feed_out';
                }
                
                // Tools (what goes OUT/IN - farming tools)
                const ferramentas = ['hoe', 'planttrimmer', 'wateringcan', 'pickaxe', 'shovel', 'bucket', 'balde', 'enxada', 'regador'];
                if (ferramentas.some(tool => itemLower.includes(tool))) {
                    return tipo === 'remover' ? 'tools_out' : 'tools_in';
                }
                
                // Plants/Crops (what comes IN - farming results)
                const plantas = ['corn', 'milho', 'bulrush', 'junco', 'trigo', 'wheat', 'apple', 'maconha', 'flordamaconha'];
                if (plantas.some(plant => itemLower.includes(plant))) {
                    return 'plants_in';
                }
                
                // Animal Products (what comes IN - animal service results)
                const produtosAnimais = ['milk_', 'leather_', 'common_portion_', 'meat', 'lã', 'ladeovelha', 'crina', 'taurine', 'fat', 'egg'];
                if (produtosAnimais.some(produto => itemLower.includes(produto))) {
                    return 'animal_products_in';
                }
                
                // Manufactured goods (what comes IN - crafted items)
                if (itemLower.includes('caixa') || itemLower.includes('box') || itemLower.includes('rustic')) {
                    return 'manufactured_in';
                }
                
                // Financial transactions (deposits/withdrawals)
                if (itemLower.includes('$') || itemLower.includes('dinheiro') || itemLower.includes('money')) {
                    return 'financial';
                }
                
                return 'unknown';
            };

            // Separate transactions by category and type (OUT vs IN)
            const transacoesPorCategoria = {
                seeds_out: [],
                seeds_in: [],
                animals_out: [],
                animals_in: [],
                feed_out: [],
                feed_in: [],
                tools_out: [],
                tools_in: [],
                plants_in: [],
                animal_products_in: [],
                manufactured_in: [],
                financial: [],
                unknown: [],
                other: []
            };

            // Process all activities and categorize
            atividadesUsuario.forEach((atividade, index) => {
                const categoriaBase = categorizarItem(atividade.item, atividade.tipo);
                
                // For animals and feed, separate IN and OUT transactions
                let categoria = categoriaBase;
                if (categoriaBase === 'animals_out' && atividade.tipo === 'adicionar') {
                    categoria = 'animals_in';
                } else if (categoriaBase === 'feed_out' && atividade.tipo === 'adicionar') {
                    categoria = 'feed_in';
                } else if (categoriaBase === 'seeds_out' && atividade.tipo === 'adicionar') {
                    categoria = 'seeds_in';
                }
                
                // Debug first 5 categorizations
                if (index < 5) {
                    console.log(`🏷️ Item "${atividade.item}" (${atividade.tipo}) → categoria: ${categoria}`);
                }
                
                // Add display name and analysis data
                const transacaoAnalizada = {
                    ...atividade,
                    displayName: this.obterMelhorNomeExibicao(atividade.item),
                    categoria: categoria,
                    tipoFluxo: atividade.tipo === 'remover' ? 'OUT' : 'IN',
                    diasDesdeTransacao: Math.floor((Date.now() - new Date(atividade.timestamp)) / (1000 * 60 * 60 * 24)),
                    valorEsperado: this.calcularValorEsperado(atividade.item, atividade.quantidade, categoria),
                    statusRetorno: 'pending' // Will be calculated in analysis phase
                };

                transacoesPorCategoria[categoria].push(transacaoAnalizada);
            });

            // Debug: Show categorization summary
            const categoriaSummary = {};
            Object.keys(transacoesPorCategoria).forEach(categoria => {
                categoriaSummary[categoria] = transacoesPorCategoria[categoria].length;
            });
            console.log(`📊 Resumo de categorização:`, categoriaSummary);

            // Calculate yield analysis and profitability
            const analiseRendimento = this.calcularAnaliseRendimento(transacoesPorCategoria);
            
            // Calculate honesty score based on returns
            const pontuacaoHonestidade = this.calcularPontuacaoHonestidade(transacoesPorCategoria, analiseRendimento);

            // Generate summary statistics
            const estatisticasResumo = this.gerarEstatisticasResumo(transacoesPorCategoria, analiseRendimento);
            
            // Calculate detailed analysis for seeds/plants, animals/feed, tools/buckets
            const analiseDetalhada = this.calcularAnaliseDetalhada(transacoesPorCategoria);

            return {
                userId: userId,
                totalTransacoes: atividadesUsuario.length,
                transacoesPorCategoria: transacoesPorCategoria,
                analiseRendimento: analiseRendimento,
                pontuacaoHonestidade: pontuacaoHonestidade,
                estatisticasResumo: estatisticasResumo,
                analiseDetalhada: analiseDetalhada,
                todasTransacoes: atividadesUsuario, // Return ALL transactions
                dataAnalise: new Date().toISOString()
            };

        } catch (error) {
            console.error('❌ Erro ao analisar transações:', error);
            return {
                userId: userId,
                erro: 'Falha ao analisar transações',
                detalhes: error.message
            };
        }
    }

    /**
     * Calcula análise detalhada de seeds/plants, animals/feed, tools/buckets
     */
    /**
     * Get semantic key for grouping - use ONLY the global naming system
     */
    getSemanticSeedKey(itemId) {
        if (!itemId) return 'unknown_seed';
        
        // Use the global naming system to get the proper display name first
        const displayName = this.obterMelhorNomeExibicao(itemId);
        
        // Create a normalized key from the display name - this ensures items with same meaning group together
        return displayName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    }

    /**
     * Get semantic key for plant grouping - keeps plants separate from seeds
     */
    getSemanticPlantKey(itemId) {
        if (!itemId) return 'unknown_plant';
        
        // Use the global naming system to get the proper display name
        const displayName = this.obterMelhorNomeExibicao(itemId);
        
        // Keep plants as separate entities - DO NOT remove seed/semente words
        return displayName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    }

    /**
     * Check if seed and plant should be matched for conversion tracking
     * This determines if a plant return should count toward a seed's expected yield
     */
    doSeedAndPlantMatch(seedSemanticKey, plantSemanticKey, plantItemId) {
        // Get the display names to compare semantics
        const seedDisplayName = seedSemanticKey.replace(/_/g, ' ');
        const plantDisplayName = plantSemanticKey.replace(/_/g, ' ');
        
        // Extract the crop base (remove seed/semente and de/of words)
        const seedCropBase = seedDisplayName
            .replace(/\b(semente|seed)\b/gi, '')
            .replace(/\b(de|of)\b/gi, '')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();
            
        const plantCropBase = plantDisplayName
            .replace(/\b(semente|seed)\b/gi, '')
            .replace(/\b(de|of)\b/gi, '')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();
        
        // Match if the crop bases are the same (e.g., "trigo" matches "trigo")
        return seedCropBase === plantCropBase && seedCropBase.length > 0;
    }

    /**
     * Get best display name for a semantic group - use ONLY global naming system
     */
    getBestDisplayNameForSemanticGroup(semanticKey, sampleItemId) {
        // ONLY use the global naming system - no hardcoded names
        return this.obterMelhorNomeExibicao(sampleItemId);
    }

    calcularAnaliseDetalhada(transacoesPorCategoria) {
        const analise = {
            seedsPlants: {},
            animalsFeed: {},
            toolsBuckets: {},
            foodDrink: {},
            summary: {}
        };

        // Analyze seeds taken vs plants returned
        const seedsOut = transacoesPorCategoria.seeds_out || [];
        const plantsIn = transacoesPorCategoria.plants_in || [];
        
        // Group seeds by semantic meaning (normalize similar items together)
        seedsOut.forEach((seed) => {
            // Get semantic key for grouping similar seeds together
            const semanticKey = this.getSemanticSeedKey(seed.item);
            const displayName = this.getBestDisplayNameForSemanticGroup(semanticKey, seed.item);
            
            if (!analise.seedsPlants[semanticKey]) {
                analise.seedsPlants[semanticKey] = {
                    displayName: displayName,
                    originalIds: [seed.item],
                    seedsTaken: 0,
                    plantsExpected: 0,
                    plantsReturned: 0,
                    seedsReturned: 0,
                    efficiency: 0,
                    transactions: []
                };
            } else {
                // Add original ID if not already present
                if (!analise.seedsPlants[semanticKey].originalIds.includes(seed.item)) {
                    analise.seedsPlants[semanticKey].originalIds.push(seed.item);
                }
            }
            
            analise.seedsPlants[semanticKey].seedsTaken += seed.quantidade || 0;
            analise.seedsPlants[semanticKey].plantsExpected += (seed.quantidade || 0) * 10; // 1 seed = 10 plants
            analise.seedsPlants[semanticKey].transactions.push(seed);
        });
        
        // Count plants returned using semantic matching
        plantsIn.forEach(plant => {
            // Get semantic key for this plant to match with corresponding seeds
            const plantSemanticKey = this.getSemanticPlantKey(plant.item);
            
            // Try direct semantic match first
            if (analise.seedsPlants[plantSemanticKey]) {
                analise.seedsPlants[plantSemanticKey].plantsReturned += plant.quantidade || 0;
                analise.seedsPlants[plantSemanticKey].transactions.push(plant);
            } else {
                // Fallback: try matching any existing seed semantic keys with this plant
                Object.keys(analise.seedsPlants).forEach(seedSemanticKey => {
                    if (this.doSeedAndPlantMatch(seedSemanticKey, plantSemanticKey, plant.item)) {
                        analise.seedsPlants[seedSemanticKey].plantsReturned += plant.quantidade || 0;
                        analise.seedsPlants[seedSemanticKey].transactions.push(plant);
                    }
                });
            }
        });
        
        // Calculate efficiency for each seed type
        Object.keys(analise.seedsPlants).forEach(seedType => {
            const data = analise.seedsPlants[seedType];
            if (data.plantsExpected > 0) {
                data.efficiency = Math.round((data.plantsReturned / data.plantsExpected) * 100);
            }
        });
        
        // Analyze animals and feed
        const animalsOut = transacoesPorCategoria.animals_out || [];
        const animalsIn = transacoesPorCategoria.animals_in || [];
        const feedOut = transacoesPorCategoria.feed_out || [];
        const feedIn = transacoesPorCategoria.feed_in || [];
        const animalProductsIn = transacoesPorCategoria.animal_products_in || [];
        
        // Calculate net usage (OUT - IN)
        const totalAnimalsOut = animalsOut.reduce((sum, a) => sum + (a.quantidade || 0), 0);
        const totalAnimalsIn = animalsIn.reduce((sum, a) => sum + (a.quantidade || 0), 0);
        const totalFeedOut = feedOut.reduce((sum, a) => sum + (a.quantidade || 0), 0);
        const totalFeedIn = feedIn.reduce((sum, a) => sum + (a.quantidade || 0), 0);
        
        const netAnimals = totalAnimalsOut - totalAnimalsIn;
        const netFeed = totalFeedOut - totalFeedIn;
        
        analise.animalsFeed = {
            // Totals
            totalAnimalsOut: totalAnimalsOut,
            totalAnimalsIn: totalAnimalsIn,
            netAnimals: netAnimals,
            totalFeedOut: totalFeedOut,
            totalFeedIn: totalFeedIn,
            netFeed: netFeed,
            
            // Analysis
            expectedFeedRatio: 2, // 2 feed per animal
            actualFeedRatio: netAnimals > 0 ? netFeed / netAnimals : 0,
            deliveriesExpected: Math.floor(netAnimals / 4),
            productsReturned: animalProductsIn.length,
            
            // All transactions
            animalWithdrawals: animalsOut,
            animalReturns: animalsIn,
            feedWithdrawals: feedOut,
            feedReturns: feedIn,
            productTransactions: animalProductsIn
        };
        
        // Analyze tools and buckets
        const toolsOut = transacoesPorCategoria.tools_out || [];
        const toolsIn = transacoesPorCategoria.tools_in || [];
        
        const bucketsTaken = toolsOut.filter(t => t.item && t.item.toLowerCase().includes('bucket'));
        const bucketsReturned = toolsIn.filter(t => t.item && t.item.toLowerCase().includes('bucket'));
        
        analise.toolsBuckets = {
            bucketsTaken: bucketsTaken.reduce((sum, b) => sum + (b.quantidade || 0), 0),
            bucketsReturned: bucketsReturned.reduce((sum, b) => sum + (b.quantidade || 0), 0),
            bucketsNotReturned: 0,
            bucketCostOwed: 0,
            otherToolsTaken: toolsOut.filter(t => !t.item || !t.item.toLowerCase().includes('bucket')),
            otherToolsReturned: toolsIn.filter(t => !t.item || !t.item.toLowerCase().includes('bucket'))
        };
        
        analise.toolsBuckets.bucketsNotReturned = Math.max(0, 
            analise.toolsBuckets.bucketsTaken - analise.toolsBuckets.bucketsReturned);
        analise.toolsBuckets.bucketCostOwed = analise.toolsBuckets.bucketsNotReturned * 0.50;
        
        // Analyze food and drink consumption
        const consumables = ['water', 'food', 'drink', 'juice', 'beer', 'wine', 'milk'];
        const foodDrinkOut = (transacoesPorCategoria.unknown || []).filter(t => 
            t.item && consumables.some(c => t.item.toLowerCase().includes(c))
        );
        
        analise.foodDrink = {
            totalConsumed: foodDrinkOut.reduce((sum, f) => sum + (f.quantidade || 0), 0),
            uniqueItems: [...new Set(foodDrinkOut.map(f => f.item))].length,
            transactions: foodDrinkOut,
            suspiciousConsumption: foodDrinkOut.filter(f => (f.quantidade || 0) > 10)
        };
        
        // Summary
        analise.summary = {
            totalSeedsTaken: Object.values(analise.seedsPlants).reduce((sum, s) => sum + s.seedsTaken, 0),
            totalPlantsExpected: Object.values(analise.seedsPlants).reduce((sum, s) => sum + s.plantsExpected, 0),
            totalPlantsReturned: Object.values(analise.seedsPlants).reduce((sum, s) => sum + s.plantsReturned, 0),
            overallPlantEfficiency: 0,
            bucketsOwed: analise.toolsBuckets.bucketCostOwed,
            suspiciousActivity: analise.foodDrink.suspiciousConsumption.length > 0
        };
        
        if (analise.summary.totalPlantsExpected > 0) {
            analise.summary.overallPlantEfficiency = Math.round(
                (analise.summary.totalPlantsReturned / analise.summary.totalPlantsExpected) * 100
            );
        }
        
        return analise;
    }

    /**
     * Calcula valor esperado baseado no tipo de item e quantidade
     */
    calcularValorEsperado(item, quantidade, categoria) {
        if (!item || typeof item !== 'string') return 0;
        
        // Convert quantidade to number if it's a string
        const qty = typeof quantidade === 'string' ? parseFloat(quantidade) : quantidade;
        if (!qty || isNaN(qty)) return 0;
        
        const itemLower = item.toLowerCase();
        
        if (categoria === 'seeds_out') {
            // Seeds: 1 seed → 10 plants (trimmed) or 5 plants (not trimmed)
            // Assume trimmed for calculation (best case)
            const plantasEsperadas = qty * 10;
            
            // Main crops: $0.15/plant, Special crops: $0.20/plant
            const mainCrops = ['corn', 'milho', 'bulrush', 'junco', 'trigo'];
            const isMainCrop = mainCrops.some(crop => itemLower.includes(crop));
            const precoPorPlanta = isMainCrop ? 0.15 : 0.20;
            
            return plantasEsperadas * precoPorPlanta;
        }
        
        if (categoria === 'animals_out') {
            // Animals: 4 animals + 8 racao → $160 + materials
            // Each batch of 4 animals should generate $160
            const lotes = Math.ceil(qty / 4);
            return lotes * 160;
        }
        
        if (categoria === 'plants_in' || categoria === 'animal_products_in') {
            // These are returns - positive value
            const mainCrops = ['corn', 'milho', 'bulrush', 'junco', 'trigo'];
            const isMainCrop = mainCrops.some(crop => itemLower.includes(crop));
            const precoPorPlanta = isMainCrop ? 0.15 : 0.20;
            
            return qty * precoPorPlanta;
        }
        
        return 0; // Tools, feed, etc. don't have direct expected returns
    }

    /**
     * Calcula análise de rendimento (yield analysis)
     */
    calcularAnaliseRendimento(transacoes) {
        // Seeds OUT vs Plants IN analysis
        const seedsOut = transacoes.seeds_out.filter(t => t.tipo === 'remover');
        const plantsIn = transacoes.plants_in.filter(t => t.tipo === 'adicionar');
        
        const totalSeedsOut = seedsOut.reduce((sum, t) => sum + t.quantidade, 0);
        const totalPlantsIn = plantsIn.reduce((sum, t) => sum + t.quantidade, 0);
        const plantasEsperadasDeSeeds = totalSeedsOut * 10; // Assuming trimmed
        
        // Animals OUT vs Products/Money IN analysis
        const animalsOut = transacoes.animals_out.filter(t => t.tipo === 'remover');
        const feedOut = transacoes.feed_out.filter(t => t.tipo === 'remover');
        const animalProductsIn = transacoes.animal_products_in.filter(t => t.tipo === 'adicionar');
        
        const totalAnimalsOut = animalsOut.reduce((sum, t) => sum + t.quantidade, 0);
        const totalFeedOut = feedOut.reduce((sum, t) => sum + t.quantidade, 0);
        const totalAnimalProductsIn = animalProductsIn.reduce((sum, t) => sum + t.quantidade, 0);
        
        // Expected deliveries (4 animals per delivery)
        const entregasEsperadas = Math.floor(totalAnimalsOut / 4);
        const valorEsperadoAnimais = entregasEsperadas * 160;

        return {
            sementes: {
                totalRetiradas: totalSeedsOut,
                plantasRetornadas: totalPlantsIn,
                plantasEsperadas: plantasEsperadasDeSeeds,
                eficiencia: plantasEsperadasDeSeeds > 0 ? (totalPlantsIn / plantasEsperadasDeSeeds * 100).toFixed(1) : 0,
                status: totalPlantsIn >= plantasEsperadasDeSeeds ? 'completed' : 'pending'
            },
            animais: {
                totalRetirados: totalAnimalsOut,
                racaoRetirado: totalFeedOut,
                produtosRetornados: totalAnimalProductsIn,
                entregasEsperadas: entregasEsperadas,
                valorEsperado: valorEsperadoAnimais,
                status: entregasEsperadas > 0 ? 'pending' : 'none' // TODO: Check for $160 deposits
            }
        };
    }

    /**
     * Calcula pontuação de honestidade baseada nos retornos
     */
    calcularPontuacaoHonestidade(transacoes, analiseRendimento) {
        let pontuacao = 100;
        
        // Penalize based on seed/plant ratio
        if (analiseRendimento.sementes.eficiencia < 50) {
            pontuacao -= 30; // Major penalty for very low returns
        } else if (analiseRendimento.sementes.eficiencia < 80) {
            pontuacao -= 15; // Minor penalty for below-expected returns
        }
        
        // Check for animal service accountability
        if (analiseRendimento.animais.totalRetirados > 0 && analiseRendimento.animais.entregasEsperadas === 0) {
            pontuacao -= 40; // Major penalty for taking animals but no deliveries
        }
        
        // Bonus for returning excess materials
        const totalOut = transacoes.seeds_out.length + transacoes.animals_out.length + transacoes.feed_out.length;
        const totalIn = transacoes.plants_in.length + transacoes.animal_products_in.length;
        
        if (totalIn > totalOut) {
            pontuacao += 10; // Bonus for active returning
        }
        
        return Math.max(0, Math.min(100, pontuacao));
    }

    /**
     * Gera estatísticas resumidas
     */
    gerarEstatisticasResumo(transacoes, analiseRendimento) {
        const totalOut = transacoes.seeds_out.length + transacoes.animals_out.length + transacoes.feed_out.length + transacoes.tools_out.length;
        const totalIn = transacoes.plants_in.length + transacoes.animal_products_in.length + transacoes.manufactured_in.length;
        
        // Calculate expected vs actual values
        const valorEsperadoTotal = analiseRendimento.sementes.plantasEsperadas * 0.15 + analiseRendimento.animais.valorEsperado;
        const valorRetornadoTotal = transacoes.plants_in.reduce((sum, t) => sum + (t.valorEsperado || 0), 0);
        
        const lucroEstimado = valorRetornadoTotal - (valorEsperadoTotal * 0.6); // 60% is worker payment
        
        return {
            totalTransacoesOut: totalOut,
            totalTransacoesIn: totalIn,
            balanceTransacoes: totalIn - totalOut,
            valorEsperadoTotal: valorEsperadoTotal,
            valorRetornadoTotal: valorRetornadoTotal,
            lucroEstimado: lucroEstimado,
            statusGeral: lucroEstimado > 0 ? 'lucrativo' : lucroEstimado < -50 ? 'prejuizo' : 'neutro'
        };
    }

    /**
     * Obtém o melhor nome de exibição para um item
     * Prioridade: 1) Nome customizado, 2) Nome da lista de preços, 3) Nome formatado do ID
     * @param {string} itemId - ID do item
     * @returns {string} Melhor nome de exibição disponível
     */
    obterMelhorNomeExibicao(itemId) {
        if (!itemId) return '';
        
        // 1. Tentar nome customizado primeiro (highest priority)
        const nomeCustomizado = this.obterNomeCustomizado(itemId);
        if (nomeCustomizado) {
            return nomeCustomizado;
        }

        // 2. Tentar nome da lista de preços
        const precoItem = this.precos.itens[itemId];
        if (precoItem && precoItem.nome) {
            return precoItem.nome;
        }

        // 3. Usar sistema de localização português com custom overrides
        return this.localization.getDisplayName(itemId, this.displayNames.display_names);
    }
    
    /**
     * Atualiza o saldo atual da fazenda
     * @param {number} novoSaldo - Novo saldo
     * @returns {boolean} Sucesso da operação
     */
    atualizarSaldoAtual(novoSaldo) {
        try {
            const saldoAnterior = this.balanceData.saldo_atual;
            this.balanceData.saldo_atual = Math.round(novoSaldo * 100) / 100;
            this.balanceData.ultima_atualizacao = new Date().toISOString();
            
            // Adicionar ao histórico
            this.balanceData.historico_saldos.push({
                saldo_anterior: saldoAnterior,
                saldo_novo: this.balanceData.saldo_atual,
                timestamp: this.balanceData.ultima_atualizacao
            });
            
            // Manter apenas os últimos 100 registros de histórico
            if (this.balanceData.historico_saldos.length > 100) {
                this.balanceData.historico_saldos = this.balanceData.historico_saldos.slice(-100);
            }
            
            const success = this.salvarArquivoJson(this.saldoFazendaFile, this.balanceData);
            
            if (success) {
                logger.info(`Saldo atualizado: $${saldoAnterior} -> $${this.balanceData.saldo_atual}`);
            }
            
            return success;
        } catch (error) {
            logger.error('Erro ao atualizar saldo atual:', error);
            return false;
        }
    }
    
    /**
     * Obtém o saldo atual da fazenda
     * @returns {number} Saldo atual
     */
    calcularSaldoAtual() {
        return this.balanceData.saldo_atual || 0;
    }
    
    /**
     * Obter estatísticas financeiras detalhadas
     * @returns {object} Estatísticas financeiras
     */
    obterEstatisticasFinanceiras() {
        try {
            const atividades = this.atividades.atividades_recentes || [];
            const financeiras = atividades.filter(a => a.categoria === 'financeiro');
            
            let totalDepositos = 0;
            let totalSaques = 0;
            let transacoesHoje = 0;
            
            const hoje = new Date().toISOString().split('T')[0];
            
            for (const atividade of financeiras) {
                const dataAtividade = atividade.timestamp ? atividade.timestamp.split('T')[0] : '';
                
                if (atividade.valor) {
                    if (atividade.tipo === 'deposito') {
                        totalDepositos += atividade.valor;
                    } else if (atividade.tipo === 'saque') {
                        totalSaques += atividade.valor;
                    }
                }
                
                if (dataAtividade === hoje) {
                    transacoesHoje++;
                }
            }
            
            return {
                saldo_atual: this.calcularSaldoAtual(),
                total_depositos: Math.round(totalDepositos * 100) / 100,
                total_saques: Math.round(totalSaques * 100) / 100,
                total_transacoes: financeiras.length,
                transacoes_hoje: transacoesHoje,
                atividades_recentes: financeiras.slice(0, 10),
                historico_saldos: this.balanceData.historico_saldos.slice(-5) // Últimos 5 históricos
            };
        } catch (error) {
            logger.error('Erro ao obter estatísticas financeiras:', error);
            return {
                saldo_atual: 0,
                total_depositos: 0,
                total_saques: 0,
                total_transacoes: 0,
                transacoes_hoje: 0,
                atividades_recentes: []
            };
        }
    }
    
    /**
     * Retornar performance vazia para usuário não encontrado
     */
    getEmptyPerformance() {
        return {
            usuario_id: null,
            total_atividades: 0,
            itens_adicionados: 0,
            itens_removidos: 0,
            valor_depositado: 0,
            valor_sacado: 0,
            saldo_contribuicao: 0,
            atividades_hoje: 0,
            atividades_recentes: [],
            servicos: {
                plantacao: { total_plantas: 0, valor_total: 0, detalhes: [], detalhes_por_item: {} },
                animais: { total_entregas: 0, valor_total: 0, detalhes: [] },
                total_ganhos: 0
            }
        };
    }

    /**
     * Obter performance de usuário baseada nas atividades do Discord
     * @param {string} userId - ID do usuário
     * @returns {object} Performance do usuário
     */
    obterPerformanceUsuario(userId) {
        try {
            const atividades = this.atividades.atividades_recentes || [];
            
            // Get user data to match by name and FIXO
            const userData = this.usuarios.usuarios[userId];
            if (!userData) {
                console.log(`❌ User ${userId} not found in usuarios data`);
                return this.getEmptyPerformance();
            }
            
            // Debug logging for troubleshooting (can be removed later)
            console.log(`🔍 Loading performance for user: ${userData.nome} (ID: ${userId}, FIXO: ${userData.fixo_id})`);
            console.log(`📊 Total activities loaded: ${atividades.length}`);
            
            // Enhanced debug logging for user 74829
            if (userId === '74829') {
                console.log(`🚨 [DEBUG 74829] Enhanced debug for problematic user:`);
                console.log(`🚨 [DEBUG 74829] User data:`, userData);
                console.log(`🚨 [DEBUG 74829] Sample activities:`, atividades.slice(0, 3).map(a => ({
                    autor: a.autor,
                    acao: a.acao,
                    timestamp: a.timestamp
                })));
            }
            
            const atividadesUsuario = atividades.filter(a => {
                if (!a.autor) return false;
                
                // Extract clean name and FIXO from author
                const autorLimpo = a.autor.split(' | ')[0].toLowerCase().trim();
                const fixoMatch = a.autor.match(/FIXO:\s*(\d+)/);
                const autorFixo = fixoMatch ? fixoMatch[1] : null;
                
                
                // Improved matching logic
                const userNameLimpo = userData.nome.toLowerCase().trim();
                let isMatch = false;
                
                // 1. Try FIXO ID match first (most reliable)
                if (userData.fixo_id && autorFixo) {
                    isMatch = autorFixo === userData.fixo_id;
                }
                
                // 2. If no FIXO match, try exact name match
                if (!isMatch) {
                    isMatch = autorLimpo === userNameLimpo;
                }
                
                // 3. If still no match, try partial name matching (for imported data)
                if (!isMatch && autorLimpo.length > 0 && userNameLimpo.length > 0) {
                    // Check if the names contain each other (handles variations in imported data)
                    const autorWords = autorLimpo.split(' ').filter(w => w.length > 2);
                    const userWords = userNameLimpo.split(' ').filter(w => w.length > 2);
                    
                    // Check if at least 2 significant words match, or if one name contains the other
                    const commonWords = autorWords.filter(word => userWords.some(uWord => 
                        uWord.includes(word) || word.includes(uWord)
                    ));
                    
                    isMatch = commonWords.length >= Math.min(autorWords.length, userWords.length, 2) ||
                             autorLimpo.includes(userNameLimpo) || 
                             userNameLimpo.includes(autorLimpo);
                }
                
                return isMatch;
            });
            
            console.log(`🎯 Found ${atividadesUsuario.length} activities for user ${userData.nome} (${userId})`);
            
            // Enhanced debug logging for user 74829
            if (userId === '74829') {
                console.log(`🚨 [DEBUG 74829] Matched activities:`, atividadesUsuario.length);
                console.log(`🚨 [DEBUG 74829] First few matched activities:`, atividadesUsuario.slice(0, 3).map(a => ({
                    autor: a.autor,
                    acao: a.acao,
                    item: a.item,
                    quantidade: a.quantidade,
                    timestamp: a.timestamp
                })));
            }
            
            let itensAdicionados = 0;
            let itensRemovidos = 0;
            let valorDepositado = 0;
            let valorSacado = 0;
            
            const hoje = new Date().toISOString().split('T')[0];
            let atividadesHoje = 0;
            
            for (const atividade of atividadesUsuario) {
                const dataAtividade = atividade.timestamp ? atividade.timestamp.split('T')[0] : '';
                
                if (atividade.categoria === 'inventario') {
                    if (atividade.tipo === 'adicionar') {
                        itensAdicionados += atividade.quantidade || 0;
                    } else if (atividade.tipo === 'remover') {
                        itensRemovidos += atividade.quantidade || 0;
                    }
                } else if (atividade.categoria === 'financeiro' && atividade.valor) {
                    if (atividade.tipo === 'deposito') {
                        valorDepositado += atividade.valor;
                    } else if (atividade.tipo === 'saque') {
                        valorSacado += atividade.valor;
                    }
                }
                
                if (dataAtividade === hoje) {
                    atividadesHoje++;
                }
            }
            
            // Calcular ganhos por serviços
            const ganhosPlantacao = this.calcularGanhosPlantacao(userId);
            const ganhosAnimais = this.calcularGanhosAnimais(userId);
            const totalGanhos = ganhosPlantacao.valor_total + ganhosAnimais.valor_total;
            
            // Enhanced debug logging for user 74829
            if (userId === '74829') {
                console.log(`🚨 [DEBUG 74829] Service calculations:`, {
                    plantacao: ganhosPlantacao,
                    animais: ganhosAnimais,
                    total_ganhos: totalGanhos
                });
            }
            
            const atividadesFiltradas = this.filtrarAtividadesTrabalhador(atividadesUsuario);
            console.log(`✅ Found ${atividadesUsuario.length} activities for user ${userData.nome}`);
            
            // Calculate inventory abuse and theft
            const inventoryAbuse = this.calculateInventoryAbuse(userId, atividadesUsuario);
            
            // Calculate net payment after deducting abuse charges
            const grossEarnings = Math.round(totalGanhos * 100) / 100;
            const abuseCharges = Math.round(inventoryAbuse.total_charges * 100) / 100;
            const netEarnings = grossEarnings - abuseCharges;
            
            const result = {
                usuario_id: userId,
                total_atividades: atividadesUsuario.length,
                atividades_hoje: atividadesHoje,
                itens_adicionados: itensAdicionados,
                itens_removidos: itensRemovidos,
                valor_depositado: Math.round(valorDepositado * 100) / 100,
                valor_sacado: Math.round(valorSacado * 100) / 100,
                saldo_contribuicao: Math.round((valorDepositado - valorSacado) * 100) / 100,
                atividades_recentes: atividadesUsuario.slice(0, 20), // Show all user activities for historical context
                servicos: {
                    plantacao: ganhosPlantacao,
                    animais: ganhosAnimais,
                    total_ganhos: grossEarnings
                },
                // Inventory abuse tracking
                inventario_abuse: {
                    total_charges: abuseCharges,
                    violations: inventoryAbuse.violations,
                    suspicious_items: inventoryAbuse.suspicious_items,
                    unreturned_tools: inventoryAbuse.unreturned_tools,
                    excess_consumption: inventoryAbuse.excess_consumption,
                    legitimate_usage: inventoryAbuse.legitimate_usage
                },
                // Net payment after abuse deductions
                pagamento_liquido: Math.round(netEarnings * 100) / 100
            };
            
            console.log(`🚨 [ABUSE] User ${userData.nome}: $${abuseCharges} in abuse charges, ${inventoryAbuse.violations.length} violations`);
            
            return result;
        } catch (error) {
            logger.error('Erro ao obter performance do usuário:', error);
            return {
                usuario_id: userId,
                total_atividades: 0,
                atividades_hoje: 0,
                itens_adicionados: 0,
                itens_removidos: 0,
                valor_depositado: 0,
                valor_sacado: 0,
                saldo_contribuicao: 0,
                atividades_recentes: []
            };
        }
    }
    
    /**
     * Filtrar atividades para mostrar apenas material retirado/retornado por trabalhadores
     * Exclui: plantação de itens, entrega de animais, depósitos de dinheiro
     * @param {Array} atividades - Lista de atividades do usuário
     * @returns {Array} Atividades filtradas
     */
    filtrarAtividadesTrabalhador(atividades) {
        try {
            // Plantas que workers depositam (devem ser excluídas)
            const plantasExcluir = [
                'junco', 'plantacoes_por_semente_plantada', 'trigo', 'milho',
                'tomate', 'batata', 'cenoura', 'alface', 'couve', 'pimentao', 
                'melancia', 'abobora', 'pepino', 'repolho', 'espinafre', 'cebola',
                'alho', 'morango', 'beringela', 'brocolis', 'couve_flor', 'maca', 'apple',
                'oregano', 'black_berry', 'blackberry', 'parasol_mushroom', 'mushroom',
                'oleander_sage', 'black_currant', 'blackcurrant'
            ];
            
            // Animais que workers entregam (devem ser excluídas)
            const animaisExcluir = [
                'pig', 'cow', 'chicken', 'sheep', 'porco', 'vaca', 'galinha', 'ovelha',
                'porcos', 'vacas', 'galinhas', 'ovelhas'
            ];
            
            return atividades.filter(atividade => {
                // Excluir atividades financeiras (workers não depositam dinheiro)
                if (atividade.categoria === 'financeiro') {
                    return false;
                }
                
                // Apenas atividades de inventário
                if (atividade.categoria !== 'inventario') {
                    return false;
                }
                
                const itemNormalizado = atividade.item.toLowerCase();
                const displayName = (atividade.displayName || '').toLowerCase();
                
                // Excluir plantas depositadas (workers plantam, não retiram plantas)
                const ehPlanta = plantasExcluir.some(planta => 
                    itemNormalizado.includes(planta) || displayName.includes(planta)
                );
                
                if (ehPlanta && atividade.tipo === 'adicionar') {
                    return false; // Workers plantam (adicionar), não retiram plantas
                }
                
                // Excluir animais entregues (workers entregam, não retiram animais)
                const ehAnimal = animaisExcluir.some(animal => 
                    itemNormalizado.includes(animal) || displayName.includes(animal)
                );
                
                if (ehAnimal && atividade.tipo === 'adicionar') {
                    return false; // Workers entregam (adicionar), não retiram animais
                }
                
                // Incluir apenas atividades de retirada de materiais ou retorno de itens
                // (ferramentas, equipamentos, materiais de trabalho, etc.)
                return true;
            });
        } catch (error) {
            logger.error('Erro ao filtrar atividades do trabalhador:', error);
            return atividades; // Retornar todas se houver erro
        }
    }
    
    /**
     * Obter ranking de performance de todos os usuários
     * @returns {Array} Lista de usuários ordenada por performance
     */
    obterRankingPerformance() {
        try {
            const usuarios = Object.keys(this.usuarios.usuarios);
            const ranking = [];
            
            for (const userId of usuarios) {
                const performance = this.obterPerformanceUsuario(userId);
                const dadosUsuario = this.usuarios.usuarios[userId];
                
                // Calcular eficiência do usuário
                const eficiencia = this.calcularEficienciaUsuario(performance);
                
                ranking.push({
                    ...performance,
                    nome: dadosUsuario.nome,
                    funcao: dadosUsuario.funcao,
                    ativo: dadosUsuario.ativo,
                    eficiencia: eficiencia,
                    ranking_categoria: this.determinarCategoriaRanking(eficiencia, dadosUsuario.funcao)
                });
            }
            
            // Ordenar por eficiência (mais eficiente primeiro)
            ranking.sort((a, b) => b.eficiencia.pontuacao_total - a.eficiencia.pontuacao_total);
            
            return ranking;
        } catch (error) {
            logger.error('Erro ao obter ranking de performance:', error);
            return [];
        }
    }
    
    /**
     * Calcular eficiência de um usuário baseado em múltiplos fatores
     * @param {object} performance - Dados de performance do usuário
     * @returns {object} Métricas de eficiência
     */
    calcularEficienciaUsuario(performance) {
        try {
            const servicos = performance.servicos || {};
            
            // Pontuação por ganhos totais (40% do peso)
            const pontuacaoGanhos = (servicos.total_ganhos || 0) * 4;
            
            // Pontuação por volume de plantação (25% do peso)
            const totalPlantas = servicos.plantacao?.total_plantas || 0;
            const pontuacaoPlantacao = totalPlantas * 0.25;
            
            // Pontuação por entregas de animais (25% do peso)
            const totalEntregasAnimais = servicos.animais?.total_entregas || 0;
            const pontuacaoAnimais = totalEntregasAnimais * 25;
            
            // Pontuação por consistência (atividades hoje vs total) (10% do peso)
            const totalAtividades = performance.total_atividades || 1;
            const atividadesHoje = performance.atividades_hoje || 0;
            const consistencia = (atividadesHoje / totalAtividades) * 100;
            const pontuacaoConsistencia = consistencia * 1;
            
            // Pontuação total
            const pontuacaoTotal = pontuacaoGanhos + pontuacaoPlantacao + pontuacaoAnimais + pontuacaoConsistencia;
            
            // Métricas por categoria
            const eficienciaPlantacao = totalPlantas > 0 ? 
                Math.round((servicos.plantacao?.valor_total || 0) / totalPlantas * 100) / 100 : 0;
            
            const eficienciaAnimais = totalEntregasAnimais > 0 ?
                Math.round((servicos.animais?.valor_total || 0) / totalEntregasAnimais * 100) / 100 : 0;
            
            return {
                pontuacao_total: Math.round(pontuacaoTotal * 100) / 100,
                ganhos_peso: Math.round(pontuacaoGanhos * 100) / 100,
                plantacao_peso: Math.round(pontuacaoPlantacao * 100) / 100,
                animais_peso: Math.round(pontuacaoAnimais * 100) / 100,
                consistencia_peso: Math.round(pontuacaoConsistencia * 100) / 100,
                eficiencia_plantacao: eficienciaPlantacao,
                eficiencia_animais: eficienciaAnimais,
                consistencia_percentual: Math.round(consistencia * 100) / 100,
                especialidade: this.determinarEspecialidade(servicos)
            };
        } catch (error) {
            logger.error('Erro ao calcular eficiência do usuário:', error);
            return {
                pontuacao_total: 0,
                ganhos_peso: 0,
                plantacao_peso: 0,
                animais_peso: 0,
                consistencia_peso: 0,
                eficiencia_plantacao: 0,
                eficiencia_animais: 0,
                consistencia_percentual: 0,
                especialidade: 'indefinido'
            };
        }
    }
    
    /**
     * Determinar especialidade do usuário baseado nos serviços
     * @param {object} servicos - Serviços do usuário
     * @returns {string} Especialidade
     */
    determinarEspecialidade(servicos) {
        const plantacao = servicos.plantacao?.valor_total || 0;
        const animais = servicos.animais?.valor_total || 0;
        
        if (plantacao === 0 && animais === 0) return 'iniciante';
        if (plantacao > animais * 2) return 'especialista_plantacao';
        if (animais > plantacao * 2) return 'especialista_animais';
        return 'generalista';
    }
    
    /**
     * Determinar categoria de ranking baseado na pontuação
     * @param {object} eficiencia - Métricas de eficiência
     * @returns {string} Categoria do ranking
     */
    determinarCategoriaRanking(eficiencia, funcao = null) {
        // Managers get special category regardless of performance
        if (funcao === 'gerente') {
            return 'gerente';
        }
        
        const pontuacao = eficiencia.pontuacao_total;
        
        if (pontuacao >= 500) return 'elite';
        if (pontuacao >= 300) return 'avancado';
        if (pontuacao >= 150) return 'intermediario';
        if (pontuacao >= 50) return 'iniciante';
        return 'novato';
    }
    
    /**
     * Retornar serviço de plantação vazio
     */
    getEmptyPlantationService() {
        return {
            tipo_servico: 'plantacao',
            total_plantas_015: 0,
            total_plantas_020: 0,
            total_plantas: 0,
            valor_total_015: 0,
            valor_total_020: 0,
            valor_total: 0,
            detalhes: [],
            detalhes_por_item: {}
        };
    }

    /**
     * Calcula ganhos de plantação para um usuário
     * @param {string} userId - ID do usuário
     * @returns {object} Ganhos de plantação
     */
    calcularGanhosPlantacao(userId) {
        try {
            const atividades = this.atividades.atividades_recentes || [];
            
            // Get user data for matching
            const userData = this.usuarios.usuarios[userId];
            if (!userData) {
                return this.getEmptyPlantationService();
            }
            
            // CRITICAL: Exclude managers from service payments - they have different compensation
            if (userData.funcao === 'gerente') {
                logger.info(`User ${userId} is a manager - excluding from plantation service payments`);
                return this.getEmptyPlantationService();
            }
            
            const atividadesUsuario = atividades.filter(a => {
                // Include both 'adicionar' (deposits) and 'remover' (withdrawals) for plantation services
                if (!a.autor || (a.tipo !== 'adicionar' && a.tipo !== 'remover')) return false;
                
                // Extract clean name and FIXO from author
                const autorLimpo = a.autor.split(' | ')[0].toLowerCase().trim();
                const fixoMatch = a.autor.match(/FIXO:\s*(\d+)/);
                const autorFixo = fixoMatch ? fixoMatch[1] : null;
                
                // Improved matching logic (same as obterPerformanceUsuario)
                const userNameLimpo = userData.nome.toLowerCase().trim();
                let isMatch = false;
                
                // 1. Try direct user ID match (for manually added activities)
                if (a.autor === userId) {
                    isMatch = true;
                }
                
                // 2. Try FIXO ID match
                if (!isMatch && userData.fixo_id && autorFixo) {
                    isMatch = autorFixo === userData.fixo_id;
                }
                
                // 3. Try exact name match
                if (!isMatch) {
                    isMatch = autorLimpo === userNameLimpo;
                }
                
                // 3. Try partial name matching for imported data
                if (!isMatch && autorLimpo.length > 0 && userNameLimpo.length > 0) {
                    const autorWords = autorLimpo.split(' ').filter(w => w.length > 2);
                    const userWords = userNameLimpo.split(' ').filter(w => w.length > 2);
                    
                    const commonWords = autorWords.filter(word => userWords.some(uWord => 
                        uWord.includes(word) || word.includes(uWord)
                    ));
                    
                    isMatch = commonWords.length >= Math.min(autorWords.length, userWords.length, 2) ||
                             autorLimpo.includes(userNameLimpo) || 
                             userNameLimpo.includes(autorLimpo);
                }
                
                return isMatch;
            });
            
            let totalPlantas015 = 0;
            let totalPlantas020 = 0;
            let detalhes = [];
            let detalhesPorItem = {};
            
            // Plant arrays no longer needed - using ItemNormalizer now
            
            for (const atividade of atividadesUsuario) {
                // Get item category from inventory if available
                const itemData = this.inventario.itens[atividade.item];
                const itemCategory = itemData ? itemData.categoria : null;
                
                const plantType = ItemNormalizer.identifyPlantType(atividade.item, itemCategory);
                
                if (plantType.isPlant) {
                    const quantidade = atividade.quantidade || 0;
                    const valorUnitario = plantType.price;
                    const valorTotal = quantidade * valorUnitario;
                    const isPago = atividade.pago === true;
                    
                    // Get proper display name using custom names first
                    const tipoPlanta = this.obterMelhorNomeExibicao(atividade.item);
                    
                    // Agrupar por tipo de planta
                    if (!detalhesPorItem[tipoPlanta]) {
                        detalhesPorItem[tipoPlanta] = {
                            nome: tipoPlanta,
                            quantidade_total: 0,
                            valor_unitario: valorUnitario,
                            valor_total: 0,
                            transacoes: []
                        };
                    }
                    
                    // Only add to totals if not paid
                    if (!isPago) {
                        detalhesPorItem[tipoPlanta].quantidade_total += quantidade;
                        detalhesPorItem[tipoPlanta].valor_total += valorTotal;
                        
                        if (plantType.category === 'main_crop') {
                            totalPlantas015 += quantidade;
                        } else {
                            totalPlantas020 += quantidade;
                        }
                    }
                    
                    // Always add to transaction list (paid or unpaid)
                    detalhesPorItem[tipoPlanta].transacoes.push({
                        quantidade: quantidade,
                        valor: valorTotal,
                        timestamp: atividade.timestamp,
                        id_atividade: atividade.id,
                        pago: isPago,
                        data_pagamento: atividade.data_pagamento
                    });
                    
                    // Always add to details list (paid or unpaid)
                    detalhes.push({
                        item: tipoPlanta,
                        quantidade: quantidade,
                        valor_unitario: valorUnitario,
                        valor_total: valorTotal,
                        timestamp: atividade.timestamp,
                        id_atividade: atividade.id,
                        tipo: plantType.category === 'main_crop' ? 'planta_015' : 'planta_020',
                        pago: isPago,
                        data_pagamento: atividade.data_pagamento
                    });
                }
            }
            
            const valorTotal015 = Math.round(totalPlantas015 * 0.15 * 100) / 100;
            const valorTotal020 = Math.round(totalPlantas020 * 0.20 * 100) / 100;
            const valorTotal = valorTotal015 + valorTotal020;
            
            return {
                tipo_servico: 'plantacao',
                total_plantas_015: totalPlantas015,
                total_plantas_020: totalPlantas020,
                total_plantas: totalPlantas015 + totalPlantas020,
                valor_total_015: valorTotal015,
                valor_total_020: valorTotal020,
                valor_total: valorTotal,
                detalhes: detalhes,
                detalhes_por_item: detalhesPorItem
            };
        } catch (error) {
            logger.error('Erro ao calcular ganhos de plantação:', error);
            return {
                tipo_servico: 'plantacao',
                total_plantas_015: 0,
                total_plantas_020: 0,
                total_plantas: 0,
                valor_total_015: 0,
                valor_total_020: 0,
                valor_total: 0,
                detalhes: [],
                detalhes_por_item: {}
            };
        }
    }
    
    /**
     * Retornar serviço de animais vazio
     */
    getEmptyAnimalService() {
        return {
            tipo_servico: 'animais',
            total_entregas: 0,
            valor_total: 0,
            detalhes: []
        };
    }

    /**
     * Calcula ganhos de entrega de animais para um usuário
     * @param {string} userId - ID do usuário
     * @returns {object} Ganhos de animais
     */
    calcularGanhosAnimais(userId) {
        try {
            console.log(`🐄 [ANIMAL] Starting animal calculation for user: ${userId}`);
            const atividades = this.atividades.atividades_recentes || [];
            
            // Get user data for matching
            const userData = this.usuarios.usuarios[userId];
            if (!userData) {
                console.log(`❌ [ANIMAL] User ${userId} not found in usuarios data`);
                return this.getEmptyAnimalService();
            }
            
            console.log(`👤 [ANIMAL] User data:`, {
                nome: userData.nome,
                funcao: userData.funcao,
                fixo_id: userData.fixo_id
            });
            
            // CRITICAL: Exclude managers from service payments - they have different compensation
            if (userData.funcao === 'gerente') {
                console.log(`🚫 [ANIMAL] User ${userId} is a manager - excluding from animal service payments`);
                logger.info(`User ${userId} is a manager - excluding from animal service payments`);
                return this.getEmptyAnimalService();
            }
            
            // Find ALL deposits by this user - ANY deposit by a worker is an animal delivery
            const entregasAnimais = atividades.filter(a => {
                if (!a.autor || a.tipo !== 'deposito' || a.categoria !== 'financeiro') return false;
                // ANY deposit amount is valid - animals can be sold at different ages
                
                // Extract clean name and FIXO from author
                const autorLimpo = a.autor.split(' | ')[0].toLowerCase().trim();
                const fixoMatch = a.autor.match(/FIXO:\s*(\d+)/);
                const autorFixo = fixoMatch ? fixoMatch[1] : null;
                
                // Improved matching logic (same as obterPerformanceUsuario)
                const userNameLimpo = userData.nome.toLowerCase().trim();
                let isMatch = false;
                
                // 1. Try direct user ID match (for manually added activities)
                if (a.autor === userId) {
                    isMatch = true;
                }
                
                // 2. Try FIXO ID match
                if (!isMatch && userData.fixo_id && autorFixo) {
                    isMatch = autorFixo === userData.fixo_id;
                }
                
                // 3. Try exact name match
                if (!isMatch) {
                    isMatch = autorLimpo === userNameLimpo;
                }
                
                // 4. Try partial name matching for imported data
                if (!isMatch && autorLimpo.length > 0 && userNameLimpo.length > 0) {
                    const autorWords = autorLimpo.split(' ').filter(w => w.length > 2);
                    const userWords = userNameLimpo.split(' ').filter(w => w.length > 2);
                    
                    const commonWords = autorWords.filter(word => userWords.some(uWord => 
                        uWord.includes(word) || word.includes(uWord)
                    ));
                    
                    isMatch = commonWords.length >= Math.min(autorWords.length, userWords.length, 2) ||
                             autorLimpo.includes(userNameLimpo) || 
                             userNameLimpo.includes(autorLimpo);
                }
                
                return isMatch;
            });
            
            console.log(`🔍 [ANIMAL] Found ${entregasAnimais.length} potential animal deposits for ${userData.nome}:`, 
                entregasAnimais.map(a => ({
                    autor: a.autor,
                    valor: a.valor,
                    timestamp: a.timestamp,
                    pago: a.pago
                })));
            
            // Remove only exact duplicate timestamps (Discord log duplicates)
            const uniqueDeposits = [];
            const sortedDeposits = entregasAnimais.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            
            for (const deposit of sortedDeposits) {
                // Only remove if timestamp is exactly the same (to the second)
                const isDuplicate = uniqueDeposits.some(existing => {
                    return existing.timestamp === deposit.timestamp;
                });
                
                if (!isDuplicate) {
                    uniqueDeposits.push(deposit);
                } else {
                    console.log(`📌 [ANIMALS] User ${userId}: Exact duplicate timestamp removed - ${deposit.timestamp}`);
                }
            }
            
            console.log(`🐄 [ANIMALS] User ${userId}: Found ${entregasAnimais.length} deposits, ${uniqueDeposits.length} unique deliveries`);
            
            // Build delivery details from unique deposits with inventory tracking
            const detalhes = uniqueDeposits.map(entrega => {
                const valorDeposito = entrega.valor;
                const isPago = entrega.pago === true;
                
                // Calculate worker payment based on standard delivery
                // Standard delivery should ALWAYS be $160 deposit
                // Worker payment is $60 per complete delivery
                const expectedDeposit = 160;
                const standardWorkerPayment = 60;
                
                let pagamentoWorker = 0;
                
                if (valorDeposito >= expectedDeposit) {
                    // Complete delivery - pay standard rate
                    pagamentoWorker = standardWorkerPayment;
                } else {
                    // Incomplete/early delivery - proportional payment
                    pagamentoWorker = (valorDeposito / expectedDeposit) * standardWorkerPayment;
                }
                
                // Round to 2 decimal places
                pagamentoWorker = Math.round(pagamentoWorker * 100) / 100;
                
                // Determine status and problems
                let status = 'completa';
                let problemas = [];
                
                if (valorDeposito < expectedDeposit) {
                    status = 'incompleta';
                    problemas.push(`Early delivery - received $${valorDeposito} instead of $${expectedDeposit}`);
                    problemas.push(`Payment reduced to $${pagamentoWorker.toFixed(2)}`);
                } else if (valorDeposito > expectedDeposit) {
                    problemas.push(`Over-delivery - received $${valorDeposito} (bonus: $${valorDeposito - expectedDeposit})`);
                }
                
                // Find related inventory withdrawals and returns for THIS specific delivery
                const depositTime = new Date(entrega.timestamp);
                
                // For the first delivery, use 2 hours before
                // For subsequent deliveries, start from the previous delivery time
                const previousDelivery = uniqueDeposits[uniqueDeposits.indexOf(entrega) - 1];
                const windowStart = previousDelivery ? 
                    new Date(Math.max(
                        new Date(previousDelivery.timestamp).getTime(),
                        depositTime.getTime() - (2 * 60 * 60 * 1000)
                    )) : 
                    new Date(depositTime.getTime() - (2 * 60 * 60 * 1000));
                    
                const windowEnd = new Date(depositTime.getTime() + (30 * 60 * 1000)); // 30 min after delivery (for returns)
                
                // Get all user activities for matching withdrawals AND returns
                const userWithdrawalActivities = atividades.filter(a => {
                    if (!a.autor || a.tipo !== 'remover') return false;
                    const aTime = new Date(a.timestamp);
                    return aTime >= windowStart && aTime <= depositTime; // Only before delivery
                });
                
                const userReturnActivities = atividades.filter(a => {
                    if (!a.autor || a.tipo !== 'adicionar') return false;
                    const aTime = new Date(a.timestamp);
                    return aTime >= windowStart && aTime <= windowEnd; // Before and after delivery
                });
                
                // Filter for this specific user (withdrawals)
                const userWithdrawals = userWithdrawalActivities.filter(a => {
                    const autorLimpo = a.autor.split(' | ')[0].toLowerCase().trim();
                    const fixoMatch = a.autor.match(/FIXO:\s*(\d+)/);
                    const autorFixo = fixoMatch ? fixoMatch[1] : null;
                    const userNameLimpo = userData.nome.toLowerCase().trim();
                    
                    return (userData.fixo_id && autorFixo && autorFixo === userData.fixo_id) ||
                           autorLimpo === userNameLimpo;
                });
                
                // Filter for this specific user (returns)
                const userReturns = userReturnActivities.filter(a => {
                    const autorLimpo = a.autor.split(' | ')[0].toLowerCase().trim();
                    const fixoMatch = a.autor.match(/FIXO:\s*(\d+)/);
                    const autorFixo = fixoMatch ? fixoMatch[1] : null;
                    const userNameLimpo = userData.nome.toLowerCase().trim();
                    
                    return (userData.fixo_id && autorFixo && autorFixo === userData.fixo_id) ||
                           autorLimpo === userNameLimpo;
                });
                
                // Animal types and feed types
                const animalTypes = ['carneiro', 'ovelha', 'bode', 'cabra', 'galo', 'galinha', 'mane_chicken', 
                                   'porco', 'porca', 'vaca', 'touro', 'mula', 'burro', 'sheep_male', 'sheep_female', 
                                   'pig_male', 'cow_male', 'cow_female', 'chicken_male', 'chicken_female', 
                                   'donkey_male', 'donkey_female', 'sheep', 'pig', 'cow', 'chicken', 'donkey'];
                                   
                const feedTypes = ['racao', 'common_portion', 'racao_de_galinha', 'racao_de_mula', 'racao_de_porco',
                                 'common_portion_sheep', 'common_portion_pig', 'common_portion_cow', 
                                 'common_portion_chicken', 'common_portion_donkey', 'common_portion_goat'];
                
                // Extract animal and feed withdrawals (feed takes priority to avoid duplicates)
                const feedWithdrawals = userWithdrawals.filter(w => 
                    feedTypes.some(feed => w.item?.toLowerCase().includes(feed))
                );
                
                const animalWithdrawals = userWithdrawals.filter(w => {
                    // Skip if it's already identified as feed
                    const isFeed = feedTypes.some(feed => w.item?.toLowerCase().includes(feed));
                    if (isFeed) return false;
                    
                    // Check if it's an animal
                    return animalTypes.some(animal => w.item?.toLowerCase().includes(animal));
                });
                
                // Separate returns into animals and feed
                const animalReturns = userReturns.filter(w => {
                    const isFeed = feedTypes.some(feed => w.item?.toLowerCase().includes(feed));
                    if (isFeed) return false;
                    return animalTypes.some(animal => w.item?.toLowerCase().includes(animal));
                });
                
                const feedReturns = userReturns.filter(w => 
                    feedTypes.some(feed => w.item?.toLowerCase().includes(feed))
                );
                
                // Calculate totals
                const totalAnimaisRetirados = animalWithdrawals.reduce((sum, w) => sum + (w.quantidade || 0), 0);
                const totalRacaoRetirado = feedWithdrawals.reduce((sum, w) => sum + (w.quantidade || 0), 0);
                const totalAnimaisDevolvidos = animalReturns.reduce((sum, w) => sum + (w.quantidade || 0), 0);
                const totalRacaoDevolvido = feedReturns.reduce((sum, w) => sum + (w.quantidade || 0), 0);
                
                // Analyze withdrawal patterns accounting for returns
                const animaisNetRetirados = totalAnimaisRetirados - totalAnimaisDevolvidos;
                const racaoNetRetirado = totalRacaoRetirado - totalRacaoDevolvido;
                
                const excessoAnimais = Math.max(0, animaisNetRetirados - 4);
                const excessoRacao = Math.max(0, racaoNetRetirado - 8);
                const deficitAnimais = Math.max(0, 4 - animaisNetRetirados);
                const deficitRacao = Math.max(0, 8 - racaoNetRetirado);
                
                // Detect suspicious patterns and account for returns
                if (animaisNetRetirados === 0 && racaoNetRetirado === 0) {
                    problemas.push(`🚨 SUSPEITO: Entrega sem retirada de animais/ração (possível roubo de animais prontos)`);
                    status = 'suspeita';
                } else if (deficitAnimais > 0 || deficitRacao > 0) {
                    if (deficitAnimais > 0) {
                        problemas.push(`⚠️ Deficit: Faltam ${deficitAnimais} animais líquidos para entrega completa`);
                    }
                    if (deficitRacao > 0) {
                        problemas.push(`⚠️ Deficit: Faltam ${deficitRacao} rações líquidas para entrega completa`);
                    }
                } else if (excessoAnimais > 0 || excessoRacao > 0) {
                    if (excessoAnimais > 0) {
                        const returnedAnimals = totalAnimaisDevolvidos > 0 ? ` (devolveu ${totalAnimaisDevolvidos})` : '';
                        problemas.push(`📋 Excesso: ${excessoAnimais} animais extras não devolvidos${returnedAnimals}`);
                    }
                    if (excessoRacao > 0) {
                        const returnedFeed = totalRacaoDevolvido > 0 ? ` (devolveu ${totalRacaoDevolvido})` : '';
                        problemas.push(`📋 Excesso: ${excessoRacao} rações extras não devolvidas${returnedFeed}`);
                    }
                } else if (totalAnimaisDevolvidos > 0 || totalRacaoDevolvido > 0) {
                    // Worker properly returned excess items
                    problemas.push(`✅ Devolução: Trabalhador devolveu corretamente os excesso ao estoque`);
                }
                
                // Calculate honesty score accounting for returns
                let honestyScore = 100;
                if (animaisNetRetirados === 0 && racaoNetRetirado === 0) {
                    honestyScore = 0; // Very suspicious
                } else if (deficitAnimais > 0 || deficitRacao > 0) {
                    honestyScore = Math.max(20, 100 - ((deficitAnimais + deficitRacao) * 10));
                } else if (excessoAnimais > 0 || excessoRacao > 0) {
                    honestyScore = Math.max(60, 100 - ((excessoAnimais + excessoRacao) * 5));
                } else if (totalAnimaisDevolvidos > 0 || totalRacaoDevolvido > 0) {
                    honestyScore = 100; // Perfect - returned excess properly
                }
                
                return {
                    timestamp: entrega.timestamp,
                    valor_fazenda: valorDeposito,
                    pagamento_worker: pagamentoWorker,
                    status: status,
                    honesty_score: honestyScore,
                    deficit_animais: deficitAnimais,
                    deficit_racao: deficitRacao,
                    excesso_animais: excessoAnimais,
                    excesso_racao: excessoRacao,
                    pago: isPago,
                    data_pagamento: entrega.data_pagamento,
                    id_atividade: entrega.id,
                    // Inventory tracking
                    animais_retirados: animalWithdrawals.map(w => ({
                        item: w.item,
                        quantidade: w.quantidade,
                        timestamp: w.timestamp,
                        displayName: this.obterNomeCustomizado(w.item) || w.displayName || w.item
                    })),
                    racao_retirado: feedWithdrawals.map(w => ({
                        item: w.item,
                        quantidade: w.quantidade,
                        timestamp: w.timestamp,
                        displayName: this.obterNomeCustomizado(w.item) || w.displayName || w.item
                    })),
                    animais_devolvidos: animalReturns.map(w => ({
                        item: w.item,
                        quantidade: w.quantidade,
                        timestamp: w.timestamp,
                        displayName: this.obterNomeCustomizado(w.item) || w.displayName || w.item
                    })),
                    racao_devolvido: feedReturns.map(w => ({
                        item: w.item,
                        quantidade: w.quantidade,
                        timestamp: w.timestamp,
                        displayName: this.obterNomeCustomizado(w.item) || w.displayName || w.item
                    })),
                    total_animais_retirados: totalAnimaisRetirados,
                    total_racao_retirado: totalRacaoRetirado,
                    total_animais_devolvidos: totalAnimaisDevolvidos,
                    total_racao_devolvido: totalRacaoDevolvido,
                    animais_net_retirados: animaisNetRetirados,
                    racao_net_retirado: racaoNetRetirado,
                    excesso_animais: excessoAnimais,
                    excesso_racao: excessoRacao,
                    problemas: problemas,
                    // Standard delivery expectation
                    esperado: {
                        animais: 4,
                        racao: 8,
                        deposito: expectedDeposit
                    },
                    // Financial summary
                    custos: {
                        animais: 80, // 4 * $20
                        racao: 12,   // 8 * $1.50
                        worker: Math.max(0, pagamentoWorker), // Only positive payments count as costs
                        total: 92 + Math.max(0, pagamentoWorker) // $80 animals + $12 feed
                    },
                    receita_total: valorDeposito,
                    lucro_fazenda: valorDeposito - 92 - pagamentoWorker, // Farm profit after all costs
                    worker_payment: pagamentoWorker
                };
            });
            
            // Calculate totals (only unpaid deliveries)
            const entregasNaoPagas = detalhes.filter(d => !d.pago);
            
            console.log(`🐄 [ANIMALS] User ${userId}: ${detalhes.length} deliveries, ${entregasNaoPagas.length} unpaid`);
            if (detalhes.length > 1) {
                console.log(`📊 [ANIMALS] Delivery attribution check:`);
                detalhes.slice(0, 2).forEach((d, i) => {
                    console.log(`  Delivery ${i+1} (${d.timestamp.slice(11, 19)}): ${d.animais_retirados.length + d.racao_retirado.length} withdrawals, ${d.animais_devolvidos.length + d.racao_devolvido.length} returns`);
                });
            }
            const valorTotal = entregasNaoPagas.reduce((sum, d) => sum + d.pagamento_worker, 0);
            const totalDepositos = detalhes.reduce((sum, d) => sum + d.valor_fazenda, 0);
            
            return {
                tipo_servico: 'animais',
                total_entregas: entregasNaoPagas.length,
                valor_total: Math.round(valorTotal * 100) / 100,
                total_depositos: Math.round(totalDepositos * 100) / 100,
                todas_entregas: detalhes.length,
                detalhes: detalhes
            };
        } catch (error) {
            logger.error('Erro ao calcular ganhos de animais:', error);
            return {
                tipo_servico: 'animais',
                total_entregas: 0,
                valor_total: 0,
                detalhes: []
            };
        }
    }
    
    /**
     * Gera recibo formatado para Discord
     * @param {string} userId - ID do usuário
     * @param {string} tipoServico - Tipo de serviço
     * @param {number} valor - Valor pago
     * @param {Array} detalhes - Detalhes do pagamento
     * @returns {string} Recibo formatado para Discord
     */
    gerarReciboDiscord(userId, tipoServico, valor, detalhes = []) {
        try {
            const usuario = this.usuarios.usuarios[userId];
            const nomeUsuario = usuario?.nome || userId;
            const timestamp = moment().format('DD/MM/YYYY HH:mm:ss');
            
            // Format service type
            const tipoFormatado = {
                'plantacao': '🌾 Plantação',
                'plantacao_individual': '🌱 Plantação (Individual)',
                'animais': '🐄 Animais',
                'animais_individual': '🐮 Animais (Individual)',
                'todos': '📦 Todos os Serviços'
            }[tipoServico] || tipoServico;
            
            // Build receipt header
            let receipt = '```\n';
            receipt += '╔════════════════════════════════════════╗\n';
            receipt += '║        RECIBO DE PAGAMENTO             ║\n';
            receipt += '╠════════════════════════════════════════╣\n';
            receipt += `║ Data: ${timestamp}          ║\n`;
            receipt += `║ Trabalhador: ${nomeUsuario.padEnd(26)}║\n`;
            receipt += `║ Serviço: ${tipoFormatado.padEnd(30)}║\n`;
            receipt += '╠════════════════════════════════════════╣\n';
            
            // Add service details
            if (detalhes && detalhes.length > 0) {
                receipt += '║ DETALHES:                              ║\n';
                
                // Handle combined payment (todos)
                if (tipoServico === 'todos') {
                    // Get detailed service data for this user
                    const performance = this.obterPerformanceUsuario(userId);
                    const servicos = performance.servicos;
                    
                    // Add detailed plant summary
                    if (servicos.plantacao && servicos.plantacao.valor_total > 0) {
                        receipt += '║ 🌾 PLANTAÇÃO:                          ║\n';
                        
                        // Seeds taken and plants returned breakdown
                        const seedsSummary = {};
                        const plantsSummary = {};
                        
                        // Collect detailed transactions with timestamps
                        const seedTransactions = [];
                        const plantTransactions = [];
                        
                        servicos.plantacao.detalhes.forEach(d => {
                            
                            const timestamp = d.timestamp ? 
                                moment(d.timestamp).format('DD/MM HH:mm') : 
                                '-- / --';
                            
                            // Check different possible structures
                            if (d.tipo === 'seed' || (d.item && d.item.includes('seed'))) {
                                // Seeds taken
                                const seedName = this.obterMelhorNomeExibicao(d.item) || d.planta || d.item || 'unknown';
                                seedTransactions.push({
                                    timestamp,
                                    name: seedName,
                                    quantity: d.quantidade || 0
                                });
                                if (!seedsSummary[seedName]) seedsSummary[seedName] = 0;
                                seedsSummary[seedName] += d.quantidade || 0;
                            } else if (d.tipo === 'plant' || (d.item && !d.item.includes('seed'))) {
                                // Plants returned
                                const plantName = this.obterMelhorNomeExibicao(d.item) || d.planta || d.item || 'unknown';
                                plantTransactions.push({
                                    timestamp,
                                    name: plantName,
                                    quantity: d.quantidade || 0
                                });
                                if (!plantsSummary[plantName]) plantsSummary[plantName] = 0;
                                plantsSummary[plantName] += d.quantidade || 0;
                            }
                        });
                        
                        // Show seeds taken with timestamps
                        if (seedTransactions.length > 0) {
                            receipt += '║  Sementes Retiradas:                   ║\n';
                            seedTransactions.forEach(transaction => {
                                const line = `    ${transaction.timestamp} - ${transaction.name}: ${transaction.quantity}x`;
                                receipt += `║${line.padEnd(40)}║\n`;
                            });
                        }
                        
                        // Show plants returned with timestamps
                        if (plantTransactions.length > 0) {
                            receipt += '║  Plantas Retornadas:                   ║\n';
                            plantTransactions.forEach(transaction => {
                                const line = `    ${transaction.timestamp} - ${transaction.name}: ${transaction.quantity}x`;
                                receipt += `║${line.padEnd(40)}║\n`;
                            });
                        }
                        
                        receipt += `║  Valor Plantação: $${servicos.plantacao.valor_total.toFixed(2).padEnd(21)}║\n`;
                    }
                    
                    // Add detailed animal summary
                    if (servicos.animais && servicos.animais.valor_total > 0) {
                        receipt += '║ 🐄 ANIMAIS:                            ║\n';
                        
                        let totalAnimaisTaken = 0;
                        let totalRacaoTaken = 0;
                        let totalAnimaisDelivered = 0;
                        let totalDeliveries = 0;
                        
                        // Show individual deliveries with timestamps
                        if (servicos.animais.detalhes.length > 0) {
                            receipt += '║  Entregas Realizadas:                  ║\n';
                            
                            servicos.animais.detalhes.forEach(entrega => {
                                totalDeliveries++;
                                totalAnimaisDelivered += 4; // Standard 4 animals per delivery
                                
                                const timestamp = entrega.timestamp ? 
                                    moment(entrega.timestamp).format('DD/MM HH:mm') : 
                                    '-- / --';
                                const valorWorker = entrega.pagamento_worker || 60;
                                
                                // Get animal type from first animal withdrawn or default
                                let animalType = 'Animal';
                                if (entrega.animais_retirados && entrega.animais_retirados.length > 0) {
                                    animalType = this.obterMelhorNomeExibicao(entrega.animais_retirados[0].item) || 
                                                entrega.animais_retirados[0].displayName || 
                                                entrega.animais_retirados[0].item || 'Animal';
                                }
                                
                                const line = `    ${timestamp} - ${animalType}: 4x ($${valorWorker})`;
                                receipt += `║${line.padEnd(40)}║\n`;
                                
                                // Count animals and feed taken from inventory
                                if (entrega.animais_retirados) {
                                    totalAnimaisTaken += entrega.animais_retirados.reduce((sum, item) => sum + (item.quantidade || 0), 0);
                                }
                                if (entrega.racao_retirado) {
                                    totalRacaoTaken += entrega.racao_retirado.reduce((sum, item) => sum + (item.quantidade || 0), 0);
                                }
                            });
                            
                            // Summary section
                            receipt += '║  Inventário Utilizado:                 ║\n';
                            receipt += `║    Animais Retirados: ${totalAnimaisTaken.toString().padEnd(17)}║\n`;
                            receipt += `║    Ração Retirada: ${totalRacaoTaken.toString().padEnd(20)}║\n`;
                            receipt += `║  Total: ${totalDeliveries} entregas, ${totalAnimaisDelivered} animais${' '.padEnd(Math.max(0, 9 - totalDeliveries.toString().length - totalAnimaisDelivered.toString().length))}║\n`;
                        }
                        
                        receipt += `║  Valor Animais: $${servicos.animais.valor_total.toFixed(2).padEnd(23)}║\n`;
                    }
                    
                } else if (tipoServico.includes('plantacao')) {
                    // ONLY show plantation details for plantation payment
                    receipt += '║ 🌾 PLANTAÇÃO:                          ║\n';
                    
                    // Seeds taken and plants returned breakdown from payment details
                    const seedsSummary = {};
                    const plantsSummary = {};
                    
                    detalhes.forEach(d => {
                        if (d.tipo === 'seed') {
                            // Seeds taken
                            const seedName = d.planta || d.item || 'unknown';
                            if (!seedsSummary[seedName]) seedsSummary[seedName] = 0;
                            seedsSummary[seedName] += d.quantidade || 0;
                        } else if (d.tipo === 'plant') {
                            // Plants returned
                            const plantName = d.planta || d.item || 'unknown';
                            if (!plantsSummary[plantName]) plantsSummary[plantName] = 0;
                            plantsSummary[plantName] += d.quantidade || 0;
                        }
                    });
                    
                    // Show seeds taken
                    if (Object.keys(seedsSummary).length > 0) {
                        receipt += '║  Sementes Retiradas:                   ║\n';
                        Object.entries(seedsSummary).forEach(([seed, qty]) => {
                            const line = `    ${seed}: ${qty}x`;
                            receipt += `║${line.padEnd(40)}║\n`;
                        });
                    }
                    
                    // Show plants returned
                    if (Object.keys(plantsSummary).length > 0) {
                        receipt += '║  Plantas Retornadas:                   ║\n';
                        Object.entries(plantsSummary).forEach(([plant, qty]) => {
                            const line = `    ${plant}: ${qty}x`;
                            receipt += `║${line.padEnd(40)}║\n`;
                        });
                    }
                    
                } else if (tipoServico.includes('animais')) {
                    // ONLY show animal details for animal payment
                    receipt += '║ 🐄 ANIMAIS:                            ║\n';
                    
                    let totalAnimaisTaken = 0;
                    let totalRacaoTaken = 0;
                    let totalAnimaisDelivered = 0;
                    let totalDeliveries = detalhes.length;
                    
                    // Use ONLY the payment details, not all user performance data
                    detalhes.forEach(entrega => {
                        totalAnimaisDelivered += 4; // Standard 4 animals per delivery
                        
                        // Count animals and feed taken from inventory
                        if (entrega.inventario_retirado) {
                            entrega.inventario_retirado.forEach(item => {
                                if (item.tipo === 'animals') {
                                    totalAnimaisTaken += item.quantidade;
                                } else if (item.tipo === 'feed') {
                                    totalRacaoTaken += item.quantidade;
                                }
                            });
                        }
                    });
                    
                    receipt += `║  Animais Retirados: ${totalAnimaisTaken.toString().padEnd(19)}║\n`;
                    receipt += `║  Ração Retirada: ${totalRacaoTaken.toString().padEnd(22)}║\n`;
                    receipt += `║  Entregas Feitas: ${totalDeliveries.toString().padEnd(21)}║\n`;
                    receipt += `║  Animais Entregues: ${totalAnimaisDelivered.toString().padEnd(17)}║\n`;
                } else {
                    // Generic details
                    const totalItems = detalhes.length;
                    receipt += `║  Transações: ${totalItems.toString().padEnd(26)}║\n`;
                }
            }
            
            // Add payment summary
            receipt += '╠════════════════════════════════════════╣\n';
            receipt += `║ VALOR PAGO: $${valor.toFixed(2).padEnd(26)}║\n`;
            receipt += '╠════════════════════════════════════════╣\n';
            receipt += '║ ✅ Pagamento processado com sucesso    ║\n';
            receipt += '║ 📋 Registrado no sistema               ║\n';
            receipt += '╚════════════════════════════════════════╝\n';
            receipt += '```';
            
            return receipt;
            
        } catch (error) {
            console.error('Erro ao gerar recibo Discord:', error);
            // Return simple receipt on error
            return `\`\`\`\n💰 PAGAMENTO REALIZADO\nUsuário: ${userId}\nValor: $${valor.toFixed(2)}\nData: ${moment().format('DD/MM/YYYY HH:mm:ss')}\n\`\`\``;
        }
    }
    
    /**
     * Registra um pagamento para usuário
     * @param {string} userId - ID do usuário
     * @param {string} tipoServico - Tipo de serviço (plantacao/animais)
     * @param {number} valor - Valor do pagamento
     * @param {Array} detalhes - Detalhes das atividades pagas
     * @returns {boolean} Sucesso da operação
     */
    registrarPagamento(userId, tipoServico, valor, detalhes = []) {
        try {
            console.log(`💰 [PAYMENT] Registering payment for user ${userId}, service ${tipoServico}, value $${valor}`);
            
            // Create payment record
            const pagamento = {
                id: uuidv4(),
                usuario_id: userId,
                tipo_servico: tipoServico,
                valor: valor,
                detalhes: detalhes,
                timestamp: new Date().toISOString(),
                data_formatada: moment().format('DD/MM/YYYY, HH:mm:ss')
            };
            
            // Generate Discord receipt
            const receipt = this.gerarReciboDiscord(userId, tipoServico, valor, detalhes);
            pagamento.recibo_discord = receipt;
            
            // Add to payments array
            this.pagamentos.pagamentos.push(pagamento);
            
            // Save payments file
            const saved = this.salvarArquivoJson(this.pagamentosFile, this.pagamentos);
            if (!saved) {
                console.error('❌ [PAYMENT] Failed to save payment file');
                return null;
            }
            
            console.log(`✅ [PAYMENT] Payment record saved: ${pagamento.id}`);
            
            // Extract activity IDs from details to mark as paid
            const activityIds = [];
            
            if (tipoServico === 'plantacao' || tipoServico === 'plantacao_individual') {
                // For plantation services, extract activity IDs directly
                detalhes.forEach(detalhe => {
                    if (detalhe.id_atividade) {
                        activityIds.push(detalhe.id_atividade);
                    }
                });
            } else if (tipoServico === 'animais' || tipoServico === 'animais_individual') {
                // For animal services, extract from nested animal arrays
                detalhes.forEach(entrega => {
                    if (entrega.animais && Array.isArray(entrega.animais)) {
                        entrega.animais.forEach(animal => {
                            if (animal.id_atividade) {
                                activityIds.push(animal.id_atividade);
                            }
                        });
                    } else if (entrega.id_atividade) {
                        // For individual animal transactions
                        activityIds.push(entrega.id_atividade);
                    }
                });
            }
            
            console.log(`📋 [PAYMENT] Found ${activityIds.length} activities to mark as paid`);
            
            // Mark activities as paid
            if (activityIds.length > 0) {
                const marked = this.marcarAtividadesComoPagas(activityIds);
                console.log(`✅ [PAYMENT] Activities marked as paid: ${marked}`);
            }
            
            // Update totals
            this.pagamentos.total_pago = this.pagamentos.pagamentos.reduce((sum, p) => sum + p.valor, 0);
            this.pagamentos.ultima_atualizacao = new Date().toISOString();
            
            // Save updated totals
            this.salvarArquivoJson(this.pagamentosFile, this.pagamentos);
            
            // Emit update via WebSocket
            if (this.io) {
                this.io.emit('pagamento:registrado', {
                    usuario_id: userId,
                    tipo_servico: tipoServico,
                    valor: valor,
                    timestamp: pagamento.timestamp
                });
            }
            
            return pagamento;
        } catch (error) {
            console.error('❌ [PAYMENT] Error in registrarPagamento:', error);
            logger.error('Erro ao registrar pagamento:', error);
            return null;
        }
    }
    
    /**
     * Pagar todos os serviços pendentes de um usuário
     * @param {string} userId - ID do usuário
     * @returns {object} Resultado do pagamento
     */
    pagarTodosServicos(userId) {
        try {
            console.log(`🔄 [PAY_ALL] Starting payment for user: ${userId}`);
            const performance = this.obterPerformanceUsuario(userId);
            const servicos = performance.servicos;
            
            console.log(`📊 [PAY_ALL] Services data:`, {
                plantacao_valor: servicos?.plantacao?.valor_total || 0,
                animais_valor: servicos?.animais?.valor_total || 0,
                total_ganhos: servicos?.total_ganhos || 0,
                servicos_keys: Object.keys(servicos || {}),
                plantacao_exists: !!servicos?.plantacao,
                animais_exists: !!servicos?.animais,
                full_servicos: servicos
            });
            
            if (!servicos || servicos.total_ganhos <= 0) {
                return {
                    sucesso: false,
                    erro: 'Nenhum serviço pendente para pagamento'
                };
            }
            
            // Combine all services into one payment
            const todosDetalhes = [];
            const valorTotal = servicos.total_ganhos || 0;
            
            // Add plantation details
            if (servicos.plantacao && servicos.plantacao.valor_total > 0) {
                console.log(`🌾 [PAY_ALL] Adding ${servicos.plantacao.detalhes.length} plantation details`);
                todosDetalhes.push(...servicos.plantacao.detalhes);
            }
            
            // Add animal details
            if (servicos.animais && servicos.animais.valor_total > 0) {
                console.log(`🐄 [PAY_ALL] Adding ${servicos.animais.detalhes.length} animal details`);
                todosDetalhes.push(...servicos.animais.detalhes);
            }
            
            console.log(`📝 [PAY_ALL] Total details combined: ${todosDetalhes.length}`);
            
            // Register combined payment
            const pagamento = this.registrarPagamento(
                userId,
                'todos',
                valorTotal,
                todosDetalhes
            );
            
            if (pagamento) {
                // Mark all activities as paid
                const todasAtividades = [];
                
                // Plantation activities
                if (servicos.plantacao && servicos.plantacao.detalhes) {
                    const idsPlantacao = servicos.plantacao.detalhes
                        .map(detalhe => detalhe.id_atividade)
                        .filter(id => id);
                    todasAtividades.push(...idsPlantacao);
                }
                
                // Animal activities
                if (servicos.animais && servicos.animais.detalhes) {
                    const idsAnimais = servicos.animais.detalhes
                        .map(entrega => entrega.id_atividade)
                        .filter(id => id);
                    todasAtividades.push(...idsAnimais);
                }
                
                this.marcarAtividadesComoPagas(todasAtividades);
                
                return {
                    sucesso: true,
                    valor_total: Math.round(valorTotal * 100) / 100,
                    pagamentos: [
                        { tipo: 'plantacao', valor: servicos.plantacao?.valor_total || 0 },
                        { tipo: 'animais', valor: servicos.animais?.valor_total || 0 }
                    ],
                    recibo_discord: pagamento.recibo_discord
                };
            } else {
                return {
                    sucesso: false,
                    erro: 'Falha ao registrar pagamento'
                };
            }
        } catch (error) {
            logger.error('Erro ao pagar todos os serviços:', error);
            return {
                sucesso: false,
                erro: 'Erro interno ao processar pagamento'
            };
        }
    }
    
    /**
     * Pagar serviço específico
     * @param {string} userId - ID do usuário
     * @param {string} tipoServico - Tipo de serviço
     * @returns {object} Resultado do pagamento
     */
    pagarServicoEspecifico(userId, tipoServico) {
        console.log(`🚀 [PAYMENT METHOD] pagarServicoEspecifico called with userId: ${userId}, tipoServico: ${tipoServico}`);
        try {
            console.log(`💰 [PAYMENT] Starting payment for user ${userId}, service: ${tipoServico}`);
            
            const performance = this.obterPerformanceUsuario(userId);
            console.log(`📊 [PAYMENT] Performance data:`, {
                total_atividades: performance.total_atividades,
                servicos_keys: Object.keys(performance.servicos || {}),
                servicos_plantacao: performance.servicos?.plantacao,
                servicos_animais: performance.servicos?.animais
            });
            
            const servico = performance.servicos[tipoServico];
            console.log(`🔍 [PAYMENT] Service ${tipoServico} data:`, servico);
            
            if (!servico || servico.valor_total <= 0) {
                console.log(`❌ [PAYMENT] No valid service found:`, {
                    servico_exists: !!servico,
                    valor_total: servico?.valor_total,
                    available_services: Object.keys(performance.servicos || {})
                });
                return {
                    sucesso: false,
                    erro: `Nenhum serviço de ${tipoServico} pendente para pagamento`
                };
            }
            
            const pagamento = this.registrarPagamento(
                userId,
                tipoServico,
                servico.valor_total,
                servico.detalhes
            );
            
            console.log(`🔄 [PAYMENT] registrarPagamento returned:`, pagamento, typeof pagamento);
            
            if (pagamento) {
                // Mark all activities associated with this service as paid
                const idsAtividades = servico.detalhes.map(detalhe => detalhe.id_atividade).filter(id => id);
                console.log(`✅ [PAYMENT] Marking ${idsAtividades.length} activities as paid:`, idsAtividades);
                
                const markResult = this.marcarAtividadesComoPagas(idsAtividades);
                console.log(`🔄 [PAYMENT] Mark result: ${markResult}`);
                
                return {
                    sucesso: true,
                    valor_pago: servico.valor_total,
                    tipo_servico: tipoServico,
                    recibo_discord: pagamento.recibo_discord || null
                };
            } else {
                return {
                    sucesso: false,
                    erro: 'Falha ao registrar pagamento'
                };
            }
        } catch (error) {
            logger.error('Erro ao pagar serviço específico:', error);
            return {
                sucesso: false,
                erro: 'Erro interno ao processar pagamento'
            };
        }
    }
    
    /**
     * Obtém histórico de pagamentos
     * @param {string} userId - ID do usuário (opcional)
     * @returns {Array} Lista de pagamentos
     */
    obterHistoricoPagamentos(userId = null) {
        try {
            // FIXED: Handle case where pagamentos might not be initialized
            if (!this.pagamentos || !this.pagamentos.pagamentos || !Array.isArray(this.pagamentos.pagamentos)) {
                console.warn('⚠️ Pagamentos data not initialized or not an array');
                return [];
            }
            
            let pagamentos = [...this.pagamentos.pagamentos];
            
            if (userId) {
                pagamentos = pagamentos.filter(p => p.usuario_id === userId);
            }
            
            // Generate receipts for payments that don't have them
            pagamentos = pagamentos.map(p => {
                if (!p.recibo_discord && this.gerarReciboRetroativo) {
                    try {
                        p.recibo_discord = this.gerarReciboRetroativo(p);
                    } catch (receiptError) {
                        console.warn('⚠️ Failed to generate receipt for payment:', p.id, receiptError.message);
                    }
                }
                return p;
            });
            
            // Ordenar por mais recente primeiro
            pagamentos.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            return pagamentos;
        } catch (error) {
            console.error('❌ Erro ao obter histórico de pagamentos:', error);
            return [];
        }
    }
    
    /**
     * Gera recibo retroativo para pagamentos antigos
     * @param {Object} pagamento - Objeto de pagamento
     * @returns {string} Recibo formatado
     */
    gerarReciboRetroativo(pagamento) {
        try {
            const usuario = this.usuarios.usuarios[pagamento.usuario_id];
            const nomeUsuario = usuario?.nome || pagamento.usuario_id;
            const timestamp = pagamento.data_formatada || moment(pagamento.timestamp).format('DD/MM/YYYY HH:mm:ss');
            
            // Format service type
            const tipoFormatado = {
                'plantacao': '🌾 Plantação',
                'plantacao_individual': '🌱 Plantação (Individual)',
                'animais': '🐄 Animais',
                'animais_individual': '🐮 Animais (Individual)',
                'todos': '📦 Todos os Serviços'
            }[pagamento.tipo_servico] || pagamento.tipo_servico;
            
            // Build receipt
            let receipt = '```\n';
            receipt += '╔════════════════════════════════════════╗\n';
            receipt += '║        RECIBO DE PAGAMENTO             ║\n';
            receipt += '╠════════════════════════════════════════╣\n';
            receipt += `║ Data: ${timestamp}          ║\n`;
            receipt += `║ Trabalhador: ${nomeUsuario.padEnd(26)}║\n`;
            receipt += `║ Serviço: ${tipoFormatado.padEnd(30)}║\n`;
            receipt += '╠════════════════════════════════════════╣\n';
            
            // Add details if available
            if (pagamento.detalhes && pagamento.detalhes.length > 0) {
                receipt += '║ DETALHES:                              ║\n';
                const count = pagamento.detalhes.length;
                receipt += `║  Transações: ${count.toString().padEnd(26)}║\n`;
            }
            
            receipt += '╠════════════════════════════════════════╣\n';
            receipt += `║ VALOR PAGO: $${pagamento.valor.toFixed(2).padEnd(26)}║\n`;
            receipt += '╠════════════════════════════════════════╣\n';
            receipt += '║ ✅ Pagamento processado                ║\n';
            receipt += '║ 📋 Registro histórico                  ║\n';
            receipt += '╚════════════════════════════════════════╝\n';
            receipt += '```';
            
            return receipt;
            
        } catch (error) {
            console.error('Erro ao gerar recibo retroativo:', error);
            return `\`\`\`\n💰 PAGAMENTO HISTÓRICO\nUsuário: ${pagamento.usuario_id}\nValor: $${pagamento.valor}\nData: ${pagamento.timestamp}\n\`\`\``;
        }
    }
    
    /**
     * Salva recibos para pagamentos existentes
     */
    async atualizarRecibosHistoricos() {
        try {
            let updated = false;
            
            this.pagamentos.pagamentos = this.pagamentos.pagamentos.map(p => {
                if (!p.recibo_discord) {
                    p.recibo_discord = this.gerarReciboRetroativo(p);
                    updated = true;
                }
                return p;
            });
            
            if (updated) {
                this.salvarArquivoJson(this.pagamentosFile, this.pagamentos);
                console.log('✅ Recibos históricos atualizados');
            }
            
            return { sucesso: true, atualizados: updated };
        } catch (error) {
            console.error('Erro ao atualizar recibos históricos:', error);
            return { sucesso: false, erro: error.message };
        }
    }
    
    /**
     * Pagar transação individual
     * @param {string} userId - ID do usuário
     * @param {string} tipoServico - Tipo de serviço (plantacao/animais)
     * @param {string} idTransacao - ID da transação específica
     * @returns {object} Resultado do pagamento
     */
    pagarTransacaoIndividual(userId, tipoServico, idTransacao) {
        try {
            console.log(`💰 [INDIVIDUAL] Individual payment request: ${userId}, ${tipoServico}, ${idTransacao}`);
            const performance = this.obterPerformanceUsuario(userId);
            const servico = performance.servicos[tipoServico];
            
            console.log(`🔍 [INDIVIDUAL] Service found:`, {
                servico_exists: !!servico,
                detalhes_length: servico?.detalhes?.length || 0,
                servico_structure: servico ? Object.keys(servico) : []
            });
            
            if (!servico || !servico.detalhes) {
                return {
                    sucesso: false,
                    erro: 'Serviço não encontrado'
                };
            }
            
            // Find the specific transaction
            // For animal services: look for id_atividade directly
            // For plant services: look in nested animais array if it exists
            let transacao = null;
            
            if (tipoServico === 'animais') {
                // Animal services have direct id_atividade
                transacao = servico.detalhes.find(d => d.id_atividade === idTransacao);
                console.log(`🐄 [INDIVIDUAL] Animal transaction search: found = ${!!transacao}`);
            } else {
                // Plant services might have nested structure
                transacao = servico.detalhes.find(d => {
                    if (d.id_atividade === idTransacao) return true;
                    if (d.animais) {
                        return d.animais.some(a => a.id_atividade === idTransacao);
                    }
                    return false;
                });
                console.log(`🌾 [INDIVIDUAL] Plant transaction search: found = ${!!transacao}`);
            }
            
            if (!transacao) {
                console.log(`❌ [INDIVIDUAL] Transaction not found. Available IDs:`, 
                    servico.detalhes.map(d => d.id_atividade || 'no_id'));
                return {
                    sucesso: false,
                    erro: 'Transação não encontrada'
                };
            }
            
            // Calculate individual transaction value
            const valorTransacao = tipoServico === 'animais' ? 
                transacao.pagamento_worker : 
                (transacao.valor_total || 0);
            
            console.log(`💵 [INDIVIDUAL] Transaction value: $${valorTransacao}`);
            
            // Registrar pagamento individual
            const pagamento = this.registrarPagamento(
                userId,
                `${tipoServico}_individual`,
                valorTransacao,
                [transacao]
            );
            
            if (pagamento) {
                return {
                    sucesso: true,
                    valor_pago: transacao.valor_total,
                    tipo_servico: tipoServico,
                    transacao: transacao,
                    recibo_discord: pagamento.recibo_discord || null
                };
            } else {
                return {
                    sucesso: false,
                    erro: 'Falha ao registrar pagamento'
                };
            }
        } catch (error) {
            logger.error('Erro ao pagar transação individual:', error);
            return {
                sucesso: false,
                erro: 'Erro interno ao processar pagamento'
            };
        }
    }
    
    /**
     * Marcar atividades como pagas
     * @param {Array} idsAtividades - Lista de IDs de atividades pagas
     * @returns {boolean} Sucesso da operação
     */
    marcarAtividadesComoPagas(idsAtividades) {
        try {
            console.log(`🔄 [MARK PAID] Starting to mark ${idsAtividades?.length} activities as paid:`, idsAtividades);
            
            if (!Array.isArray(idsAtividades)) {
                console.log(`❌ [MARK PAID] Invalid input - not an array:`, idsAtividades);
                return false;
            }
            
            if (idsAtividades.length === 0) {
                console.log(`❌ [MARK PAID] No activities to mark`);
                return false;
            }
            
            // Marcar as atividades no histórico do Discord como pagas
            const atividades = this.atividades.atividades_recentes || [];
            console.log(`📊 [MARK PAID] Total activities available: ${atividades.length}`);
            
            let markedCount = 0;
            atividades.forEach(atividade => {
                if (idsAtividades.includes(atividade.id)) {
                    atividade.pago = true;
                    atividade.data_pagamento = new Date().toISOString();
                    markedCount++;
                    console.log(`✅ [MARK PAID] Marked activity: ${atividade.id} (${atividade.item})`);
                }
            });
            
            console.log(`📈 [MARK PAID] Successfully marked ${markedCount} activities as paid`);
            
            this.atividades.ultima_atualizacao = new Date().toISOString();
            // WARNING: atividades are now read-only from analyzed_data.json
            console.warn('⚠️ Attempted to save activities - now managed by bot pipeline');
            const saved = true; // this.salvarArquivoJson(this.atividadesFile, this.atividades);
            
            console.log(`💾 [MARK PAID] File save result: ${saved}`);
            return saved;
        } catch (error) {
            console.error('❌ [MARK PAID] Error marking activities as paid:', error);
            logger.error('Erro ao marcar atividades como pagas:', error);
            return false;
        }
    }

    /**
     * Sistema de Categorização de Itens para Controle de Abuso/Roubo
     */
    getItemCategory(itemName) {
        const itemLower = itemName.toLowerCase();
        
        // Service items (legitimate for paid work)
        const serviceItems = {
            // Animals for delivery service
            animals: [
                'vaca', 'cow_female', 'ovelha', 'sheep_female', 'cabra', 'goat_female',
                'porca', 'pig_female', 'mula', 'donkey_female', 'galinha', 'chicken_female',
                'touro', 'cow_male', 'carneiro', 'sheep_male', 'bode', 'goat_male',
                'porco', 'pig_male', 'burro', 'donkey_male', 'galo', 'chicken_male', 'mane_chicken'
            ],
            // Feed for animals
            feed: [
                'common_portion_sheep', 'common_portion_pig', 'common_portion_cow',
                'common_portion_chicken', 'common_portion_donkey', 'common_portion_goat',
                'common_portion', 'racao_de_galinha', 'racao_de_mula', 'racao_de_porco'
            ],
            // Seeds for planting service
            seeds: [
                'seed', 'semente', 'wheat_seed', 'corn_seed', 'bulrush_seed',
                'semente_trigo', 'semente_milho', 'semente_junco', 'potato_seed',
                'carrot_seed', 'beet_seed', 'cabbage_seed', 'onion_seed'
            ]
        };
        
        // Personal allowances (legitimate personal use)
        const personalItems = {
            drinks: ['agua', 'water', 'suco', 'juice', 'refrigerante', 'soda', 'bebida'],
            food: ['comida', 'food', 'pao', 'bread', 'sanduiche', 'sandwich', 'fruta', 'fruit'],
            cigarettes: ['cigarro', 'cigarette', 'tabaco', 'tobacco']
        };
        
        // Returnable tools (must be returned or charged)
        const returnableTools = {
            watering_cans: ['watering_can', 'regador', 'watermachine'],
            tools: ['hoe', 'enxada', 'plant_trimmer', 'podador', 'machado', 'axe', 'pickaxe', 'picareta']
        };
        
        // Check each category
        for (const [category, items] of Object.entries(serviceItems)) {
            if (items.some(item => itemLower.includes(item) || item.includes(itemLower))) {
                return { type: 'service', subtype: category, legitimate: true };
            }
        }
        
        for (const [category, items] of Object.entries(personalItems)) {
            if (items.some(item => itemLower.includes(item) || item.includes(itemLower))) {
                return { type: 'personal', subtype: category, legitimate: true };
            }
        }
        
        for (const [category, items] of Object.entries(returnableTools)) {
            if (items.some(item => itemLower.includes(item) || item.includes(itemLower))) {
                return { type: 'returnable', subtype: category, legitimate: true, must_return: true };
            }
        }
        
        // If not categorized, it's potentially suspicious
        return { type: 'other', subtype: 'unknown', legitimate: false, needs_review: true };
    }
    
    /**
     * Define Worker Allowances
     */
    getWorkerAllowances() {
        return {
            // Per service allowances
            per_delivery: {
                animals: 4,
                feed: 8  // net consumption after returns
            },
            per_planting_session: {
                seeds: 100,
                tools: 1
            },
            // Personal allowances (time-based)
            per_hour: {
                drinks: 2
            },
            per_day: {
                food: 1
            },
            per_2_hours: {
                cigarettes: 1
            },
            // Tool costs for unreturned items
            tool_costs: {
                watering_can: 0.50,
                hoe: 2.00,
                plant_trimmer: 5.00,
                axe: 8.00,
                pickaxe: 10.00
            }
        };
    }

    /**
     * Obter estatísticas de plantas por usuário em um período específico
     */
    obterEstatisticasPlantas(dataInicio, dataFim) {
        const inicio = new Date(dataInicio);
        const fim = new Date(dataFim);
        
        // All known plants - INCLUDES BOTH ENGLISH AND PORTUGUESE IDs
        const todasPlantas = [
            // Main crops ($0.15 each) - Portuguese and English IDs
            'junco', 'bulrush', 'plantacoes_por_semente_plantada', 'trigo', 'milho', 'corn',
            // Other plants ($0.20 each)
            'tomate', 'batata', 'cenoura', 'alface', 'couve', 'pimentao', 
            'melancia', 'abobora', 'pepino', 'repolho', 'espinafre', 'cebola',
            'alho', 'morango', 'beringela', 'brocolis', 'couve_flor', 'maca', 'apple',
            'oregano', 'black_berry', 'blackberry', 'parasol_mushroom', 'mushroom',
            'oleander_sage', 'black_currant', 'blackcurrant'
        ];
        
        // Filter activities within date range
        const atividadesFiltradas = this.atividades.atividades_recentes.filter(atividade => {
            const timestampAtividade = new Date(atividade.timestamp);
            return timestampAtividade >= inicio && timestampAtividade <= fim && 
                   atividade.tipo === 'adicionar' && 
                   todasPlantas.includes(atividade.item.toLowerCase());
        });
        
        const estatisticasPorUsuario = {};
        const usuarios = this.obterTodosUsuarios();
        
        // Initialize stats for all users
        Object.entries(usuarios).forEach(([userId, userData]) => {
            estatisticasPorUsuario[userId] = {
                nome: userData.nome,
                funcao: userData.funcao,
                plantas: {},
                totalPlantas: 0,
                valorEstimado: 0
            };
        });
        
        // Process activities
        atividadesFiltradas.forEach(atividade => {
            // Find which user this activity belongs to
            Object.entries(usuarios).forEach(([userId, userData]) => {
                if (this.isUserMatch(atividade.autor, userData)) {
                    const item = atividade.item.toLowerCase();
                    const quantidade = atividade.quantidade || 0;
                    
                    // Initialize plant entry if not exists
                    if (!estatisticasPorUsuario[userId].plantas[item]) {
                        estatisticasPorUsuario[userId].plantas[item] = {
                            nome: this.obterMelhorNomeExibicao(item),
                            quantidade: 0,
                            valor: 0
                        };
                    }
                    
                    // Add quantity
                    estatisticasPorUsuario[userId].plantas[item].quantidade += quantidade;
                    estatisticasPorUsuario[userId].totalPlantas += quantidade;
                    
                    // Calculate value
                    const plantasPagas015 = ['junco', 'bulrush', 'plantacoes_por_semente_plantada', 'trigo', 'milho', 'corn'];
                    const valorUnitario = plantasPagas015.includes(item) ? 0.15 : 0.20;
                    const valor = quantidade * valorUnitario;
                    
                    estatisticasPorUsuario[userId].plantas[item].valor += valor;
                    estatisticasPorUsuario[userId].valorEstimado += valor;
                }
            });
        });
        
        // Filter out users with no plants and sort by total plants
        const resultado = Object.entries(estatisticasPorUsuario)
            .filter(([userId, stats]) => stats.totalPlantas > 0)
            .map(([userId, stats]) => ({
                usuario_id: userId,
                ...stats,
                plantas: Object.values(stats.plantas).sort((a, b) => b.quantidade - a.quantidade)
            }))
            .sort((a, b) => b.totalPlantas - a.totalPlantas);
        
        return {
            periodo: {
                inicio: dataInicio,
                fim: dataFim
            },
            usuarios: resultado,
            resumo: {
                totalUsuarios: resultado.length,
                totalPlantas: resultado.reduce((sum, user) => sum + user.totalPlantas, 0),
                valorTotal: resultado.reduce((sum, user) => sum + user.valorEstimado, 0)
            }
        };
    }
    
    /**
     * Helper method to check if an activity matches a user
     */
    isUserMatch(autorAtividade, userData) {
        const autorLimpo = autorAtividade.split(' | ')[0].toLowerCase().trim();
        const fixoMatch = autorAtividade.match(/FIXO:\s*(\d+)/);
        const autorFixo = fixoMatch ? fixoMatch[1] : null;
        
        const userNameLimpo = userData.nome.toLowerCase().trim();
        let isMatch = false;
        
        // 1. Try FIXO ID match first
        if (userData.fixo_id && autorFixo) {
            isMatch = autorFixo === userData.fixo_id;
        }
        
        // 2. Try exact name match
        if (!isMatch) {
            isMatch = autorLimpo === userNameLimpo;
        }
        
        // 3. Try partial name matching for imported data
        if (!isMatch && autorLimpo.length > 0 && userNameLimpo.length > 0) {
            const autorWords = autorLimpo.split(' ').filter(w => w.length > 2);
            const userWords = userNameLimpo.split(' ').filter(w => w.length > 2);
            
            const commonWords = autorWords.filter(word => userWords.some(uWord => 
                uWord.includes(word) || word.includes(uWord)
            ));
            
            isMatch = commonWords.length >= Math.min(autorWords.length, userWords.length, 2) ||
                     autorLimpo.includes(userNameLimpo) || 
                     userNameLimpo.includes(autorLimpo);
        }
        
        return isMatch;
    }

    /**
     * Calculate Inventory Abuse and Theft for a User
     * @param {string} userId - User ID
     * @param {Array} userActivities - User's inventory activities
     * @returns {object} Abuse analysis
     */
    calculateInventoryAbuse(userId, userActivities) {
        try {
            const allowances = this.getWorkerAllowances();
            const abuse = {
                total_charges: 0,
                violations: [],
                legitimate_usage: {},
                suspicious_items: [],
                unreturned_tools: [],
                excess_consumption: []
            };

            // Group activities by item and type (removal vs insertion)
            const itemTracking = {};
            const toolBorrowings = {};

            userActivities.forEach(activity => {
                // Skip activities without valid item data or financial transactions
                if (!activity.item || typeof activity.item !== 'string' || activity.tipo === 'deposito') {
                    return;
                }
                
                const item = activity.item.toLowerCase();
                const category = this.getItemCategory(item);
                const quantity = activity.quantidade || 0;
                const isRemoval = activity.tipo === 'remocao' || activity.acao === 'removed';
                const timestamp = new Date(activity.timestamp);

                if (!itemTracking[item]) {
                    itemTracking[item] = {
                        category: category,
                        total_removed: 0,
                        total_returned: 0,
                        net_consumed: 0,
                        activities: []
                    };
                }

                itemTracking[item].activities.push(activity);

                if (isRemoval) {
                    itemTracking[item].total_removed += quantity;
                    
                    // Track tool borrowings specifically
                    if (category.type === 'returnable') {
                        if (!toolBorrowings[item]) {
                            toolBorrowings[item] = { borrowed: 0, returned: 0, cost_per_item: 0 };
                        }
                        toolBorrowings[item].borrowed += quantity;
                        
                        // Get cost from allowances
                        const toolName = category.subtype === 'watering_cans' ? 'watering_can' : item;
                        toolBorrowings[item].cost_per_item = allowances.tool_costs[toolName] || 0.50;
                    }
                } else {
                    itemTracking[item].total_returned += quantity;
                    
                    if (category.type === 'returnable' && toolBorrowings[item]) {
                        toolBorrowings[item].returned += quantity;
                    }
                }

                itemTracking[item].net_consumed = itemTracking[item].total_removed - itemTracking[item].total_returned;
            });

            // Analyze each item for violations
            Object.entries(itemTracking).forEach(([item, tracking]) => {
                const category = tracking.category;
                
                if (!category.legitimate) {
                    // Suspicious/unknown items
                    abuse.suspicious_items.push({
                        item: item,
                        quantity: tracking.net_consumed,
                        category: category.type,
                        charge: tracking.net_consumed * 1.00 // $1 per suspicious item
                    });
                    abuse.total_charges += tracking.net_consumed * 1.00;
                    
                } else if (category.type === 'returnable') {
                    // Check unreturned tools
                    const toolData = toolBorrowings[item];
                    if (toolData && toolData.borrowed > toolData.returned) {
                        const unreturned = toolData.borrowed - toolData.returned;
                        const charge = unreturned * toolData.cost_per_item;
                        
                        abuse.unreturned_tools.push({
                            item: item,
                            borrowed: toolData.borrowed,
                            returned: toolData.returned,
                            unreturned: unreturned,
                            cost_per_item: toolData.cost_per_item,
                            total_charge: charge
                        });
                        abuse.total_charges += charge;
                    }
                    
                } else if (category.type === 'personal') {
                    // Check personal allowance violations
                    // For now, just track legitimate usage
                    // TODO: Implement time-based allowance checking
                    abuse.legitimate_usage[item] = tracking.net_consumed;
                    
                } else if (category.type === 'service') {
                    // Track service item usage
                    abuse.legitimate_usage[item] = tracking.net_consumed;
                    
                    // Check for excessive feed consumption
                    if (category.subtype === 'feed' && tracking.net_consumed > 50) {
                        abuse.excess_consumption.push({
                            item: item,
                            consumed: tracking.net_consumed,
                            reasonable_limit: 50,
                            excess: tracking.net_consumed - 50,
                            charge: (tracking.net_consumed - 50) * 1.50 // $1.50 per excess feed
                        });
                        abuse.total_charges += (tracking.net_consumed - 50) * 1.50;
                    }
                }
            });

            // Track unreturned animals and ração (theft)
            const animaisReais = [
                'vaca', 'cow_female', 'ovelha', 'sheep_female', 'cabra', 'goat_female',
                'porca', 'pig_female', 'mula', 'donkey_female', 'galinha', 'chicken_female',
                'touro', 'cow_male', 'carneiro', 'sheep_male', 'bode', 'goat_male',
                'porco', 'pig_male', 'burro', 'donkey_male', 'galo', 'chicken_male',
                'mane_chicken'
            ];
            
            const racaoItems = [
                'common_portion_sheep', 'common_portion_pig', 'common_portion_cow',
                'common_portion_chicken', 'common_portion_donkey', 'common_portion_goat',
                'common_portion', 'racao_de_galinha', 'racao_de_mula', 'racao_de_porco'
            ];
            
            // Find all deposits by this user (completed deliveries - ANY amount)
            const completedDeliveries = userActivities.filter(a => 
                a.categoria === 'financeiro' && 
                a.tipo === 'deposito'
            ).length;
            
            // Calculate expected animals/ração for completed deliveries
            const expectedAnimalsDelivered = completedDeliveries * 4;
            const expectedRacaoDelivered = completedDeliveries * 8;
            
            // Track total animals and ração removed
            let totalAnimalsRemoved = 0;
            let totalRacaoRemoved = 0;
            
            Object.entries(itemTracking).forEach(([item, tracking]) => {
                const itemLower = item.toLowerCase();
                
                // Check if it's an animal
                if (animaisReais.some(animal => itemLower.includes(animal))) {
                    totalAnimalsRemoved += tracking.net_consumed;
                }
                
                // Check if it's ração
                if (racaoItems.some(racao => itemLower.includes(racao))) {
                    totalRacaoRemoved += tracking.net_consumed;
                }
            });
            
            // Calculate theft
            const stolenAnimals = Math.max(0, totalAnimalsRemoved - expectedAnimalsDelivered);
            const stolenRacao = Math.max(0, totalRacaoRemoved - expectedRacaoDelivered);
            
            if (stolenAnimals > 0 || stolenRacao > 0) {
                const animalTheftCharge = stolenAnimals * 20; // $20 per stolen animal
                const racaoTheftCharge = stolenRacao * 1.5; // $1.50 per stolen ração
                const totalTheftCharge = animalTheftCharge + racaoTheftCharge;
                
                abuse.total_charges += totalTheftCharge;
                
                if (stolenAnimals > 0) {
                    abuse.violations.push(`${stolenAnimals} animals not delivered (removed but no deposit found)`);
                    abuse.unreturned_tools.push({
                        item: 'animals (various)',
                        borrowed: totalAnimalsRemoved,
                        returned: 0,
                        unreturned: stolenAnimals,
                        cost_per_item: 20,
                        total_charge: animalTheftCharge
                    });
                }
                
                if (stolenRacao > 0) {
                    abuse.violations.push(`${stolenRacao} ração not delivered (removed but no deposit found)`);
                    abuse.unreturned_tools.push({
                        item: 'ração (various)',
                        borrowed: totalRacaoRemoved,
                        returned: 0,
                        unreturned: stolenRacao,
                        cost_per_item: 1.5,
                        total_charge: racaoTheftCharge
                    });
                }
            }
            
            // Add violation summaries
            if (abuse.suspicious_items.length > 0) {
                abuse.violations.push(`${abuse.suspicious_items.length} suspicious items taken`);
            }
            if (abuse.unreturned_tools.length > 0) {
                abuse.violations.push(`${abuse.unreturned_tools.length} tools not returned`);
            }
            if (abuse.excess_consumption.length > 0) {
                abuse.violations.push(`${abuse.excess_consumption.length} items consumed excessively`);
            }

            return abuse;
            
        } catch (error) {
            console.error('❌ [ABUSE DETECTION] Error calculating inventory abuse:', error);
            return {
                total_charges: 0,
                violations: ['Error calculating abuse'],
                error: error.message
            };
        }
    }

    /**
     * Record abuse action (charge or ignore)
     * @param {string} userId - User ID
     * @param {string} action - 'charge' or 'ignore'
     * @param {string} category - Category of abuse item
     * @param {number} index - Index of the item
     * @param {object} item - The abuse item
     * @returns {object} Result of the operation
     */
    recordAbuseAction(userId, action, category, index, item) {
        try {
            // Create abuse action record
            const abuseAction = {
                id: require('crypto').randomUUID(),
                usuario_id: userId,
                action: action,
                category: category,
                index: index,
                item: item,
                timestamp: new Date().toISOString(),
                data_formatada: new Date().toLocaleString('pt-BR')
            };

            // Initialize abuse actions file if it doesn't exist
            if (!this.abuseActions) {
                this.abuseActions = {
                    actions: [],
                    total_ignored: 0,
                    total_charged: 0,
                    ultima_atualizacao: new Date().toISOString()
                };
            }

            // Add the action
            this.abuseActions.actions.push(abuseAction);
            
            // Update totals
            if (action === 'ignore') {
                this.abuseActions.total_ignored += 1;
            } else if (action === 'charge') {
                this.abuseActions.total_charged += 1;
            }

            this.abuseActions.ultima_atualizacao = new Date().toISOString();

            // Save to file
            const saved = this.salvarArquivoJson(this.abuseActionsFile, this.abuseActions);

            if (saved) {
                logger.info(`Abuse action recorded: ${action} for ${userId}, category: ${category}`);
                
                return {
                    sucesso: true,
                    mensagem: action === 'charge' ? 'Cobrança aplicada com sucesso' : 'Item ignorado com sucesso',
                    dados: abuseAction
                };
            } else {
                return {
                    sucesso: false,
                    erro: 'Falha ao salvar ação de abuso'
                };
            }
        } catch (error) {
            logger.error('Erro ao registrar ação de abuso:', error);
            return {
                sucesso: false,
                erro: 'Erro interno ao processar ação'
            };
        }
    }

    /**
     * Adicionar item ao inventário
     * @param {string} nomeItem - Nome do item
     * @param {number} quantidade - Quantidade a adicionar
     * @param {string} autor - Autor da operação
     * @param {boolean} skipActivity - Skip activity registration (for webhook calls)
     * @returns {boolean} Sucesso da operação
     */
    adicionarItem(nomeItem, quantidade, autor = 'Sistema', skipActivity = false) {
        try {
            if (!nomeItem || quantidade <= 0) {
                logger.warn('Nome do item ou quantidade inválidos');
                return false;
            }

            // Normalizar nome do item
            const itemId = nomeItem.toLowerCase().replace(/\s+/g, '_');
            
            // Adicionar ao inventário
            if (!this.inventario.itens[itemId]) {
                this.inventario.itens[itemId] = {
                    nome: nomeItem,
                    quantidade: 0,
                    criado_em: new Date().toISOString()
                };
            }
            
            const quantidadeAnterior = this.inventario.itens[itemId].quantidade;
            this.inventario.itens[itemId].quantidade += quantidade;
            this.inventario.itens[itemId].ultima_atualizacao = new Date().toISOString();
            const quantidadeNova = this.inventario.itens[itemId].quantidade;
            
            // Adicionar ao histórico
            this.inventario.historico_transacoes.push({
                id: require('crypto').randomUUID(),
                tipo: 'adicionar',
                item: itemId,
                nome_item: nomeItem,
                quantidade: quantidade,
                autor: autor,
                timestamp: new Date().toISOString(),
                quantidade_anterior: (this.inventario.itens[itemId].quantidade || 0) - quantidade,
                quantidade_posterior: this.inventario.itens[itemId].quantidade
            });
            
            // Atualizar metadados
            this.inventario.ultima_atualizacao = new Date().toISOString();
            this.inventario.total_itens = Object.keys(this.inventario.itens).length;
            this.inventario.total_quantidade = Object.values(this.inventario.itens)
                .reduce((sum, item) => sum + (item.quantidade || 0), 0);
            
            const success = this.salvarArquivoJson(this.inventarioFile, this.inventario);
            
            if (success && !skipActivity) {
                // Registrar atividade Discord (skip if called from webhook)
                this.registrarAtividadeDiscord('adicionar', {
                    item: itemId,
                    quantidade: quantidade,
                    autor: autor,
                    displayName: nomeItem
                });
                
                logger.info(`Item adicionado: ${nomeItem} (+${quantidade}) por ${autor}`);
            }
            
            // Check for plant changes and auto-update Discord
            if (success) {
                this.verificarMudancasPlantas(itemId, quantidadeAnterior, quantidadeNova);
            }
            
            return success;
        } catch (error) {
            logger.error('Erro ao adicionar item:', error);
            return false;
        }
    }

    /**
     * Remover item do inventário
     * @param {string} nomeItem - Nome do item
     * @param {number} quantidade - Quantidade a remover
     * @param {string} autor - Autor da operação
     * @param {boolean} skipActivity - Skip activity registration (for webhook calls)
     * @returns {boolean} Sucesso da operação
     */
    removerItem(nomeItem, quantidade, autor = 'Sistema', skipActivity = false) {
        try {
            if (!nomeItem || quantidade <= 0) {
                logger.warn('Nome do item ou quantidade inválidos');
                return false;
            }

            // Normalizar nome do item
            const itemId = nomeItem.toLowerCase().replace(/\s+/g, '_');
            
            // Verificar se o item existe
            if (!this.inventario.itens[itemId]) {
                logger.warn(`Item não encontrado no inventário: ${nomeItem}`);
                return false;
            }
            
            // Verificar se há quantidade suficiente
            if (this.inventario.itens[itemId].quantidade < quantidade) {
                logger.warn(`Quantidade insuficiente: ${nomeItem} (disponível: ${this.inventario.itens[itemId].quantidade}, solicitado: ${quantidade})`);
                return false;
            }
            
            const quantidadeAnterior = this.inventario.itens[itemId].quantidade;
            this.inventario.itens[itemId].quantidade -= quantidade;
            this.inventario.itens[itemId].ultima_atualizacao = new Date().toISOString();
            const quantidadeNova = this.inventario.itens[itemId].quantidade;
            
            // Remove item se quantidade chegar a zero
            if (this.inventario.itens[itemId].quantidade <= 0) {
                delete this.inventario.itens[itemId];
            }
            
            // Adicionar ao histórico
            this.inventario.historico_transacoes.push({
                id: require('crypto').randomUUID(),
                tipo: 'remover',
                item: itemId,
                nome_item: nomeItem,
                quantidade: quantidade,
                autor: autor,
                timestamp: new Date().toISOString(),
                quantidade_anterior: quantidadeAnterior,
                quantidade_posterior: this.inventario.itens[itemId]?.quantidade || 0
            });
            
            // Atualizar metadados
            this.inventario.ultima_atualizacao = new Date().toISOString();
            this.inventario.total_itens = Object.keys(this.inventario.itens).length;
            this.inventario.total_quantidade = Object.values(this.inventario.itens)
                .reduce((sum, item) => sum + (item.quantidade || 0), 0);
            
            const success = this.salvarArquivoJson(this.inventarioFile, this.inventario);
            
            if (success && !skipActivity) {
                // Registrar atividade Discord (skip if called from webhook)
                this.registrarAtividadeDiscord('remover', {
                    item: itemId,
                    quantidade: quantidade,
                    autor: autor,
                    displayName: nomeItem
                });
                
                logger.info(`Item removido: ${nomeItem} (-${quantidade}) por ${autor}`);
            }
            
            // Check for plant changes and auto-update Discord
            if (success) {
                const finalQuantity = this.inventario.itens[itemId]?.quantidade || 0;
                this.verificarMudancasPlantas(itemId, quantidadeAnterior, finalQuantity);
            }
            
            return success;
        } catch (error) {
            logger.error('Erro ao remover item:', error);
            return false;
        }
    }

    /**
     * Remove uma atividade do Discord por ID
     */
    removerAtividadeDiscord(activityId) {
        try {
            const indexDiscord = this.discord.atividades_recentes.findIndex(a => a.id === activityId);
            const indexAtividades = this.atividades.atividades_recentes.findIndex(a => a.id === activityId);
            
            let removed = false;
            
            if (indexDiscord >= 0) {
                this.discord.atividades_recentes.splice(indexDiscord, 1);
                // DISABLED: No longer save to discordFile as it now points to analyzed_data.json
                // this.salvarArquivoJson(this.discordFile, this.discord);
                removed = true;
            }
            
            if (indexAtividades >= 0) {
                this.atividades.atividades_recentes.splice(indexAtividades, 1);
                // WARNING: atividades are now read-only from analyzed_data.json
            // Data is managed by the bot data pipeline
            console.warn('⚠️ Attempted to save activities - now managed by bot pipeline');
            // this.salvarArquivoJson(this.atividadesFile, this.atividades);
                removed = true;
            }
            
            logger.info(`Atividade removida: ${activityId}`);
            return { sucesso: true, removida: removed };
        } catch (error) {
            logger.error('Erro ao remover atividade:', error);
            return { sucesso: false, erro: error.message };
        }
    }

    /**
     * Edita uma atividade do Discord
     */
    editarAtividadeDiscord(activityId, novosDados) {
        try {
            let updated = false;
            
            // Atualizar no discord
            const indexDiscord = this.discord.atividades_recentes.findIndex(a => a.id === activityId);
            if (indexDiscord >= 0) {
                this.discord.atividades_recentes[indexDiscord] = {
                    ...this.discord.atividades_recentes[indexDiscord],
                    ...novosDados,
                    timestamp: novosDados.timestamp || this.discord.atividades_recentes[indexDiscord].timestamp
                };
                // DISABLED: No longer save to discordFile as it now points to analyzed_data.json
                // this.salvarArquivoJson(this.discordFile, this.discord);
                updated = true;
            }
            
            // Atualizar no atividades
            const indexAtividades = this.atividades.atividades_recentes.findIndex(a => a.id === activityId);
            if (indexAtividades >= 0) {
                this.atividades.atividades_recentes[indexAtividades] = {
                    ...this.atividades.atividades_recentes[indexAtividades],
                    ...novosDados,
                    timestamp: novosDados.timestamp || this.atividades.atividades_recentes[indexAtividades].timestamp
                };
                // WARNING: atividades are now read-only from analyzed_data.json
            // Data is managed by the bot data pipeline
            console.warn('⚠️ Attempted to save activities - now managed by bot pipeline');
            // this.salvarArquivoJson(this.atividadesFile, this.atividades);
                updated = true;
            }
            
            logger.info(`Atividade editada: ${activityId}`);
            return { sucesso: true, atualizada: updated };
        } catch (error) {
            logger.error('Erro ao editar atividade:', error);
            return { sucesso: false, erro: error.message };
        }
    }

    /**
     * Adiciona uma nova atividade manualmente
     */
    adicionarAtividadeManual(dadosAtividade) {
        try {
            // Auto-calculate value for plantation services if not provided
            let valor = dadosAtividade.valor;
            if (!valor && dadosAtividade.tipo === 'remover' && dadosAtividade.quantidade) {
                // Get item category from inventory if available
                const itemData = this.inventario.itens[dadosAtividade.item];
                const itemCategory = itemData ? itemData.categoria : null;
                
                const plantType = ItemNormalizer.identifyPlantType(dadosAtividade.item, itemCategory);
                
                if (plantType.isPlant) {
                    valor = dadosAtividade.quantidade * plantType.price;
                    logger.info(`Auto-calculated plantation value: ${dadosAtividade.quantidade} x $${plantType.price} = $${valor} for ${plantType.category}`);
                } else if (plantType.category === 'seed') {
                    logger.info(`Seed item detected and excluded from plantation payment: ${dadosAtividade.item}`);
                }
            }

            const atividade = {
                id: uuidv4(),
                tipo: dadosAtividade.tipo || 'manual',
                item: dadosAtividade.item || null,
                quantidade: dadosAtividade.quantidade || null,
                valor: valor || null,
                autor: dadosAtividade.autor || 'Manual',
                displayName: dadosAtividade.displayName || this.obterMelhorNomeExibicao(dadosAtividade.item),
                descricao: dadosAtividade.descricao || this.formatarDescricaoAtividade(dadosAtividade.tipo, dadosAtividade),
                timestamp: dadosAtividade.timestamp || new Date().toISOString(),
                categoria: dadosAtividade.categoria || 'inventario',
                manual: true
            };

            // Adicionar ao Discord
            this.discord.atividades_recentes.unshift(atividade);
            this.discord.total_atividades = this.discord.atividades_recentes.length;
            this.discord.ultima_atualizacao = new Date().toISOString();
            
            // Adicionar ao atividades
            this.atividades.atividades_recentes.unshift(atividade);
            this.atividades.total_atividades = this.atividades.atividades_recentes.length;
            this.atividades.ultima_atualizacao = new Date().toISOString();

            // Manter limite de atividades
            if (this.discord.atividades_recentes.length > 2000) {
                this.discord.atividades_recentes = this.discord.atividades_recentes.slice(0, 2000);
            }
            if (this.atividades.atividades_recentes.length > 2000) {
                this.atividades.atividades_recentes = this.atividades.atividades_recentes.slice(0, 2000);
            }

            // Salvar arquivos
            // DISABLED: No longer save to discordFile as it now points to analyzed_data.json
            // this.salvarArquivoJson(this.discordFile, this.discord);
            // WARNING: atividades are now read-only from analyzed_data.json
            // Data is managed by the bot data pipeline
            console.warn('⚠️ Attempted to save activities - now managed by bot pipeline');
            // this.salvarArquivoJson(this.atividadesFile, this.atividades);

            logger.info(`Atividade manual adicionada: ${atividade.descricao}`);
            logger.info(`Activity details: tipo=${atividade.tipo}, item=${atividade.item}, quantidade=${atividade.quantidade}, valor=${atividade.valor}`);
            
            // Emit update for dashboard/activities
            if (this.io) {
                this.io.emit('atividades:atualizado', {
                    atividades_recentes: this.obterAtividadesRecentes(20),
                    total_atividades: this.discord.total_atividades
                });
            }
            
            return { sucesso: true, atividade: atividade };
        } catch (error) {
            logger.error('Erro ao adicionar atividade manual:', error);
            return { sucesso: false, erro: error.message };
        }
    }

    /**
     * Obtém uma atividade específica por ID
     */
    obterAtividadePorId(activityId) {
        try {
            let atividade = this.discord.atividades_recentes.find(a => a.id === activityId);
            if (!atividade) {
                atividade = this.atividades.atividades_recentes.find(a => a.id === activityId);
            }
            
            return atividade || null;
        } catch (error) {
            logger.error('Erro ao obter atividade por ID:', error);
            return null;
        }
    }

    /**
     * Obter todas as transações de um usuário específico
     * @param {string} userId - ID do usuário
     * @returns {Array} Array com todas as transações do usuário
     */
    obterTodasTransacoesUsuario(userId) {
        try {
            const atividades = this.atividades.atividades_recentes || [];
            
            // Get user data for matching
            const userData = this.usuarios.usuarios[userId];
            if (!userData) {
                console.log(`❌ User ${userId} not found in usuarios data`);
                return [];
            }
            
            console.log(`🔍 Finding all transactions for user: ${userData.nome} (ID: ${userId}, FIXO: ${userData.fixo_id})`);
            
            const userTransactions = atividades.filter(a => {
                if (!a.autor) return false;
                
                // Extract clean name and FIXO from author
                const autorLimpo = a.autor.split(' | ')[0].toLowerCase().trim();
                const fixoMatch = a.autor.match(/FIXO:\s*(\d+)/);
                const autorFixo = fixoMatch ? fixoMatch[1] : null;
                
                // Improved matching logic (same as other methods)
                const userNameLimpo = userData.nome.toLowerCase().trim();
                let isMatch = false;
                
                // 1. Try FIXO ID match first
                if (userData.fixo_id && autorFixo) {
                    isMatch = autorFixo === userData.fixo_id;
                }
                
                // 2. Try exact name match
                if (!isMatch) {
                    isMatch = autorLimpo === userNameLimpo;
                }
                
                // 3. Try partial name matching for imported data
                if (!isMatch && autorLimpo.length > 0 && userNameLimpo.length > 0) {
                    const autorWords = autorLimpo.split(' ').filter(w => w.length > 2);
                    const userWords = userNameLimpo.split(' ').filter(w => w.length > 2);
                    
                    const commonWords = autorWords.filter(word => userWords.some(uWord => 
                        uWord.includes(word) || word.includes(uWord)
                    ));
                    
                    isMatch = commonWords.length >= Math.min(autorWords.length, userWords.length, 2) ||
                             autorLimpo.includes(userNameLimpo) || 
                             userNameLimpo.includes(autorLimpo);
                }
                
                return isMatch;
            });
            
            // Add display names using the proper translation system
            const transactionsWithDisplayNames = userTransactions.map(transaction => ({
                ...transaction,
                displayName: transaction.displayName || 
                           this.obterNomeCustomizado(transaction.item) || 
                           (this.precos.itens[transaction.item]?.nome) ||
                           (transaction.item ? transaction.item.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Item')
            }));
            
            console.log(`📋 Found ${transactionsWithDisplayNames.length} transactions for user ${userData.nome}`);
            return transactionsWithDisplayNames;
            
        } catch (error) {
            console.error('Error getting user transactions:', error);
            return [];
        }
    }

    /**
     * Atualizar item globalmente em todos os sistemas
     * @param {string} oldId - ID atual do item
     * @param {string} newId - Novo ID do item (opcional, se não fornecido mantém o mesmo)
     * @param {string} newDisplayName - Novo nome de exibição (opcional)
     * @returns {object} Resultado da operação
     */
    atualizarItemGlobalmente(oldId, newId = null, newDisplayName = null) {
        try {
            console.log(`🌍 Starting global update for item: ${oldId} → ${newId || oldId}`);
            console.log(`📝 New display name: ${newDisplayName || 'unchanged'}`);
            
            const finalId = newId || oldId;
            let updatedCount = 0;
            const results = {
                transactions: 0,
                inventory: 0,
                prices: 0,
                customNames: 0
            };

            // 1. Update all transactions in atividades_discord.json
            if (this.atividades.atividades_recentes) {
                this.atividades.atividades_recentes.forEach(atividade => {
                    if (atividade.item === oldId) {
                        atividade.item = finalId;
                        if (newDisplayName) {
                            atividade.displayName = newDisplayName;
                        }
                        results.transactions++;
                    }
                });
                
                if (results.transactions > 0) {
                    // WARNING: atividades are now read-only from analyzed_data.json
            // Data is managed by the bot data pipeline
            console.warn('⚠️ Attempted to save activities - now managed by bot pipeline');
            // this.salvarArquivoJson(this.atividadesFile, this.atividades);
                    console.log(`✅ Updated ${results.transactions} transactions`);
                }
            }

            // 2. Update discord activities if different from atividades
            if (this.discord && this.discord.atividades_recentes) {
                this.discord.atividades_recentes.forEach(atividade => {
                    if (atividade.item === oldId) {
                        atividade.item = finalId;
                        if (newDisplayName) {
                            atividade.displayName = newDisplayName;
                        }
                    }
                });
                // DISABLED: No longer save to discordFile as it now points to analyzed_data.json
                // this.salvarArquivoJson(this.discordFile, this.discord);
            }

            // 3. Update inventory items
            if (this.inventario.itens && this.inventario.itens[oldId]) {
                const itemData = this.inventario.itens[oldId];
                delete this.inventario.itens[oldId];
                this.inventario.itens[finalId] = itemData;
                
                if (newDisplayName) {
                    this.inventario.itens[finalId].nome = newDisplayName;
                }
                
                results.inventory++;
                this.salvarArquivoJson(this.inventarioFile, this.inventario);
                console.log(`✅ Updated inventory item`);
            }

            // 4. Update prices
            if (this.precos.itens && this.precos.itens[oldId]) {
                const precoData = this.precos.itens[oldId];
                delete this.precos.itens[oldId];
                this.precos.itens[finalId] = precoData;
                
                if (newDisplayName) {
                    this.precos.itens[finalId].nome = newDisplayName;
                }
                
                results.prices++;
                this.salvarArquivoJson(this.precosFile, this.precos);
                console.log(`✅ Updated price item`);
            }

            // 5. Update custom display names
            if (newDisplayName) {
                // Remove old custom name if ID changed
                if (newId && newId !== oldId && this.customDisplayNames.display_names[oldId]) {
                    delete this.customDisplayNames.display_names[oldId];
                }
                
                // Set new custom name
                this.customDisplayNames.display_names[finalId] = newDisplayName;
                this.customDisplayNames.ultima_atualizacao = new Date().toISOString();
                
                results.customNames++;
                this.salvarArquivoJson(this.displayNamesFile, this.customDisplayNames);
                console.log(`✅ Updated custom display name: ${finalId} = "${newDisplayName}"`);
            } else if (newId && newId !== oldId && this.customDisplayNames.display_names[oldId]) {
                // Just change the ID, keep the display name
                const displayName = this.customDisplayNames.display_names[oldId];
                delete this.customDisplayNames.display_names[oldId];
                this.customDisplayNames.display_names[finalId] = displayName;
                this.customDisplayNames.ultima_atualizacao = new Date().toISOString();
                
                results.customNames++;
                this.salvarArquivoJson(this.displayNamesFile, this.customDisplayNames);
                console.log(`✅ Updated custom display name ID: ${oldId} → ${finalId}`);
            }

            updatedCount = results.transactions + results.inventory + results.prices + results.customNames;
            
            console.log(`🎉 Global update completed! Updated ${updatedCount} items across all systems`);
            console.log(`📊 Details:`, results);
            
            // Emit real-time updates to all connected clients
            if (this.io) {
                // Emit updates for all affected modules
                this.io.emit('atividades:atualizado', this.obterAtividadesRecentes());
                this.io.emit('inventario:atualizado', this.obterInventario());
                this.io.emit('precos:atualizado', this.obterTodosPrecos());
                this.io.emit('usuarios:atualizado', this.obterTodosUsuarios());
                this.io.emit('dashboard:atualizado', this.obterEstatisticasDashboard());
                this.io.emit('customNames:atualizado', this.customDisplayNames.display_names);
                console.log(`📡 Emitted real-time updates for global item change`);
            }
            
            return {
                sucesso: true,
                updatedCount,
                results,
                oldId,
                newId: finalId,
                newDisplayName
            };
            
        } catch (error) {
            console.error('Error updating item globally:', error);
            return {
                sucesso: false,
                erro: error.message
            };
        }
    }
    
    /**
     * Deletar um pagamento
     * @param {string} paymentId - ID do pagamento
     * @returns {object} Resultado da operação
     */
    deletarPagamento(paymentId) {
        try {
            console.log(`🗑️ [DELETE] Deleting payment with ID: ${paymentId}`);
            
            const pagamentoIndex = this.pagamentos.pagamentos.findIndex(p => p.id === paymentId);
            
            if (pagamentoIndex === -1) {
                return {
                    sucesso: false,
                    erro: 'Pagamento não encontrado'
                };
            }
            
            const pagamento = this.pagamentos.pagamentos[pagamentoIndex];
            console.log(`🔍 [DELETE] Found payment:`, {
                id: pagamento.id,
                usuario_id: pagamento.usuario_id,
                tipo_servico: pagamento.tipo_servico,
                valor: pagamento.valor
            });
            
            // ONLY DELETE THE RECEIPT - DO NOT UNPAY ANYTHING
            
            // Remove payment from list
            this.pagamentos.pagamentos.splice(pagamentoIndex, 1);
            
            // Save changes
            this.salvarArquivoJson(this.pagamentosFile, this.pagamentos);
            
            console.log(`✅ [DELETE] Payment ${paymentId} deleted successfully`);
            
            return {
                sucesso: true,
                pagamento_deletado: pagamento
            };
            
        } catch (error) {
            console.error('Error deleting payment:', error);
            return {
                sucesso: false,
                erro: error.message
            };
        }
    }
    
    /**
     * Desmarcar atividades como não pagas
     * @param {Array} idsAtividades - IDs das atividades
     */
    desmarcarAtividadesComoPagas(idsAtividades) {
        try {
            if (!Array.isArray(idsAtividades) || idsAtividades.length === 0) {
                return false;
            }
            
            let modified = false;
            
            this.atividades.atividades_recentes = this.atividades.atividades_recentes.map(atividade => {
                if (idsAtividades.includes(atividade.id)) {
                    atividade.pago = false;
                    modified = true;
                }
                return atividade;
            });
            
            if (modified) {
                // WARNING: atividades are now read-only from analyzed_data.json
            // Data is managed by the bot data pipeline
            console.warn('⚠️ Attempted to save activities - now managed by bot pipeline');
            // this.salvarArquivoJson(this.atividadesFile, this.atividades);
                console.log(`✅ Unmarked ${idsAtividades.length} activities as unpaid`);
            }
            
            return modified;
        } catch (error) {
            console.error('Erro ao desmarcar atividades:', error);
            return false;
        }
    }

    // ==============================
    // FERROVIARIA MANAGEMENT METHODS
    // ==============================

    /**
     * Obter dados completos da ferroviaria
     */
    obterDadosFerroviaria() {
        return this.ferroviaria;
    }

    /**
     * Adicionar investidor
     */
    adicionarInvestidor(dados) {
        const id = uuidv4();
        const investidor = {
            id,
            nome: dados.nome,
            pombo: dados.pombo,
            funcao: dados.funcao,
            porcentagem: dados.porcentagem,
            ativo: true,
            criado_em: new Date().toISOString()
        };

        this.ferroviaria.investidores[id] = investidor;
        this.ferroviaria.ultima_atualizacao = new Date().toISOString();
        this.salvarArquivoJson(this.ferroviariaFile, this.ferroviaria);
        
        if (this.io) {
            this.io.emit('ferroviaria:atualizado', this.ferroviaria);
        }
        
        return investidor;
    }

    /**
     * Atualizar investidor
     */
    atualizarInvestidor(id, dados) {
        if (!this.ferroviaria.investidores[id]) {
            throw new Error('Investidor não encontrado');
        }

        const investidor = this.ferroviaria.investidores[id];
        investidor.nome = dados.nome || investidor.nome;
        investidor.pombo = dados.pombo || investidor.pombo;
        investidor.funcao = dados.funcao || investidor.funcao;
        investidor.porcentagem = dados.porcentagem !== undefined ? dados.porcentagem : investidor.porcentagem;
        investidor.ativo = dados.ativo !== undefined ? dados.ativo : investidor.ativo;

        this.ferroviaria.ultima_atualizacao = new Date().toISOString();
        this.salvarArquivoJson(this.ferroviariaFile, this.ferroviaria);
        
        if (this.io) {
            this.io.emit('ferroviaria:atualizado', this.ferroviaria);
        }
        
        return investidor;
    }

    /**
     * Remover investidor
     */
    removerInvestidor(id) {
        if (!this.ferroviaria.investidores[id]) {
            throw new Error('Investidor não encontrado');
        }

        delete this.ferroviaria.investidores[id];
        this.ferroviaria.ultima_atualizacao = new Date().toISOString();
        this.salvarArquivoJson(this.ferroviariaFile, this.ferroviaria);
        
        if (this.io) {
            this.io.emit('ferroviaria:atualizado', this.ferroviaria);
        }
        
        return true;
    }

    /**
     * Registrar depósito de caixas
     */
    registrarDepositoCaixas(dados) {
        const deposito = {
            id: uuidv4(),
            tipo_caixa: dados.tipo_caixa,
            quantidade: dados.quantidade,
            custo_unitario: dados.custo_unitario || this.ferroviaria.configuracao.custo_por_caixa,
            custo_total: dados.quantidade * (dados.custo_unitario || this.ferroviaria.configuracao.custo_por_caixa),
            timestamp: new Date().toISOString()
        };

        this.ferroviaria.caixas_depositos.push(deposito);
        this.ferroviaria.ultima_atualizacao = new Date().toISOString();
        this.salvarArquivoJson(this.ferroviariaFile, this.ferroviaria);
        
        if (this.io) {
            this.io.emit('ferroviaria:atualizado', this.ferroviaria);
        }
        
        return deposito;
    }

    /**
     * Registrar serviço ferroviário completo (múltiplas entregas)
     */
    registrarServicoFerroviaria(dados) {
        const { manager_id, numero_entregas, total_caixas, tipo_caixas, tempo_inicio, tempo_fim, notas } = dados;
        
        // Get manager name
        const managerName = this.usuarios.usuarios[manager_id]?.nome || 'Unknown';
        
        // Calculate financials
        const grossRevenue = total_caixas * 4; // $4 per box
        const investorPayment = grossRevenue * 0.2; // 20% to investors
        const netRevenue = grossRevenue - investorPayment;
        
        // Calculate production cost based on box types using configurable costs
        let productionCost = 0;
        const config = this.ferroviaria.configuracao;
        
        if (tipo_caixas.caixaanimal && tipo_caixas.caixadeverduras) {
            // Mixed boxes - use configured costs for each type
            const animalCost = tipo_caixas.caixaanimal * (config.custo_caixa_animal || 0);
            const plantCost = tipo_caixas.caixadeverduras * (config.custo_caixa_verduras || 0);
            productionCost = animalCost + plantCost;
        } else if (tipo_caixas.caixaanimal) {
            // Only animal boxes
            productionCost = tipo_caixas.caixaanimal * (config.custo_caixa_animal || 0);
        } else if (tipo_caixas.caixadeverduras) {
            // Only plant boxes
            productionCost = tipo_caixas.caixadeverduras * (config.custo_caixa_verduras || 0);
        } else {
            // Fallback - use average of both costs
            const avgCost = ((config.custo_caixa_animal || 0) + (config.custo_caixa_verduras || 0)) / 2;
            productionCost = total_caixas * avgCost;
        }
        
        const netProfit = netRevenue - productionCost;
        const valueAdded = netProfit - (total_caixas * 2 - productionCost); // Extra value vs regular sale
        
        // Calculate workload points
        const workloadPoints = this.calcularWorkloadFerroviaria(total_caixas);
        
        // Create the service entry
        const entrega = {
            id: uuidv4(),
            manager_id,
            trabalhador: managerName,
            numero_entregas,
            caixas_utilizadas: total_caixas,
            tipo_caixas,
            valor_recebido: grossRevenue,
            gross_revenue: grossRevenue,
            investor_payment: investorPayment,
            net_revenue: netRevenue,
            production_cost: productionCost,
            net_profit: netProfit,
            value_added: valueAdded,
            workload_points: workloadPoints,
            tempo_inicio: tempo_inicio || new Date().toISOString(),
            tempo_fim: tempo_fim || new Date().toISOString(),
            duracao_minutos: tempo_fim && tempo_inicio ? 
                Math.round((new Date(tempo_fim) - new Date(tempo_inicio)) / 60000) : 
                numero_entregas * 10, // Default 10 min per delivery
            notas,
            pagamento_trabalhador: 0, // Will be calculated in manager distribution
            timestamp: new Date().toISOString()
        };

        // Save to ferroviaria
        this.ferroviaria.entregas.push(entrega);
        this.ferroviaria.ultima_atualizacao = new Date().toISOString();
        this.salvarArquivoJson(this.ferroviariaFile, this.ferroviaria);
        
        // Create manager transaction for workload tracking
        this.processarTransacaoGerente(manager_id, {
            tipo: 'ferroviaria',
            categoria: total_caixas >= 2000 ? 'ferroviaria_large' : 
                       total_caixas >= 1000 ? 'ferroviaria_medium' : 'ferroviaria_small',
            valor: netProfit,
            descricao: `Ferroviaria: ${numero_entregas} entregas, ${total_caixas} caixas`,
            ferroviaria_id: entrega.id,
            weight: workloadPoints,
            timestamp: new Date().toISOString()
        });
        
        // Update manager performance
        this.atualizarDadosGerente(manager_id);
        
        // Emit updates
        if (this.io) {
            this.io.emit('ferroviaria:atualizado', this.ferroviaria);
            this.io.emit('gerentes:atualizado', this.obterDadosGerentes());
        }
        
        return entrega;
    }

    /**
     * Calculate workload points for ferroviaria based on box count
     */
    calcularWorkloadFerroviaria(total_caixas) {
        // Calculate workload points based on box count
        // More boxes = more workload points
        if (total_caixas <= 500) return 1;      // Small job
        if (total_caixas <= 1000) return 2;     // Medium job  
        if (total_caixas <= 2000) return 3;     // Large job
        return 4;                               // Very large job
    }

    /**
     * Editar serviço ferroviário existente
     */
    editarServicoFerroviaria(serviceId, dados) {
        const entregaIndex = this.ferroviaria.entregas.findIndex(e => e.id === serviceId);
        if (entregaIndex === -1) {
            throw new Error('Serviço ferroviário não encontrado');
        }

        const { manager_id, numero_entregas, total_caixas, tipo_caixas, tempo_inicio, tempo_fim, notas } = dados;
        
        // Get manager name
        const managerName = this.usuarios.usuarios[manager_id]?.nome || 'Unknown';
        
        // Calculate financials (same logic as registrar)
        const grossRevenue = total_caixas * 4;
        const investorPayment = grossRevenue * 0.2;
        const netRevenue = grossRevenue - investorPayment;
        
        // Use same configurable costs for edit
        let productionCost = 0;
        const config = this.ferroviaria.configuracao;
        
        if (tipo_caixas.caixaanimal && tipo_caixas.caixadeverduras) {
            const animalCost = tipo_caixas.caixaanimal * (config.custo_caixa_animal || 0);
            const plantCost = tipo_caixas.caixadeverduras * (config.custo_caixa_verduras || 0);
            productionCost = animalCost + plantCost;
        } else if (tipo_caixas.caixaanimal) {
            productionCost = tipo_caixas.caixaanimal * (config.custo_caixa_animal || 0);
        } else if (tipo_caixas.caixadeverduras) {
            productionCost = tipo_caixas.caixadeverduras * (config.custo_caixa_verduras || 0);
        } else {
            const avgCost = ((config.custo_caixa_animal || 0) + (config.custo_caixa_verduras || 0)) / 2;
            productionCost = total_caixas * avgCost;
        }
        
        const netProfit = netRevenue - productionCost;
        const valueAdded = netProfit - (total_caixas * 2 - productionCost);
        const workloadPoints = this.calcularWorkloadFerroviaria(total_caixas);

        // Update the existing entry
        const existingEntry = this.ferroviaria.entregas[entregaIndex];
        const updatedEntry = {
            ...existingEntry,
            manager_id,
            trabalhador: managerName,
            numero_entregas,
            caixas_utilizadas: total_caixas,
            tipo_caixas,
            valor_recebido: grossRevenue,
            gross_revenue: grossRevenue,
            investor_payment: investorPayment,
            net_revenue: netRevenue,
            production_cost: productionCost,
            net_profit: netProfit,
            value_added: valueAdded,
            workload_points: workloadPoints,
            tempo_inicio: tempo_inicio || existingEntry.tempo_inicio,
            tempo_fim: tempo_fim || existingEntry.tempo_fim,
            duracao_minutos: tempo_fim && tempo_inicio ? 
                Math.round((new Date(tempo_fim) - new Date(tempo_inicio)) / 60000) : 
                numero_entregas * 10,
            notas: notas || '',
            editado_em: new Date().toISOString()
        };

        this.ferroviaria.entregas[entregaIndex] = updatedEntry;
        this.ferroviaria.ultima_atualizacao = new Date().toISOString();
        this.salvarArquivoJson(this.ferroviariaFile, this.ferroviaria);

        // Update related manager transaction if it exists
        const managerTransaction = this.gerentesAccountability.transacoes.find(
            t => t.ferroviaria_id === serviceId
        );
        if (managerTransaction) {
            managerTransaction.valor = netProfit;
            managerTransaction.categoria = total_caixas >= 2000 ? 'ferroviaria_large' : 
                                         total_caixas >= 1000 ? 'ferroviaria_medium' : 'ferroviaria_small';
            managerTransaction.descricao = `Ferroviaria: ${numero_entregas} entregas, ${total_caixas} caixas`;
            managerTransaction.weight = workloadPoints;
            managerTransaction.editado_em = new Date().toISOString();
            this.salvarArquivoJson(this.gerentesAccountabilityFile, this.gerentesAccountability);
        }

        // Update manager performance
        this.atualizarDadosGerente(manager_id);

        // Emit updates
        if (this.io) {
            this.io.emit('ferroviaria:atualizado', this.ferroviaria);
            this.io.emit('gerentes:atualizado', this.obterDadosGerentes());
        }

        return updatedEntry;
    }

    /**
     * Remover serviço ferroviário
     */
    removerServicoFerroviaria(serviceId) {
        const entregaIndex = this.ferroviaria.entregas.findIndex(e => e.id === serviceId);
        if (entregaIndex === -1) {
            throw new Error('Serviço ferroviário não encontrado');
        }

        const removedEntry = this.ferroviaria.entregas[entregaIndex];
        const managerId = removedEntry.manager_id;

        // Remove from ferroviaria
        this.ferroviaria.entregas.splice(entregaIndex, 1);
        this.ferroviaria.ultima_atualizacao = new Date().toISOString();
        this.salvarArquivoJson(this.ferroviariaFile, this.ferroviaria);

        // Remove related manager transaction if it exists
        const transactionIndex = this.gerentesAccountability.transacoes.findIndex(
            t => t.ferroviaria_id === serviceId
        );
        if (transactionIndex !== -1) {
            this.gerentesAccountability.transacoes.splice(transactionIndex, 1);
            this.salvarArquivoJson(this.gerentesAccountabilityFile, this.gerentesAccountability);
        }

        // Update manager performance if manager exists
        if (managerId) {
            this.atualizarDadosGerente(managerId);
        }

        // Emit updates
        if (this.io) {
            this.io.emit('ferroviaria:atualizado', this.ferroviaria);
            this.io.emit('gerentes:atualizado', this.obterDadosGerentes());
        }

        return { id: serviceId, removed: true };
    }

    /**
     * Registrar entrega (legacy - single delivery)
     */
    registrarEntrega(dados) {
        const entrega = {
            id: uuidv4(),
            caixas_utilizadas: dados.caixas_utilizadas,
            valor_recebido: dados.valor_recebido || this.ferroviaria.configuracao.valor_por_entrega,
            tempo_inicio: dados.tempo_inicio,
            tempo_fim: dados.tempo_fim || new Date().toISOString(),
            duracao_minutos: dados.duracao_minutos || this.ferroviaria.configuracao.tempo_por_entrega_minutos,
            trabalhador: dados.trabalhador,
            pagamento_trabalhador: dados.pagamento_trabalhador || 0
        };

        this.ferroviaria.entregas.push(entrega);
        this.ferroviaria.ultima_atualizacao = new Date().toISOString();
        this.salvarArquivoJson(this.ferroviariaFile, this.ferroviaria);
        
        if (this.io) {
            this.io.emit('ferroviaria:atualizado', this.ferroviaria);
        }
        
        return entrega;
    }

    /**
     * Calcular análise de eficiência da ferroviaria
     */
    calcularAnaliseFerroviaria() {
        const config = this.ferroviaria.configuracao;
        
        // Get boxes directly from inventory
        const caixasInventario = this.obterTiposCaixasInventario();
        const totalCaixasInventario = caixasInventario.reduce((total, caixa) => {
            return total + caixa.quantidade;
        }, 0);
        
        // Calculate weighted average cost based on box types in inventory
        let custoMedioPorCaixa = 0;
        let totalCusto = 0;
        
        caixasInventario.forEach(caixa => {
            let custoPorCaixa;
            if (caixa.id === 'caixaanimal') {
                // Use configurable cost for animal boxes
                custoPorCaixa = config.custo_caixa_animal || 0;
            } else if (caixa.id === 'caixadeverduras') {
                // Use configurable cost for plant boxes
                custoPorCaixa = config.custo_caixa_verduras || 0;
            } else {
                // Default fallback cost - average of configured costs
                custoPorCaixa = ((config.custo_caixa_animal || 0) + (config.custo_caixa_verduras || 0)) / 2;
            }
            
            totalCusto += caixa.quantidade * custoPorCaixa;
        });
        
        custoMedioPorCaixa = totalCaixasInventario > 0 ? totalCusto / totalCaixasInventario : 0;
        
        // ===== HISTORICAL DATA (COMPLETED WORK) =====
        const totalCaixasEntregues = this.ferroviaria.entregas.reduce((total, entrega) => {
            return total + entrega.caixas_utilizadas;
        }, 0);
        
        const totalEntregasCompletas = this.ferroviaria.entregas.reduce((total, entrega) => {
            return total + (entrega.numero_entregas || Math.ceil(entrega.caixas_utilizadas / config.caixas_por_entrega));
        }, 0);
        
        // Receita real total das entregas já feitas
        const receitaRealTotal = this.ferroviaria.entregas.reduce((total, entrega) => {
            return total + (entrega.gross_revenue || entrega.valor_recebido || 0);
        }, 0);
        
        // Custo real total das entregas já feitas - use current configured costs
        const custoRealTotal = this.ferroviaria.entregas.reduce((total, entrega) => {
            // Always recalculate using current configured costs
            let cost = 0;
            if (entrega.tipo_caixas) {
                cost = (entrega.tipo_caixas.caixaanimal || 0) * (config.custo_caixa_animal || 0) +
                       (entrega.tipo_caixas.caixadeverduras || 0) * (config.custo_caixa_verduras || 0);
            } else {
                // Fallback for old entries without type breakdown - use average current cost
                const avgCost = ((config.custo_caixa_animal || 0) + (config.custo_caixa_verduras || 0)) / 2;
                cost = entrega.caixas_utilizadas * avgCost;
            }
            return total + cost;
        }, 0);
        
        // ===== CURRENT CAPACITY (FUTURE POTENTIAL) =====
        // Caixas disponíveis para próximas entregas (apenas inventário atual)
        const caixasDisponiveis = totalCaixasInventario;
        
        // Each delivery needs exactly 250 boxes and pays $1000
        const entregasPossiveis = Math.floor(caixasDisponiveis / 250);
        const caixasRestantes = caixasDisponiveis % 250;
        const maximoEntregas = entregasPossiveis; // No limit, calculate all possible
        
        // Receita potencial para próximas entregas (250 boxes = $1000 each)
        const receitaPotencial = maximoEntregas * 1000; // $1000 per delivery
        const custoEntregas = maximoEntregas * 250 * custoMedioPorCaixa; // 250 boxes per delivery
        
        // ===== INVESTOR CALCULATIONS (FOR COMPLETED WORK) =====
        const investidores = Object.values(this.ferroviaria.investidores).filter(inv => inv.ativo);
        
        // Pagamentos de investidores para trabalho já realizado
        const pagamentosInvestidoresRealizados = investidores.map(investidor => {
            const pagamento = (receitaRealTotal * investidor.porcentagem) / 100;
            return {
                investidor: investidor.nome,
                funcao: investidor.funcao,
                porcentagem: investidor.porcentagem,
                pagamento: pagamento
            };
        });
        
        // Pagamentos de investidores para trabalho futuro potencial
        const pagamentosInvestidoresPotenciais = investidores.map(investidor => {
            const pagamento = (receitaPotencial * investidor.porcentagem) / 100;
            return {
                investidor: investidor.nome,
                funcao: investidor.funcao,
                porcentagem: investidor.porcentagem,
                pagamento: pagamento
            };
        });
        
        const totalPagamentosRealizados = pagamentosInvestidoresRealizados.reduce((total, pag) => total + pag.pagamento, 0);
        const totalPagamentosPotenciais = pagamentosInvestidoresPotenciais.reduce((total, pag) => total + pag.pagamento, 0);
        
        // Lucro líquido real (trabalho já realizado)
        const lucroLiquidoReal = receitaRealTotal - custoRealTotal - totalPagamentosRealizados;
        
        // Lucro líquido potencial (trabalho futuro)
        const lucroLiquidoPotencial = receitaPotencial - custoEntregas - totalPagamentosPotenciais;
        
        // Comparação com venda normal
        const vendaNormal = caixasDisponiveis * config.valor_venda_normal_caixa;
        const vantagem = receitaPotencial - vendaNormal;
        
        // Tempo estimado (10 minutes per delivery of 250 boxes)
        const tempoTotal = maximoEntregas * 10;
        
        return {
            caixas: {
                total_inventario: totalCaixasInventario,
                total_entregues: totalCaixasEntregues, // Historical: boxes delivered
                disponiveis: caixasDisponiveis, // Current: boxes available for future deliveries
                restantes_apos_entregas: caixasRestantes, // Boxes left after all possible deliveries
                custo_medio: custoMedioPorCaixa,
                detalhes_inventario: caixasInventario
            },
            entregas: {
                completadas: totalEntregasCompletas, // Historical: deliveries completed
                possiveis: entregasPossiveis, // Current: possible with current inventory
                maximo_por_refill: maximoEntregas,
                tempo_estimado_minutos: tempoTotal,
                tempo_estimado_horas: Math.round(tempoTotal / 60 * 100) / 100
            },
            financeiro: {
                // Historical (completed work)
                receita_real_total: receitaRealTotal,
                custo_real_total: custoRealTotal, 
                pagamentos_investidores: pagamentosInvestidoresRealizados,
                total_pagamentos: totalPagamentosRealizados,
                lucro_liquido: lucroLiquidoReal, // This will show in dashboard
                // Future potential (with current inventory)
                receita_ferroviaria_potencial: receitaPotencial,
                custo_total_caixas: custoEntregas,
                receita_venda_normal: vendaNormal,
                vantagem_ferroviaria: vantagem,
                lucro_potencial: lucroLiquidoPotencial,
                roi_percentage: custoRealTotal > 0 ? Math.round((lucroLiquidoReal / custoRealTotal) * 100) : 0
            },
            eficiencia: {
                // Use real data for efficiency metrics
                lucro_por_hora: totalCaixasEntregues > 0 ? Math.round((lucroLiquidoReal / (totalCaixasEntregues * config.tempo_por_entrega_minutos / 60)) * 100) / 100 : 0,
                lucro_por_caixa: totalCaixasEntregues > 0 ? Math.round((lucroLiquidoReal / totalCaixasEntregues) * 100) / 100 : 0,
                utilizacao_trem: Math.round((caixasDisponiveis / config.capacidade_maxima_trem) * 100),
                eficiencia_vs_venda: vendaNormal > 0 ? Math.round((vantagem / vendaNormal) * 100) : 0
            }
        };
    }

    /**
     * Obter tipos de caixas do inventário
     */
    obterTiposCaixasInventario() {
        const caixasTypes = [];
        const items = this.inventario.itens;
        
        // Only specific boxes used for Ferroviaria deliveries
        const allowedBoxIds = ['caixaanimal', 'caixadeverduras'];
        
        for (const [itemId, itemData] of Object.entries(items)) {
            // Only include the two specific box types
            if (allowedBoxIds.includes(itemId) && itemData.quantidade > 0) {
                const displayName = this.obterMelhorNomeExibicao(itemId);
                caixasTypes.push({
                    id: itemId,
                    nome: displayName,
                    quantidade: itemData.quantidade
                });
            }
        }
        
        console.log(`Found ${caixasTypes.length} ferroviaria box types:`, caixasTypes.map(c => c.nome));
        return caixasTypes;
    }

    /**
     * Atualizar configuração da ferroviaria
     */
    atualizarConfiguracaoFerroviaria(novaConfig) {
        this.ferroviaria.configuracao = {
            ...this.ferroviaria.configuracao,
            ...novaConfig
        };
        
        this.ferroviaria.ultima_atualizacao = new Date().toISOString();
        this.salvarArquivoJson(this.ferroviariaFile, this.ferroviaria);
        
        if (this.io) {
            this.io.emit('ferroviaria:atualizado', this.ferroviaria);
        }
        
        return this.ferroviaria.configuracao;
    }

    /**
     * Verificar remoção não autorizada de caixas
     */
    verificarRemocaoNaoAutorizada(atividade) {
        try {
            // Check if the item is a box type
            const boxTypes = ['caixaanimal', 'caixadeverduras'];
            if (!boxTypes.includes(atividade.item)) {
                return null; // Not a box removal, no warning needed
            }

            // Check if it's a removal activity
            if (atividade.tipo !== 'remover') {
                return null; // Not a removal, no warning needed
            }

            // Get user role
            const userId = this.extrairIdUsuario(atividade.autor);
            const user = this.usuarios.usuarios[userId];
            
            // Check if user is manager
            const isManager = user && (user.funcao === 'gerente' || this.usuarios.funcoes.gerente.includes(userId));
            
            if (isManager) {
                return null; // Manager removal is authorized
            }

            // Non-manager removed boxes - create warning
            const warning = {
                id: uuidv4(),
                atividade_id: atividade.id,
                usuario: atividade.autor,
                item: atividade.item,
                quantidade: atividade.quantidade,
                timestamp: atividade.timestamp,
                display_name: this.obterMelhorNomeExibicao(atividade.item),
                tipo: 'unauthorized_box_removal',
                status: 'pending', // pending, approved, ignored, reversed
                criado_em: new Date().toISOString()
            };

            return warning;
        } catch (error) {
            console.error('Erro ao verificar remoção não autorizada:', error);
            return null;
        }
    }

    /**
     * Obter avisos pendentes de remoção não autorizada
     */
    obterAvisosPendentes() {
        // Check recent activities for unauthorized box removals
        const warnings = [];
        const recentActivities = this.atividades.atividades_recentes.slice(-100); // Check last 100 activities

        recentActivities.forEach(atividade => {
            const warning = this.verificarRemocaoNaoAutorizada(atividade);
            if (warning) {
                warnings.push(warning);
            }
        });

        return warnings;
    }

    /**
     * Aprovar aviso de remoção
     */
    aprovarAvisoRemocao(warningId) {
        // For now, just mark as approved - could store in a warnings file if needed
        console.log(`Aviso aprovado: ${warningId}`);
        return true;
    }

    /**
     * Reverter remoção não autorizada
     */
    reverterRemocaoNaoAutorizada(warningId, atividade) {
        try {
            // Add the items back to inventory
            this.adicionarItem(atividade.item, atividade.quantidade, 'Sistema - Reversão de Remoção');
            
            console.log(`Remoção revertida: ${atividade.quantidade}x ${atividade.item} adicionado de volta ao inventário`);
            return true;
        } catch (error) {
            console.error('Erro ao reverter remoção:', error);
            return false;
        }
    }

    /**
     * Atualizar quantidade de item no inventário
     */
    atualizarQuantidadeInventario(itemId, novaQuantidade) {
        if (!this.inventario.itens[itemId]) {
            throw new Error('Item não encontrado no inventário');
        }

        const item = this.inventario.itens[itemId];
        const quantidadeAnterior = item.quantidade;
        
        item.quantidade = parseInt(novaQuantidade);
        item.atualizado_em = new Date().toISOString();
        item.ultima_atualizacao = new Date().toISOString();

        this.inventario.ultima_atualizacao = new Date().toISOString();
        this.salvarArquivoJson(this.inventarioFile, this.inventario);

        // Log da alteração manual
        this.registrarAtividadeDiscord('ajuste_manual', {
            item: itemId,
            quantidade: novaQuantidade - quantidadeAnterior,
            autor: 'Sistema - Ajuste Manual',
            displayName: this.obterMelhorNomeExibicao(itemId),
            observacao: `Quantidade alterada de ${quantidadeAnterior} para ${novaQuantidade}`
        });

        if (this.io) {
            this.io.emit('inventario:atualizado', this.inventario);
        }

        return item;
    }

    // ================================
    // MANAGER ACCOUNTABILITY METHODS
    // ================================

    /**
     * Obter dados completos dos gerentes
     */
    obterDadosGerentes() {
        // Ensure balance data is loaded
        if (!this.balanceData) {
            this.balanceData = this.carregarArquivoJson(this.saldoFazendaFile, {
                saldo_atual: 10000,
                ultima_atualizacao: new Date().toISOString(),
                historico_saldos: []
            });
        }

        // Get current farm balance and calculate available funds for distribution
        const saldoAtual = this.balanceData.saldo_atual || 0;
        const capitalMinimo = 10000;
        const fundosDisponiveis = Math.max(0, saldoAtual - capitalMinimo);

        // Calculate workload for all active managers
        const gerentesAtivos = {};
        const workloadData = {};
        let workloadTotal = 0;

        for (const [userId, userData] of Object.entries(this.usuarios.usuarios)) {
            if (['gerente', 'supervisor'].includes(userData.funcao) && userData.ativo !== false) {
                const workload = this.calcularWorkloadGerente(userId);
                gerentesAtivos[userId] = {
                    ...userData,
                    id: userId,
                    workload: workload
                };
                workloadData[userId] = workload;
                workloadTotal += workload.pontos_total;
            }
        }

        // Calculate payment amounts based on workload percentages
        const pagamentos = {};
        for (const [userId, workload] of Object.entries(workloadData)) {
            if (workloadTotal > 0) {
                const percentual = (workload.pontos_total / workloadTotal) * 100;
                const valorPagamento = (percentual / 100) * fundosDisponiveis;
                pagamentos[userId] = {
                    percentual_workload: Math.round(percentual * 100) / 100,
                    valor_pagamento: Math.round(valorPagamento * 100) / 100
                };
            } else {
                pagamentos[userId] = {
                    percentual_workload: 0,
                    valor_pagamento: 0
                };
            }
        }

        return {
            saldo_atual: saldoAtual,
            capital_minimo: capitalMinimo,
            fundos_disponiveis: Math.round(fundosDisponiveis * 100) / 100,
            workload_total: workloadTotal,
            gerentes: gerentesAtivos,
            pagamentos: pagamentos,
            estatisticas: {
                total_gerentes: Object.keys(gerentesAtivos).length,
                gerentes_ativos: Object.values(gerentesAtivos).filter(g => g.ativo !== false).length,
                total_nao_pago: Object.values(pagamentos).reduce((sum, p) => sum + p.valor_pagamento, 0),
                ultima_atualizacao: new Date().toISOString()
            }
        };
    }

    /**
     * Calcular workload de um gerente baseado em serviços realizados
     */
    calcularWorkloadGerente(managerId) {
        const manager = this.usuarios.usuarios[managerId];
        if (!manager || !['gerente', 'supervisor'].includes(manager.funcao)) {
            return {
                pontos_total: 0,
                servicos: {
                    plantacao: { quantidade: 0, pontos: 0 },
                    animais: { quantidade: 0, pontos: 0 },
                    ferroviaria: { quantidade: 0, pontos: 0 },
                    restock: { quantidade: 0, pontos: 0 }
                },
                ultima_atividade: null
            };
        }

        // Get last payment timestamp to only count services after payment
        const ultimoPagamento = this.obterUltimoPagamentoGerente(managerId);
        const timestampCorte = ultimoPagamento ? ultimoPagamento.timestamp : null;

        // Calculate plantation services (plants returned)
        const servicosPlantacao = this.calcularServicosPlantacao(managerId, timestampCorte);
        
        // Calculate animal services ($160 deposits)
        const servicosAnimais = this.calcularServicosAnimais(managerId, timestampCorte);
        
        // Calculate ferroviaria services (box deliveries)
        const servicosFerroviaria = this.calcularServicosFerroviaria(managerId, timestampCorte);
        
        // Calculate restock services (inventory additions)
        const servicosRestock = this.calcularServicosRestock(managerId, timestampCorte);

        // Scoring system (points per service type)
        const pontosPorServico = {
            plantas: 0.1,      // 0.1 points per plant
            animais: 10,       // 10 points per animal delivery ($160)
            ferroviaria: 20,   // 20 points per ferroviaria delivery
            restock: 1         // 1 point per restock transaction
        };

        const pontosTotais = 
            (servicosPlantacao.quantidade * pontosPorServico.plantas) +
            (servicosAnimais.quantidade * pontosPorServico.animais) +
            (servicosFerroviaria.quantidade * pontosPorServico.ferroviaria) +
            (servicosRestock.quantidade * pontosPorServico.restock);

        // Get most recent activity timestamp
        const ultimaAtividade = this.obterUltimaAtividadeGerente(managerId, timestampCorte);

        return {
            pontos_total: Math.round(pontosTotais * 100) / 100,
            servicos: {
                plantacao: {
                    quantidade: servicosPlantacao.quantidade,
                    pontos: Math.round(servicosPlantacao.quantidade * pontosPorServico.plantas * 100) / 100,
                    detalhes: servicosPlantacao.detalhes
                },
                animais: {
                    quantidade: servicosAnimais.quantidade,
                    pontos: Math.round(servicosAnimais.quantidade * pontosPorServico.animais * 100) / 100,
                    detalhes: servicosAnimais.detalhes
                },
                ferroviaria: {
                    quantidade: servicosFerroviaria.quantidade,
                    pontos: Math.round(servicosFerroviaria.quantidade * pontosPorServico.ferroviaria * 100) / 100,
                    detalhes: servicosFerroviaria.detalhes
                },
                restock: {
                    quantidade: servicosRestock.quantidade,
                    pontos: Math.round(servicosRestock.quantidade * pontosPorServico.restock * 100) / 100,
                    detalhes: servicosRestock.detalhes
                }
            },
            ultima_atividade: ultimaAtividade,
            ultimo_pagamento: ultimoPagamento
        };
    }

    /**
     * Calcular serviços de plantação (plantas retornadas pelo gerente)
     */
    calcularServicosPlantacao(managerId, timestampCorte) {
        const atividadesPlantacao = this.discord.atividades_recentes.filter(atividade => {
            if (timestampCorte && new Date(atividade.timestamp) <= new Date(timestampCorte)) {
                return false;
            }

            const userId = this.extrairIdUsuario(atividade.autor);
            if (userId !== managerId || atividade.tipo !== 'adicionar' || atividade.categoria !== 'inventario') {
                return false;
            }

            // Check if it's a plant (not seed, not animal, not tool)
            const itemId = atividade.item?.toLowerCase() || '';
            return this.isPlantItem(itemId);
        });

        let totalPlantas = 0;
        const detalhes = [];

        for (const atividade of atividadesPlantacao) {
            const quantidade = atividade.quantidade || 0;
            totalPlantas += quantidade;
            detalhes.push({
                timestamp: atividade.timestamp,
                item: atividade.item,
                item_display: this.obterMelhorNomeExibicao(atividade.item),
                quantidade: quantidade
            });
        }

        return {
            quantidade: totalPlantas,
            detalhes: detalhes.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        };
    }

    /**
     * Calcular serviços de animais ($160 depósitos pelo gerente)
     */
    calcularServicosAnimais(managerId, timestampCorte) {
        const managerData = this.usuarios.usuarios[managerId];
        if (!managerData) return { quantidade: 0, detalhes: [] };
        
        const depositosAnimais = this.discord.atividades_recentes.filter(atividade => {
            if (timestampCorte && new Date(atividade.timestamp) <= new Date(timestampCorte)) {
                return false;
            }

            // Enhanced user matching for animal services
            const userId = this.extrairIdUsuario(atividade.autor);
            if (userId === managerId) {
                return atividade.tipo === 'deposito' && atividade.valor === 160;
            }
            
            // Fallback: match by name for historical data without FIXO ID
            if (!userId && atividade.autor && atividade.autor.trim() === managerData.nome.trim()) {
                return atividade.tipo === 'deposito' && atividade.valor === 160;
            }
            
            return false;
        });

        const detalhes = depositosAnimais.map(atividade => ({
            timestamp: atividade.timestamp,
            valor: atividade.valor,
            descricao: atividade.descricao || 'Entrega de animais'
        })).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        return {
            quantidade: depositosAnimais.length,
            detalhes: detalhes
        };
    }

    /**
     * Calcular serviços de ferroviária (entregas registradas)
     */
    calcularServicosFerroviaria(managerId, timestampCorte) {
        if (!this.ferroviaria || !this.ferroviaria.entregas) {
            return { quantidade: 0, detalhes: [] };
        }

        const entregasFerroviaria = this.ferroviaria.entregas.filter(entrega => {
            if (timestampCorte && entrega.tempo_inicio && new Date(entrega.tempo_inicio) <= new Date(timestampCorte)) {
                return false;
            }
            return entrega.manager_id === managerId;
        });

        const detalhes = entregasFerroviaria.map(entrega => ({
            timestamp: entrega.tempo_inicio || entrega.timestamp,
            caixas_utilizadas: entrega.caixas_utilizadas || 0,
            valor_total: entrega.valor_recebido || 0,
            lucro_liquido: entrega.net_profit || 0,
            numero_entregas: entrega.numero_entregas || 1
        })).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        return {
            quantidade: entregasFerroviaria.length,
            detalhes: detalhes
        };
    }

    /**
     * Calcular serviços de restock (itens adicionados ao inventário)
     */
    calcularServicosRestock(managerId, timestampCorte) {
        const atividadesRestock = this.discord.atividades_recentes.filter(atividade => {
            if (timestampCorte && new Date(atividade.timestamp) <= new Date(timestampCorte)) {
                return false;
            }

            const userId = this.extrairIdUsuario(atividade.autor);
            if (userId !== managerId || atividade.tipo !== 'adicionar' || atividade.categoria !== 'inventario') {
                return false;
            }

            // Only count restocking items (seeds, animals, tools, food/drinks, but not plants)
            const itemId = atividade.item?.toLowerCase() || '';
            return !this.isPlantItem(itemId); // Exclude plants (those are plantation services)
        });

        let totalTransacoes = 0;
        const detalhesPorTipo = {};

        for (const atividade of atividadesRestock) {
            const itemDisplay = this.obterMelhorNomeExibicao(atividade.item);
            const categoria = this.categorizarItemRestock(atividade.item);
            
            if (!detalhesPorTipo[categoria]) {
                detalhesPorTipo[categoria] = [];
            }
            
            detalhesPorTipo[categoria].push({
                timestamp: atividade.timestamp,
                item: atividade.item,
                item_display: itemDisplay,
                quantidade: atividade.quantidade || 0
            });
            
            totalTransacoes++;
        }

        // Sort details by timestamp (newest first)
        for (const categoria in detalhesPorTipo) {
            detalhesPorTipo[categoria].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        }

        return {
            quantidade: totalTransacoes,
            detalhes: detalhesPorTipo
        };
    }

    /**
     * Helper: Check if item is a plant (for plantation services)
     */
    isPlantItem(itemId) {
        const plantItems = [
            'corn', 'bulrush', 'trigo', 'milho', 'junco',
            'apple', 'maconha', 'cannabis', 'strawberry', 'morango',
            'black_currant', 'groselha', 'blackberry', 'amora',
            'lemon', 'limao', 'orange', 'laranja',
            'parasol_mushroom', 'cogumelo'
        ];
        
        return plantItems.some(plant => itemId.includes(plant)) && 
               !itemId.includes('seed') && !itemId.includes('semente');
    }

    /**
     * Helper: Categorize restock items
     */
    categorizarItemRestock(itemId) {
        const itemLower = itemId.toLowerCase();
        
        if (itemLower.includes('seed') || itemLower.includes('semente')) {
            return 'Sementes';
        }
        if (itemLower.includes('animal') || this.isAnimalItem(itemId)) {
            return 'Animais';
        }
        if (itemLower.includes('racao') || itemLower.includes('feed')) {
            return 'Ração';
        }
        if (itemLower.includes('bucket') || itemLower.includes('balde') || 
            itemLower.includes('tool') || itemLower.includes('ferramenta')) {
            return 'Ferramentas';
        }
        if (itemLower.includes('food') || itemLower.includes('drink') || 
            itemLower.includes('comida') || itemLower.includes('bebida')) {
            return 'Consumíveis';
        }
        
        return 'Outros';
    }

    /**
     * Helper: Check if item is an animal
     */
    isAnimalItem(itemId) {
        const animalItems = [
            'carneiro', 'ovelha', 'sheep', 'bode', 'cabra', 'goat',
            'galo', 'galinha', 'chicken', 'porco', 'porca', 'pig',
            'vaca', 'touro', 'cow', 'mula', 'burro', 'donkey'
        ];
        
        return animalItems.some(animal => itemId.toLowerCase().includes(animal));
    }

    /**
     * Obter último pagamento de um gerente
     */
    obterUltimoPagamentoGerente(managerId) {
        if (!this.pagamentosGerentes) {
            this.pagamentosGerentes = this.carregarArquivoJson(this.pagamentosGerentesFile) || {
                pagamentos: [],
                ultima_atualizacao: new Date().toISOString()
            };
        }

        // Ensure pagamentos array exists
        if (!this.pagamentosGerentes.pagamentos) {
            this.pagamentosGerentes.pagamentos = [];
        }

        const pagamentos = this.pagamentosGerentes.pagamentos.filter(p => p.manager_id === managerId);
        return pagamentos.length > 0 ? 
               pagamentos.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0] : 
               null;
    }

    /**
     * Obter última atividade de um gerente
     */
    obterUltimaAtividadeGerente(managerId, timestampCorte) {
        const atividades = this.discord.atividades_recentes.filter(atividade => {
            if (timestampCorte && new Date(atividade.timestamp) <= new Date(timestampCorte)) {
                return false;
            }
            const userId = this.extrairIdUsuario(atividade.autor);
            return userId === managerId;
        });

        return atividades.length > 0 ? 
               atividades.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0].timestamp :
               null;
    }

    /**
     * Processar pagamento para um gerente
     */
    processarPagamentoGerente(managerId, valor, descricao = 'Pagamento baseado em workload') {
        if (!this.pagamentosGerentes) {
            this.pagamentosGerentes = this.carregarArquivoJson(this.pagamentosGerentesFile) || {
                pagamentos: [],
                ultima_atualizacao: new Date().toISOString()
            };
        }

        const manager = this.usuarios.usuarios[managerId];
        if (!manager || !['gerente', 'supervisor'].includes(manager.funcao)) {
            throw new Error('Usuário não é um gerente válido');
        }

        // Check if there are sufficient funds
        const saldoAtual = this.balanceData.saldo_atual || 0;
        const capitalMinimo = 10000;
        const fundosDisponiveis = Math.max(0, saldoAtual - capitalMinimo);

        if (valor > fundosDisponiveis) {
            throw new Error(`Fundos insuficientes. Disponível: $${fundosDisponiveis.toFixed(2)}, Solicitado: $${valor.toFixed(2)}`);
        }

        if (valor < 0.01) {
            throw new Error('Valor do pagamento deve ser pelo menos $0.01');
        }

        // Create payment record
        const pagamento = {
            id: uuidv4(),
            manager_id: managerId,
            manager_nome: manager.nome,
            valor: Math.round(valor * 100) / 100,
            descricao,
            timestamp: new Date().toISOString(),
            workload_snapshot: this.calcularWorkloadGerente(managerId)
        };

        // Add payment to history
        this.pagamentosGerentes.pagamentos.push(pagamento);
        this.pagamentosGerentes.ultima_atualizacao = new Date().toISOString();

        // Deduct from farm balance
        this.atualizarSaldoAtual(saldoAtual - valor);

        // Save data
        this.salvarArquivoJson(this.pagamentosGerentesFile, this.pagamentosGerentes);

        // Emit real-time update
        if (this.io) {
            this.io.emit('gerentes:atualizado', this.obterDadosGerentes());
            this.io.emit('dashboard:atualizado', { 
                saldo_atual: this.balanceData.saldo_atual,
                ultimo_pagamento: pagamento 
            });
        }

        return pagamento;
    }

    /**
     * Processar pagamento para todos os gerentes baseado em workload
     */
    processarPagamentoTodosGerentes() {
        const dadosGerentes = this.obterDadosGerentes();
        const { fundos_disponiveis, pagamentos } = dadosGerentes;

        if (fundos_disponiveis < 0.01) {
            throw new Error('Não há fundos suficientes para distribuir (mínimo $0.01)');
        }

        const pagamentosRealizados = [];
        const erros = [];

        for (const [managerId, dadosPagamento] of Object.entries(pagamentos)) {
            if (dadosPagamento.valor_pagamento >= 0.01) {
                try {
                    const pagamento = this.processarPagamentoGerente(
                        managerId, 
                        dadosPagamento.valor_pagamento,
                        `Pagamento automático baseado em ${dadosPagamento.percentual_workload}% do workload total`
                    );
                    pagamentosRealizados.push(pagamento);
                } catch (error) {
                    erros.push({
                        manager_id: managerId,
                        manager_nome: this.usuarios.usuarios[managerId]?.nome || 'Unknown',
                        error: error.message
                    });
                }
            }
        }

        return {
            pagamentos_realizados: pagamentosRealizados,
            total_pago: pagamentosRealizados.reduce((sum, p) => sum + p.valor, 0),
            erros: erros
        };
    }

    /**
     * Obter histórico de pagamentos de um gerente
     */
    obterHistoricoPagamentos(managerId = null, limite = 50) {
        if (!this.pagamentosGerentes) {
            this.pagamentosGerentes = this.carregarArquivoJson(this.pagamentosGerentesFile) || {
                pagamentos: [],
                ultima_atualizacao: new Date().toISOString()
            };
        }

        let pagamentos = this.pagamentosGerentes.pagamentos;

        if (managerId) {
            pagamentos = pagamentos.filter(p => p.manager_id === managerId);
        }

        return pagamentos
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, limite);
    }

    /**
     * Marcar serviços como pagos (para excluir de futuros cálculos de workload)
     */
    marcarServicosPagos(managerId, timestampPagamento) {
        // This is handled automatically by the calcularWorkloadGerente method
        // which uses the timestamp of the last payment to filter out paid services
        console.log(`Serviços marcados como pagos para ${managerId} em ${timestampPagamento}`);
        
        // Services are automatically excluded from workload calculation after payment timestamp
        return true;
    }

    /**
     * Processar transações de gerentes e criar expectativas
     */
    processarTransacaoGerente(userId, transacao) {
        const manager = this.usuarios.usuarios[userId];
        if (!manager || manager.funcao !== 'gerente') {
            throw new Error('Usuário não é um gerente');
        }

        // Adicionar transação ao histórico
        const transacaoCompleta = {
            id: uuidv4(),
            manager_id: userId,
            manager_nome: manager.nome,
            ...transacao,
            timestamp: new Date().toISOString()
        };

        this.gerentesAccountability.transacoes.push(transacaoCompleta);

        // Criar expectativas baseadas no tipo de transação
        const expectativa = this.criarExpectativa(transacaoCompleta);
        if (expectativa) {
            this.gerentesAccountability.expectativas.push(expectativa);
        }

        // Atualizar performance
        this.atualizarDadosGerente(userId);

        // Salvar dados
        this.salvarArquivoJson(this.gerentesAccountabilityFile, this.gerentesAccountability);

        if (this.io) {
            this.io.emit('gerentes:atualizado', this.gerentesAccountability);
        }

        return transacaoCompleta;
    }

    /**
     * Criar expectativa baseada na transação
     */
    criarExpectativa(transacao) {
        const expectativa = {
            id: uuidv4(),
            transacao_id: transacao.id,
            manager_id: transacao.manager_id,
            timestamp: transacao.timestamp,
            status: 'pendente'
        };

        // Seeds → Plants (using EXISTING category names)
        if (transacao.tipo === 'remover' && transacao.categoria === 'seeds_out') {
            expectativa.tipo = 'plantas';
            expectativa.quantidade_esperada = transacao.quantidade * 10; // 1 seed = 10 plants
            expectativa.prazo = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours
            expectativa.descricao = `Esperando ${expectativa.quantidade_esperada} plantas de ${transacao.quantidade} sementes`;
        }
        // Animals + Feed → $160 deposit (using EXISTING category names)
        else if (transacao.tipo === 'remover' && transacao.categoria === 'animals_out') {
            expectativa.tipo = 'deposito';
            expectativa.valor_esperado = Math.floor(transacao.quantidade / 4) * 160;
            expectativa.prazo = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(); // 2 hours
            expectativa.descricao = `Esperando depósito de $${expectativa.valor_esperado} de ${transacao.quantidade} animais`;
        }
        // Money withdrawal → Materials or payment
        else if (transacao.tipo === 'saque') {
            expectativa.tipo = 'justificativa';
            expectativa.valor = transacao.valor;
            expectativa.requer_edicao = true;
            expectativa.descricao = `Requer justificativa para saque de $${transacao.valor}`;
        }
        // Boxes → Ferroviaria revenue
        else if (transacao.tipo === 'remover' && transacao.item && transacao.item.toLowerCase().includes('caixa')) {
            expectativa.tipo = 'ferroviaria';
            const entregas = Math.floor(transacao.quantidade / 250);
            expectativa.valor_esperado = entregas * 1000;
            expectativa.prazo = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(); // 4 hours
            expectativa.descricao = `Esperando $${expectativa.valor_esperado} da ferroviária (${entregas} entregas)`;
        }
        else {
            return null; // No expectation for this transaction type
        }

        return expectativa;
    }

    /**
     * Reconciliar transações com retornos
     */
    reconciliarTransacoes(managerId) {
        const expectativasPendentes = this.gerentesAccountability.expectativas.filter(
            e => e.manager_id === managerId && e.status === 'pendente'
        );

        const transacoesRecentes = this.discord.atividades_recentes.filter(
            a => {
                const userId = this.extrairIdUsuario(a.autor);
                return userId === managerId;
            }
        );

        for (const expectativa of expectativasPendentes) {
            // Check for matching returns
            let cumprida = false;

            if (expectativa.tipo === 'plantas') {
                // Look for plant deposits
                const plantasRetornadas = transacoesRecentes.filter(
                    t => t.tipo === 'adicionar' && 
                    t.categoria === 'inventario' &&
                    new Date(t.timestamp) > new Date(expectativa.timestamp)
                ).reduce((sum, t) => sum + (t.quantidade || 0), 0);

                if (plantasRetornadas >= expectativa.quantidade_esperada * 0.8) {
                    cumprida = true;
                    expectativa.quantidade_real = plantasRetornadas;
                    expectativa.eficiencia = (plantasRetornadas / expectativa.quantidade_esperada) * 100;
                }
            }
            else if (expectativa.tipo === 'deposito') {
                // Look for money deposits
                const depositos = transacoesRecentes.filter(
                    t => t.tipo === 'deposito' && 
                    t.valor === 160 &&
                    new Date(t.timestamp) > new Date(expectativa.timestamp)
                );

                if (depositos.length > 0) {
                    cumprida = true;
                    expectativa.valor_real = depositos.reduce((sum, d) => sum + d.valor, 0);
                    expectativa.eficiencia = (expectativa.valor_real / expectativa.valor_esperado) * 100;
                }
            }
            else if (expectativa.tipo === 'ferroviaria') {
                // Check ferroviaria deliveries
                const entregas = this.ferroviaria.entregas.filter(
                    e => e.responsavel_id === managerId &&
                    new Date(e.timestamp) > new Date(expectativa.timestamp)
                );

                const valorTotal = entregas.reduce((sum, e) => sum + (e.valor_total || 0), 0);
                if (valorTotal >= expectativa.valor_esperado * 0.8) {
                    cumprida = true;
                    expectativa.valor_real = valorTotal;
                    expectativa.eficiencia = (valorTotal / expectativa.valor_esperado) * 100;
                }
            }

            if (cumprida) {
                expectativa.status = 'cumprida';
                expectativa.reconciliado_em = new Date().toISOString();

                // Create reconciliation record
                this.gerentesAccountability.reconciliacao.push({
                    id: uuidv4(),
                    expectativa_id: expectativa.id,
                    manager_id: managerId,
                    tipo: expectativa.tipo,
                    esperado: expectativa.quantidade_esperada || expectativa.valor_esperado,
                    real: expectativa.quantidade_real || expectativa.valor_real,
                    eficiencia: expectativa.eficiencia,
                    timestamp: new Date().toISOString()
                });
            }
            else if (new Date() > new Date(expectativa.prazo)) {
                expectativa.status = 'vencida';
                expectativa.vencido_em = new Date().toISOString();

                // DISABLED: Accountability system was creating fake debts for managers
                // Managers don't need to fulfill worker expectations like animal deliveries
                // this.atualizarCreditoGerente(managerId, -(expectativa.valor_esperado || 0), 
                //     `Expectativa não cumprida: ${expectativa.descricao}`);
            }
        }

        this.salvarArquivoJson(this.gerentesAccountabilityFile, this.gerentesAccountability);
        return this.gerentesAccountability.reconciliacao.filter(r => r.manager_id === managerId);
    }

    /**
     * Atualizar crédito/débito do gerente
     */
    atualizarCreditoGerente(managerId, valor, descricao) {
        if (!this.gerentesAccountability.creditos[managerId]) {
            const manager = this.usuarios.usuarios[managerId];
            this.gerentesAccountability.creditos[managerId] = {
                nome: manager?.nome || 'Unknown',
                saldo: 0,
                historico: []
            };
        }

        this.gerentesAccountability.creditos[managerId].saldo += valor;
        this.gerentesAccountability.creditos[managerId].historico.push({
            id: uuidv4(),
            valor,
            descricao,
            saldo_apos: this.gerentesAccountability.creditos[managerId].saldo,
            timestamp: new Date().toISOString()
        });

        this.salvarArquivoJson(this.gerentesAccountabilityFile, this.gerentesAccountability);
    }

    /**
     * Add payment to log and update last payment dates
     */
    // Payment log methods removed
    
    // Payment log methods removed

    /**
     * Reset erroneous negative balances caused by broken accountability system
     */
    resetErroneousNegativeBalances() {
        const resetDetails = [];

        for (const [managerId, credito] of Object.entries(this.gerentesAccountability.creditos)) {
            if (credito.saldo < 0) {
                const oldBalance = credito.saldo;
                
                // Reset balance to zero
                credito.saldo = 0;
                
                // Add correction entry to history
                credito.historico.push({
                    id: uuidv4(),
                    valor: -oldBalance, // Positive value to cancel negative
                    descricao: `CORREÇÃO: Reset de saldo negativo errôneo (accountability system corrigido)`,
                    saldo_apos: 0,
                    timestamp: new Date().toISOString()
                });

                resetDetails.push({
                    managerId,
                    nome: credito.nome,
                    oldBalance,
                    correction: -oldBalance
                });
            }
        }

        if (resetDetails.length > 0) {
            this.salvarArquivoJson(this.gerentesAccountabilityFile, this.gerentesAccountability);
        }

        return {
            resetCount: resetDetails.length,
            resetDetails
        };
    }

    /**
     * Basic manager data update (simplified)
     */
    atualizarDadosGerente(managerId) {
        // Simple data update without complex calculations
        if (!this.gerentesAccountability.performance) {
            this.gerentesAccountability.performance = {};
        }
        
        this.gerentesAccountability.performance[managerId] = {
            nome: this.usuarios.usuarios[managerId]?.nome || 'Unknown'
        };
    }

    // All efficiency calculation methods removed - basic managers only

    // Efficiency calculation methods removed

    // Workload calculation method removed
    
    // Weight calculation methods removed

    /**
     * Editar razão de transação (para saques de dinheiro)
     */
    editarRazaoTransacao(transacaoId, razao, valorJustificado) {
        const transacao = this.gerentesAccountability.transacoes.find(t => t.id === transacaoId);
        if (!transacao) {
            throw new Error('Transação não encontrada');
        }

        transacao.razao = razao;
        transacao.valor_justificado = valorJustificado;
        transacao.editado_em = new Date().toISOString();

        // Update expectation if exists
        const expectativa = this.gerentesAccountability.expectativas.find(e => e.transacao_id === transacaoId);
        if (expectativa) {
            expectativa.razao = razao;
            expectativa.status = 'justificada';
            expectativa.justificado_em = new Date().toISOString();

            // Update credit if justified
            const diferenca = (transacao.valor || 0) - (valorJustificado || 0);
            if (diferenca !== 0) {
                this.atualizarCreditoGerente(transacao.manager_id, diferenca, 
                    `Ajuste de justificativa: ${razao}`);
            }
        }

        this.salvarArquivoJson(this.gerentesAccountabilityFile, this.gerentesAccountability);

        if (this.io) {
            this.io.emit('gerentes:atualizado', this.gerentesAccountability);
        }

        return transacao;
    }

    /**
     * Obter relatório de accountability do gerente
     */
    obterRelatorioGerente(managerId) {
        const transacoes = this.gerentesAccountability.transacoes.filter(t => t.manager_id === managerId);
        const expectativas = this.gerentesAccountability.expectativas.filter(e => e.manager_id === managerId);
        const reconciliacoes = this.gerentesAccountability.reconciliacao.filter(r => r.manager_id === managerId);
        const credito = this.gerentesAccountability.creditos[managerId] || { saldo: 0, historico: [] };
        const performance = this.gerentesAccountability.performance[managerId] || {};

        // Group transactions by category
        const transacoesPorCategoria = {
            sementes: transacoes.filter(t => t.categoria === 'sementes'),
            animais: transacoes.filter(t => t.categoria === 'animais'),
            dinheiro: transacoes.filter(t => t.tipo === 'saque'),
            ferroviaria: transacoes.filter(t => t.item && t.item.toLowerCase().includes('caixa')),
            outros: transacoes.filter(t => 
                t.categoria !== 'sementes' && 
                t.categoria !== 'animais' && 
                t.tipo !== 'saque' && 
                (!t.item || !t.item.toLowerCase().includes('caixa'))
            )
        };

        // Calculate pending expectations
        const expectativasPendentes = expectativas.filter(e => e.status === 'pendente');
        const expectativasCumpridas = expectativas.filter(e => e.status === 'cumprida');
        const expectativasVencidas = expectativas.filter(e => e.status === 'vencida');

        return {
            manager: this.usuarios.usuarios[managerId],
            resumo: {
                total_transacoes: transacoes.length,
                total_expectativas: expectativas.length,
                expectativas_pendentes: expectativasPendentes.length,
                expectativas_cumpridas: expectativasCumpridas.length,
                expectativas_vencidas: expectativasVencidas.length,
                saldo_credito: credito.saldo,
                workload_percentual: performance.workload_percentual || 0
            },
            transacoes_por_categoria: transacoesPorCategoria,
            expectativas: {
                pendentes: expectativasPendentes,
                cumpridas: expectativasCumpridas,
                vencidas: expectativasVencidas
            },
            reconciliacoes,
            credito,
            performance
        };
    }

    // ===========================================
    // MANAGER PAYMENT SYSTEM - REMOVED
    // ===========================================

    // Payment processing method removed

    /**
     * Adicionar/editar gerente ou supervisor
     */
    adicionarEditarGerente(userId, dados) {
        const { nome, funcao, ativo, pagamento_semanal } = dados;
        
        if (!['gerente', 'supervisor'].includes(funcao)) {
            throw new Error('Função deve ser "gerente" ou "supervisor"');
        }

        // Atualizar usuário
        if (!this.usuarios.usuarios[userId]) {
            this.usuarios.usuarios[userId] = {};
        }

        this.usuarios.usuarios[userId] = {
            ...this.usuarios.usuarios[userId],
            nome,
            funcao,
            ativo: ativo !== undefined ? ativo : true,
            atualizado_em: new Date().toISOString()
        };

        // Para supervisores, adicionar pagamento semanal
        if (funcao === 'supervisor' && pagamento_semanal) {
            this.usuarios.usuarios[userId].pagamento_semanal = pagamento_semanal;
        }

        // Atualizar listas de função
        if (!this.usuarios.funcoes[funcao]) {
            this.usuarios.funcoes[funcao] = [];
        }

        // Remover de outras funções
        for (const [funcaoAtual, usuarios] of Object.entries(this.usuarios.funcoes)) {
            const index = usuarios.indexOf(userId);
            if (index > -1) {
                usuarios.splice(index, 1);
            }
        }

        // Adicionar à nova função
        if (!this.usuarios.funcoes[funcao].includes(userId)) {
            this.usuarios.funcoes[funcao].push(userId);
        }

        // Inicializar dados de accountability se necessário
        if (!this.gerentesAccountability.creditos[userId]) {
            this.gerentesAccountability.creditos[userId] = {
                nome,
                saldo: 0,
                historico: []
            };
        } else {
            this.gerentesAccountability.creditos[userId].nome = nome;
        }

        // Salvar dados
        this.salvarArquivoJson(this.usuariosFile, this.usuarios);
        this.salvarArquivoJson(this.gerentesAccountabilityFile, this.gerentesAccountability);

        // Emit updates
        if (this.io) {
            this.io.emit('usuarios:atualizado', this.usuarios);
            this.io.emit('gerentes:atualizado', this.gerentesAccountability);
        }

        return this.usuarios.usuarios[userId];
    }

    /**
     * Remover gerente (marcar como inativo)
     */
    removerGerente(userId) {
        const usuario = this.usuarios.usuarios[userId];
        if (!usuario) {
            throw new Error('Usuário não encontrado');
        }

        if (!['gerente', 'supervisor'].includes(usuario.funcao)) {
            throw new Error('Usuário não é gerente ou supervisor');
        }

        // DEMOTE to worker, DON'T DELETE from system
        usuario.funcao = 'trabalhador';
        usuario.demovido_em = new Date().toISOString();
        delete usuario.removido_em; // Remove any existing deletion mark
        
        // Remove from manager roles, add to worker role
        if (this.usuarios.funcoes.gerente) {
            this.usuarios.funcoes.gerente = this.usuarios.funcoes.gerente.filter(id => id !== userId);
        }
        if (this.usuarios.funcoes.supervisor) {
            this.usuarios.funcoes.supervisor = this.usuarios.funcoes.supervisor.filter(id => id !== userId);
        }
        if (!this.usuarios.funcoes.trabalhador.includes(userId)) {
            this.usuarios.funcoes.trabalhador.push(userId);
        }

        // Salvar dados
        this.salvarArquivoJson(this.usuariosFile, this.usuarios);

        // Emit updates
        if (this.io) {
            this.io.emit('usuarios:atualizado', this.usuarios);
            this.io.emit('gerentes:atualizado', this.gerentesAccountability);
        }

        return usuario;
    }

    /**
     * Obter overview de estatísticas gerenciais
     */
    obterOverviewGerencial() {
        // Simple overview - just basic manager counts
        const dados = this.obterDadosGerentes();
        const gerentes = Object.values(dados.gerentes).filter(g => 
            g.ativo !== false && g.funcao === 'gerente'
        );
        const supervisores = Object.values(dados.gerentes).filter(g => 
            g.ativo !== false && g.funcao === 'supervisor'
        );

        return {
            total_gerentes_ativos: gerentes.length,
            total_supervisores_ativos: supervisores.length
        };
    }

    // =====================================
    // STOCK MANAGEMENT METHODS
    // =====================================

    /**
     * Obter todas as configurações de estoque com quantidades atuais
     */
    obterConfiguracoesEstoque() {
        // Always reload from file to get latest data (don't cache)
        this.stockManagement = this.carregarArquivoJson(this.stockManagementFile) || {
            configuracoes: {},
            avisos: [],
            configuracoes_gerais: {
                verificar_automaticamente: true,
                notificar_dashboard: true,
                manter_historico_avisos: true,
                dias_manter_historico: 30,
                sincronizar_categorias_inventario: false
            },
            ultima_atualizacao: new Date().toISOString()
        };
        
        // Ensure the sync setting exists (for existing installations)
        if (this.stockManagement.configuracoes_gerais && 
            this.stockManagement.configuracoes_gerais.sincronizar_categorias_inventario === undefined) {
            this.stockManagement.configuracoes_gerais.sincronizar_categorias_inventario = false;
            this.salvarArquivoJson(this.stockManagementFile, this.stockManagement);
        }
        
        // Adicionar quantidades atuais às configurações
        const configuracoes = this.stockManagement.configuracoes || {};
        Object.keys(configuracoes).forEach(itemId => {
            configuracoes[itemId].quantidade_atual = this.obterQuantidadeItem(itemId);
        });
        
        // Update pricing data for existing configurations that don't have it
        this.atualizarPrecosConfiguracoes();
        
        // Return the full stockManagement object
        return this.stockManagement;
    }


    /**
     * Atualizar todas as configurações existentes com dados de preços
     */
    atualizarPrecosConfiguracoes() {
        if (!this.stockManagement || !this.stockManagement.configuracoes) return;
        
        let updated = false;
        Object.keys(this.stockManagement.configuracoes).forEach(itemId => {
            const config = this.stockManagement.configuracoes[itemId];
            
            // Only update category from inventory if sync is enabled
            if (this.stockManagement.configuracoes_gerais?.sincronizar_categorias_inventario) {
                const inventoryCategory = this.determinarCategoriaItem(itemId);
                if (config.categoria !== inventoryCategory) {
                    config.categoria = inventoryCategory;
                    updated = true;
                    console.log(`🔧 Synced category for ${itemId}: ${inventoryCategory} (auto-sync enabled)`);
                }
            }
            // If sync is disabled, preserve user's manual category choice
            
            // Only update pricing if not manually set (usar_preco_fixo = false)
            if (!config.usar_preco_fixo) {
                const precoInfo = this.obterPrecoItem(itemId);
                
                config.preco_unitario = precoInfo.preco_default;
                config.preco_min = precoInfo.preco_min;
                config.preco_max = precoInfo.preco_max;
                config.preco_fonte = precoInfo.fonte;
                config.atualizado_em = new Date().toISOString();
                
                updated = true;
                console.log(`💰 Updated pricing for ${itemId}: R$ ${precoInfo.preco_default} (${precoInfo.fonte})`);
            }
        });
        
        if (updated) {
            this.stockManagement.ultima_atualizacao = new Date().toISOString();
            this.salvarArquivoJson(this.stockManagementFile, this.stockManagement);
            console.log('✅ ALL stock configurations updated with correct categories and pricing!');
        }
    }

    /**
     * Atualizar configuração de estoque de um item
     */
    atualizarConfiguracaoEstoque(itemId, maximo, minimo, ativo = true, precoUnitario = null, nomeExibicao = null, categoria = null) {
        try {
            if (!this.stockManagement) {
                this.stockManagement = this.carregarArquivoJson(this.stockManagementFile) || {
                    configuracoes: {},
                    avisos: [],
                    configuracoes_gerais: {}
                };
            }

            const finalNomeExibicao = nomeExibicao || this.obterMelhorNomeExibicao(itemId);
            const finalCategoria = categoria || this.determinarCategoriaItem(itemId);

            // Get current inventory quantity for this item
            const quantidadeAtual = this.obterQuantidadeItem(itemId);
            
            // Get pricing information
            const precoInfo = this.obterPrecoItem(itemId);
            const precoFinal = precoUnitario !== null ? parseFloat(precoUnitario) : precoInfo.preco_default;
            
            this.stockManagement.configuracoes[itemId] = {
                id: itemId,
                nome_exibicao: finalNomeExibicao,
                categoria: finalCategoria,
                maximo: parseInt(maximo),
                minimo: parseInt(minimo),
                ativo: ativo,
                quantidade_atual: quantidadeAtual,
                preco_unitario: precoFinal,
                preco_min: precoInfo.preco_min,
                preco_max: precoInfo.preco_max,
                preco_fonte: precoInfo.fonte,
                usar_preco_fixo: precoUnitario !== null,
                atualizado_em: new Date().toISOString(),
                criado_em: this.stockManagement.configuracoes[itemId]?.criado_em || new Date().toISOString()
            };

            this.stockManagement.ultima_atualizacao = new Date().toISOString();
            this.salvarArquivoJson(this.stockManagementFile, this.stockManagement);

            // Verificar se precisa de avisos imediatamente
            this.verificarNiveisEstoque();

            return { success: true, message: 'Configuração de estoque atualizada com sucesso' };
        } catch (error) {
            logger.error('Erro ao atualizar configuração de estoque:', error);
            return { success: false, error: 'Erro interno do servidor' };
        }
    }

    /**
     * Remover item do controle de estoque
     */
    removerConfiguracaoEstoque(itemId) {
        try {
            if (!this.stockManagement || !this.stockManagement.configuracoes[itemId]) {
                return { success: false, error: 'Item não encontrado no controle de estoque' };
            }

            delete this.stockManagement.configuracoes[itemId];
            this.stockManagement.ultima_atualizacao = new Date().toISOString();
            this.salvarArquivoJson(this.stockManagementFile, this.stockManagement);

            // Remover avisos relacionados a este item
            this.limparAvisosItem(itemId);

            return { success: true, message: 'Item removido do controle de estoque' };
        } catch (error) {
            logger.error('Erro ao remover configuração de estoque:', error);
            return { success: false, error: 'Erro interno do servidor' };
        }
    }

    /**
     * Verificar níveis de estoque e gerar avisos
     */
    verificarNiveisEstoque() {
        try {
            const stockData = this.obterConfiguracoesEstoque();
            const configuracoes = stockData.configuracoes || {};
            const novosAvisos = [];

            Object.values(configuracoes).forEach(config => {
                if (!config.ativo) return;

                const quantidadeAtual = this.obterQuantidadeItem(config.id);
                
                if (quantidadeAtual <= config.minimo) {
                    const quantidadeRestock = config.maximo - quantidadeAtual;
                    const prioridade = quantidadeAtual === 0 ? 'critico' : 'aviso';

                    const aviso = {
                        id: uuidv4(),
                        item_id: config.id,
                        item_nome: config.nome_exibicao,
                        categoria: config.categoria,
                        quantidade_atual: quantidadeAtual,
                        minimo: config.minimo,
                        maximo: config.maximo,
                        quantidade_restock: quantidadeRestock,
                        prioridade: prioridade,
                        visto: false,
                        timestamp: new Date().toISOString()
                    };

                    novosAvisos.push(aviso);
                }
            });

            // Atualizar avisos (substituir avisos existentes)
            this.stockManagement.avisos = novosAvisos;
            this.stockManagement.ultima_atualizacao = new Date().toISOString();
            this.salvarArquivoJson(this.stockManagementFile, this.stockManagement);

            // Emitir evento para o frontend
            if (this.io && novosAvisos.length > 0) {
                this.io.emit('estoque:avisos-atualizados', {
                    avisos: novosAvisos,
                    total: novosAvisos.length
                });
            }

            return { success: true, avisos: novosAvisos };
        } catch (error) {
            logger.error('Erro ao verificar níveis de estoque:', error);
            return { success: false, error: 'Erro ao verificar níveis de estoque' };
        }
    }

    /**
     * Obter avisos ativos de estoque
     */
    obterAvisosEstoque() {
        if (!this.stockManagement) {
            return [];
        }
        return this.stockManagement.avisos || [];
    }

    /**
     * Marcar aviso como visto
     */
    marcarAvisoComoVisto(avisoId) {
        try {
            if (!this.stockManagement || !this.stockManagement.avisos) {
                return { success: false, error: 'Nenhum aviso encontrado' };
            }

            const aviso = this.stockManagement.avisos.find(a => a.id === avisoId);
            if (!aviso) {
                return { success: false, error: 'Aviso não encontrado' };
            }

            aviso.visto = true;
            aviso.visto_em = new Date().toISOString();

            this.stockManagement.ultima_atualizacao = new Date().toISOString();
            this.salvarArquivoJson(this.stockManagementFile, this.stockManagement);

            return { success: true, message: 'Aviso marcado como visto' };
        } catch (error) {
            logger.error('Erro ao marcar aviso como visto:', error);
            return { success: false, error: 'Erro interno do servidor' };
        }
    }

    /**
     * Obter quantidade atual de um item no inventário
     */
    obterQuantidadeItem(itemId) {
        if (!this.inventario || !this.inventario.itens) {
            return 0;
        }
        return this.inventario.itens[itemId]?.quantidade || 0;
    }

    /**
     * Determinar categoria de um item baseado no ID
     */
    determinarCategoriaItem(itemId) {
        // ONLY SOURCE OF TRUTH: Use category from inventory
        if (this.inventario?.itens?.[itemId]?.categoria) {
            return this.inventario.itens[itemId].categoria;
        }

        // If item doesn't exist in inventory, return 'outros'
        return 'outros';
    }

    /**
     * Obter preço de um item baseado na lista de preços
     */
    obterPrecoItem(itemId) {
        // PRIORITY 1: Use price from price list if it exists
        if (this.precos?.itens?.[itemId]) {
            const precoItem = this.precos.itens[itemId];
            return {
                preco_min: precoItem.preco_min || 0,
                preco_max: precoItem.preco_max || precoItem.preco_min || 0,
                preco_default: precoItem.preco_min || 0,
                tem_preco: true,
                fonte: 'price_list'
            };
        }

        // FALLBACK: Set to 0 for items not in price list (user will edit manually)
        return {
            preco_min: 0,
            preco_max: 0,
            preco_default: 0,
            tem_preco: false,
            fonte: 'default'
        };
    }

    /**
     * Calcular custo total de reposição para todos os itens
     */
    calcularCustoReposicaoTotal() {
        const stockData = this.obterConfiguracoesEstoque();
        const configuracoes = stockData.configuracoes || {};
        
        let custoTotal = 0;
        let itensPorCategoria = {};
        let itensParaRestock = [];

        Object.values(configuracoes).forEach(config => {
            if (!config.ativo) return;

            const quantidadeAtual = this.obterQuantidadeItem(config.id);
            const quantidadeRestock = Math.max(0, config.maximo - quantidadeAtual);
            
            if (quantidadeRestock > 0) {
                const precoUnitario = config.preco_unitario || 0.50; // Default fallback
                const custoItem = quantidadeRestock * precoUnitario;
                
                custoTotal += custoItem;
                
                // Group by category
                if (!itensPorCategoria[config.categoria]) {
                    itensPorCategoria[config.categoria] = {
                        itens: 0,
                        quantidade: 0,
                        custo: 0
                    };
                }
                
                itensPorCategoria[config.categoria].itens += 1;
                itensPorCategoria[config.categoria].quantidade += quantidadeRestock;
                itensPorCategoria[config.categoria].custo += custoItem;
                
                itensParaRestock.push({
                    id: config.id,
                    nome: config.nome_exibicao,
                    categoria: config.categoria,
                    quantidade_atual: quantidadeAtual,
                    quantidade_restock: quantidadeRestock,
                    preco_unitario: precoUnitario,
                    custo_total: custoItem
                });
            }
        });

        return {
            custo_total: custoTotal,
            total_itens: itensParaRestock.length,
            total_quantidade: itensParaRestock.reduce((sum, item) => sum + item.quantidade_restock, 0),
            preco_medio: custoTotal > 0 ? custoTotal / itensParaRestock.reduce((sum, item) => sum + item.quantidade_restock, 0) : 0,
            itens_por_categoria: itensPorCategoria,
            itens_detalhados: itensParaRestock,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Limpar avisos de um item específico
     */
    limparAvisosItem(itemId) {
        if (!this.stockManagement || !this.stockManagement.avisos) return;

        this.stockManagement.avisos = this.stockManagement.avisos.filter(
            aviso => aviso.item_id !== itemId
        );

        this.salvarArquivoJson(this.stockManagementFile, this.stockManagement);
    }

    /**
     * Obter estatísticas de estoque para dashboard
     */
    obterEstatisticasEstoque() {
        const stockData = this.obterConfiguracoesEstoque();
        const configuracoes = stockData.configuracoes || {};
        const avisos = this.obterAvisosEstoque();
        
        const stats = {
            total_itens_monitorados: Object.keys(configuracoes).length,
            avisos_ativos: avisos.length,
            avisos_criticos: avisos.filter(a => a.prioridade === 'critico').length,
            avisos_por_categoria: {},
            nivel_estoque_geral: 'OK'
        };

        // Contar avisos por categoria
        avisos.forEach(aviso => {
            stats.avisos_por_categoria[aviso.categoria] = 
                (stats.avisos_por_categoria[aviso.categoria] || 0) + 1;
        });

        // Determinar nível geral
        if (stats.avisos_criticos > 0) {
            stats.nivel_estoque_geral = 'CRÍTICO';
        } else if (stats.avisos_ativos > 0) {
            stats.nivel_estoque_geral = 'ATENÇÃO';
        }

        return stats;
    }

    /**
     * Hook para ser chamado quando itens são adicionados/removidos do inventário
     */
    verificarEstoqueAposAlteracao(itemId) {
        // Verificar se este item está sendo monitorado
        const stockData = this.obterConfiguracoesEstoque();
        const configuracoes = stockData.configuracoes || {};
        if (configuracoes[itemId]) {
            // Fazer verificação completa (pode ser otimizado para verificar só um item)
            setTimeout(() => {
                this.verificarNiveisEstoque();
            }, 100); // Small delay to ensure inventory is saved first
        }
    }

    /**
     * Calculate plant demand for production
     */
    calcularDemandaPlantas() {
        try {
            // Target levels for box production
            const metas = {
                corn: { meta: 5000, nome: 'Milho', emoji: '🌽' },
                trigo: { meta: 2500, nome: 'Trigo', emoji: '🌾' },
                bulrush: { meta: 2500, nome: 'Junco', emoji: '🌿' }
            };

            // Get current inventory levels
            const estoqueAtual = {
                corn: this.inventario.itens.corn?.quantidade || 0,
                trigo: this.inventario.itens.trigo?.quantidade || 0,
                bulrush: this.inventario.itens.bulrush?.quantidade || 0
            };

            // Calculate demand and priorities
            const demanda = [];
            let totalFalta = 0;

            for (const [itemId, meta] of Object.entries(metas)) {
                const atual = estoqueAtual[itemId];
                const falta = Math.max(0, meta.meta - atual);
                const percentualEstoque = (atual / meta.meta) * 100;
                const sementesNecessarias = Math.ceil(falta / 10); // 1 seed = 10 plants
                
                let status = 'BOM';
                let statusEmoji = '✅';
                let prioridade = 3;
                
                if (percentualEstoque < 20) {
                    status = 'CRÍTICO';
                    statusEmoji = '🔴';
                    prioridade = 1;
                } else if (percentualEstoque < 50) {
                    status = 'BAIXO';
                    statusEmoji = '⚠️';
                    prioridade = 2;
                }

                demanda.push({
                    itemId,
                    nome: meta.nome,
                    emoji: meta.emoji,
                    atual,
                    meta: meta.meta,
                    falta,
                    sementesNecessarias,
                    percentualEstoque: Math.round(percentualEstoque),
                    status,
                    statusEmoji,
                    prioridade
                });

                totalFalta += falta;
            }

            // Sort by priority (1 = highest)
            demanda.sort((a, b) => {
                // First by priority level
                if (a.prioridade !== b.prioridade) {
                    return a.prioridade - b.prioridade;
                }
                // Then by percentage (lower percentage = higher priority)
                return a.percentualEstoque - b.percentualEstoque;
            });

            // Calculate priority percentages
            if (totalFalta > 0) {
                demanda.forEach(item => {
                    item.percentualPrioridade = Math.round((item.falta / totalFalta) * 100);
                });
            }

            return {
                demanda,
                totalFalta,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            logger.error('Erro ao calcular demanda de plantas:', error);
            throw error;
        }
    }

    /**
     * Calculate plant demand for production
     */
    calcularDemandaPlantas() {
        try {
            // Target levels for box production
            const metas = {
                corn: { meta: 5000, nome: 'Milho', emoji: '🌽' },
                trigo: { meta: 2500, nome: 'Trigo', emoji: '🌾' },
                bulrush: { meta: 2500, nome: 'Junco', emoji: '🌿' }
            };

            // Get current inventory levels
            const estoqueAtual = {
                corn: this.inventario.itens.corn?.quantidade || 0,
                trigo: this.inventario.itens.trigo?.quantidade || 0,
                bulrush: this.inventario.itens.bulrush?.quantidade || 0
            };

            // Calculate demand and priorities
            const demanda = [];
            let totalFalta = 0;

            for (const [itemId, meta] of Object.entries(metas)) {
                const atual = estoqueAtual[itemId];
                const falta = Math.max(0, meta.meta - atual);
                const percentualEstoque = (atual / meta.meta) * 100;
                const sementesNecessarias = Math.ceil(falta / 10); // 1 seed = 10 plants
                
                let status = 'BOM';
                let statusEmoji = '✅';
                let prioridade = 3;
                
                if (percentualEstoque < 20) {
                    status = 'CRÍTICO';
                    statusEmoji = '🔴';
                    prioridade = 1;
                } else if (percentualEstoque < 50) {
                    status = 'BAIXO';
                    statusEmoji = '⚠️';
                    prioridade = 2;
                }

                demanda.push({
                    itemId,
                    nome: meta.nome,
                    emoji: meta.emoji,
                    atual,
                    meta: meta.meta,
                    falta,
                    sementesNecessarias,
                    percentualEstoque: Math.round(percentualEstoque),
                    status,
                    statusEmoji,
                    prioridade
                });

                totalFalta += falta;
            }

            // Sort by priority (1 = highest)
            demanda.sort((a, b) => {
                // First by priority level
                if (a.prioridade !== b.prioridade) {
                    return a.prioridade - b.prioridade;
                }
                // Then by percentage (lower percentage = higher priority)
                return a.percentualEstoque - b.percentualEstoque;
            });

            // Calculate priority percentages
            if (totalFalta > 0) {
                demanda.forEach(item => {
                    item.percentualPrioridade = Math.round((item.falta / totalFalta) * 100);
                });
            }

            return {
                demanda,
                totalFalta,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            logger.error('Erro ao calcular demanda de plantas:', error);
            throw error;
        }
    }

    /**
     * Format and send plant demand to Discord
     */
    async enviarDemandaDiscord() {
        try {
            const axios = require('axios');
            const { demanda } = this.calcularDemandaPlantas();
            
            // Build Discord message
            let message = '🚨 **ORDEM DE PLANTIO - PRIORIDADE** 🚨\n\n';
            message += '**🔴 PLANTAR AGORA:**\n';
            message += '──────────────────────────────\n';

            demanda.forEach((item, index) => {
                const ordem = index + 1;
                message += `**${ordem}º - ${item.nome.toUpperCase()}** ${item.emoji}\n`;
                message += `   • Estoque: **${item.atual.toLocaleString('pt-BR')} / ${item.meta.toLocaleString('pt-BR')}** (${item.percentualEstoque}%)\n`;
                
                if (item.sementesNecessarias > 0) {
                    message += `   • **PLANTAR: ${item.sementesNecessarias} SEMENTES** (= ${item.falta.toLocaleString('pt-BR')} plantas)\n`;
                    message += `   • Status: **${item.status}** ${item.statusEmoji}\n`;
                } else {
                    message += `   • Status: **ESTOQUE OK** ✅\n`;
                }
                message += '\n';
            });


            const webhookUrl = 'https://discord.com/api/webhooks/1403756701022158870/BpUYp4Wq7z4p6lyxW5Qs-e6xIotBypum91qIvKg1ZdGFSD9oQXbMVtIGDm1g656e-k2Y';
            
            // Try to edit existing message first
            if (this.ultimaMensagemDiscord && this.ultimaMensagemDiscord.messageId) {
                logger.info(`🔄 Attempting to edit Discord message ID: ${this.ultimaMensagemDiscord.messageId}`);
                try {
                    const editResponse = await axios.patch(`${webhookUrl}/messages/${this.ultimaMensagemDiscord.messageId}`, {
                        content: message
                    });
                    
                    logger.info('✅ Discord message edited successfully:', {
                        messageId: this.ultimaMensagemDiscord.messageId,
                        status: editResponse.status
                    });
                    return { sucesso: true };
                } catch (editError) {
                    logger.error('❌ Failed to edit Discord message:', {
                        messageId: this.ultimaMensagemDiscord.messageId,
                        status: editError.response?.status,
                        statusText: editError.response?.statusText,
                        data: editError.response?.data,
                        message: editError.message
                    });
                    
                    // If message was deleted or doesn't exist, clear the stored ID
                    if (editError.response?.status === 404) {
                        logger.warn('🗑️ Discord message was deleted, clearing stored ID');
                        this.ultimaMensagemDiscord = null;
                    }
                }
            } else {
                logger.info('📝 No existing Discord message ID, will create new message');
            }
            
            // Create new message if no previous message or edit failed
            logger.info('📝 Creating new Discord message...');
            const response = await axios.post(webhookUrl, {
                content: message,
                username: 'Sistema de Demanda - Fazenda',
                avatar_url: 'https://emojipedia-us.s3.dualstack.us-west-1.amazonaws.com/thumbs/120/twitter/322/seedling_1f331.png'
            });

            // Store the new message ID for future edits
            this.ultimaMensagemDiscord = {
                messageId: response.data.id,
                timestamp: new Date().toISOString()
            };
            
            logger.info('💾 Saving Discord message ID to file:', {
                messageId: response.data.id,
                timestamp: this.ultimaMensagemDiscord.timestamp
            });
            
            // Save message ID to file for persistence
            try {
                this.salvarArquivoJson(path.join(this.dataPath, 'ultima_mensagem_discord.json'), this.ultimaMensagemDiscord);
                logger.info('✅ Discord message ID saved successfully');
            } catch (saveError) {
                logger.error('❌ Failed to save Discord message ID:', saveError.message);
            }

            logger.info('✅ New Discord message created successfully');
            return { sucesso: true };
        } catch (error) {
            logger.error('❌ Erro ao enviar demanda para Discord:', error);
            return { sucesso: false, erro: error.message };
        }
    }

    /**
     * Check if plant inventory changed (logging only - no auto Discord updates)
     */
    async verificarMudancasPlantas(itemId, quantidadeAnterior, quantidadeNova) {
        const plantasMonitoradas = ['corn', 'trigo', 'bulrush'];
        
        // Only check for monitored plants
        if (!plantasMonitoradas.includes(itemId)) {
            return;
        }

        logger.info(`🌱 Plant quantity changed: ${itemId} ${quantidadeAnterior} → ${quantidadeNova} (Discord auto-update disabled)`);
        
        // AUTO-UPDATE DISABLED - Discord messages are now manual only
        // Users can send updates manually via the web interface
        // This prevents spam when inventory changes frequently
    }
}

module.exports = DataManager;
// ===== Channel Monitoring Methods =====

DataManager.prototype.updateMonitoringChannels = function(channels) {
    try {
        this.monitoringChannels = channels || [];
        const logger = require('./utils/logger');
        logger.info(`📺 Updated monitoring channels: ${this.monitoringChannels.length} channels`);
        
        // Emit update to connected clients
        if (this.io) {
            this.io.emit('monitoring:channels:updated', {
                channels: this.monitoringChannels,
                timestamp: new Date().toISOString()
            });
        }
        
        return true;
    } catch (error) {
        const logger = require('./utils/logger');
        logger.error('Error updating monitoring channels:', error);
        return false;
    }
};

DataManager.prototype.getMonitoringChannels = function() {
    return this.monitoringChannels || [];
};

DataManager.prototype.isChannelMonitored = function(channelId) {
    if (!this.monitoringChannels || !channelId) return false;
    
    return this.monitoringChannels.some(channel => 
        channel.id === channelId && channel.enabled === true
    );
};

DataManager.prototype.processChannelMessage = function(messageData) {
    try {
        if (!this.isChannelMonitored(messageData.channelId)) {
            return false;
        }

        // Process different types of farm-related messages
        if (this.isInventoryMessage(messageData)) {
            return this.processInventoryMessage(messageData);
        }

        if (this.isUserActivityMessage(messageData)) {
            return this.processUserActivityMessage(messageData);
        }

        if (this.isPaymentMessage(messageData)) {
            return this.processPaymentMessage(messageData);
        }

        // Log all monitored messages for analysis
        return this.logDiscordMessage(messageData);
    } catch (error) {
        const logger = require('./utils/logger');
        logger.error('Error processing channel message:', error);
        return false;
    }
};

DataManager.prototype.isInventoryMessage = function(messageData) {
    const inventoryKeywords = [
        'BAÚ ORGANIZAÇÃO', 'REMOVER ITEM', 'INSERIR ITEM', 
        'inventário', 'estoque', 'adicionar', 'remover'
    ];
    
    const content = (messageData.content || '').toLowerCase();
    const embedTitles = messageData.embeds ? 
        messageData.embeds.map(e => (e.title || '').toLowerCase()).join(' ') : '';
    
    const searchText = content + ' ' + embedTitles;
    
    return inventoryKeywords.some(keyword => 
        searchText.includes(keyword.toLowerCase())
    );
};

DataManager.prototype.isUserActivityMessage = function(messageData) {
    const userKeywords = [
        'usuário', 'trabalhador', 'gerente', 'funcionário',
        'contratado', 'demitido', 'promovido'
    ];
    
    const content = (messageData.content || '').toLowerCase();
    return userKeywords.some(keyword => content.includes(keyword));
};

DataManager.prototype.isPaymentMessage = function(messageData) {
    const paymentKeywords = [
        'pagamento', 'salário', 'pagar', '$', 'dinheiro', 'valor'
    ];
    
    const content = (messageData.content || '').toLowerCase();
    return paymentKeywords.some(keyword => content.includes(keyword));
};

DataManager.prototype.processInventoryMessage = function(messageData) {
    try {
        // Extract item and quantity from message
        const embeds = messageData.embeds || [];
        
        for (const embed of embeds) {
            if (embed.title && embed.title.includes('ITEM')) {
                const fields = embed.fields || [];
                let itemName = null;
                let quantity = 0;
                let action = null;
                
                // Determine action type
                if (embed.title.includes('REMOVER')) {
                    action = 'remove';
                } else if (embed.title.includes('INSERIR') || embed.title.includes('ADICIONAR')) {
                    action = 'add';
                }
                
                // Extract item and quantity from fields
                for (const field of fields) {
                    if (field.name && field.name.includes('Item')) {
                        const match = field.value.match(/```\w*\n?(.+?)\s*x?(\d+)?\n?```/);
                        if (match) {
                            const parts = match[1].split(' x');
                            itemName = parts[0].trim();
                            quantity = parts[1] ? parseInt(parts[1]) : (match[2] ? parseInt(match[2]) : 1);
                        }
                    }
                }
                
                if (itemName && quantity && action) {
                    if (action === 'add') {
                        return this.addInventoryItem(itemName, quantity, messageData.author);
                    } else if (action === 'remove') {
                        return this.removeInventoryItem(itemName, quantity, messageData.author);
                    }
                }
            }
        }
        
        return this.logDiscordMessage(messageData);
    } catch (error) {
        const logger = require('./utils/logger');
        logger.error('Error processing inventory message:', error);
        return false;
    }
};

DataManager.prototype.processUserActivityMessage = function(messageData) {
    // For now, just log user activity messages
    // Later can be expanded to track user changes
    return this.logDiscordMessage(messageData);
};

DataManager.prototype.processPaymentMessage = function(messageData) {
    // For now, just log payment messages  
    // Later can be expanded to track payments automatically
    return this.logDiscordMessage(messageData);
};

// Channel monitoring methods for admin panel integration
DataManager.prototype.setWatchedChannels = function(channelIds) {
    this.watchedChannels = channelIds || [];
    const logger = require('./utils/logger');
    logger.info(`📺 Updated monitored channels: ${this.watchedChannels.length} channels`);
    this.watchedChannels.forEach(channelId => {
        logger.info(`   - Channel ID: ${channelId}`);
    });
};

DataManager.prototype.isChannelMonitored = function(channelId) {
    return this.watchedChannels && this.watchedChannels.includes(channelId);
};

// Discord integration wrapper methods (compatibility layer)
DataManager.prototype.addInventoryItem = function(itemName, quantity, author) {
    return this.adicionarItem(itemName, quantity, author);
};

DataManager.prototype.removeInventoryItem = function(itemName, quantity, author) {
    return this.removerItem(itemName, quantity, author);
};

DataManager.prototype.logDiscordMessage = function(messageData) {
    try {
        const logger = require('./utils/logger');
        const FarmMessageParser = require('./FarmMessageParser');
        
        // Load current analyzed data
        let analyzedData = this.carregarArquivoJson(this.analyzedDataFile, {
            messages: [],
            farm_activities: [],
            inventory_changes: [],
            financial_transactions: [],
            channel_stats: {},
            last_updated: new Date().toISOString()
        });
        
        // Convert and parse the Discord message using the proper parser
        const convertedMessage = FarmMessageParser.convertDiscordMessage(messageData);
        const parsedActivity = FarmMessageParser.parseMessage(convertedMessage);
        
        // Add message to messages array (raw Discord message format)
        if (!analyzedData.messages) {
            analyzedData.messages = [];
        }
        
        // Add the new message
        analyzedData.messages.push({
            id: messageData.id,
            author: messageData.author,
            content: messageData.content,
            timestamp: messageData.timestamp,
            channelId: messageData.channelId,
            guildId: messageData.guildId,
            embeds: messageData.embeds || []
        });
        

        // Process parsed activity into appropriate arrays
        if (parsedActivity.parseSuccess) {
            if (parsedActivity.categoria === 'inventario') {
                if (!analyzedData.inventory_changes) {
                    analyzedData.inventory_changes = [];
                }
                analyzedData.inventory_changes.push({
                    type: parsedActivity.tipo, // 'adicionar' or 'remover'
                    author: parsedActivity.autor,
                    timestamp: parsedActivity.timestamp,
                    details: {
                        item: parsedActivity.item,
                        quantity: parsedActivity.quantidade,
                        action: parsedActivity.tipo
                    },
                    content: parsedActivity.displayText,
                    raw_message: messageData,
                    confidence: parsedActivity.confidence
                });
                
                // Also update the actual inventory if this is a high-confidence parse
                if (parsedActivity.confidence === 'high' && parsedActivity.item && parsedActivity.quantidade) {
                    try {
                        // Try to extract real author from Discord message
                        let realAuthor = parsedActivity.autor;
                        
                        // First try: Check if messageData has a different author than bot
                        if (messageData && messageData.author && messageData.author !== 'Spidey Bot' && messageData.author !== 'Unknown') {
                            realAuthor = messageData.author;
                            logger.info(`🔍 Using Discord message author: ${realAuthor}`);
                        }
                        // Second try: Extract from embeds (for financial messages)
                        else if (messageData && messageData.embeds && messageData.embeds.length > 0) {
                            const embed = messageData.embeds[0];
                            if (embed.fields) {
                                // Look for author field in embed
                                for (const field of embed.fields) {
                                    if (field.name && field.name.toLowerCase().includes('autor')) {
                                        const match = field.value.match(/```prolog\n?([^|\\n]+)/);
                                        if (match && match[1] && match[1].trim() !== 'Spidey Bot') {
                                            realAuthor = match[1].trim();
                                            logger.info(`🔍 Found real author in Discord embed: ${realAuthor}`);
                                            break;
                                        }
                                    }
                                    // Also check action fields for animal sales
                                    if (field.name && field.name.toLowerCase().includes('ação')) {
                                        const actionMatch = field.value.match(/```prolog\n?([^\\s]+[^v\\n]*?)\\s+(vendeu|depositou|sacou|comprou)/);
                                        if (actionMatch && actionMatch[1] && actionMatch[1].trim() !== 'Spidey Bot') {
                                            realAuthor = actionMatch[1].trim();
                                            logger.info(`🔍 Found real author in action field: ${realAuthor}`);
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                        
                        // If still no real author found, check if this might be a system action
                        if (realAuthor === 'Spidey Bot' || realAuthor === 'Sistema') {
                            logger.warn(`⚠️ No real author found for inventory activity: ${parsedActivity.tipo} ${parsedActivity.item} x${parsedActivity.quantidade}. Using: ${realAuthor}`);
                        }
                        
                        if (parsedActivity.tipo === 'adicionar') {
                            this.adicionarItem(parsedActivity.item, parsedActivity.quantidade, realAuthor);
                        } else if (parsedActivity.tipo === 'remover') {
                            this.removerItem(parsedActivity.item, parsedActivity.quantidade, realAuthor);
                        }
                    } catch (inventoryError) {
                        logger.warn('Failed to update inventory from parsed activity:', inventoryError.message);
                    }
                }
            } else if (parsedActivity.categoria === 'financeiro') {
                if (!analyzedData.financial_transactions) {
                    analyzedData.financial_transactions = [];
                }
                analyzedData.financial_transactions.push({
                    type: parsedActivity.tipo, // 'deposito', 'saque', 'venda'
                    author: parsedActivity.autor,
                    timestamp: parsedActivity.timestamp,
                    details: {
                        amount: parsedActivity.valor,
                        action: parsedActivity.tipo,
                        description: parsedActivity.descricao
                    },
                    content: parsedActivity.displayText,
                    raw_message: messageData,
                    confidence: parsedActivity.confidence
                });
                
                // Update farm balance if this is a high-confidence financial transaction
                if (parsedActivity.confidence === 'high' && parsedActivity.valor) {
                    try {
                        let saldoData = this.carregarArquivoJson(this.saldoFazendaFile, { saldo_atual: 0 });
                        if (parsedActivity.tipo === 'deposito') {
                            saldoData.saldo_atual += parsedActivity.valor;
                        } else if (parsedActivity.tipo === 'saque') {
                            saldoData.saldo_atual -= parsedActivity.valor;
                        } else if (parsedActivity.tipo === 'venda') {
                            saldoData.saldo_atual += parsedActivity.valor;
                        }
                        saldoData.ultima_atualizacao = new Date().toISOString();
                        this.salvarArquivoJson(this.saldoFazendaFile, saldoData);
                    } catch (balanceError) {
                        logger.warn('Failed to update balance from parsed activity:', balanceError.message);
                    }
                }
            } else {
                // General farm activities for other types
                if (!analyzedData.farm_activities) {
                    analyzedData.farm_activities = [];
                }
                analyzedData.farm_activities.push({
                    type: parsedActivity.tipo || 'general',
                    author: parsedActivity.autor,
                    timestamp: parsedActivity.timestamp,
                    content: parsedActivity.displayText || parsedActivity.content,
                    raw_message: messageData,
                    confidence: parsedActivity.confidence
                });
            }
        }
        
        // Keep only last 1000 messages and activities
        if (analyzedData.messages.length > 1000) {
            analyzedData.messages = analyzedData.messages.slice(-1000);
        }
        if (analyzedData.inventory_changes && analyzedData.inventory_changes.length > 1000) {
            analyzedData.inventory_changes = analyzedData.inventory_changes.slice(-1000);
        }
        if (analyzedData.financial_transactions && analyzedData.financial_transactions.length > 1000) {
            analyzedData.financial_transactions = analyzedData.financial_transactions.slice(-1000);
        }
        if (analyzedData.farm_activities && analyzedData.farm_activities.length > 1000) {
            analyzedData.farm_activities = analyzedData.farm_activities.slice(-1000);
        }
        
        // Update channel stats
        if (!analyzedData.channel_stats) {
            analyzedData.channel_stats = {};
        }
        if (!analyzedData.channel_stats[messageData.channelId]) {
            analyzedData.channel_stats[messageData.channelId] = {
                total_messages: 0,
                last_message: null
            };
        }
        analyzedData.channel_stats[messageData.channelId].total_messages++;
        analyzedData.channel_stats[messageData.channelId].last_message = messageData.timestamp;
        
        // Update last_updated timestamp
        analyzedData.last_updated = new Date().toISOString();
        
        // Save to file
        this.salvarArquivoJson(this.analyzedDataFile, analyzedData);
        
        // Emit socket event if available
        if (this.io) {
            this.io.emit('discord-message', {
                ...messageData,
                parsedActivity: parsedActivity
            });
        }
        
        logger.info(`📝 Discord message processed from channel ${messageData.channelId}: ${parsedActivity.parseSuccess ? 'PARSED' : 'RAW'} - ${parsedActivity.autor}`);
        return { success: true, parsed: parsedActivity };
    } catch (error) {
        const logger = require('./utils/logger');
        logger.error('Error logging Discord message:', error);
        return { success: false, error: error.message };
    }
};

