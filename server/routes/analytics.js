const express = require('express');
const router = express.Router();

/**
 * Rotas do Dashboard - Estatísticas e Analytics
 * Sistema completamente em português
 */
module.exports = (dataManager) => {
  
  // GET /api/dashboard/estatisticas - Obter estatísticas do dashboard
  router.get('/estatisticas', (req, res) => {
    try {
      const estatisticas = dataManager.obterEstatisticasDashboard();
      res.json({
        sucesso: true,
        dados: estatisticas,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Erro ao obter estatísticas do dashboard:', error);
      res.status(500).json({ 
        sucesso: false,
        erro: 'Falha ao obter estatísticas do dashboard',
        mensagem: error.message 
      });
    }
  });

  // GET /api/dashboard/inventario - Obter analytics do inventário
  router.get('/inventario', (req, res) => {
    try {
      const inventario = dataManager.obterInventario();
      const historico = dataManager.obterHistoricoTransacoes(20, 0);
      
      // Calcular métricas do inventário
      const itens = Object.entries(inventario.itens).map(([id, dados]) => ({
        id,
        nome: dados.nome,
        quantidade: dados.quantidade,
        valor_estimado: dados.quantidade * 1.0 // Valor padrão
      })).sort((a, b) => b.quantidade - a.quantidade);

      const analytics = {
        resumo: {
          total_itens: inventario.total_itens,
          total_quantidade: inventario.total_quantidade,
          ultima_atualizacao: inventario.ultima_atualizacao
        },
        top_itens: itens.slice(0, 10),
        itens_baixo_estoque: itens.filter(item => item.quantidade < 10),
        atividade_recente: historico.transacoes,
        total_transacoes: historico.total
      };
      
      res.json({
        sucesso: true,
        dados: analytics
      });
    } catch (error) {
      console.error('Erro ao obter analytics do inventário:', error);
      res.status(500).json({ 
        sucesso: false,
        erro: 'Falha ao obter analytics do inventário',
        mensagem: error.message 
      });
    }
  });

  // GET /api/dashboard/usuarios - Obter analytics dos usuários
  router.get('/usuarios', (req, res) => {
    try {
      const usuarios = dataManager.obterTodosUsuarios();
      const historico = dataManager.obterHistoricoTransacoes(100, 0);
      
      // Calcular performance dos usuários
      const performanceUsuarios = Object.entries(usuarios).map(([id, dadosUsuario]) => {
        const transacoesUsuario = historico.transacoes.filter(t => t.autor === id);
        const totalItensProcessados = transacoesUsuario.reduce((soma, t) => soma + t.quantidade, 0);
        
        return {
          id,
          nome: dadosUsuario.nome,
          funcao: dadosUsuario.funcao,
          total_transacoes: transacoesUsuario.length,
          total_itens_processados: totalItensProcessados,
          ultima_atividade: transacoesUsuario.length > 0 ? 
            transacoesUsuario[transacoesUsuario.length - 1].timestamp : null,
          ativo: dadosUsuario.ativo
        };
      });
      
      // Ordenar por atividade
      performanceUsuarios.sort((a, b) => b.total_transacoes - a.total_transacoes);
      
      const analytics = {
        resumo: {
          total_usuarios: Object.keys(usuarios).length,
          gerentes: performanceUsuarios.filter(u => u.funcao === 'gerente').length,
          trabalhadores: performanceUsuarios.filter(u => u.funcao === 'trabalhador').length,
          usuarios_ativos: performanceUsuarios.filter(u => u.ativo).length
        },
        performance_usuarios: performanceUsuarios,
        top_performers: performanceUsuarios.slice(0, 5)
      };
      
      res.json({
        sucesso: true,
        dados: analytics
      });
    } catch (error) {
      console.error('Erro ao obter analytics dos usuários:', error);
      res.status(500).json({ 
        sucesso: false,
        erro: 'Falha ao obter analytics dos usuários',
        mensagem: error.message 
      });
    }
  });

  // GET /api/dashboard/atividades - Obter atividades recentes do Discord
  router.get('/atividades', (req, res) => {
    try {
      const limite = parseInt(req.query.limite) || 20;
      const offset = parseInt(req.query.offset) || 0;
      
      const atividades = dataManager.obterAtividadesRecentes(limite, offset);
      
      res.json({
        sucesso: true,
        dados: atividades,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Erro ao obter atividades recentes:', error);
      res.status(500).json({ 
        sucesso: false,
        erro: 'Falha ao obter atividades recentes do Discord',
        mensagem: error.message 
      });
    }
  });

  return router;
};