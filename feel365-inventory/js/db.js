// Simple in-memory + localStorage fallback
const DB = {
  products: new Map(),
  transactions: [],

  init() {
    const saved = localStorage.getItem('feel365_data');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        this.products = new Map(Object.entries(data.products));
        this.transactions = data.transactions || [];
      } catch (e) {
        console.error('Failed to parse saved data');
        this.products = new Map();
        this.transactions = [];
      }
    }
    this.updateLastActivity();
  },

  save() {
    const data = {
      products: Object.fromEntries(this.products),
      transactions: this.transactions
    };
    localStorage.setItem('feel365_data', JSON.stringify(data));
    this.updateLastActivity();
  },

  updateLastActivity() {
    localStorage.setItem('feel365_last_activity', Date.now());
  },

  addProduct(name) {
    if (!this.products.has(name)) {
      this.products.set(name, 0);
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
      .reduce((sum, t) => sum + Math.abs(t.qty), 0); // qty is negative for SALES
  }
};


DB.init();