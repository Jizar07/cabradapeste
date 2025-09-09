const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// Simple inventory route that reads data directly
router.get('/', (req, res) => {
    try {
        const inventarioPath = path.join(__dirname, '../../data/inventario.json');
        
        if (fs.existsSync(inventarioPath)) {
            const inventario = JSON.parse(fs.readFileSync(inventarioPath, 'utf8'));
            
            res.json({
                sucesso: true,
                dados: inventario,
                timestamp: new Date().toISOString()
            });
        } else {
            res.json({
                sucesso: true,
                dados: { itens: {} },
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error('Error getting inventory:', error);
        res.status(500).json({
            sucesso: false,
            erro: 'Falha ao obter inventário',
            mensagem: error.message
        });
    }
});

module.exports = router;