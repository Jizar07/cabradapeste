/**
 * GoogleSheetsClient - Cliente para Google Sheets API
 * 
 * Integração com Google Sheets para obter preços atualizados automaticamente.
 * URL do documento: https://docs.google.com/spreadsheets/d/10SdJdnkMaD95JfMsH8Qe0m0FTgMZTScTR0U_NnTmRxc/edit?gid=1271510005#gid=1271510005
 */
const axios = require('axios');
const logger = require('./utils/logger');

class GoogleSheetsClient {
    constructor() {
        // ID da planilha extraído da URL
        this.spreadsheetId = '10SdJdnkMaD95JfMsH8Qe0m0FTgMZTScTR0U_NnTmRxc';
        this.sheetId = '1271510005'; // gid da URL
        
        // URL para acessar dados da planilha em formato CSV (sem gid específico para evitar problemas de acesso)
        this.csvUrl = `https://docs.google.com/spreadsheets/d/${this.spreadsheetId}/export?format=csv`;
        
        // Cache dos dados
        this.cachedData = null;
        this.lastFetch = null;
        this.cacheTimeout = 30 * 60 * 1000; // 30 minutos
        
        // Configurações da planilha
        this.columnMapping = {
            item: 0,        // Coluna A - Nome do item
            categoria: 1,   // Coluna B - Categoria
            preco_min: 2,   // Coluna C - Preço mínimo
            preco_max: 3,   // Coluna D - Preço máximo
            observacoes: 4  // Coluna E - Observações
        };
    }
    
    /**
     * Obtém dados da planilha Google Sheets
     * @returns {Promise<Array>} - Array com dados da planilha
     */
    async fetchSheetData() {
        try {
            logger.info('📊 Buscando dados do Google Sheets...');
            
            const response = await axios.get(this.csvUrl, {
                timeout: 15000, // 15 segundos timeout
                maxRedirects: 10, // Seguir até 10 redirects
                followRedirect: true,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });
            
            if (response.status !== 200) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const csvData = response.data;
            
            // Verificar se retornou HTML (erro de acesso)
            if (typeof csvData === 'string' && csvData.includes('<HTML>')) {
                throw new Error('Planilha não é publicamente acessível. Configure para "Qualquer pessoa com o link pode visualizar"');
            }
            const parsedData = this.parseCSVData(csvData);
            
            // Atualizar cache
            this.cachedData = parsedData;
            this.lastFetch = new Date();
            
            logger.info(`✅ Dados obtidos com sucesso: ${parsedData.length} itens`);
            return parsedData;
            
        } catch (error) {
            logger.error('❌ Erro ao buscar dados do Google Sheets:', error.message);
            
            // Se temos dados em cache, usar eles
            if (this.cachedData) {
                logger.warn('⚠️ Usando dados em cache devido ao erro');
                return this.cachedData;
            }
            
            throw error;
        }
    }
    
    /**
     * Converte dados CSV em array de objetos
     * @param {string} csvData - Dados CSV brutos
     * @returns {Array} - Array de objetos com dados estruturados
     */
    parseCSVData(csvData) {
        try {
            const lines = csvData.split('\n');
            const parsedData = [];
            
            // Mapear todas as tabelas encontradas no CSV com suas categorias
            const allTables = [
                { line: 1, col: 1, categoria: 'ALIMENTACAO' },
                { line: 1, col: 5, categoria: 'ARMARIAS' },
                { line: 1, col: 9, categoria: 'FAZENDAS' },
                { line: 44, col: 1, categoria: 'ESTABLOS' },
                { line: 44, col: 5, categoria: 'FERRARIAS' },
                { line: 44, col: 9, categoria: 'FOGOS' },
                { line: 65, col: 1, categoria: 'ARTESANATO' },
                { line: 65, col: 5, categoria: 'MEDICOS' },
                { line: 65, col: 9, categoria: 'DOCERIA' },
                { line: 87, col: 1, categoria: 'GRAFICA' },
                { line: 87, col: 5, categoria: 'MUNICAO_ESPECIAL' },
                { line: 87, col: 9, categoria: 'PADARIA' },
                { line: 99, col: 9, categoria: 'CAVALARIA' },
                { line: 108, col: 1, categoria: 'ATELIE' },
                { line: 108, col: 5, categoria: 'JORNAL' },
                { line: 108, col: 9, categoria: 'MADEIREIRA' },
                { line: 126, col: 1, categoria: 'TABACARIA' },
                { line: 126, col: 9, categoria: 'MINERADORA' },
                { line: 136, col: 1, categoria: 'INDIGENAS' },
                { line: 136, col: 5, categoria: 'AVES' }
            ];
            
            // Para cada tabela, processar as linhas de dados seguintes
            for (const table of allTables) {
                const startLine = table.line + 2; // Pular linha de cabeçalho "Produtos, Min., Máx."
                const endLine = Math.min(startLine + 40, lines.length); // Processar até 40 linhas por tabela
                
                for (let i = startLine; i < endLine; i++) {
                    const line = lines[i];
                    if (!line || line.trim() === '') continue;
                    
                    const columns = this.parseCSVLine(line);
                    if (columns.length <= table.col + 2) continue;
                    
                    const nome = this.cleanText(columns[table.col]);
                    const precoMin = this.parsePrice(columns[table.col + 1]);
                    const precoMax = this.parsePrice(columns[table.col + 2]);
                    
                    // Validar se é um item válido
                    if (nome && nome.length > 1 && 
                        !nome.includes('Produtos') && 
                        !nome.includes('TABELA') &&
                        !nome.includes('Min.') &&
                        !nome.includes('Máx.') &&
                        !nome.startsWith('R$') &&
                        !nome.match(/^\d+[,.]?\d*$/) &&
                        nome !== '0,00' &&
                        nome !== '0.00' &&
                        nome !== '__' &&
                        nome.trim() !== '' &&
                        (precoMin > 0 || precoMax > 0)) {
                        
                        const item = {
                            nome: nome,
                            categoria: table.categoria,
                            preco_min: precoMin,
                            preco_max: precoMax,
                            observacoes: '',
                            atualizado_em: new Date().toISOString()
                        };
                        
                        parsedData.push(item);
                    }
                    
                    // Parar se encontrar linha com nova tabela
                    if (line.includes('TABELA DE PREÇOS')) break;
                }
            }
            
            return parsedData;
            
        } catch (error) {
            logger.error('❌ Erro ao processar dados CSV:', error);
            return [];
        }
    }
    
    /**
     * Processa uma linha CSV considerando vírgulas dentro de aspas
     * @param {string} line - Linha CSV
     * @returns {Array} - Array com colunas separadas
     */
    parseCSVLine(line) {
        const columns = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                columns.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        
        // Adicionar última coluna
        columns.push(current);
        
        return columns;
    }
    
    /**
     * Limpa texto removendo aspas e espaços desnecessários
     * @param {string} text - Texto a limpar
     * @returns {string} - Texto limpo
     */
    cleanText(text) {
        if (!text) return '';
        return text.replace(/^"|"$/g, '').trim();
    }
    
    /**
     * Converte string de preço para número (formato brasileiro)
     * @param {string} priceStr - String com preço
     * @returns {number} - Preço como número
     */
    parsePrice(priceStr) {
        if (!priceStr) return 0;
        
        // Remover aspas, espaços, e símbolos de moeda brasileiros
        let cleanPrice = priceStr
            .replace(/^"|"$/g, '')
            .replace(/[R$\s]/g, '')
            .trim();
        
        // Tratar formato brasileiro: "0,45" -> 0.45
        if (cleanPrice.includes(',') && !cleanPrice.includes('.')) {
            cleanPrice = cleanPrice.replace(',', '.');
        }
        // Tratar formato com milhares: "1.500,45" -> 1500.45
        else if (cleanPrice.includes('.') && cleanPrice.includes(',')) {
            cleanPrice = cleanPrice.replace(/\./g, '').replace(',', '.');
        }
        
        const price = parseFloat(cleanPrice);
        return isNaN(price) ? 0 : price;
    }
    
    /**
     * Obtém dados com cache
     * @param {boolean} forceRefresh - Forçar atualização dos dados
     * @returns {Promise<Array>} - Dados da planilha
     */
    async getData(forceRefresh = false) {
        // Verificar se precisa atualizar cache
        const cacheExpired = !this.lastFetch || 
                           (new Date() - this.lastFetch) > this.cacheTimeout;
        
        if (forceRefresh || cacheExpired || !this.cachedData) {
            return await this.fetchSheetData();
        }
        
        logger.info('📋 Usando dados em cache do Google Sheets');
        return this.cachedData;
    }
    
    /**
     * Converte dados da planilha para formato do sistema de preços
     * @param {Array} sheetData - Dados da planilha
     * @returns {Object} - Dados no formato do sistema
     */
    convertToPricingFormat(sheetData) {
        const pricingData = {
            itens: {},
            categorias: {},
            ultima_atualizacao: new Date().toISOString(),
            total_itens: 0
        };
        
        // Mapear categorias únicas - MANTER TODAS AS 19 CATEGORIAS ESPECIALIZADAS
        const categoriesSet = new Set();
        const usedIds = new Set(); // Track used IDs to handle duplicates
        
        sheetData.forEach(item => {
            if (!item.nome) return;
            
            // Normalizar nome do item (minúsculo, sem espaços extras)
            let itemId = item.nome.toLowerCase().trim().replace(/\s+/g, '_');
            
            // Handle duplicate IDs by adding suffix
            let finalId = itemId;
            let counter = 1;
            while (usedIds.has(finalId)) {
                finalId = `${itemId}_${counter}`;
                counter++;
            }
            usedIds.add(finalId);
            
            // Adicionar item aos preços - MANTER CATEGORIA ORIGINAL ESPECIALIZADA
            pricingData.itens[finalId] = {
                nome: item.nome,
                categoria: item.categoria || 'OUTROS', // Mantém categoria específica (ARMARIAS, ESTABELOS, etc.)
                preco_min: item.preco_min,
                preco_max: item.preco_max,
                observacoes: item.observacoes,
                atualizado_em: item.atualizado_em
            };
            
            // Coletar categoria específica
            if (item.categoria) {
                categoriesSet.add(item.categoria);
            }
        });
        
        // Mapear todas as 19 categorias especializadas encontradas no spreadsheet
        categoriesSet.forEach(categoria => {
            pricingData.categorias[categoria.toUpperCase()] = categoria;
        });
        
        pricingData.total_itens = Object.keys(pricingData.itens).length;
        
        return pricingData;
    }
    
    /**
     * Obtém preços atualizados no formato do sistema
     * @param {boolean} forceRefresh - Forçar atualização
     * @returns {Promise<Object>} - Dados de preços formatados
     */
    async getUpdatedPrices(forceRefresh = false) {
        try {
            const sheetData = await this.getData(forceRefresh);
            return this.convertToPricingFormat(sheetData);
        } catch (error) {
            logger.error('❌ Erro ao obter preços atualizados:', error);
            throw error;
        }
    }
    
    /**
     * Obtém informações sobre o cache
     * @returns {Object} - Informações do cache
     */
    getCacheInfo() {
        return {
            tem_cache: !!this.cachedData,
            total_itens: this.cachedData ? this.cachedData.length : 0,
            ultima_atualizacao: this.lastFetch ? this.lastFetch.toISOString() : null,
            cache_expira_em: this.lastFetch ? 
                new Date(this.lastFetch.getTime() + this.cacheTimeout).toISOString() : null,
            cache_expirado: !this.lastFetch || 
                           (new Date() - this.lastFetch) > this.cacheTimeout
        };
    }
    
    /**
     * Limpa o cache forçando nova busca na próxima requisição
     */
    clearCache() {
        this.cachedData = null;
        this.lastFetch = null;
        logger.info('🗑️ Cache do Google Sheets limpo');
    }
}

module.exports = GoogleSheetsClient;