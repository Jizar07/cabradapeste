const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// Helper to read JSON file
function readDataFile(filename) {
    try {
        const filePath = path.join(__dirname, '../../data', filename);
        if (fs.existsSync(filePath)) {
            return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        }
        return null;
    } catch (error) {
        console.error(`Error reading ${filename}:`, error);
        return null;
    }
}

// INVENTORY ROUTES
router.get('/inventario', (req, res) => {
    const data = readDataFile('inventario.json');
    res.json({ sucesso: true, dados: data || { itens: {} } });
});

router.get('/inventory', (req, res) => {
    const data = readDataFile('inventario.json');
    res.json({ sucesso: true, dados: data || { itens: {} } });
});

// USERS ROUTES
router.get('/usuarios', (req, res) => {
    const data = readDataFile('usuarios.json');
    res.json({ sucesso: true, dados: data || { usuarios: {} } });
});

router.get('/users', (req, res) => {
    const data = readDataFile('usuarios.json');
    res.json({ sucesso: true, dados: data || { usuarios: {} } });
});

// MANAGERS ROUTES
router.get('/managers', (req, res) => {
    const data = readDataFile('gerentes_accountability.json');
    res.json({ sucesso: true, dados: data || {} });
});

router.get('/gerentes', (req, res) => {
    const data = readDataFile('gerentes_accountability.json');
    res.json({ sucesso: true, dados: data || {} });
});

// PRICING ROUTES
router.get('/precos', (req, res) => {
    const data = readDataFile('precos.json');
    res.json({ sucesso: true, dados: data || { itens: {} } });
});

router.get('/pricing', (req, res) => {
    const data = readDataFile('precos.json');
    res.json({ sucesso: true, dados: data || { itens: {} } });
});

// PAYMENTS ROUTES
router.get('/pagamentos', (req, res) => {
    const data = readDataFile('pagamentos.json');
    res.json({ sucesso: true, dados: data || [] });
});

router.get('/payments', (req, res) => {
    const data = readDataFile('pagamentos.json');
    res.json({ sucesso: true, dados: data || [] });
});

// FERROVIARIA ROUTES
router.get('/ferroviaria', (req, res) => {
    const data = readDataFile('ferroviaria.json');
    res.json({ sucesso: true, dados: data || {} });
});

// STOCK MANAGEMENT ROUTES
router.get('/stock', (req, res) => {
    const data = readDataFile('stock_management.json');
    res.json({ sucesso: true, dados: data || {} });
});

router.get('/stock-management', (req, res) => {
    const data = readDataFile('stock_management.json');
    res.json({ sucesso: true, dados: data || {} });
});

// BALANCE ROUTES
router.get('/saldo', (req, res) => {
    const data = readDataFile('saldo_fazenda.json');
    res.json({ sucesso: true, dados: data || { saldo: 0 } });
});

router.get('/balance', (req, res) => {
    const data = readDataFile('saldo_fazenda.json');
    res.json({ sucesso: true, dados: data || { saldo: 0 } });
});

// ACTIVITIES ROUTES - UPDATED to use analyzed_data.json
router.get('/atividades', (req, res) => {
    const data = readDataFile('analyzed_data.json');
    let atividades = [];
    
    // Convert new structure to legacy format
    if (data) {
        if (data.farm_activities) atividades = atividades.concat(data.farm_activities);
        if (data.financial_transactions) atividades = atividades.concat(data.financial_transactions);
        if (data.inventory_changes) atividades = atividades.concat(data.inventory_changes);
        
        // Sort by timestamp (newest first)
        atividades.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }
    
    res.json({ sucesso: true, dados: { atividades, total: atividades.length } });
});

// CUSTOM NAMES ROUTES
router.get('/custom-names', (req, res) => {
    const data = readDataFile('custom_display_names.json');
    res.json({ sucesso: true, dados: data || {} });
});

// ANALYTICS ROUTES
router.get('/analytics', (req, res) => {
    const inventario = readDataFile('inventario.json');
    const usuarios = readDataFile('usuarios.json');
    const pagamentos = readDataFile('pagamentos.json');
    // UPDATED: Use analyzed_data.json instead of deprecated atividades_discord.json
    const atividades = readDataFile('analyzed_data.json');
    const saldo = readDataFile('saldo_fazenda.json');
    
    const analytics = {
        totalItens: inventario?.itens ? Object.keys(inventario.itens).length : 0,
        totalUsuarios: usuarios?.usuarios ? Object.keys(usuarios.usuarios).length : 0,
        totalPagamentos: Array.isArray(pagamentos) ? pagamentos.length : 0,
        totalAtividades: atividades ? 
            (atividades.farm_activities?.length || 0) + 
            (atividades.financial_transactions?.length || 0) + 
            (atividades.inventory_changes?.length || 0) : 0,
        saldoFazenda: saldo?.saldo || 0
    };
    
    res.json({ sucesso: true, dados: analytics });
});

// LOCALIZATION ROUTES
router.get('/localization', (req, res) => {
    res.json({ 
        sucesso: true, 
        dados: {
            language: 'pt-BR',
            currency: 'R$',
            dateFormat: 'DD/MM/YYYY'
        }
    });
});

// ALL DATA ROUTE - GET EVERYTHING AT ONCE
router.get('/all', (req, res) => {
    const allData = {
        inventario: readDataFile('inventario.json'),
        usuarios: readDataFile('usuarios.json'),
        precos: readDataFile('precos.json'),
        pagamentos: readDataFile('pagamentos.json'),
        gerentes: readDataFile('gerentes_accountability.json'),
        ferroviaria: readDataFile('ferroviaria.json'),
        stock: readDataFile('stock_management.json'),
        saldo: readDataFile('saldo_fazenda.json'),
        // UPDATED: Use analyzed_data.json instead of deprecated atividades_discord.json
        atividades: readDataFile('analyzed_data.json'),
        customNames: readDataFile('custom_display_names.json')
    };
    
    res.json({ sucesso: true, dados: allData });
});

module.exports = router;