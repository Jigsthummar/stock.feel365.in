document.addEventListener('DOMContentLoaded', () => {
  let currentDeleteProduct = null;
  let LOW_STOCK_THRESHOLD = parseInt(localStorage.getItem('lowStockThreshold') || '5');
  let apexChart = null;

  // ======================
  // VIEW MANAGEMENT
  // ======================
  function switchView(targetView) {
    document.querySelectorAll('.view').forEach(v => {
      v.classList.add('hidden');
      v.classList.remove('view-animate');
    });
    
    const activeView = document.getElementById(`view-${targetView}`);
    activeView.classList.remove('hidden');
    setTimeout(() => activeView.classList.add('view-animate'), 10);

    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.view === targetView);
    });

    // Load specific view data
    if (targetView === 'dashboard') updateDashboard();
    if (targetView === 'stock') renderStockCards();
    if (targetView === 'ledger') renderLedger();
    if (['add-stock', 'sell', 'return', 'damage'].includes(targetView)) populateDropdowns();
  }

  // ======================
  // RENDERING
  // ======================
  function updateDashboard() {
    document.getElementById('totalProducts').textContent = DB.products.size;
    document.getElementById('todaySales').textContent = DB.getTodaySales();
    renderChart();
    checkBackupReminder();
  }

  function renderStockCards() {
    const container = document.getElementById('stockListContainer');
    const term = document.getElementById('stockSearch').value.toLowerCase();
    container.innerHTML = '';

    const products = Array.from(DB.products.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    
    products.forEach(([name, qty]) => {
      if (term && !name.toLowerCase().includes(term)) return;

      let statusColor = 'var(--success)';
      let statusBg = 'rgba(16, 185, 129, 0.1)';
      if (qty <= 0) {
        statusColor = 'var(--danger)';
        statusBg = 'rgba(244, 63, 94, 0.1)';
      } else if (qty <= LOW_STOCK_THRESHOLD) {
        statusColor = 'var(--warning)';
        statusBg = 'rgba(245, 158, 11, 0.1)';
      }

      const item = document.createElement('div');
      item.className = 'stock-item';
      item.innerHTML = `
        <div class="stock-info">
          <h4>${name}</h4>
          <p>${qty <= LOW_STOCK_THRESHOLD ? '⚠️ Low Stock' : '✅ In Stock'}</p>
        </div>
        <div style="display:flex; align-items:center; gap:15px;">
          <span class="stock-badge" style="color:${statusColor}; background:${statusBg}">${qty}</span>
          <button class="delete-trigger" style="background:none; border:none; color:var(--text-dim); cursor:pointer;">
            <i class="fas fa-trash-alt"></i>
          </button>
        </div>
      `;

      item.querySelector('.delete-trigger').onclick = (e) => {
        e.stopPropagation();
        currentDeleteProduct = name;
        document.getElementById('deleteProductName').textContent = name;
        document.getElementById('deleteModal').style.display = 'flex';
      };

      container.appendChild(item);
    });
  }

  function renderLedger(filterDate = null) {
    const container = document.getElementById('ledgerItems');
    container.innerHTML = '';
    const tx = DB.getTransactions(filterDate);

    if (tx.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:var(--text-dim); padding:20px;">No records found</p>';
        return;
    }

    tx.forEach(t => {
      const typeColor = t.type === 'SALE' ? 'var(--danger)' : t.type === 'ADD' ? 'var(--success)' : 'var(--accent)';
      const div = document.createElement('div');
      div.className = 'stock-item';
      div.style.marginBottom = '8px';
      div.innerHTML = `
        <div class="stock-info">
          <h4 style="font-size:0.9rem">${t.product}</h4>
          <p style="font-size:0.7rem">${t.date}</p>
        </div>
        <div style="text-align:right">
          <div style="font-weight:800; color:${typeColor}">${t.qty > 0 ? '+' : ''}${t.qty}</div>
          <div style="font-size:0.6rem; text-transform:uppercase; color:var(--text-dim)">${t.type}</div>
        </div>
      `;
      container.appendChild(div);
    });
  }

  function renderChart() {
    const data = DB.getBestSelling();
    const el = document.getElementById('bestSellingChart');
    if (apexChart) apexChart.destroy();
    
    if (data.length === 0) {
      el.innerHTML = '<p style="color:var(--text-dim); text-align:center; padding-top:40px;">No sales data available</p>';
      return;
    }

    const options = {
      series: [{ name: 'Units', data: data.map(d => d[1]) }],
      chart: { type: 'bar', height: 200, toolbar: { show: false }, background: 'transparent' },
      plotOptions: { bar: { borderRadius: 8, columnWidth: '50%', distributed: true } },
      colors: ['#8b5cf6', '#d946ef', '#ec4899', '#f43f5e', '#f59e0b'],
      xaxis: { 
        categories: data.map(d => d[0].substring(0, 10)),
        labels: { style: { colors: '#94a3b8' } }
      },
      yaxis: { labels: { style: { colors: '#94a3b8' } } },
      grid: { borderColor: 'rgba(255,255,255,0.05)' },
      theme: { mode: 'dark' },
      legend: { show: false },
      dataLabels: { enabled: false }
    };

    apexChart = new ApexCharts(el, options);
    apexChart.render();
  }

  // ======================
  // ACTIONS & EVENTS
  // ======================
  function populateDropdowns() {
    const products = Array.from(DB.products.keys()).sort();
    ['sellProduct', 'addStockProduct', 'returnProduct', 'damageProduct'].forEach(id => {
      const select = document.getElementById(id);
      if (!select) return;
      select.innerHTML = products.map(p => `<option value="${p}">${p}</option>`).join('') || '<option disabled>No products available</option>';
    });
  }

  function attachListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        switchView(btn.dataset.view);
      };
    });

    document.getElementById('flip-add-product').onclick = () => switchView('add-product');
    document.getElementById('go-to-stock').onclick = () => switchView('stock');
    document.getElementById('go-to-sales').onclick = () => switchView('ledger');

    // Forms
    document.getElementById('saveProductBtn').onclick = () => {
      const name = document.getElementById('newProductName').value.trim();
      if (!name || DB.products.has(name)) return alert("Invalid or duplicate product");
      DB.addProduct(name);
      document.getElementById('newProductName').value = '';
      alert("Success!");
      switchView('stock');
    };

    document.getElementById('saveSellBtn').onclick = () => {
      const p = document.getElementById('sellProduct').value;
      const q = parseInt(document.getElementById('sellQty').value);
      if (DB.products.get(p) < q) return alert("Insufficient Stock!");
      DB.addTransaction(p, -q, 'SALE');
      document.getElementById('sellQty').value = '';
      alert("Sale Recorded");
      switchView('dashboard');
    };

    document.getElementById('saveAddStockBtn').onclick = () => {
      const p = document.getElementById('addStockProduct').value;
      const q = parseInt(document.getElementById('addStockQty').value);
      DB.addTransaction(p, q, 'ADD');
      document.getElementById('addStockQty').value = '';
      alert("Stock Updated");
      switchView('stock');
    };

    // Filters
    document.getElementById('stockSearch').oninput = renderStockCards;
    document.getElementById('lowStockThreshold').oninput = (e) => {
      LOW_STOCK_THRESHOLD = parseInt(e.target.value);
      document.getElementById('thresholdValue').textContent = LOW_STOCK_THRESHOLD;
      localStorage.setItem('lowStockThreshold', LOW_STOCK_THRESHOLD);
      renderStockCards();
    };

    // Ledger Filter
    document.getElementById('filterLedgerBtn').onclick = () => {
      const date = document.getElementById('dateFilter').value;
      renderLedger(date || null);
    };

    // Modal Actions
    document.getElementById('confirmDeleteBtn').onclick = () => {
      DB.products.delete(currentDeleteProduct);
      DB.save();
      document.getElementById('deleteModal').style.display = 'none';
      renderStockCards();
      updateDashboard();
    };

    // WhatsApp
    document.getElementById('whatsappStockBtn').onclick = () => {
        let msg = '*FEEL365 Stock Summary*\n\n';
        Array.from(DB.products.entries()).forEach(([n, q]) => {
            msg += `• ${n}: *${q} units*\n`;
        });
        window.open(`https://wa.me/919825531314?text=${encodeURIComponent(msg)}`);
    };

    // Backup
    document.getElementById('backupNowBtn').onclick = () => {
        const data = localStorage.getItem('feel365_data');
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Backup_${new Date().toLocaleDateString()}.json`;
        a.click();
        localStorage.setItem('feel365_last_backup', Date.now());
        checkBackupReminder();
    };

    // Import
    document.getElementById('importLedgerBtn').onclick = () => document.getElementById('importModal').style.display = 'flex';
    document.getElementById('confirmImportBtn').onclick = () => {
        const file = document.getElementById('importFile').files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            localStorage.setItem('feel365_data', e.target.result);
            DB.init();
            location.reload();
        };
        reader.readAsText(file);
    };
  }

  function checkBackupReminder() {
    const last = localStorage.getItem('feel365_last_backup');
    const over = !last || (Date.now() - parseInt(last)) > 7 * 24 * 60 * 60 * 1000;
    document.getElementById('backupAlert').classList.toggle('hidden', !over);
  }

  // Swipe logic (Improved)
  const setupSwipe = () => {
    const mc = new Hammer(document.body);
    const views = ['dashboard', 'stock', 'sell', 'ledger'];
    mc.on('swipeleft', () => {
      const curr = document.querySelector('.nav-item.active').dataset.view;
      const idx = views.indexOf(curr);
      if (idx < views.length - 1) switchView(views[idx+1]);
    });
    mc.on('swiperight', () => {
      const curr = document.querySelector('.nav-item.active').dataset.view;
      const idx = views.indexOf(curr);
      if (idx > 0) switchView(views[idx-1]);
    });
  };

  // Init
  attachListeners();
  setupSwipe();
  switchView('dashboard');
});
