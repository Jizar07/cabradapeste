const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// Path to the item links data file
const ITEM_LINKS_FILE = path.join(__dirname, '../../data/item_links.json');

// Helper function to load item links
function loadItemLinks() {
  try {
    if (fs.existsSync(ITEM_LINKS_FILE)) {
      const data = fs.readFileSync(ITEM_LINKS_FILE, 'utf8');
      return JSON.parse(data);
    }
    return { links: {}, metadata: { created: new Date().toISOString(), version: '1.0' } };
  } catch (error) {
    console.error('Error loading item links:', error);
    return { links: {}, metadata: { created: new Date().toISOString(), version: '1.0' } };
  }
}

// Helper function to save item links
function saveItemLinks(data) {
  try {
    data.metadata.updated = new Date().toISOString();
    fs.writeFileSync(ITEM_LINKS_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error saving item links:', error);
    return false;
  }
}

// GET /api/item-links - Get all item links
router.get('/', (req, res) => {
  try {
    const itemLinks = loadItemLinks();
    res.json({
      sucesso: true,
      dados: itemLinks
    });
  } catch (error) {
    console.error('Error getting item links:', error);
    res.status(500).json({
      sucesso: false,
      erro: 'Erro ao obter links de itens'
    });
  }
});

// POST /api/item-links - Create a new item link
router.post('/', (req, res) => {
  try {
    const { inventoryId, pricingId, description } = req.body;
    
    if (!inventoryId || !pricingId) {
      return res.status(400).json({
        sucesso: false,
        erro: 'ID do inventário e ID do preço são obrigatórios'
      });
    }

    const itemLinks = loadItemLinks();
    
    // Check if link already exists
    const existingLinkId = Object.keys(itemLinks.links).find(linkId => 
      itemLinks.links[linkId].inventoryId === inventoryId || 
      itemLinks.links[linkId].pricingId === pricingId
    );
    
    if (existingLinkId) {
      return res.status(400).json({
        sucesso: false,
        erro: 'Um dos itens já está vinculado a outro item'
      });
    }

    // Create new link
    const linkId = `link_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    itemLinks.links[linkId] = {
      id: linkId,
      inventoryId,
      pricingId,
      description: description || '',
      created: new Date().toISOString(),
      updated: new Date().toISOString()
    };

    if (saveItemLinks(itemLinks)) {
      res.json({
        sucesso: true,
        dados: itemLinks.links[linkId],
        mensagem: 'Link criado com sucesso'
      });
    } else {
      res.status(500).json({
        sucesso: false,
        erro: 'Erro ao salvar link'
      });
    }
  } catch (error) {
    console.error('Error creating item link:', error);
    res.status(500).json({
      sucesso: false,
      erro: 'Erro interno do servidor'
    });
  }
});

// PUT /api/item-links/:linkId - Update an item link
router.put('/:linkId', (req, res) => {
  try {
    const { linkId } = req.params;
    const { inventoryId, pricingId, description } = req.body;

    const itemLinks = loadItemLinks();
    
    if (!itemLinks.links[linkId]) {
      return res.status(404).json({
        sucesso: false,
        erro: 'Link não encontrado'
      });
    }

    // Update link
    if (inventoryId) itemLinks.links[linkId].inventoryId = inventoryId;
    if (pricingId) itemLinks.links[linkId].pricingId = pricingId;
    if (description !== undefined) itemLinks.links[linkId].description = description;
    itemLinks.links[linkId].updated = new Date().toISOString();

    if (saveItemLinks(itemLinks)) {
      res.json({
        sucesso: true,
        dados: itemLinks.links[linkId],
        mensagem: 'Link atualizado com sucesso'
      });
    } else {
      res.status(500).json({
        sucesso: false,
        erro: 'Erro ao salvar link'
      });
    }
  } catch (error) {
    console.error('Error updating item link:', error);
    res.status(500).json({
      sucesso: false,
      erro: 'Erro interno do servidor'
    });
  }
});

// DELETE /api/item-links/:linkId - Delete an item link
router.delete('/:linkId', (req, res) => {
  try {
    const { linkId } = req.params;

    const itemLinks = loadItemLinks();
    
    if (!itemLinks.links[linkId]) {
      return res.status(404).json({
        sucesso: false,
        erro: 'Link não encontrado'
      });
    }

    delete itemLinks.links[linkId];

    if (saveItemLinks(itemLinks)) {
      res.json({
        sucesso: true,
        mensagem: 'Link removido com sucesso'
      });
    } else {
      res.status(500).json({
        sucesso: false,
        erro: 'Erro ao remover link'
      });
    }
  } catch (error) {
    console.error('Error deleting item link:', error);
    res.status(500).json({
      sucesso: false,
      erro: 'Erro interno do servidor'
    });
  }
});

// GET /api/item-links/suggestions - Get suggestions for linking items
router.get('/suggestions', (req, res) => {
  try {
    const itemLinks = loadItemLinks();
    
    // This would typically load inventory and pricing data to suggest potential matches
    // For now, return empty suggestions - this can be enhanced later
    res.json({
      sucesso: true,
      dados: {
        suggestions: [],
        message: 'Funcionalidade de sugestões será implementada em versão futura'
      }
    });
  } catch (error) {
    console.error('Error getting link suggestions:', error);
    res.status(500).json({
      sucesso: false,
      erro: 'Erro ao obter sugestões de links'
    });
  }
});

module.exports = router;