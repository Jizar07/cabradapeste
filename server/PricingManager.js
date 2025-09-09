const fs = require('fs');
const path = require('path');

class PricingManager {
  constructor(dataFolder = '../data', io = null) {
    this.dataFolder = dataFolder;
    this.pricesFile = path.join(dataFolder, 'item_prices.json');
    this.io = io;
    this.itemPrices = this.loadItemPrices();
  }

  loadItemPrices() {
    try {
      if (fs.existsSync(this.pricesFile)) {
        const data = fs.readFileSync(this.pricesFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading item prices:', error);
    }
    
    return {
      items: {},
      categories: {
        "ANIMAIS": [],
        "SEMENTES": [],
        "MINERADORA": [],
        "OUTROS": []
      },
      last_updated: new Date().toISOString()
    };
  }

  saveItemPrices() {
    try {
      const dir = path.dirname(this.pricesFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      this.itemPrices.last_updated = new Date().toISOString();
      fs.writeFileSync(this.pricesFile, JSON.stringify(this.itemPrices, null, 2));
      return true;
    } catch (error) {
      console.error('Error saving item prices:', error);
      return false;
    }
  }

  getAllPrices() {
    // Return in the format that routes expect
    return this.itemPrices;
  }

  getItemPrice(itemName) {
    return this.itemPrices[itemName] || null;
  }

  getItemsByCategory(category) {
    const items = [];
    
    for (const [itemName, itemData] of Object.entries(this.itemPrices)) {
      if (itemData && itemData.category === category) {
        items.push({
          name: itemName,
          ...itemData
        });
      }
    }
    
    return items.sort((a, b) => a.name.localeCompare(b.name));
  }

  addOrUpdateItem(itemName, priceData) {
    // Validate price data
    const requiredFields = ['min_price', 'max_price', 'farmer_payment', 'category'];
    for (const field of requiredFields) {
      if (!(field in priceData)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate price values
    if (priceData.min_price < 0 || priceData.max_price < 0 || priceData.farmer_payment < 0) {
      throw new Error('Prices cannot be negative');
    }

    if (priceData.min_price > priceData.max_price) {
      throw new Error('Minimum price cannot be greater than maximum price');
    }

    // Add item to items object
    this.itemPrices.items[itemName] = {
      min_price: parseFloat(priceData.min_price),
      max_price: parseFloat(priceData.max_price),
      farmer_payment: parseFloat(priceData.farmer_payment),
      category: priceData.category,
      custom_pricing: priceData.custom_pricing || false,
      notes: priceData.notes || "",
      created_at: priceData.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Add to category if not already there
    if (!this.itemPrices.categories[priceData.category]) {
      this.itemPrices.categories[priceData.category] = [];
    }
    
    if (!this.itemPrices.categories[priceData.category].includes(itemName)) {
      this.itemPrices.categories[priceData.category].push(itemName);
    }

    const saved = this.saveItemPrices();
    
    // Emit real-time update if socket.io is available
    if (saved && this.io) {
      this.io.emit('pricing:update', this.itemPrices);
    }
    
    return saved;
  }

  removeItem(itemName) {
    if (!this.itemPrices.items[itemName]) {
      return false;
    }

    const category = this.itemPrices.items[itemName].category;
    
    // Remove from category
    if (this.itemPrices.categories[category]) {
      const index = this.itemPrices.categories[category].indexOf(itemName);
      if (index > -1) {
        this.itemPrices.categories[category].splice(index, 1);
      }
    }

    // Remove from items
    delete this.itemPrices.items[itemName];

    const saved = this.saveItemPrices();
    
    // Emit real-time update if socket.io is available
    if (saved && this.io) {
      this.io.emit('pricing:update', this.itemPrices);
    }
    
    return saved;
  }

  updateItemCategory(itemName, newCategory) {
    if (!this.itemPrices.items[itemName]) {
      return false;
    }

    const oldCategory = this.itemPrices.items[itemName].category;
    
    // Remove from old category
    if (this.itemPrices.categories[oldCategory]) {
      const index = this.itemPrices.categories[oldCategory].indexOf(itemName);
      if (index > -1) {
        this.itemPrices.categories[oldCategory].splice(index, 1);
      }
    }

    // Add to new category
    if (!this.itemPrices.categories[newCategory]) {
      this.itemPrices.categories[newCategory] = [];
    }
    if (!this.itemPrices.categories[newCategory].includes(itemName)) {
      this.itemPrices.categories[newCategory].push(itemName);
    }

    // Update item category
    this.itemPrices.items[itemName].category = newCategory;
    this.itemPrices.items[itemName].updated_at = new Date().toISOString();

    const saved = this.saveItemPrices();
    
    // Emit real-time update if socket.io is available
    if (saved && this.io) {
      this.io.emit('pricing:update', this.itemPrices);
    }
    
    return saved;
  }

  getItemSellPrice(itemName) {
    const item = this.getItemPrice(itemName);
    return item ? item.max_price : 0;
  }

  getItemBuyPrice(itemName) {
    const item = this.getItemPrice(itemName);
    return item ? item.min_price : 0;
  }

  getFarmerPayment(itemName) {
    const item = this.getItemPrice(itemName);
    return item ? item.farmer_payment : 0;
  }

  calculateProfit(itemName, quantity = 1) {
    const item = this.getItemPrice(itemName);
    if (!item) {
      return { profit: 0, buy_cost: 0, sell_revenue: 0 };
    }

    const buy_cost = item.min_price * quantity;
    const sell_revenue = item.max_price * quantity;
    const profit = sell_revenue - buy_cost;

    return {
      profit: profit,
      buy_cost: buy_cost,
      sell_revenue: sell_revenue,
      margin_percent: buy_cost > 0 ? ((profit / buy_cost) * 100) : 0
    };
  }

  searchItems(searchTerm) {
    const results = [];
    const term = searchTerm.toLowerCase();

    for (const [itemName, itemData] of Object.entries(this.itemPrices.items)) {
      if (itemName.toLowerCase().includes(term)) {
        results.push({
          name: itemName,
          ...itemData
        });
      }
    }

    return results.sort((a, b) => a.name.localeCompare(b.name));
  }

  getCategories() {
    // Extract unique categories from the flat item structure
    const categories = new Set();
    
    for (const [itemName, itemData] of Object.entries(this.itemPrices)) {
      if (itemData && itemData.category) {
        categories.add(itemData.category);
      }
    }
    
    return Array.from(categories).sort();
  }

  getCategoryStats() {
    const stats = {};
    
    for (const [category, items] of Object.entries(this.itemPrices.categories)) {
      stats[category] = {
        item_count: items.length,
        total_value: items.reduce((sum, itemName) => {
          const item = this.itemPrices.items[itemName];
          return sum + (item ? item.max_price : 0);
        }, 0),
        avg_price: 0
      };
      
      if (stats[category].item_count > 0) {
        stats[category].avg_price = stats[category].total_value / stats[category].item_count;
      }
    }

    return stats;
  }

  // Method to validate price ranges for order processing
  validatePrice(itemName, price) {
    const item = this.getItemPrice(itemName);
    if (!item) {
      return { valid: false, message: 'Item not found in pricing database' };
    }

    if (price < item.min_price) {
      return { 
        valid: false, 
        message: `Price $${price} is below minimum $${item.min_price}` 
      };
    }

    if (price > item.max_price) {
      return { 
        valid: false, 
        message: `Price $${price} is above maximum $${item.max_price}` 
      };
    }

    return { valid: true, message: 'Price is within valid range' };
  }

  // Method to get default sell price (max price)
  getDefaultSellPrice(itemName) {
    const item = this.getItemPrice(itemName);
    return item ? item.max_price : null;
  }

  // Method to get items suitable for purchase planning
  getItemsForPurchase() {
    const items = [];
    
    for (const [itemName, itemData] of Object.entries(this.itemPrices.items)) {
      items.push({
        name: itemName,
        category: itemData.category,
        buy_price: itemData.min_price,
        sell_price: itemData.max_price,
        farmer_payment: itemData.farmer_payment,
        profit_margin: itemData.max_price - itemData.min_price
      });
    }

    return items.sort((a, b) => b.profit_margin - a.profit_margin);
  }
}

module.exports = PricingManager;