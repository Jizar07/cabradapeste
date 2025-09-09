const express = require('express');
const router = express.Router();

module.exports = (pricingManager) => {
  // GET /api/pricing - Get all pricing data
  router.get('/', (req, res) => {
    try {
      const pricingData = pricingManager.getAllPrices();
      res.json(pricingData);
    } catch (error) {
      console.error('Error getting pricing data:', error);
      res.status(500).json({ error: 'Failed to get pricing data' });
    }
  });

  // GET /api/pricing/items - Get all items with prices
  router.get('/items', (req, res) => {
    try {
      const pricingData = pricingManager.getAllPrices();
      res.json(pricingData.items || {});
    } catch (error) {
      console.error('Error getting pricing items:', error);
      res.status(500).json({ error: 'Failed to get pricing items' });
    }
  });

  // GET /api/pricing/item/:itemName - Get specific item price
  router.get('/item/:itemName', (req, res) => {
    try {
      const itemName = decodeURIComponent(req.params.itemName);
      const itemPrice = pricingManager.getItemPrice(itemName);
      
      if (!itemPrice) {
        return res.status(404).json({ error: 'Item not found in pricing database' });
      }
      
      res.json({ name: itemName, ...itemPrice });
    } catch (error) {
      console.error('Error getting item price:', error);
      res.status(500).json({ error: 'Failed to get item price' });
    }
  });

  // GET /api/pricing/categories - Get all categories
  router.get('/categories', (req, res) => {
    try {
      const categories = pricingManager.getCategories();
      res.json(categories);
    } catch (error) {
      console.error('Error getting categories:', error);
      res.status(500).json({ error: 'Failed to get categories' });
    }
  });

  // GET /api/pricing/category/:category - Get items by category
  router.get('/category/:category', (req, res) => {
    try {
      const category = decodeURIComponent(req.params.category);
      const items = pricingManager.getItemsByCategory(category);
      res.json(items);
    } catch (error) {
      console.error('Error getting items by category:', error);
      res.status(500).json({ error: 'Failed to get items by category' });
    }
  });

  // POST /api/pricing/item - Add or update item price
  router.post('/item', (req, res) => {
    try {
      const { itemName, priceData } = req.body;
      
      if (!itemName || !priceData) {
        return res.status(400).json({ error: 'itemName and priceData are required' });
      }

      const success = pricingManager.addOrUpdateItem(itemName, priceData);
      
      if (success) {
        const updatedItem = pricingManager.getItemPrice(itemName);
        res.json({ 
          success: true, 
          message: 'Item price updated successfully',
          item: { name: itemName, ...updatedItem }
        });
      } else {
        res.status(500).json({ error: 'Failed to update item price' });
      }
    } catch (error) {
      console.error('Error updating item price:', error);
      res.status(400).json({ error: error.message || 'Failed to update item price' });
    }
  });

  // DELETE /api/pricing/item/:itemName - Remove item from pricing
  router.delete('/item/:itemName', (req, res) => {
    try {
      const itemName = decodeURIComponent(req.params.itemName);
      const success = pricingManager.removeItem(itemName);
      
      if (success) {
        res.json({ 
          success: true, 
          message: 'Item removed from pricing successfully'
        });
      } else {
        res.status(404).json({ error: 'Item not found in pricing database' });
      }
    } catch (error) {
      console.error('Error removing item price:', error);
      res.status(500).json({ error: 'Failed to remove item price' });
    }
  });

  // GET /api/pricing/search - Search items
  router.get('/search', (req, res) => {
    try {
      const { q } = req.query;
      
      if (!q) {
        return res.status(400).json({ error: 'Search query (q) is required' });
      }

      const results = pricingManager.searchItems(q);
      res.json(results);
    } catch (error) {
      console.error('Error searching items:', error);
      res.status(500).json({ error: 'Failed to search items' });
    }
  });

  // GET /api/pricing/stats - Get pricing statistics
  router.get('/stats', (req, res) => {
    try {
      const stats = pricingManager.getCategoryStats();
      res.json(stats);
    } catch (error) {
      console.error('Error getting pricing stats:', error);
      res.status(500).json({ error: 'Failed to get pricing stats' });
    }
  });

  // POST /api/pricing/validate - Validate price for an item
  router.post('/validate', (req, res) => {
    try {
      const { itemName, price } = req.body;
      
      if (!itemName || price === undefined) {
        return res.status(400).json({ error: 'itemName and price are required' });
      }

      const validation = pricingManager.validatePrice(itemName, parseFloat(price));
      res.json(validation);
    } catch (error) {
      console.error('Error validating price:', error);
      res.status(500).json({ error: 'Failed to validate price' });
    }
  });

  // GET /api/pricing/profit/:itemName - Calculate profit for an item
  router.get('/profit/:itemName', (req, res) => {
    try {
      const itemName = decodeURIComponent(req.params.itemName);
      const quantity = parseInt(req.query.quantity) || 1;
      
      const profit = pricingManager.calculateProfit(itemName, quantity);
      res.json({ itemName, quantity, ...profit });
    } catch (error) {
      console.error('Error calculating profit:', error);
      res.status(500).json({ error: 'Failed to calculate profit' });
    }
  });

  // GET /api/pricing/purchase-items - Get items suitable for purchase planning
  router.get('/purchase-items', (req, res) => {
    try {
      const items = pricingManager.getItemsForPurchase();
      res.json(items);
    } catch (error) {
      console.error('Error getting purchase items:', error);
      res.status(500).json({ error: 'Failed to get purchase items' });
    }
  });

  // POST /api/pricing/update - Update item pricing (alternative endpoint)
  router.post('/update', (req, res) => {
    try {
      const { itemId, pricing } = req.body;
      
      if (!itemId || !pricing) {
        return res.status(400).json({ error: 'itemId and pricing data are required' });
      }

      // Validate pricing data structure
      const requiredFields = ['min_price', 'max_price', 'farmer_payment', 'category'];
      for (const field of requiredFields) {
        if (pricing[field] === undefined) {
          pricing[field] = 0; // Set default value for missing fields
        }
      }

      const success = pricingManager.addOrUpdateItem(itemId, {
        min_price: parseFloat(pricing.min_price) || 0,
        max_price: parseFloat(pricing.max_price) || 0,
        farmer_payment: parseFloat(pricing.farmer_payment) || 0,
        category: pricing.category || 'OUTROS',
        custom_pricing: pricing.custom_pricing || false,
        notes: pricing.notes || ""
      });
      
      if (success) {
        const updatedItem = pricingManager.getItemPrice(itemId);
        
        // Emit real-time update if socket.io is available
        // This would need to be passed from the main server
        // For now, we'll rely on client-side refresh
        
        res.json({ 
          success: true, 
          message: `Pricing updated for ${itemId}`,
          item: { name: itemId, ...updatedItem }
        });
      } else {
        res.status(500).json({ error: 'Failed to update item pricing' });
      }
    } catch (error) {
      console.error('Error updating item pricing:', error);
      res.status(400).json({ error: error.message || 'Failed to update item pricing' });
    }
  });

  // PUT /api/pricing/items/:itemId - Update specific item pricing
  router.put('/items/:itemId', (req, res) => {
    try {
      const { itemId } = req.params;
      const pricingData = req.body;
      
      if (!pricingData) {
        return res.status(400).json({ error: 'Pricing data is required' });
      }

      const success = pricingManager.addOrUpdateItem(itemId, pricingData);
      
      if (success) {
        const updatedItem = pricingManager.getItemPrice(itemId);
        res.json({ 
          success: true, 
          message: `Pricing updated for ${itemId}`,
          item: { name: itemId, ...updatedItem }
        });
      } else {
        res.status(500).json({ error: 'Failed to update item pricing' });
      }
    } catch (error) {
      console.error('Error updating item pricing:', error);
      res.status(400).json({ error: error.message || 'Failed to update item pricing' });
    }
  });

  // POST /api/pricing/bulk-update - Update multiple items at once
  router.post('/bulk-update', (req, res) => {
    try {
      const { items } = req.body;
      
      if (!items || !Array.isArray(items)) {
        return res.status(400).json({ error: 'Items array is required' });
      }

      const results = [];
      const errors = [];

      for (const item of items) {
        try {
          const { itemId, pricing } = item;
          if (!itemId || !pricing) {
            errors.push({ itemId: itemId || 'unknown', error: 'Missing itemId or pricing data' });
            continue;
          }

          const success = pricingManager.addOrUpdateItem(itemId, pricing);
          if (success) {
            results.push({ itemId, status: 'updated' });
          } else {
            errors.push({ itemId, error: 'Failed to update' });
          }
        } catch (itemError) {
          errors.push({ itemId: item.itemId || 'unknown', error: itemError.message });
        }
      }

      res.json({
        success: errors.length === 0,
        message: `Updated ${results.length} items, ${errors.length} errors`,
        results,
        errors
      });
    } catch (error) {
      console.error('Error in bulk update:', error);
      res.status(500).json({ error: 'Failed to perform bulk update' });
    }
  });

  return router;
};