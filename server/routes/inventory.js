const express = require('express');
const router = express.Router();

module.exports = (dataManager) => {
  // GET /api/inventario - Get all inventory data
  router.get('/', (req, res) => {
    try {
      console.log('📋 Getting inventory data...');
      const inventoryData = dataManager.inventario || {};
      
      // Add display names to items
      if (inventoryData.itens) {
        Object.keys(inventoryData.itens).forEach(itemId => {
          const item = inventoryData.itens[itemId];
          // Get custom display name or create readable name from ID
          const customName = dataManager.obterNomeCustomizado(itemId);
          if (customName) {
            item.nome = customName;
          } else if (!item.nome) {
            // Create readable name from ID: replace underscores with spaces and capitalize
            item.nome = itemId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          }
        });
      }
      
      const response = {
        sucesso: true,
        dados: inventoryData,
        timestamp: new Date().toISOString()
      };
      console.log('✅ Got inventory data:', Object.keys(inventoryData));
      res.json(response);
    } catch (error) {
      console.error('❌ Error getting inventory data:', error);
      res.status(500).json({ 
        sucesso: false, 
        erro: 'Falha ao obter dados do inventário',
        mensagem: error.message 
      });
    }
  });

  // GET /api/inventory/items - Get just the items
  router.get('/items', (req, res) => {
    try {
      const data = dataManager.getAllData();
      res.json(data.items || {});
    } catch (error) {
      console.error('Error getting inventory items:', error);
      res.status(500).json({ error: 'Failed to get inventory items' });
    }
  });

  // GET /api/inventory/stats - Get inventory statistics
  router.get('/stats', (req, res) => {
    try {
      const data = dataManager.getAllData();
      const items = data.items || {};
      
      const stats = {
        totalItems: Object.keys(items).length,
        totalQuantity: Object.values(items).reduce((sum, qty) => sum + (qty || 0), 0),
        lastUpdated: data.last_updated || null,
        totalTransactions: (data.transaction_log || []).length
      };
      
      res.json(stats);
    } catch (error) {
      console.error('Error getting inventory stats:', error);
      res.status(500).json({ error: 'Failed to get inventory stats' });
    }
  });

  // POST /api/inventario/adicionar - Add item to inventory
  router.post('/adicionar', (req, res) => {
    try {
      const { nomeItem, quantidade, autor = 'Sistema' } = req.body;
      
      if (!nomeItem || quantidade === undefined) {
        return res.status(400).json({ 
          sucesso: false, 
          erro: 'Nome do item e quantidade são obrigatórios' 
        });
      }

      const success = dataManager.adicionarItem(nomeItem, parseInt(quantidade), autor);
      
      if (success) {
        res.json({ 
          sucesso: true, 
          mensagem: 'Item adicionado com sucesso'
        });
      } else {
        res.status(500).json({ 
          sucesso: false, 
          erro: 'Falha ao adicionar item' 
        });
      }
    } catch (error) {
      console.error('Error adding item:', error);
      res.status(500).json({ 
        sucesso: false, 
        erro: 'Falha ao adicionar item',
        mensagem: error.message 
      });
    }
  });

  // POST /api/inventario/remover - Remove item from inventory
  router.post('/remover', (req, res) => {
    try {
      const { nomeItem, quantidade, autor = 'Sistema' } = req.body;
      
      if (!nomeItem || quantidade === undefined) {
        return res.status(400).json({ 
          sucesso: false, 
          erro: 'Nome do item e quantidade são obrigatórios' 
        });
      }

      const success = dataManager.removerItem(nomeItem, parseInt(quantidade), autor);
      
      if (success) {
        res.json({ 
          sucesso: true, 
          mensagem: 'Item removido com sucesso'
        });
      } else {
        res.status(500).json({ 
          sucesso: false, 
          erro: 'Falha ao remover item ou quantidade insuficiente' 
        });
      }
    } catch (error) {
      console.error('Error removing item:', error);
      res.status(500).json({ 
        sucesso: false, 
        erro: 'Falha ao remover item',
        mensagem: error.message 
      });
    }
  });

  // GET /api/inventory/transactions - Get transaction log
  router.get('/transactions', (req, res) => {
    try {
      const data = dataManager.getAllData();
      const transactions = data.transaction_log || [];
      
      // Optional filtering by date range and user
      const { start_date, end_date, limit, user } = req.query;
      let filteredTransactions = transactions;

      // Filter by user if specified
      if (user) {
        filteredTransactions = filteredTransactions.filter(transaction => 
          transaction.author === user || transaction.user_id === user
        );
      }

      // Filter by date range if specified
      if (start_date || end_date) {
        filteredTransactions = filteredTransactions.filter(transaction => {
          const transactionDate = new Date(transaction.timestamp);
          if (start_date && transactionDate < new Date(start_date)) return false;
          if (end_date && transactionDate > new Date(end_date)) return false;
          return true;
        });
      }

      if (limit) {
        filteredTransactions = filteredTransactions.slice(-parseInt(limit));
      }

      // Add display names to transactions
      const enrichedTransactions = filteredTransactions.map(transaction => ({
        ...transaction,
        displayName: dataManager.getItemDisplayName(transaction.item),
        canonicalId: transaction.item
      }));

      res.json(enrichedTransactions);
    } catch (error) {
      console.error('Error getting transactions:', error);
      res.status(500).json({ error: 'Failed to get transactions' });
    }
  });

  // GET /api/inventory/balance - Get balance information
  router.get('/balance', (req, res) => {
    try {
      const data = dataManager.getAllData();
      const balance = {
        current_balance: data.current_balance || 0,
        balance_log: data.balance_log || []
      };
      
      res.json(balance);
    } catch (error) {
      console.error('Error getting balance:', error);
      res.status(500).json({ error: 'Failed to get balance' });
    }
  });

  // POST /api/inventory/update-stock - Update item quantity directly
  router.post('/update-stock', (req, res) => {
    try {
      const { itemId, quantity } = req.body;
      
      if (!itemId || quantity === undefined || quantity < 0) {
        return res.status(400).json({ error: 'itemId and valid quantity are required' });
      }

      const allData = dataManager.getAllData();
      const currentItem = allData.inventory[itemId];
      
      if (!currentItem) {
        // If item doesn't exist, create it with the specified quantity
        const success = dataManager.adicionarItem(itemId, parseInt(quantity), 'Dashboard Admin', 'manual');
        if (success) {
          // Emit real-time update
          if (dataManager.io) {
            dataManager.io.emit('inventory:update', dataManager.getInventory());
          }
          
          res.json({ 
            success: true, 
            message: `New item created: ${itemId} with quantity ${quantity}`,
            item: {
              itemId,
              oldQuantity: 0,
              newQuantity: parseInt(quantity),
              difference: parseInt(quantity)
            }
          });
        } else {
          res.status(500).json({ error: 'Failed to create new item' });
        }
        return;
      }

      const oldQuantity = currentItem.quantity;
      const newQuantity = parseInt(quantity);
      const difference = newQuantity - oldQuantity;
      
      let success = true;
      if (difference > 0) {
        // Add items
        success = dataManager.adicionarItem(itemId, difference, 'Dashboard Admin', 'manual');
      } else if (difference < 0) {
        // Remove items
        success = dataManager.removerItem(itemId, Math.abs(difference), 'Dashboard Admin', 'manual');
      }

      if (success) {
        // Emit real-time update
        if (dataManager.io) {
          dataManager.io.emit('inventory:update', dataManager.getInventory());
        }
        
        res.json({ 
          success: true, 
          message: `Stock updated: ${itemId} ${oldQuantity} → ${newQuantity}`,
          item: {
            itemId,
            oldQuantity,
            newQuantity,
            difference
          }
        });
      } else {
        res.status(500).json({ error: 'Failed to update stock - insufficient quantity or other error' });
      }
    } catch (error) {
      console.error('Error updating stock:', error);
      res.status(500).json({ error: 'Failed to update stock' });
    }
  });

  // DELETE /api/inventory/items/:itemId - Delete item from inventory
  router.delete('/items/:itemId', (req, res) => {
    try {
      const { itemId } = req.params;
      
      const allData = dataManager.getAllData();
      if (!allData.inventory[itemId]) {
        return res.status(404).json({ error: 'Item not found' });
      }

      // Remove item completely by setting quantity to 0 and then removing
      const currentQuantity = allData.inventory[itemId].quantity;
      const success = dataManager.removerItem(itemId, currentQuantity, 'Dashboard Admin', 'manual_delete');
      
      if (success) {
        // Emit real-time update
        if (dataManager.io) {
          dataManager.io.emit('inventory:update', dataManager.getInventory());
        }
        
        res.json({ 
          success: true, 
          message: `Item ${itemId} deleted successfully`,
          deletedItem: {
            itemId,
            quantity: currentQuantity
          }
        });
      } else {
        res.status(500).json({ error: 'Failed to delete item' });
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      res.status(500).json({ error: 'Failed to delete item' });
    }
  });

  // PUT /api/inventory/items/:itemId - Update item details
  router.put('/items/:itemId', (req, res) => {
    try {
      const { itemId } = req.params;
      const { quantity, displayName } = req.body;
      
      const allData = dataManager.getAllData();
      const currentItem = allData.inventory[itemId];
      
      if (!currentItem) {
        return res.status(404).json({ error: 'Item not found' });
      }

      let success = true;
      const results = {};

      // Update quantity if provided
      if (quantity !== undefined) {
        const oldQuantity = currentItem.quantity;
        const newQuantity = parseInt(quantity);
        const difference = newQuantity - oldQuantity;
        
        if (difference > 0) {
          success = dataManager.adicionarItem(itemId, difference, 'Dashboard Admin', 'manual');
        } else if (difference < 0) {
          success = dataManager.removerItem(itemId, Math.abs(difference), 'Dashboard Admin', 'manual');
        }
        
        if (success) {
          results.quantity = { old: oldQuantity, new: newQuantity, difference };
        }
      }

      // Update display name if provided
      if (displayName !== undefined && success) {
        const nameSuccess = dataManager.updateDisplayName(itemId, displayName);
        if (nameSuccess) {
          results.displayName = { old: dataManager.getItemDisplayName(itemId), new: displayName };
        } else {
          success = false;
        }
      }

      if (success) {
        // Emit real-time updates
        if (dataManager.io) {
          dataManager.io.emit('inventory:update', dataManager.getInventory());
          if (displayName !== undefined) {
            dataManager.io.emit('custom-names:update', dataManager.getDisplayNames());
          }
        }
        
        res.json({ 
          success: true, 
          message: `Item ${itemId} updated successfully`,
          changes: results
        });
      } else {
        res.status(500).json({ error: 'Failed to update item' });
      }
    } catch (error) {
      console.error('Error updating item:', error);
      res.status(500).json({ error: 'Failed to update item' });
    }
  });

  // POST /api/inventory/items - Create new item
  router.post('/items', (req, res) => {
    try {
      const { itemId, quantity, displayName } = req.body;
      
      if (!itemId || quantity === undefined) {
        return res.status(400).json({ error: 'itemId and quantity are required' });
      }

      const allData = dataManager.getAllData();
      if (allData.inventory[itemId]) {
        return res.status(409).json({ error: 'Item already exists' });
      }

      // Create the item
      const success = dataManager.adicionarItem(itemId, parseInt(quantity), 'Dashboard Admin', 'manual');
      
      if (success && displayName) {
        // Add display name if provided
        dataManager.updateDisplayName(itemId, displayName);
      }

      if (success) {
        // Emit real-time updates
        if (dataManager.io) {
          dataManager.io.emit('inventory:update', dataManager.getInventory());
          if (displayName) {
            dataManager.io.emit('custom-names:update', dataManager.getDisplayNames());
          }
        }
        
        res.json({ 
          success: true, 
          message: `Item ${itemId} created successfully`,
          item: {
            itemId,
            quantity: parseInt(quantity),
            displayName: displayName || itemId
          }
        });
      } else {
        res.status(500).json({ error: 'Failed to create item' });
      }
    } catch (error) {
      console.error('Error creating item:', error);
      res.status(500).json({ error: 'Failed to create item' });
    }
  });

  // GET /api/inventory/search - Search items
  router.get('/search', (req, res) => {
    try {
      const { q, category, limit = 50 } = req.query;
      
      const allData = dataManager.getAllData();
      const inventory = allData.inventory || {};
      
      let items = Object.entries(inventory);
      
      // Filter by search query
      if (q) {
        const searchLower = q.toLowerCase();
        items = items.filter(([itemId]) => {
          const displayName = dataManager.getItemDisplayName(itemId).toLowerCase();
          const itemName = itemId.toLowerCase();
          return displayName.includes(searchLower) || itemName.includes(searchLower);
        });
      }
      
      // Filter by category (would need pricing integration)
      if (category) {
        // This would require pricing manager integration
        console.log('Category filtering not yet implemented');
      }
      
      // Limit results
      items = items.slice(0, parseInt(limit));
      
      // Transform to response format
      const results = items.map(([itemId, itemData]) => ({
        itemId,
        displayName: dataManager.getItemDisplayName(itemId),
        quantity: itemData.quantity,
        lastUpdated: itemData.last_updated,
        firstAdded: itemData.first_added
      }));
      
      res.json({
        results,
        total: results.length,
        query: { q, category, limit }
      });
    } catch (error) {
      console.error('Error searching items:', error);
      res.status(500).json({ error: 'Failed to search items' });
    }
  });

  // PUT /api/inventario/global-name - Update item name globally across all systems
  router.put('/global-name', (req, res) => {
    try {
      const { itemId, newDisplayName } = req.body;
      
      if (!itemId || !newDisplayName) {
        return res.status(400).json({ 
          sucesso: false, 
          erro: 'itemId e newDisplayName são obrigatórios' 
        });
      }

      // Update display name globally across all systems (activities, inventory, prices)
      const result = dataManager.atualizarItemGlobalmente(itemId, null, newDisplayName.trim());
      
      if (result.sucesso) {
        res.json({
          sucesso: true,
          mensagem: `Nome do item ${itemId} atualizado globalmente para "${newDisplayName}"`,
          dados: result
        });
      } else {
        res.status(500).json({
          sucesso: false,
          erro: 'Falha ao atualizar nome do item globalmente'
        });
      }
    } catch (error) {
      console.error('Error updating item name globally:', error);
      res.status(500).json({ 
        sucesso: false, 
        erro: 'Falha ao atualizar nome do item globalmente',
        mensagem: error.message 
      });
    }
  });

  // PUT /api/inventario/categoria - Update item category
  router.put('/categoria', (req, res) => {
    try {
      const { itemId, categoria } = req.body;
      
      if (!itemId || !categoria) {
        return res.status(400).json({ 
          sucesso: false, 
          erro: 'itemId e categoria são obrigatórios' 
        });
      }

      // Check if item exists in inventory
      if (!dataManager.inventario.itens[itemId]) {
        return res.status(404).json({
          sucesso: false,
          erro: 'Item não encontrado no inventário'
        });
      }

      // Update the item's category
      dataManager.inventario.itens[itemId].categoria = categoria;
      dataManager.inventario.ultima_atualizacao = new Date().toISOString();

      // Save the updated inventory
      const success = dataManager.salvarArquivoJson(dataManager.inventarioFile, dataManager.inventario);
      
      if (success) {
        // Emit real-time updates
        if (dataManager.io) {
          dataManager.io.emit('inventario:atualizado', dataManager.inventario);
        }
        
        res.json({
          sucesso: true,
          mensagem: `Categoria do item ${itemId} atualizada para ${categoria}`,
          dados: {
            itemId,
            categoria,
            atualizado_em: dataManager.inventario.ultima_atualizacao
          }
        });
      } else {
        res.status(500).json({
          sucesso: false,
          erro: 'Falha ao salvar categoria do item'
        });
      }
    } catch (error) {
      console.error('Error updating item category:', error);
      res.status(500).json({ 
        sucesso: false, 
        erro: 'Falha ao atualizar categoria do item',
        mensagem: error.message 
      });
    }
  });

  // PUT /api/inventario/:itemId/quantidade - Update item quantity
  router.put('/:itemId/quantidade', (req, res) => {
    try {
      const { itemId } = req.params;
      const { quantidade } = req.body;

      if (quantidade === undefined || quantidade < 0) {
        return res.status(400).json({
          sucesso: false,
          erro: 'Quantidade deve ser um número válido maior ou igual a 0'
        });
      }

      const item = dataManager.atualizarQuantidadeInventario(itemId, quantidade);
      
      res.json({
        sucesso: true,
        item: {
          ...item,
          nome: dataManager.obterMelhorNomeExibicao(itemId)
        },
        mensagem: `Quantidade de ${dataManager.obterMelhorNomeExibicao(itemId)} atualizada para ${quantidade}`
      });

    } catch (error) {
      console.error('Erro ao atualizar quantidade do item:', error);
      res.status(error.message === 'Item não encontrado no inventário' ? 404 : 500).json({
        sucesso: false,
        erro: error.message === 'Item não encontrado no inventário' ? 
               'Item não encontrado' : 
               'Falha ao atualizar quantidade do item',
        mensagem: error.message 
      });
    }
  });

  // GET /api/inventario/demanda-plantas - Get plant demand calculation
  router.get('/demanda-plantas', (req, res) => {
    try {
      console.log('🌱 Calculating plant demand...');
      const demanda = dataManager.calcularDemandaPlantas();
      res.json({
        sucesso: true,
        dados: demanda,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error calculating plant demand:', error);
      res.status(500).json({ 
        sucesso: false, 
        erro: 'Falha ao calcular demanda de plantas',
        mensagem: error.message 
      });
    }
  });

  // POST /api/inventario/enviar-demanda-discord - Send demand to Discord
  router.post('/enviar-demanda-discord', async (req, res) => {
    try {
      console.log('📤 Sending plant demand to Discord...');
      const resultado = await dataManager.enviarDemandaDiscord();
      
      if (resultado.sucesso) {
        res.json({
          sucesso: true,
          mensagem: 'Demanda enviada ao Discord com sucesso',
          timestamp: new Date().toISOString()
        });
      } else {
        throw new Error(resultado.erro || 'Falha ao enviar para Discord');
      }
    } catch (error) {
      console.error('❌ Error sending to Discord:', error);
      res.status(500).json({ 
        sucesso: false, 
        erro: 'Falha ao enviar demanda para Discord',
        mensagem: error.message 
      });
    }
  });

  // GET /api/inventario/demanda-plantas - Get plant demand calculation
  router.get('/demanda-plantas', (req, res) => {
    try {
      console.log('🌱 Calculating plant demand...');
      const demanda = dataManager.calcularDemandaPlantas();
      res.json({
        sucesso: true,
        dados: demanda,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error calculating plant demand:', error);
      res.status(500).json({ 
        sucesso: false, 
        erro: 'Falha ao calcular demanda de plantas',
        mensagem: error.message 
      });
    }
  });

  // POST /api/inventario/enviar-demanda-discord - Send demand to Discord
  router.post('/enviar-demanda-discord', async (req, res) => {
    try {
      console.log('📤 Sending plant demand to Discord...');
      const resultado = await dataManager.enviarDemandaDiscord();
      
      if (resultado.sucesso) {
        res.json({
          sucesso: true,
          mensagem: 'Demanda enviada ao Discord com sucesso',
          timestamp: new Date().toISOString()
        });
      } else {
        throw new Error(resultado.erro || 'Falha ao enviar para Discord');
      }
    } catch (error) {
      console.error('❌ Error sending to Discord:', error);
      res.status(500).json({ 
        sucesso: false, 
        erro: 'Falha ao enviar demanda para Discord',
        mensagem: error.message 
      });
    }
  });

  // GET /api/inventario/discord-message-status - Check Discord message status for debugging
  router.get('/discord-message-status', (req, res) => {
    try {
      const messageData = dataManager.ultimaMensagemDiscord;
      res.json({
        sucesso: true,
        dados: {
          hasStoredMessage: !!messageData,
          messageId: messageData?.messageId || null,
          timestamp: messageData?.timestamp || null,
          timeSinceLastUpdate: messageData?.timestamp ? 
            Date.now() - new Date(messageData.timestamp).getTime() : null
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error getting Discord message status:', error);
      res.status(500).json({ 
        sucesso: false, 
        erro: 'Falha ao obter status da mensagem Discord',
        mensagem: error.message 
      });
    }
  });

  return router;
};