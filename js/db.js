// Simple in-memory + localStorage fallback
const DB = {
  products: new Map(),
  productCategories: new Map(),              // ← NEW
  productLowStockThresholds: new Map(),      // ← NEW
  transactions: [],

  init() {
    const saved = localStorage.getItem('feel365_data');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        this.products = new Map(Object.entries(data.products || {}));
        this.productCategories = new Map(Object.entries(data.productCategories || {}));
        this.productLowStockThresholds = new Map(Object.entries(data.productLowStockThresholds || {}));
        this.transactions = data.transactions || [];
      } catch (e) {
        console.error('Failed to parse saved data');
        this.products = new Map();
        this.productCategories = new Map();
        this.productLowStockThresholds = new Map();
        this.transactions = [];
      }
    }
    this.updateLastActivity();
  },

  save() {
    const data = {
      products: Object.fromEntries(this.products),
      productCategories: Object.fromEntries(this.productCategories),
      productLowStockThresholds: Object.fromEntries(this.productLowStockThresholds),
      transactions: this.transactions
    };
    localStorage.setItem('feel365_data', JSON.stringify(data));
    this.updateLastActivity();
  },

  updateLastActivity() {
    localStorage.setItem('feel365_last_activity', Date.now());
  },

  // NEW: Add product with optional category & threshold
  addProduct(name, category = '', threshold = 5) {
    if (!this.products.has(name)) {
      this.products.set(name, 0);
      if (category) this.productCategories.set(name, category);
      this.productLowStockThresholds.set(name, parseInt(threshold) || 5);
      this.save();
    }
  },

  addTransaction(product, qty, type) {
    const date = new Date().toISOString().split('T')[0];
    this.transactions.push({ date, product, qty, type });
    const current = this.products.get(product) || 0;
    this.products.set(product, current + qty);
    this.save();
  },

  getTransactions(filterDate = null) {
    if (filterDate) {
      return this.transactions.filter(t => t.date === filterDate);
    }
    return [...this.transactions].reverse();
  },

  getTotalStock() {
    let total = 0;
    for (let qty of this.products.values()) {
      total += qty;
    }
    return total;
  },

  getTodaySales() {
    const today = new Date().toISOString().split('T')[0];
    return this.transactions
      .filter(t => t.date === today && t.type === 'SALE')
      .reduce((sum, t) => sum + t.qty, 0);
  },

  getBestSelling() {
    const sales = {};
    this.transactions
      .filter(t => t.type === 'SALE')
      .forEach(t => {
        sales[t.product] = (sales[t.product] || 0) + t.qty;
      });
    return Object.entries(sales)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  },

  getTotalSalesForProduct(productName) {
    return this.transactions
      .filter(t => t.product === productName && t.type === 'SALE')
      .reduce((sum, t) => sum + Math.abs(t.qty), 0);
  },

  // === NEW HELPER METHODS ===
  getCategory(productName) {
    return this.productCategories.get(productName) || '';
  },

  getThreshold(productName) {
    return this.productLowStockThresholds.get(productName) || 5;
  },

  getAllCategories() {
    const cats = new Set();
    for (const name of this.products.keys()) {
      const cat = this.getCategory(name);
      if (cat) cats.add(cat);
    }
    return Array.from(cats).sort();
  }
};

DB.init();
