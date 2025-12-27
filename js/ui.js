// js/ui.js — Mobile-First, Gesture-Enabled, Core Logic Preserved
document.addEventListener('DOMContentLoaded', () => {
  let currentDeleteProduct = null;
  let autoRefreshInterval;
  let LOW_STOCK_THRESHOLD = parseInt(localStorage.getItem('lowStockThreshold') || '5');
  let apexChart = null;

  // ======================
  // SWIPE NAVIGATION
  // ======================
  function setupSwipeGestures() {
    const mainContent = document.querySelector('.main-content');
    if (typeof Hammer === 'undefined' || window.innerWidth > 768) return;

    const mc = new Hammer(mainContent);
    const views = ['dashboard', 'add-stock', 'sell', 'return', 'damage', 'ledger', 'stock'];
    
    mc.on('swipeleft', () => {
      const current = getCurrentActiveView();
      const idx = views.indexOf(current);
      if (idx !== -1 && idx < views.length - 1) switchView(views[idx + 1]);
    });
    
    mc.on('swiperight', () => {
      const current = getCurrentActiveView();
      const idx = views.indexOf(current);
      if (idx > 0) switchView(views[idx - 1]);
    });
  }

  function getCurrentActiveView() {
    return document.querySelector('.nav-item.active')?.dataset.view || 'dashboard';
  }

  // ======================
  // APEXCHARTS
  // ======================
  function renderBestSellingChart() {
    const data = DB.getBestSelling();
    const el = document.getElementById('bestSellingChart');
    if (apexChart) apexChart.destroy(); 

    if (data.length === 0) {
      el.innerHTML = '<p style="color:#a1a1aa;text-align:center;padding:20px;">No sales yet</p>';
      return;
    }

    const options = {
      chart: { type: 'bar', height: 200, animations: { enabled: true } },
      series: [{ name: 'Units', data: data.map(d => d[1]) }],
      xaxis: {
        categories: data.map(d => d[0].length > 15 ? d[0].substring(0,12)+'...' : d[0]),
        labels: { style: { colors: '#a1a1aa', fontSize: '11px' } }
      },
      yaxis: { min: 0, labels: { style: { colors: '#a1a1aa' } } },
      plotOptions: {
        bar: {
          borderRadius: 6,
          columnWidth: '60%',
          dataLabels: { position: 'top' }
        }
      },
      dataLabels: { enabled: true, style: { colors: ['#f5f3ff'] } },
      colors: ['#a855f7'],
      grid: { borderColor: '#27272a', strokeDashArray: 3 },
      tooltip: {
        theme: 'dark',
        y: { formatter: val => `${val} units` }
      }
    };

    apexChart = new ApexCharts(el, options);
    apexChart.render();
  }

  // ======================
  // CORE RENDER FUNCTIONS (UNCHANGED LOGIC)
  // ======================
  function updateDashboard() {
    document.getElementById('totalProducts').textContent = DB.products.size;
    document.getElementById('todaySales').textContent = DB.getTodaySales();
    renderBestSellingChart();
  }

  function renderStockTable() {
    const tbody = document.getElementById('stockTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    const products = Array.from(DB.products.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    
    if (products.length === 0) {
      tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;color:#a1a1aa;">No products</td></tr>`;
      return;
    }

    products.forEach(([name, qty]) => {
      const row = document.createElement('tr');
      let stockColor = '#f5f3ff';
      if (qty <= 0) stockColor = '#ef4444';
      else if (qty <= LOW_STOCK_THRESHOLD) stockColor = '#f59e0b';

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn btn-danger';
      deleteBtn.style.padding = '6px 10px';
      deleteBtn.style.fontSize = '0.85rem';
      deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
      deleteBtn.onclick = () => {
        currentDeleteProduct = name;
        document.getElementById('deleteProductName').textContent = name;
        showModal('deleteModal');
      };

      row.innerHTML = `
        <td>${name}</td>
        <td><span style="color:${stockColor}; font-weight:600;">${qty} ${qty <= LOW_STOCK_THRESHOLD ? '⚠️' : ''}</span></td>
        <td></td>
      `;
      row.cells[2].appendChild(deleteBtn);
      tbody.appendChild(row);
    });

    applyStockFilters();
  }

  function renderLedger(filterDate = null) {
    const tbody = document.getElementById('ledgerBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    const transactions = DB.getTransactions(filterDate);
    
    if (transactions.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:#a1a1aa;">No records</td></tr>`;
      return;
    }

    transactions.forEach(t => {
      const color = 
        t.type === 'ADD' ? '#10b981' :
        t.type === 'SALE' ? '#ef4444' :
        t.type === 'RETURN' ? '#a855f7' : '#f59e0b';
        
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${t.date}</td>
        <td>${t.product}</td>
        <td>${t.qty > 0 ? '+' + t.qty : t.qty}</td>
        <td><span style="color:${color};">${t.type}</span></td>
      `;
      tbody.appendChild(row);
    });
  }

  // ======================
  // VIEW MANAGEMENT
  // ======================
  function switchView(targetView) {
    // Update nav
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.view === targetView);
    });

    // Show view
    document.querySelectorAll('.view').forEach(view => {
      view.style.display = (view.id === `view-${targetView}`) ? 'block' : 'none';
    });

    // FAB logic
    const fab = document.getElementById('fabAdd');
    if (targetView === 'add-product') {
      fab.style.display = 'none';
    } else {
      fab.style.display = 'flex';
      fab.onclick = () => switchView('add-product');
    }

    // Refresh
    if (targetView === 'dashboard') updateDashboard();
    else if (['add-stock', 'sell', 'return', 'damage'].includes(targetView)) {
      populateProductDropdowns();
    } else if (targetView === 'ledger') renderLedger();
    else if (targetView === 'stock') renderStockTable();
  }

  // ======================
  // MODAL HANDLING
  // ======================
  function showModal(modalId) {
    document.getElementById(modalId).style.display = 'flex';
    document.body.style.paddingBottom = '120px';
  }

  function hideModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
    document.body.style.paddingBottom = '80px';
  }

  // ======================
  // UTILITIES
  // ======================
  function populateProductDropdowns() {
    const products = Array.from(DB.products.keys()).sort();
    ['addStockProduct', 'sellProduct', 'returnProduct', 'damageProduct'].forEach(id => {
      const select = document.getElementById(id);
      if (!select) return;
      select.innerHTML = '';
      if (products.length === 0) {
        const opt = document.createElement('option');
        opt.textContent = '⚠️ No products';
        opt.disabled = true;
        select.appendChild(opt);
        return;
      }
      products.forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        select.appendChild(opt);
      });
    });
  }

  function updateThresholdDisplay() {
    const el = document.getElementById('thresholdValue');
    const slider = document.getElementById('lowStockThreshold');
    if (el) el.textContent = LOW_STOCK_THRESHOLD;
    if (slider) slider.value = LOW_STOCK_THRESHOLD;
  }

  function applyStockFilters() {
    const term = document.getElementById('stockSearch')?.value.toLowerCase() || '';
    document.querySelectorAll('#stockTableBody tr').forEach(row => {
      const cell = row.cells[0];
      row.style.display = !term || cell.textContent.toLowerCase().includes(term) ? '' : 'none';
    });
  }

  // ======================
  // ACTION HANDLERS
  // ======================
  function attachActionListeners() {
    // Core actions (add, sell, return, etc.) — same logic as before
    // ... [Your existing action handlers remain unchanged] ...

    // Example: Add Product
    document.getElementById('saveProductBtn')?.addEventListener('click', () => {
      const name = document.getElementById('newProductName')?.value.trim();
      if (!name) return alert('Product name required.');
      if (DB.products.has(name)) return alert('Product exists!');
      DB.addProduct(name);
      alert('✅ Added!');
      document.getElementById('newProductName').value = '';
      populateProductDropdowns();
      updateDashboard();
      renderStockTable();
      switchView('stock');
    });

    // ... [Include all your existing transaction handlers] ...

    // Backup
    document.getElementById('backupNowBtn')?.addEventListener('click', exportBackup);
    document.getElementById('exportLedgerBtn')?.addEventListener('click', exportBackup);

    // Import
    document.getElementById('importLedgerBtn')?.addEventListener('click', () => showModal('importModal'));
    document.getElementById('importFile')?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file && file.type === 'application/json') {
        document.getElementById('confirmImportBtn').onclick = () => {
          importDataFromFile(file);
        };
      }
    });

    // Filters
    document.getElementById('clearFiltersBtn')?.addEventListener('click', () => {
      document.getElementById('stockSearch').value = '';
      applyStockFilters();
    });

    document.getElementById('filterLedgerBtn')?.addEventListener('click', () => {
      renderLedger(document.getElementById('dateFilter').value || null);
    });

    document.getElementById('clearLedgerFilterBtn')?.addEventListener('click', () => {
      document.getElementById('dateFilter').value = '';
      renderLedger();
    });

    // WhatsApp
    document.getElementById('whatsappStockBtn')?.addEventListener('click', whatsappStockReport);
    document.getElementById('whatsappLedgerBtn')?.addEventListener('click', whatsappLedgerReport);

    // Threshold
    document.getElementById('lowStockThreshold')?.addEventListener('input', (e) => {
      LOW_STOCK_THRESHOLD = parseInt(e.target.value);
      localStorage.setItem('lowStockThreshold', LOW_STOCK_THRESHOLD);
      updateThresholdDisplay();
      renderStockTable();
    });

    // Search
    document.getElementById('stockSearch')?.addEventListener('input', applyStockFilters);
  }

  // ======================
  // EXISTING FUNCTIONS (exportBackup, importDataFromFile, etc.)
  // ======================
  function exportBackup() {
    const data = localStorage.getItem('feel365_data');
    if (!data) return;
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FEEL365_Stock_Backup_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    localStorage.setItem('feel365_last_backup', Date.now());
    checkBackupReminder();
  }

  function importDataFromFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.products && data.transactions) {
          localStorage.setItem('feel365_data', JSON.stringify(data));
          localStorage.setItem('feel365_last_backup', Date.now());
          DB.init();
          alert('✅ Restored!');
          renderStockTable();
          updateDashboard();
          hideModal('importModal');
        } else {
          throw new Error('Invalid file');
        }
      } catch (err) {
        alert('❌ Invalid backup file.');
      }
    };
    reader.readAsText(file);
  }

  function whatsappLedgerReport() {
    const today = new Date().toISOString().slice(0,10);
    const transactions = DB.getTransactions(today);
    let msg = `*FEEL365 Ledger - ${today}*\n\n`;
    if (transactions.length === 0) {
      msg += '• No transactions today.';
    } else {
      transactions.forEach(t => {
        const sign = t.qty > 0 ? '+' : '';
        msg += `• ${t.product}\n  → ${sign}${t.qty} | ${t.type}\n`;
      });
    }
    window.open(`https://wa.me/919825531314?text=${encodeURIComponent(msg)}`, '_blank');
  }

  function whatsappStockReport() {
    let msg = '*FEEL365 Stock Summary*\n\n';
    const products = Array.from(DB.products.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    if (products.length === 0) {
      msg += '• No products available.';
    } else {
      products.forEach(([name, qty]) => {
        const status = qty <= 0 ? '❌ OUT' : (qty <= LOW_STOCK_THRESHOLD ? '⚠️ LOW' : '✅ OK');
        msg += `• ${name}\n  → ${qty} units [${status}]\n`;
      });
    }
    window.open(`https://wa.me/919825531314?text=${encodeURIComponent(msg)}`, '_blank');
  }

  function checkBackupReminder() {
    const last = localStorage.getItem('feel365_last_backup');
    const now = Date.now();
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
    const alertEl = document.getElementById('backupAlert');
    if (alertEl) {
      alertEl.style.display = !last || (now - parseInt(last)) > SEVEN_DAYS ? 'flex' : 'none';
    }
  }

  // ======================
  // INIT
  // ======================
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      switchView(item.dataset.view);
    });
  });

  document.querySelectorAll('.close').forEach(btn => {
    btn.addEventListener('click', () => {
      hideModal(btn.closest('.modal').id);
    });
  });

  document.getElementById('confirmDeleteBtn')?.addEventListener('click', () => {
    if (currentDeleteProduct && DB.products.has(currentDeleteProduct)) {
      DB.products.delete(currentDeleteProduct);
      DB.save();
      alert(`✅ Deleted "${currentDeleteProduct}".`);
      renderStockTable();
      populateProductDropdowns();
      updateDashboard();
    }
    hideModal('deleteModal');
  });

  document.getElementById('flip-add-product')?.addEventListener('click', () => switchView('add-product'));
  document.getElementById('flip-sell')?.addEventListener('click', () => switchView('sell'));

  updateThresholdDisplay();
  switchView('dashboard');
  checkBackupReminder();
  attachActionListeners();
  setupSwipeGestures();
});
