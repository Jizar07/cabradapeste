const express = require('express');
const fs = require('fs');
const path = require('path');

module.exports = (dataManager) => {
    const router = express.Router();

// Get dashboard statistics
router.get('/estatisticas', (req, res) => {
    try {
        // Read all necessary data files
        const inventarioPath = path.join(__dirname, '../../data/inventario.json');
        const usuariosPath = path.join(__dirname, '../../data/usuarios.json');
        const saldoPath = path.join(__dirname, '../../data/saldo_fazenda.json');
        const atividadesPath = path.join(__dirname, '../../data/analyzed_data.json');
        
        let totalItens = 0;
        let totalUsuarios = 0;
        let saldoFazenda = 0;
        let atividadesRecentes = 0;
        
        // Read inventory
        if (fs.existsSync(inventarioPath)) {
            const inventario = JSON.parse(fs.readFileSync(inventarioPath, 'utf8'));
            if (inventario.itens) {
                totalItens = Object.keys(inventario.itens).length;
            }
        }
        
        // Read users and count by role
        let gerentes = 0;
        let trabalhadores = 0;
        if (fs.existsSync(usuariosPath)) {
            const usuarios = JSON.parse(fs.readFileSync(usuariosPath, 'utf8'));
            let usersObj = {};
            
            // Check different possible structures
            if (usuarios.usuarios) {
                usersObj = usuarios.usuarios;
            } else if (usuarios.users) {
                usersObj = usuarios.users;
            } else if (typeof usuarios === 'object') {
                // If it's a direct object of users
                usersObj = usuarios;
            }
            
            // Count total users and by role
            for (const [userId, userData] of Object.entries(usersObj)) {
                if (userId === 'ultima_atualizacao') continue;
                
                totalUsuarios++;
                if (userData && userData.funcao === 'gerente') {
                    gerentes++;
                } else if (userData && (userData.funcao === 'trabalhador' || !userData.funcao)) {
                    trabalhadores++;
                }
            }
        }
        
        // Read balance
        if (fs.existsSync(saldoPath)) {
            const saldo = JSON.parse(fs.readFileSync(saldoPath, 'utf8'));
            saldoFazenda = saldo.saldo_atual || saldo.saldo || 0;
        }
        
        // Read activities from new analyzed_data.json
        if (fs.existsSync(atividadesPath)) {
            const analyzedData = JSON.parse(fs.readFileSync(atividadesPath, 'utf8'));
            // Count all activities from the new structure
            const farmActivities = analyzedData.farm_activities || [];
            const financialTransactions = analyzedData.financial_transactions || [];
            const inventoryChanges = analyzedData.inventory_changes || [];
            atividadesRecentes = farmActivities.length + financialTransactions.length + inventoryChanges.length;
        }
        
        res.json({
            sucesso: true,
            dados: {
                totalItens,
                totalUsuarios,
                gerentes,
                trabalhadores,
                saldoFazenda,
                atividadesRecentes,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Error fetching dashboard statistics:', error);
        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao buscar estatísticas',
            erro: error.message
        });
    }
});

// Get recent activities
router.get('/atividades', (req, res) => {
    try {
        const limite = parseInt(req.query.limite) || 10;
        const offset = parseInt(req.query.offset) || 0;
        
        const atividadesPath = path.join(__dirname, '../../data/analyzed_data.json');
        
        if (fs.existsSync(atividadesPath)) {
            const analyzedData = JSON.parse(fs.readFileSync(atividadesPath, 'utf8'));
            
            // Combine all activities from new structure
            const farmActivities = analyzedData.farm_activities || [];
            const financialTransactions = analyzedData.financial_transactions || [];
            const inventoryChanges = analyzedData.inventory_changes || [];
            
            
            // Now activities are already properly parsed by DataManager
            // Simply combine all parsed activities
            let allActivities = [
                ...farmActivities,
                ...financialTransactions,
                ...inventoryChanges
            ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            // Apply limit FIRST
            const limitedActivities = allActivities.slice(offset, offset + limite);
            
            // Transform only the limited activities - they're already parsed!
            const paginatedAtividades = limitedActivities.map(activity => {
                // Activities are already properly parsed by DataManager's FarmMessageParser
                const rawItem = activity.details?.item || 'N/A';
                const displayName = rawItem !== 'N/A' ? dataManager.obterMelhorNomeExibicao(rawItem) : 'N/A';
                
                return {
                    ...activity,
                    // Ensure we have the standard fields expected by frontend
                    autor: activity.author,
                    acao: activity.details?.action || activity.type,
                    quantidade: activity.details?.quantity || 0,
                    item: displayName,
                    descricao: activity.content,
                    tipo: activity.type,
                    // Map category correctly based on activity type
                    categoria: activity.type === 'deposito' || activity.type === 'saque' || activity.type === 'venda' ? 'financeiro' :
                              activity.type === 'adicionar' || activity.type === 'remover' ? 'inventario' : 'sistema',
                    valor: activity.details?.amount || null
                };
            });
            
            res.json({
                sucesso: true,
                dados: {
                    atividades: paginatedAtividades,
                    total: allActivities.length
                }
            });
        } else {
            res.json({
                sucesso: true,
                dados: {
                    atividades: [],
                    total: 0
                }
            });
        }
    } catch (error) {
        console.error('Error fetching activities:', error);
        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao buscar atividades',
            erro: error.message
        });
    }
});

// Get user analytics
router.get('/usuarios', (req, res) => {
    try {
        const usuariosPath = path.join(__dirname, '../../data/usuarios.json');
        const pagamentosPath = path.join(__dirname, '../../data/pagamentos.json');
        
        let usuariosAtivos = 0;
        let totalPagamentos = 0;
        
        if (fs.existsSync(usuariosPath)) {
            const usuarios = JSON.parse(fs.readFileSync(usuariosPath, 'utf8'));
            if (usuarios.usuarios) {
                usuariosAtivos = Object.keys(usuarios.usuarios).length;
            } else {
                usuariosAtivos = Object.keys(usuarios).length;
            }
        }
        
        if (fs.existsSync(pagamentosPath)) {
            const pagamentos = JSON.parse(fs.readFileSync(pagamentosPath, 'utf8'));
            if (Array.isArray(pagamentos)) {
                totalPagamentos = pagamentos.length;
            }
        }
        
        res.json({
            sucesso: true,
            dados: {
                usuariosAtivos,
                totalPagamentos,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Error fetching user analytics:', error);
        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao buscar análises de usuários',
            erro: error.message
        });
    }
});

    return router;
};