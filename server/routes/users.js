const express = require('express');
const router = express.Router();

module.exports = (dataManager) => {
  // GET /api/usuarios - Get all users
  router.get('/', (req, res) => {
    try {
      const usuarios = dataManager.obterTodosUsuarios();
      res.json({ sucesso: true, dados: usuarios });
    } catch (error) {
      console.error('Error getting users:', error);
      res.status(500).json({ sucesso: false, erro: 'Falha ao carregar usuários' });
    }
  });

  // POST /api/usuarios - Create new user
  router.post('/', (req, res) => {
    try {
      const { id, nome, funcao = 'trabalhador' } = req.body;
      
      if (!id || !nome) {
        return res.status(400).json({ sucesso: false, erro: 'ID e nome são obrigatórios' });
      }

      const success = dataManager.adicionarUsuario(id, nome, funcao);
      
      if (success) {
        res.status(201).json({ 
          sucesso: true, 
          mensagem: 'Usuário criado com sucesso'
        });
      } else {
        res.status(500).json({ sucesso: false, erro: 'Falha ao criar usuário' });
      }
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({ sucesso: false, erro: 'Falha ao criar usuário' });
    }
  });

  // PUT /api/usuarios/:userId/funcao - Update user role
  router.put('/:userId/funcao', (req, res) => {
    try {
      const userId = decodeURIComponent(req.params.userId);
      const { funcao } = req.body;
      
      if (!funcao || !['gerente', 'trabalhador'].includes(funcao)) {
        return res.status(400).json({ sucesso: false, erro: 'Função válida (gerente ou trabalhador) é obrigatória' });
      }

      const success = dataManager.atualizarFuncaoUsuario(userId, funcao);
      
      if (success) {
        res.json({ 
          sucesso: true, 
          mensagem: 'Função do usuário atualizada com sucesso'
        });
      } else {
        res.status(404).json({ sucesso: false, erro: 'Usuário não encontrado' });
      }
    } catch (error) {
      console.error('Error updating user role:', error);
      res.status(500).json({ sucesso: false, erro: 'Falha ao atualizar função do usuário' });
    }
  });

  // DELETE /api/usuarios/:userId - Delete user
  router.delete('/:userId', (req, res) => {
    try {
      const userId = decodeURIComponent(req.params.userId);
      const success = dataManager.removerUsuario(userId);
      
      if (success) {
        res.json({ 
          sucesso: true, 
          mensagem: 'Usuário removido com sucesso'
        });
      } else {
        res.status(404).json({ sucesso: false, erro: 'Usuário não encontrado' });
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ sucesso: false, erro: 'Falha ao remover usuário' });
    }
  });
  
  // GET /api/usuarios/:userId/performance - Get user performance
  router.get('/:userId/performance', (req, res) => {
    try {
      const userId = decodeURIComponent(req.params.userId);
      console.log('🎯 API Route: Getting performance for user:', userId);
      const performance = dataManager.obterPerformanceUsuario(userId);
      console.log('📊 API Route: Performance result:', {
        total_atividades: performance.total_atividades,
        atividades_recentes: performance.atividades_recentes?.length,
        servicos_total: performance.servicos?.total_ganhos
      });
      res.json({ sucesso: true, dados: performance });
    } catch (error) {
      console.error('Error getting user performance:', error);
      res.status(500).json({ sucesso: false, erro: 'Falha ao obter performance do usuário' });
    }
  });
  
  // GET /api/usuarios/ranking/performance - Get performance ranking
  router.get('/ranking/performance', (req, res) => {
    try {
      const ranking = dataManager.obterRankingPerformance();
      res.json({ sucesso: true, dados: ranking });
    } catch (error) {
      console.error('Error getting performance ranking:', error);
      res.status(500).json({ sucesso: false, erro: 'Falha ao obter ranking de performance' });
    }
  });

  // GET /api/usuarios/:userId/transacoes-analise - Get comprehensive transaction analysis
  router.get('/:userId/transacoes-analise', (req, res) => {
    try {
      const userId = decodeURIComponent(req.params.userId);
      console.log('🚨🚨🚨 TRANSACTION ANALYSIS API: Received user ID:', userId, 'Type:', typeof userId);
      console.log('🚨🚨🚨 TRANSACTION ANALYSIS API: Raw params:', req.params);
      console.log('🚨🚨🚨 TRANSACTION ANALYSIS API: Full URL:', req.url);
      
      const analise = dataManager.obterAnalisesTransacoes(userId);
      console.log('🚨🚨🚨 TRANSACTION ANALYSIS API: Analysis result:', analise ? 'Found data' : 'No data found');
      
      if (analise.erro) {
        return res.status(400).json({ 
          sucesso: false, 
          erro: analise.erro,
          detalhes: analise.detalhes
        });
      }
      
      res.json({ 
        sucesso: true, 
        dados: analise,
        mensagem: `Análise de ${analise.totalTransacoes} transações concluída`
      });
    } catch (error) {
      console.error('Error getting transaction analysis:', error);
      res.status(500).json({ sucesso: false, erro: 'Falha ao analisar transações' });
    }
  });
  
  // POST /api/usuarios/:userId/pagar-todos - Pay all services for user
  router.post('/:userId/pagar-todos', (req, res) => {
    try {
      const userId = decodeURIComponent(req.params.userId);
      const resultado = dataManager.pagarTodosServicos(userId);
      
      if (resultado.sucesso) {
        // Emit real-time updates
        if (dataManager.io) {
          dataManager.io.emit('usuarios:atualizado', dataManager.obterTodosUsuarios());
        }
        
        res.json({ 
          sucesso: true, 
          mensagem: `Pagamento de $${resultado.valor_total} processado com sucesso`,
          dados: resultado,
          recibo_discord: resultado.recibo_discord
        });
      } else {
        res.status(400).json({ sucesso: false, erro: resultado.erro });
      }
    } catch (error) {
      console.error('Error paying all services:', error);
      res.status(500).json({ sucesso: false, erro: 'Falha ao processar pagamento' });
    }
  });
  
  // POST /api/usuarios/:userId/pagar/:tipoServico - Pay specific service
  router.post('/:userId/pagar/:tipoServico', (req, res) => {
    try {
      const userId = decodeURIComponent(req.params.userId);
      const tipoServico = req.params.tipoServico;
      
      const resultado = dataManager.pagarServicoEspecifico(userId, tipoServico);
      
      if (resultado.sucesso) {
        // Emit real-time updates
        if (dataManager.io) {
          dataManager.io.emit('usuarios:atualizado', dataManager.obterTodosUsuarios());
        }
        
        res.json({ 
          sucesso: true, 
          mensagem: `Pagamento de ${tipoServico} ($${resultado.valor_pago}) processado com sucesso`,
          dados: resultado,
          recibo_discord: resultado.recibo_discord
        });
      } else {
        res.status(400).json({ sucesso: false, erro: resultado.erro });
      }
    } catch (error) {
      console.error('Error paying specific service:', error);
      res.status(500).json({ sucesso: false, erro: 'Falha ao processar pagamento' });
    }
  });
  
  // GET /api/usuarios/:userId/pagamentos - Get user payment history
  router.get('/:userId/pagamentos', (req, res) => {
    try {
      const userId = decodeURIComponent(req.params.userId);
      console.log('📋 Getting payment history for user:', userId);
      
      if (!userId) {
        return res.status(400).json({ sucesso: false, erro: 'User ID is required' });
      }
      
      // Check if dataManager has the method and required data
      if (!dataManager.obterHistoricoPagamentos) {
        console.error('❌ DataManager missing obterHistoricoPagamentos method');
        return res.json({ sucesso: true, dados: [] });
      }
      
      const pagamentos = dataManager.obterHistoricoPagamentos(userId);
      console.log('✅ Payment history retrieved:', pagamentos?.length || 0, 'payments');
      
      res.json({ sucesso: true, dados: pagamentos || [] });
    } catch (error) {
      console.error('❌ Error getting payment history for user', req.params.userId, ':', error);
      res.status(500).json({ 
        sucesso: false, 
        erro: 'Falha ao obter histórico de pagamentos', 
        detalhes: error.message 
      });
    }
  });
  
  // POST /api/usuarios/:userId/pagar-transacao/:tipoServico/:idTransacao - Pay individual transaction
  router.post('/:userId/pagar-transacao/:tipoServico/:idTransacao', (req, res) => {
    try {
      const userId = decodeURIComponent(req.params.userId);
      const tipoServico = req.params.tipoServico;
      const idTransacao = req.params.idTransacao;
      
      const resultado = dataManager.pagarTransacaoIndividual(userId, tipoServico, idTransacao);
      
      if (resultado.sucesso) {
        // Mark transaction as paid
        dataManager.marcarAtividadesComoPagas([idTransacao]);
        
        // Emit real-time updates
        if (dataManager.io) {
          dataManager.io.emit('usuarios:atualizado', dataManager.obterTodosUsuarios());
        }
        
        res.json({ 
          sucesso: true, 
          mensagem: `Transação paga com sucesso ($${resultado.valor_pago})`,
          dados: resultado,
          recibo_discord: resultado.recibo_discord
        });
      } else {
        res.status(400).json({ sucesso: false, erro: resultado.erro });
      }
    } catch (error) {
      console.error('Error paying individual transaction:', error);
      res.status(500).json({ sucesso: false, erro: 'Falha ao processar pagamento de transação' });
    }
  });

  // GET /api/usuarios/pagamentos - Get payment history
  router.get('/pagamentos', (req, res) => {
    try {
      const userId = req.query.userId || null;
      const pagamentos = dataManager.obterHistoricoPagamentos(userId);
      
      res.json({
        sucesso: true,
        dados: pagamentos,
        total: pagamentos.length
      });
    } catch (error) {
      console.error('Error getting payment history:', error);
      res.status(500).json({ sucesso: false, erro: 'Falha ao obter histórico de pagamentos' });
    }
  });
  
  // POST /api/usuarios/pagamentos/atualizar-recibos - Update receipts for old payments
  router.post('/pagamentos/atualizar-recibos', async (req, res) => {
    try {
      const resultado = await dataManager.atualizarRecibosHistoricos();
      
      res.json({
        sucesso: resultado.sucesso,
        mensagem: resultado.sucesso ? 'Recibos históricos atualizados' : 'Erro ao atualizar recibos',
        dados: resultado
      });
    } catch (error) {
      console.error('Error updating historical receipts:', error);
      res.status(500).json({ sucesso: false, erro: 'Falha ao atualizar recibos históricos' });
    }
  });

  // GET /api/usuarios/ranking - Get users efficiency ranking
  router.get('/ranking', (req, res) => {
    try {
      const ranking = dataManager.obterRankingPerformance();
      res.json({ sucesso: true, dados: ranking });
    } catch (error) {
      console.error('Error getting users ranking:', error);
      res.status(500).json({ sucesso: false, erro: 'Falha ao obter ranking de usuários' });
    }
  });

  // GET /api/usuarios/plantas - Get plant statistics by date range
  router.get('/plantas', (req, res) => {
    try {
      const { dataInicio, dataFim } = req.query;
      
      if (!dataInicio || !dataFim) {
        return res.status(400).json({ 
          sucesso: false, 
          erro: 'dataInicio e dataFim são obrigatórios (formato ISO: YYYY-MM-DDTHH:mm:ss.sssZ)' 
        });
      }

      const estatisticas = dataManager.obterEstatisticasPlantas(dataInicio, dataFim);
      res.json({ sucesso: true, dados: estatisticas });
    } catch (error) {
      console.error('Error getting plant statistics:', error);
      res.status(500).json({ sucesso: false, erro: 'Falha ao obter estatísticas de plantas' });
    }
  });

  // POST /api/usuarios/:id/abuse-action - Handle ignore/charge action for abuse items
  router.post('/:id/abuse-action', (req, res) => {
    try {
      const userId = req.params.id;
      const { action, category, index, item } = req.body;
      
      if (!action || !category || index === undefined || !item) {
        return res.status(400).json({ 
          sucesso: false, 
          erro: 'action, category, index e item são obrigatórios' 
        });
      }

      if (!['charge', 'ignore'].includes(action)) {
        return res.status(400).json({ 
          sucesso: false, 
          erro: 'action deve ser "charge" ou "ignore"' 
        });
      }

      // Record the abuse action
      const result = dataManager.recordAbuseAction(userId, action, category, index, item);
      
      if (result.sucesso) {
        res.json({ 
          sucesso: true, 
          mensagem: result.mensagem,
          dados: result.dados
        });
      } else {
        res.status(400).json({ sucesso: false, erro: result.erro });
      }
    } catch (error) {
      console.error('Error handling abuse action:', error);
      res.status(500).json({ sucesso: false, erro: 'Falha ao processar ação de abuso' });
    }
  });

  // Service management endpoints
  
  // DELETE /api/usuarios/atividade/:activityId - Remove activity
  router.delete('/atividade/:activityId', async (req, res) => {
    try {
      const activityId = req.params.activityId;
      console.log(`🗑️ DELETE API called for transaction: ${activityId}`);
      
      const result = await dataManager.removerAtividadeDiscord(activityId);
      console.log(`🗑️ DELETE result:`, result);
      
      if (result.sucesso) {
        res.json({ 
          sucesso: true, 
          mensagem: result.mensagem || 'Atividade removida com sucesso',
          dados: result
        });
      } else {
        res.status(400).json({ sucesso: false, erro: result.erro });
      }
    } catch (error) {
      console.error('❌ Error removing activity:', error);
      res.status(500).json({ sucesso: false, erro: 'Falha ao remover atividade: ' + error.message });
    }
  });

  // PUT /api/usuarios/atividade/:activityId - Edit activity
  router.put('/atividade/:activityId', (req, res) => {
    try {
      const activityId = req.params.activityId;
      const novosDados = req.body;
      
      const result = dataManager.editarAtividadeDiscord(activityId, novosDados);
      
      if (result.sucesso) {
        // Emit real-time updates
        if (dataManager.io) {
          dataManager.io.emit('usuarios:atualizado', dataManager.obterTodosUsuarios());
        }
        
        res.json({ 
          sucesso: true, 
          mensagem: 'Atividade editada com sucesso',
          dados: result
        });
      } else {
        res.status(400).json({ sucesso: false, erro: result.erro });
      }
    } catch (error) {
      console.error('Error editing activity:', error);
      res.status(500).json({ sucesso: false, erro: 'Falha ao editar atividade' });
    }
  });

  // POST /api/usuarios/atividade - Add manual activity
  router.post('/atividade', (req, res) => {
    try {
      const dadosAtividade = req.body;
      
      if (!dadosAtividade.autor || !dadosAtividade.tipo) {
        return res.status(400).json({ 
          sucesso: false, 
          erro: 'autor e tipo são obrigatórios' 
        });
      }
      
      const result = dataManager.adicionarAtividadeManual(dadosAtividade);
      
      if (result.sucesso) {
        // Emit real-time updates
        if (dataManager.io) {
          dataManager.io.emit('usuarios:atualizado', dataManager.obterTodosUsuarios());
        }
        
        res.status(201).json({ 
          sucesso: true, 
          mensagem: 'Atividade adicionada com sucesso',
          dados: result
        });
      } else {
        res.status(400).json({ sucesso: false, erro: result.erro });
      }
    } catch (error) {
      console.error('Error adding manual activity:', error);
      res.status(500).json({ sucesso: false, erro: 'Falha ao adicionar atividade' });
    }
  });

  // GET /api/usuarios/atividade/:activityId - Get specific activity
  router.get('/atividade/:activityId', (req, res) => {
    try {
      const activityId = req.params.activityId;
      const atividade = dataManager.obterAtividadePorId(activityId);
      
      if (atividade) {
        res.json({ sucesso: true, dados: atividade });
      } else {
        res.status(404).json({ sucesso: false, erro: 'Atividade não encontrada' });
      }
    } catch (error) {
      console.error('Error getting activity:', error);
      res.status(500).json({ sucesso: false, erro: 'Falha ao obter atividade' });
    }
  });

  // GET /api/usuarios/:userId/transactions - Get all transactions for a user
  router.get('/:userId/transactions', (req, res) => {
    try {
      const userId = decodeURIComponent(req.params.userId);
      console.log('🔍 Getting all transactions for user:', userId);
      
      const transactions = dataManager.obterTodasTransacoesUsuario(userId);
      
      res.json({ 
        sucesso: true, 
        transactions: transactions,
        total: transactions.length
      });
    } catch (error) {
      console.error('Error getting user transactions:', error);
      res.status(500).json({ sucesso: false, erro: 'Falha ao obter transações do usuário' });
    }
  });

  // PUT /api/usuarios/global-item-update - Update item globally across all systems
  router.put('/global-item-update', (req, res) => {
    try {
      const { oldId, newId, newDisplayName } = req.body;
      
      if (!oldId) {
        return res.status(400).json({ sucesso: false, erro: 'oldId é obrigatório' });
      }
      
      console.log('🌍 Global item update:', { oldId, newId, newDisplayName });
      
      const result = dataManager.atualizarItemGlobalmente(oldId, newId, newDisplayName);
      
      if (result.sucesso) {
        res.json({ 
          sucesso: true, 
          mensagem: `Item atualizado globalmente: ${oldId} → ${newId || oldId}`,
          dados: result
        });
      } else {
        res.status(500).json({ sucesso: false, erro: result.erro });
      }
    } catch (error) {
      console.error('Error updating item globally:', error);
      res.status(500).json({ sucesso: false, erro: 'Falha ao atualizar item globalmente' });
    }
  });

  // POST /api/usuarios/:id/unpay/:serviceType/:activityId - Unpay specific transaction
  router.post('/:id/unpay/:serviceType/:activityId', (req, res) => {
    try {
      const { id: userId, serviceType, activityId } = req.params;
      
      const result = dataManager.despagarTransacao(userId, serviceType, activityId);
      
      if (result.sucesso) {
        // Emit real-time updates
        if (dataManager.io) {
          dataManager.io.emit('usuarios:atualizado', dataManager.obterTodosUsuarios());
        }
        
        res.json({ 
          sucesso: true, 
          mensagem: 'Transação despaga com sucesso',
          dados: result
        });
      } else {
        res.status(400).json({ sucesso: false, erro: result.erro });
      }
    } catch (error) {
      console.error('Error unpaying transaction:', error);
      res.status(500).json({ sucesso: false, erro: 'Falha ao despagar transação' });
    }
  });

  // POST /api/usuarios/:id/unpay-all/:serviceType - Unpay all transactions of a service
  router.post('/:id/unpay-all/:serviceType', (req, res) => {
    try {
      const { id: userId, serviceType } = req.params;
      console.log('🔄 UNPAY ALL: Request for user', userId, 'service', serviceType);
      
      const result = dataManager.despagarTodasTransacoes(userId, serviceType);
      console.log('📋 UNPAY ALL: Result:', result);
      
      if (result.sucesso) {
        // Emit real-time updates
        if (dataManager.io) {
          dataManager.io.emit('usuarios:atualizado', dataManager.obterTodosUsuarios());
        }
        
        res.json({ 
          sucesso: true, 
          mensagem: 'Todas as transações foram despagas',
          dados: result
        });
      } else {
        res.status(400).json({ sucesso: false, erro: result.erro });
      }
    } catch (error) {
      console.error('Error unpaying all transactions:', error);
      res.status(500).json({ sucesso: false, erro: 'Falha ao despagar todas as transações' });
    }
  });

  // DELETE /api/usuarios/pagamentos/:paymentId - Delete payment record
  router.delete('/pagamentos/:paymentId', (req, res) => {
    try {
      const paymentId = req.params.paymentId;
      
      const result = dataManager.deletarPagamento(paymentId);
      
      if (result.sucesso) {
        // Emit real-time updates
        if (dataManager.io) {
          dataManager.io.emit('usuarios:atualizado', dataManager.obterTodosUsuarios());
        }
        
        res.json({ 
          sucesso: true, 
          mensagem: 'Pagamento deletado com sucesso',
          dados: result
        });
      } else {
        res.status(400).json({ sucesso: false, erro: result.erro });
      }
    } catch (error) {
      console.error('Error deleting payment:', error);
      res.status(500).json({ sucesso: false, erro: 'Falha ao deletar pagamento' });
    }
  });

  return router;
};