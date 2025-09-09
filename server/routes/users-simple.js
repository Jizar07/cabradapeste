const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// Simple users route that reads data directly
router.get('/', (req, res) => {
    try {
        const usuariosPath = path.join(__dirname, '../../data/usuarios.json');
        
        if (fs.existsSync(usuariosPath)) {
            const usuarios = JSON.parse(fs.readFileSync(usuariosPath, 'utf8'));
            
            res.json({
                sucesso: true,
                dados: usuarios,
                timestamp: new Date().toISOString()
            });
        } else {
            res.json({
                sucesso: true,
                dados: { usuarios: {} },
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error('Error getting users:', error);
        res.status(500).json({
            sucesso: false,
            erro: 'Falha ao obter usuários',
            mensagem: error.message
        });
    }
});

module.exports = router;