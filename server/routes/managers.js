const express = require('express');
const router = express.Router();

module.exports = (dataManager) => {
    // ==============================
    // MANAGER ACCOUNTABILITY ROUTES
    // ==============================

    /**
     * GET /api/managers - Obter dados completos dos gerentes
     */
    router.get('/', (req, res) => {
        try {
            const dados = dataManager.obterDadosGerentes();
            res.json({
                success: true,
                data: dados
            });
        } catch (error) {
            console.error('Erro ao obter dados dos gerentes:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor'
            });
        }
    });

    /**
     * POST /api/managers/transaction - Registrar transação de gerente
     */
    router.post('/transaction', (req, res) => {
        try {
            const { userId, tipo, item, quantidade, valor, categoria, descricao } = req.body;
            
            if (!userId || !tipo) {
                return res.status(400).json({
                    success: false,
                    error: 'userId e tipo são obrigatórios'
                });
            }

            const transacao = dataManager.processarTransacaoGerente(userId, {
                tipo,
                item,
                quantidade,
                valor,
                categoria,
                descricao
            });

            res.status(201).json({
                success: true,
                data: transacao
            });
        } catch (error) {
            console.error('Erro ao processar transação de gerente:', error);
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * PUT /api/managers/transaction/:id - Editar razão de transação
     */
    router.put('/transaction/:id', (req, res) => {
        try {
            const { id } = req.params;
            const { razao, valorJustificado } = req.body;
            
            if (!razao) {
                return res.status(400).json({
                    success: false,
                    error: 'Razão é obrigatória'
                });
            }

            const transacao = dataManager.editarRazaoTransacao(id, razao, valorJustificado);

            res.json({
                success: true,
                data: transacao
            });
        } catch (error) {
            console.error('Erro ao editar transação:', error);
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /api/managers/:id/accountability - Obter relatório de accountability do gerente
     */
    router.get('/:id/accountability', (req, res) => {
        try {
            const { id } = req.params;
            const relatorio = dataManager.obterRelatorioGerente(id);

            res.json({
                success: true,
                data: relatorio
            });
        } catch (error) {
            console.error('Erro ao obter relatório do gerente:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor'
            });
        }
    });

    /**
     * POST /api/managers/reconcile - Executar reconciliação para um gerente
     */
    router.post('/reconcile', (req, res) => {
        try {
            const { managerId } = req.body;
            
            if (!managerId) {
                return res.status(400).json({
                    success: false,
                    error: 'managerId é obrigatório'
                });
            }

            const reconciliacoes = dataManager.reconciliarTransacoes(managerId);

            res.json({
                success: true,
                data: reconciliacoes
            });
        } catch (error) {
            console.error('Erro ao reconciliar transações:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor'
            });
        }
    });

    /**
     * POST /api/managers/:id/credit - Atualizar crédito/débito do gerente
     */
    router.post('/:id/credit', (req, res) => {
        try {
            const { id } = req.params;
            const { valor, descricao } = req.body;
            
            if (valor === undefined || !descricao) {
                return res.status(400).json({
                    success: false,
                    error: 'Valor e descrição são obrigatórios'
                });
            }

            dataManager.atualizarCreditoGerente(id, valor, descricao);
            const dados = dataManager.obterDadosGerentes();

            res.json({
                success: true,
                data: dados.gerentes[id]?.credito
            });
        } catch (error) {
            console.error('Erro ao atualizar crédito:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor'
            });
        }
    });

    /**
     * GET /api/managers/performance - Obter performance de todos os gerentes
     */
    router.get('/performance', (req, res) => {
        try {
            const dados = dataManager.obterDadosGerentes();
            const performance = {};
            
            for (const [id, gerente] of Object.entries(dados.gerentes)) {
                performance[id] = gerente.performance;
            }

            res.json({
                success: true,
                data: performance
            });
        } catch (error) {
            console.error('Erro ao obter performance:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor'
            });
        }
    });

    /**
     * POST /api/managers/sync-transactions - Sincronizar transações existentes do Discord
     */
    router.post('/sync-transactions', (req, res) => {
        try {
            // Get all Discord activities
            const atividades = dataManager.discord.atividades_recentes || [];
            let synced = 0;

            // Process activities for each manager
            const gerentes = dataManager.obterDadosGerentes().gerentes;
            
            for (const [managerId, manager] of Object.entries(gerentes)) {
                // Find activities for this manager
                const managerActivities = atividades.filter(a => {
                    const userId = dataManager.extrairIdUsuario(a.autor);
                    return userId === managerId;
                });

                // Process each activity
                for (const activity of managerActivities) {
                    // Check if already processed
                    const exists = dataManager.gerentesAccountability.transacoes.some(
                        t => t.discord_id === activity.id
                    );

                    if (!exists) {
                        try {
                            // Determine category using EXISTING inventory categories
                            let categoria = 'outros';
                            if (activity.item) {
                                const itemLower = activity.item.toLowerCase();
                                const tipo = activity.tipo;
                                
                                // Use EXACT same categories as inventory system
                                if (itemLower.includes('seed') || itemLower.includes('semente')) {
                                    categoria = tipo === 'remover' ? 'seeds_out' : 'seeds_in';
                                } else if (['carneiro', 'ovelha', 'galinha', 'porco', 'vaca', 'burro', 'cow', 'sheep', 'chicken', 'pig', 'donkey', 'goat'].some(a => itemLower.includes(a))) {
                                    categoria = tipo === 'remover' ? 'animals_out' : 'animals_in';
                                } else if (itemLower.includes('racao') || itemLower.includes('feed')) {
                                    categoria = tipo === 'remover' ? 'feed_out' : 'feed_in';
                                } else if (itemLower.includes('caixa') || itemLower.includes('box')) {
                                    categoria = 'manufactured_in';
                                } else if (['corn', 'milho', 'bulrush', 'junco', 'trigo', 'wheat'].some(p => itemLower.includes(p))) {
                                    categoria = 'plants_in';
                                } else if (['milk', 'leather', 'meat', 'egg', 'lã'].some(p => itemLower.includes(p))) {
                                    categoria = 'animal_products_in';
                                }
                            } else if (activity.valor) {
                                categoria = 'financial';
                            }

                            dataManager.processarTransacaoGerente(managerId, {
                                tipo: activity.tipo,
                                item: activity.item,
                                quantidade: activity.quantidade,
                                valor: activity.valor,
                                categoria,
                                descricao: activity.descricao,
                                discord_id: activity.id,
                                original_timestamp: activity.timestamp
                            });
                            synced++;
                        } catch (error) {
                            console.error(`Erro ao sincronizar atividade ${activity.id}:`, error);
                        }
                    }
                }

                // Run reconciliation for the manager
                dataManager.reconciliarTransacoes(managerId);
            }

            res.json({
                success: true,
                message: `${synced} transações sincronizadas`,
                data: dataManager.obterDadosGerentes()
            });
        } catch (error) {
            console.error('Erro ao sincronizar transações:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor'
            });
        }
    });

    // Payment routes removed

    /**
     * GET /api/managers/overview - Obter overview de estatísticas gerenciais
     */
    router.get('/overview', (req, res) => {
        try {
            console.log('Obtendo overview gerencial...');
            const overview = dataManager.obterOverviewGerencial();
            console.log('Overview obtido:', overview);
            res.json({
                success: true,
                data: overview
            });
        } catch (error) {
            console.error('Erro ao obter overview:', error);
            console.error('Stack:', error.stack);
            res.status(500).json({
                success: false,
                error: error.message || 'Erro interno do servidor',
                stack: error.stack
            });
        }
    });

    /**
     * POST /api/managers/add-edit - Adicionar ou editar gerente/supervisor
     */
    router.post('/add-edit', (req, res) => {
        try {
            const { userId, nome, funcao, ativo, pagamento_semanal } = req.body;
            
            if (!userId || !nome || !funcao) {
                return res.status(400).json({
                    success: false,
                    error: 'userId, nome e funcao são obrigatórios'
                });
            }

            if (!['gerente', 'supervisor'].includes(funcao)) {
                return res.status(400).json({
                    success: false,
                    error: 'Função deve ser "gerente" ou "supervisor"'
                });
            }

            const usuario = dataManager.adicionarEditarGerente(userId, {
                nome,
                funcao,
                ativo,
                pagamento_semanal
            });
            
            res.json({
                success: true,
                data: usuario
            });
        } catch (error) {
            console.error('Erro ao adicionar/editar gerente:', error);
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * DELETE /api/managers/:id - Remover gerente (marcar como inativo)
     */
    router.delete('/:id', (req, res) => {
        try {
            const { id } = req.params;
            const usuario = dataManager.removerGerente(id);
            
            res.json({
                success: true,
                data: usuario
            });
        } catch (error) {
            console.error('Erro ao remover gerente:', error);
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * POST /api/managers/reset-negative-balances - Reset erroneous negative balances
     */
    router.post('/reset-negative-balances', (req, res) => {
        try {
            const result = dataManager.resetErroneousNegativeBalances();
            
            res.json({
                success: true,
                data: result,
                message: `Reset ${result.resetCount} negative balances`
            });
        } catch (error) {
            console.error('Erro ao resetar saldos negativos:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // ==============================
    // PAYMENT SYSTEM ROUTES
    // ==============================

    /**
     * POST /api/managers/:id/payment - Processar pagamento individual para gerente
     */
    router.post('/:id/payment', (req, res) => {
        try {
            const { id } = req.params;
            const { valor, descricao } = req.body;
            
            if (!valor || valor <= 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Valor deve ser maior que zero'
                });
            }

            const pagamento = dataManager.processarPagamentoGerente(id, valor, descricao);
            
            res.json({
                success: true,
                data: pagamento,
                message: `Pagamento de $${valor.toFixed(2)} processado para ${pagamento.manager_nome}`
            });
        } catch (error) {
            console.error('Erro ao processar pagamento:', error);
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * POST /api/managers/payment/all - Processar pagamento para todos os gerentes
     */
    router.post('/payment/all', (req, res) => {
        try {
            const resultado = dataManager.processarPagamentoTodosGerentes();
            
            res.json({
                success: true,
                data: resultado,
                message: `${resultado.pagamentos_realizados.length} pagamentos processados. Total: $${resultado.total_pago.toFixed(2)}`
            });
        } catch (error) {
            console.error('Erro ao processar pagamento de todos:', error);
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /api/managers/payment/history - Obter histórico de pagamentos
     */
    router.get('/payment/history', (req, res) => {
        try {
            const { managerId, limite } = req.query;
            const historico = dataManager.obterHistoricoPagamentos(
                managerId || null, 
                parseInt(limite) || 50
            );
            
            res.json({
                success: true,
                data: historico
            });
        } catch (error) {
            console.error('Erro ao obter histórico de pagamentos:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor'
            });
        }
    });

    /**
     * GET /api/managers/:id/workload - Obter workload detalhado de um gerente
     */
    router.get('/:id/workload', (req, res) => {
        try {
            const { id } = req.params;
            const workload = dataManager.calcularWorkloadGerente(id);
            
            res.json({
                success: true,
                data: workload
            });
        } catch (error) {
            console.error('Erro ao obter workload:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor'
            });
        }
    });

    // ==============================
    // MONEY FLOW TRACKING ENDPOINTS
    // ==============================

    /**
     * POST /api/managers/:id/withdrawal - Processar saque de gerente
     */
    router.post('/:id/withdrawal', (req, res) => {
        try {
            const { id } = req.params;
            const { valor, razao, categoria = 'outros' } = req.body;
            
            if (!valor || valor <= 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Valor deve ser maior que zero'
                });
            }

            if (!razao) {
                return res.status(400).json({
                    success: false,
                    error: 'Razão é obrigatória'
                });
            }

            const withdrawal = dataManager.processarSaqueGerente(id, valor, razao, categoria);
            
            res.json({
                success: true,
                data: withdrawal,
                message: `Saque de $${valor.toFixed(2)} processado. Liability criada.`
            });
        } catch (error) {
            console.error('Erro ao processar saque:', error);
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * POST /api/managers/:id/deposit - Processar depósito de gerente
     */
    router.post('/:id/deposit', (req, res) => {
        try {
            const { id } = req.params;
            const { valor, razao, categoria = 'revenue' } = req.body;
            
            if (!valor || valor <= 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Valor deve ser maior que zero'
                });
            }

            if (!razao) {
                return res.status(400).json({
                    success: false,
                    error: 'Razão é obrigatória'
                });
            }

            const deposit = dataManager.processarDepositoGerente(id, valor, razao, categoria);
            
            if (deposit === null) {
                res.json({
                    success: true,
                    message: 'Depósito excluído do tracking (sistema automático)',
                    excluded: true
                });
            } else {
                res.json({
                    success: true,
                    data: deposit,
                    message: `Depósito de $${valor.toFixed(2)} processado`
                });
            }
        } catch (error) {
            console.error('Erro ao processar depósito:', error);
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * POST /api/managers/:id/worker-payment - Registrar pagamento para worker
     */
    router.post('/:id/worker-payment', (req, res) => {
        try {
            const { id } = req.params;
            const { worker_id, valor, withdrawal_id = null } = req.body;
            
            if (!worker_id) {
                return res.status(400).json({
                    success: false,
                    error: 'worker_id é obrigatório'
                });
            }

            if (!valor || valor <= 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Valor deve ser maior que zero'
                });
            }

            const payment = dataManager.processarPagamentoWorker(id, worker_id, valor, withdrawal_id);
            
            res.json({
                success: true,
                data: payment,
                message: `Pagamento de $${valor.toFixed(2)} registrado. Liability reduzida.`
            });
        } catch (error) {
            console.error('Erro ao processar pagamento para worker:', error);
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /api/managers/:id/liability - Obter liability atual do gerente
     */
    router.get('/:id/liability', (req, res) => {
        try {
            const { id } = req.params;
            const liability = dataManager.obterLiabilidadeGerente(id);
            
            res.json({
                success: true,
                data: liability
            });
        } catch (error) {
            console.error('Erro ao obter liability:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor'
            });
        }
    });

    /**
     * GET /api/managers/:id/money-flow - Obter relatório de fluxo de dinheiro
     */
    router.get('/:id/money-flow', (req, res) => {
        try {
            const { id } = req.params;
            const { periodo = 30 } = req.query;
            
            const report = dataManager.obterRelatorioFluxoDinheiro(id, parseInt(periodo));
            
            res.json({
                success: true,
                data: report
            });
        } catch (error) {
            console.error('Erro ao obter relatório de fluxo de dinheiro:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor'
            });
        }
    });

    /**
     * GET /api/managers/liability-alerts - Obter alertas de liability
     */
    router.get('/liability-alerts', (req, res) => {
        try {
            const alerts = dataManager.gerarAlertasLiabilidade();
            
            res.json({
                success: true,
                data: alerts
            });
        } catch (error) {
            console.error('Erro ao obter alertas de liability:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor'
            });
        }
    });

    /**
     * GET /api/managers/money-flow/summary - Obter resumo geral do fluxo de dinheiro
     */
    router.get('/money-flow/summary', (req, res) => {
        try {
            const dados = dataManager.obterDadosGerentes();
            const moneyFlow = dataManager.gerentesAccountability.money_flow || {
                withdrawals: [],
                worker_payments: [],
                liabilities: {},
                excluded_deposits: []
            };

            // Calculate summary statistics
            const totalWithdrawals = moneyFlow.withdrawals.reduce((sum, w) => sum + w.valor, 0);
            const totalWorkerPayments = moneyFlow.worker_payments.reduce((sum, p) => sum + p.valor, 0);
            const totalOutstandingLiability = Object.values(moneyFlow.liabilities)
                .reduce((sum, l) => sum + l.outstanding_amount, 0);
            const totalExcludedDeposits = moneyFlow.excluded_deposits.reduce((sum, d) => sum + d.valor, 0);

            // Get managers with high liabilities
            const managersWithHighLiability = Object.entries(moneyFlow.liabilities)
                .filter(([_, liability]) => liability.outstanding_amount > 200)
                .map(([managerId, liability]) => ({
                    manager_id: managerId,
                    manager_nome: liability.manager_nome,
                    outstanding_amount: liability.outstanding_amount
                }))
                .sort((a, b) => b.outstanding_amount - a.outstanding_amount);

            res.json({
                success: true,
                data: {
                    summary: {
                        total_withdrawals: totalWithdrawals,
                        total_worker_payments: totalWorkerPayments,
                        total_outstanding_liability: totalOutstandingLiability,
                        total_excluded_deposits: totalExcludedDeposits,
                        accountability_percentage: totalWithdrawals > 0 ? 
                            (totalWorkerPayments / totalWithdrawals) * 100 : 100
                    },
                    managers_with_high_liability: managersWithHighLiability,
                    recent_withdrawals: moneyFlow.withdrawals
                        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                        .slice(0, 10),
                    recent_worker_payments: moneyFlow.worker_payments
                        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                        .slice(0, 10)
                }
            });
        } catch (error) {
            console.error('Erro ao obter resumo do fluxo de dinheiro:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor'
            });
        }
    });

    /**
     * POST /api/managers/sync-discord-transactions - Sincronizar transações do Discord
     */
    router.post('/sync-discord-transactions', (req, res) => {
        try {
            const result = dataManager.sincronizarTransacoesDiscord();
            
            res.json({
                success: true,
                data: result,
                message: `Sincronizadas ${result.sincronizadas} transações, excluídas ${result.excluidas}`
            });
        } catch (error) {
            console.error('Erro ao sincronizar transações do Discord:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor'
            });
        }
    });

    /**
     * GET /api/managers/money-flow/transactions - Get all money flow transactions
     */
    router.get('/money-flow/transactions', (req, res) => {
        try {
            const moneyFlow = dataManager.gerentesAccountability.money_flow || {
                withdrawals: [],
                worker_payments: [],
                liabilities: {},
                excluded_deposits: []
            };

            // Combine all transactions with proper type labels
            const allTransactions = [
                ...moneyFlow.withdrawals.map(t => ({ 
                    ...t, 
                    type: 'withdrawal',
                    manager_nome: t.manager_nome,
                    valor: t.valor,
                    razao: t.razao,
                    categoria: t.categoria,
                    timestamp: t.timestamp
                })),
                ...moneyFlow.worker_payments.map(t => ({ 
                    ...t, 
                    type: 'worker_payment',
                    manager_nome: t.manager_nome,
                    valor: t.valor,
                    razao: `Payment to ${t.worker_nome}`,
                    categoria: 'worker_payment',
                    timestamp: t.timestamp
                })),
                ...moneyFlow.excluded_deposits.map(t => ({ 
                    ...t, 
                    type: 'excluded_deposit',
                    manager_nome: dataManager.usuarios.usuarios[t.manager_id]?.nome || 'Unknown',
                    valor: t.valor,
                    razao: t.exclusion_reason,
                    categoria: 'excluded',
                    timestamp: t.timestamp
                }))
            ];

            // Sort by timestamp (newest first)
            allTransactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            res.json({
                success: true,
                data: allTransactions
            });
        } catch (error) {
            console.error('Erro ao obter transações do fluxo de dinheiro:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor'
            });
        }
    });

    return router;
};