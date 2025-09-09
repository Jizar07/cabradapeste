const express = require('express');
const router = express.Router();

module.exports = (dataManager) => {
    // ==============================
    // FERROVIARIA ROUTES
    // ==============================

    /**
     * GET /api/ferroviaria - Obter dados completos da ferroviaria
     */
    router.get('/', (req, res) => {
        try {
            const dados = dataManager.obterDadosFerroviaria();
            res.json({
                success: true,
                data: dados
            });
        } catch (error) {
            console.error('Erro ao obter dados da ferroviaria:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor'
            });
        }
    });

    /**
     * GET /api/ferroviaria/analise - Obter análise de eficiência
     */
    router.get('/analise', (req, res) => {
        try {
            const analise = dataManager.calcularAnaliseFerroviaria();
            res.json({
                success: true,
                data: analise
            });
        } catch (error) {
            console.error('Erro ao calcular análise da ferroviaria:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor'
            });
        }
    });

    /**
     * GET /api/ferroviaria/caixas-inventario - Obter tipos de caixas do inventário
     */
    router.get('/caixas-inventario', (req, res) => {
        try {
            const caixas = dataManager.obterTiposCaixasInventario();
            res.json({
                success: true,
                data: caixas
            });
        } catch (error) {
            console.error('Erro ao obter caixas do inventário:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor'
            });
        }
    });

    // ==============================
    // INVESTIDORES
    // ==============================

    /**
     * POST /api/ferroviaria/investidores - Adicionar investidor
     */
    router.post('/investidores', (req, res) => {
        try {
            const { nome, pombo, funcao, porcentagem } = req.body;
            
            // Validação
            if (!nome || !pombo || !funcao || porcentagem === undefined) {
                return res.status(400).json({
                    success: false,
                    error: 'Nome, pombo, função e porcentagem são obrigatórios'
                });
            }

            if (porcentagem < 0 || porcentagem > 100) {
                return res.status(400).json({
                    success: false,
                    error: 'Porcentagem deve estar entre 0 e 100'
                });
            }

            const investidor = dataManager.adicionarInvestidor({
                nome,
                pombo,
                funcao,
                porcentagem: parseFloat(porcentagem)
            });

            res.status(201).json({
                success: true,
                data: investidor,
                message: 'Investidor adicionado com sucesso'
            });
        } catch (error) {
            console.error('Erro ao adicionar investidor:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor'
            });
        }
    });

    /**
     * PUT /api/ferroviaria/investidores/:id - Atualizar investidor
     */
    router.put('/investidores/:id', (req, res) => {
        try {
            const { id } = req.params;
            const dados = req.body;

            if (dados.porcentagem !== undefined) {
                const porcentagem = parseFloat(dados.porcentagem);
                if (porcentagem < 0 || porcentagem > 100) {
                    return res.status(400).json({
                        success: false,
                        error: 'Porcentagem deve estar entre 0 e 100'
                    });
                }
                dados.porcentagem = porcentagem;
            }

            const investidor = dataManager.atualizarInvestidor(id, dados);
            
            res.json({
                success: true,
                data: investidor,
                message: 'Investidor atualizado com sucesso'
            });
        } catch (error) {
            console.error('Erro ao atualizar investidor:', error);
            if (error.message === 'Investidor não encontrado') {
                res.status(404).json({
                    success: false,
                    error: error.message
                });
            } else {
                res.status(500).json({
                    success: false,
                    error: 'Erro interno do servidor'
                });
            }
        }
    });

    /**
     * DELETE /api/ferroviaria/investidores/:id - Remover investidor
     */
    router.delete('/investidores/:id', (req, res) => {
        try {
            const { id } = req.params;
            dataManager.removerInvestidor(id);
            
            res.json({
                success: true,
                message: 'Investidor removido com sucesso'
            });
        } catch (error) {
            console.error('Erro ao remover investidor:', error);
            if (error.message === 'Investidor não encontrado') {
                res.status(404).json({
                    success: false,
                    error: error.message
                });
            } else {
                res.status(500).json({
                    success: false,
                    error: 'Erro interno do servidor'
                });
            }
        }
    });

    // ==============================
    // CAIXAS
    // ==============================

    /**
     * POST /api/ferroviaria/caixas - Registrar depósito de caixas
     */
    router.post('/caixas', (req, res) => {
        try {
            const { tipo_caixa, quantidade, custo_unitario } = req.body;
            
            // Validação
            if (!tipo_caixa || !quantidade || quantidade <= 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Tipo de caixa e quantidade são obrigatórios'
                });
            }

            const deposito = dataManager.registrarDepositoCaixas({
                tipo_caixa,
                quantidade: parseInt(quantidade),
                custo_unitario: custo_unitario ? parseFloat(custo_unitario) : undefined
            });

            res.status(201).json({
                success: true,
                data: deposito,
                message: 'Depósito de caixas registrado com sucesso'
            });
        } catch (error) {
            console.error('Erro ao registrar depósito de caixas:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor'
            });
        }
    });

    // ==============================
    // ENTREGAS
    // ==============================

    /**
     * POST /api/ferroviaria/service - Registrar serviço ferroviário completo
     */
    router.post('/service', (req, res) => {
        try {
            console.log('🚂 POST /api/ferroviaria/service - Request body:', JSON.stringify(req.body, null, 2));
            
            const { 
                manager_id,
                numero_entregas,
                total_caixas,
                tipo_caixas,
                tempo_inicio,
                tempo_fim,
                notas
            } = req.body;
            
            // Validação
            if (!manager_id || !numero_entregas || !total_caixas) {
                return res.status(400).json({
                    success: false,
                    error: 'Manager ID, número de entregas e total de caixas são obrigatórios'
                });
            }

            // Validação adicional para prevenir valores impossíveis
            if (numero_entregas > 100) {
                return res.status(400).json({
                    success: false,
                    error: 'Número de entregas não pode exceder 100'
                });
            }

            if (total_caixas > 25000) {
                return res.status(400).json({
                    success: false,
                    error: 'Total de caixas não pode exceder 25,000'
                });
            }

            console.log('🚂 Calling registrarServicoFerroviaria with:', {
                manager_id,
                numero_entregas: parseInt(numero_entregas),
                total_caixas: parseInt(total_caixas),
                tipo_caixas: tipo_caixas || {},
                tempo_inicio,
                tempo_fim,
                notas
            });

            const service = dataManager.registrarServicoFerroviaria({
                manager_id,
                numero_entregas: parseInt(numero_entregas),
                total_caixas: parseInt(total_caixas),
                tipo_caixas: tipo_caixas || {},
                tempo_inicio,
                tempo_fim,
                notas
            });

            console.log('🚂 Service created:', service?.id);

            res.status(201).json({
                success: true,
                data: service,
                message: 'Serviço ferroviário registrado com sucesso'
            });
        } catch (error) {
            console.error('Erro ao registrar serviço ferroviário:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Erro interno do servidor'
            });
        }
    });

    /**
     * PUT /api/ferroviaria/service/:id - Editar serviço ferroviário
     */
    router.put('/service/:id', (req, res) => {
        try {
            const { id } = req.params;
            const { 
                manager_id,
                numero_entregas,
                total_caixas,
                tipo_caixas,
                tempo_inicio,
                tempo_fim,
                notas
            } = req.body;
            
            // Validação
            if (!manager_id || !numero_entregas || !total_caixas) {
                return res.status(400).json({
                    success: false,
                    error: 'Manager ID, número de entregas e total de caixas são obrigatórios'
                });
            }

            // Validação adicional para prevenir valores impossíveis
            if (numero_entregas > 100) {
                return res.status(400).json({
                    success: false,
                    error: 'Número de entregas não pode exceder 100'
                });
            }

            if (total_caixas > 25000) {
                return res.status(400).json({
                    success: false,
                    error: 'Total de caixas não pode exceder 25,000'
                });
            }

            const service = dataManager.editarServicoFerroviaria(id, {
                manager_id,
                numero_entregas: parseInt(numero_entregas),
                total_caixas: parseInt(total_caixas),
                tipo_caixas: tipo_caixas || {},
                tempo_inicio,
                tempo_fim,
                notas
            });

            res.json({
                success: true,
                data: service,
                message: 'Serviço ferroviário atualizado com sucesso'
            });
        } catch (error) {
            console.error('Erro ao editar serviço ferroviário:', error);
            res.status(error.message.includes('não encontrado') ? 404 : 500).json({
                success: false,
                error: error.message || 'Erro interno do servidor'
            });
        }
    });

    /**
     * DELETE /api/ferroviaria/service/:id - Remover serviço ferroviário
     */
    router.delete('/service/:id', (req, res) => {
        try {
            const { id } = req.params;
            
            const result = dataManager.removerServicoFerroviaria(id);

            res.json({
                success: true,
                data: result,
                message: 'Serviço ferroviário removido com sucesso'
            });
        } catch (error) {
            console.error('Erro ao remover serviço ferroviário:', error);
            res.status(error.message.includes('não encontrado') ? 404 : 500).json({
                success: false,
                error: error.message || 'Erro interno do servidor'
            });
        }
    });

    /**
     * POST /api/ferroviaria/entregas - Registrar entrega
     */
    router.post('/entregas', (req, res) => {
        try {
            const { 
                caixas_utilizadas, 
                valor_recebido, 
                tempo_inicio, 
                tempo_fim, 
                duracao_minutos, 
                trabalhador,
                pagamento_trabalhador 
            } = req.body;
            
            // Validação
            if (!caixas_utilizadas || caixas_utilizadas <= 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Caixas utilizadas são obrigatórias'
                });
            }

            const entrega = dataManager.registrarEntrega({
                caixas_utilizadas: parseInt(caixas_utilizadas),
                valor_recebido: valor_recebido ? parseFloat(valor_recebido) : undefined,
                tempo_inicio: tempo_inicio || new Date().toISOString(),
                tempo_fim: tempo_fim,
                duracao_minutos: duracao_minutos ? parseInt(duracao_minutos) : undefined,
                trabalhador: trabalhador || 'Sistema',
                pagamento_trabalhador: pagamento_trabalhador ? parseFloat(pagamento_trabalhador) : 0
            });

            res.status(201).json({
                success: true,
                data: entrega,
                message: 'Entrega registrada com sucesso'
            });
        } catch (error) {
            console.error('Erro ao registrar entrega:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor'
            });
        }
    });

    // ==============================
    // CONFIGURAÇÃO
    // ==============================

    /**
     * PUT /api/ferroviaria/configuracao - Atualizar configuração
     */
    router.put('/configuracao', (req, res) => {
        try {
            const novaConfig = req.body;
            
            // Validação básica de números positivos
            const camposNumericos = [
                'valor_por_entrega', 
                'caixas_por_entrega', 
                'capacidade_maxima_trem', 
                'entregas_por_refill', 
                'custo_por_caixa', 
                'tempo_por_entrega_minutos', 
                'valor_venda_normal_caixa'
            ];
            
            for (const campo of camposNumericos) {
                if (novaConfig[campo] !== undefined) {
                    const valor = parseFloat(novaConfig[campo]);
                    if (isNaN(valor) || valor < 0) {
                        return res.status(400).json({
                            success: false,
                            error: `${campo} deve ser um número positivo`
                        });
                    }
                    novaConfig[campo] = valor;
                }
            }

            const configuracao = dataManager.atualizarConfiguracaoFerroviaria(novaConfig);
            
            res.json({
                success: true,
                data: configuracao,
                message: 'Configuração atualizada com sucesso'
            });
        } catch (error) {
            console.error('Erro ao atualizar configuração:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor'
            });
        }
    });

    // ==============================
    // WARNING SYSTEM ROUTES
    // ==============================

    /**
     * GET /api/ferroviaria/avisos - Get pending unauthorized box removal warnings
     */
    router.get('/avisos', (req, res) => {
        try {
            const warnings = dataManager.obterAvisosPendentes();
            res.json({
                success: true,
                data: warnings
            });
        } catch (error) {
            console.error('Erro ao obter avisos:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor'
            });
        }
    });

    /**
     * POST /api/ferroviaria/avisos/:id/aprovar - Approve warning
     */
    router.post('/avisos/:id/aprovar', (req, res) => {
        try {
            const { id } = req.params;
            const success = dataManager.aprovarAvisoRemocao(id);
            
            res.json({
                success: success,
                message: 'Aviso aprovado com sucesso'
            });
        } catch (error) {
            console.error('Erro ao aprovar aviso:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor'
            });
        }
    });

    /**
     * POST /api/ferroviaria/avisos/:id/reverter - Reverse unauthorized removal
     */
    router.post('/avisos/:id/reverter', (req, res) => {
        try {
            const { id } = req.params;
            const { atividade } = req.body;
            
            if (!atividade) {
                return res.status(400).json({
                    success: false,
                    error: 'Dados da atividade são obrigatórios'
                });
            }
            
            const success = dataManager.reverterRemocaoNaoAutorizada(id, atividade);
            
            res.json({
                success: success,
                message: success ? 'Remoção revertida com sucesso' : 'Erro ao reverter remoção'
            });
        } catch (error) {
            console.error('Erro ao reverter remoção:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor'
            });
        }
    });

    return router;
};