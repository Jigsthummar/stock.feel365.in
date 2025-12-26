// js/ui.js — UI LAYER ONLY (Core DB logic untouched)
document.addEventListener('DOMContentLoaded', () => {
  let currentDeleteProduct = null;
  let autoRefreshInterval;
  let LOW_STOCK_THRESHOLD = parseInt(localStorage.getItem('lowStockThreshold') || '5');
  let apexChart = null;

  // ======================
  // CHART RENDERING (APEXCHARTS)
  // ======================
  function renderBestSellingChart() {
    const data = DB.getBestSelling();
    const chartEl = document.getElementById('bestSellingChart');

    if (apexChart) {
      apexChart.destroy();
    }

    if (data.length === 0) {
      chartEl.innerHTML = '<p style="color:#94a3b8;text-align:center;padding:20px;">No sales data yet</p>';
      return;
    }

    const options = {
      chart: { type: 'bar', height: 220, animations: { enabled: true, easing: 'easeinout' } },
      series: [{ name: 'Units Sold', data: data.map(d => d[1]) }],
      xaxis: {
        categories: data.map(d => d[0].length > 18 ? d[0].substring(0,15)+'...' : d[0]),
        labels: { style: { colors: '#94a3b8', fontSize: '12px' } }
      },
      yaxis: {
        min: 0,
        labels: { style: { colors: '#94a3b8' } }
      },
      plotOptions: {
        bar: {
          borderRadius: 6,
          horizontal: false,
          distributed: true,
          columnWidth: '50%',
          dataLabels: { position: 'top' }
        }
      },
      dataLabels: { enabled: true, style: { fontSize: '12px', colors: ['#e2e8f0'] } },
      colors: ['#818cf8'],
      grid: { borderColor: '#334155', strokeDashArray: 3 },
      tooltip: {
        theme: 'dark',
        style: { fontSize: '14px' },
        y: { formatter: (val) => `${val} units` }
      }
    };

    apexChart = new ApexCharts(chartEl, options);
    apexChart.render();
  }

  // ======================
  // Rest of your functions remain identical (only copied for context)
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
      tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;color:#94a3b8;">No products</td></tr>`;
      return;
    }

    products.forEach(([name, qty]) => {
      const row = document.createElement('tr');
      let stockColor = '#e2e8f0';
      if (qty <= 0) stockColor = '#f87171';
      else if (qty <= LOW_STOCK_THRESHOLD) stockColor = '#fbbf24';

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-btn';
      deleteBtn.innerHTML = '<i class="fas fa-trash"></i> Delete';
      deleteBtn.onclick = () => {
        currentDeleteProduct = name;
        document.getElementById('deleteProductName').textContent = name;
        document.getElementById('deleteModal').style.display = 'flex';
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
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:#94a3b8;">No records</td></tr>`;
      return;
    }

    transactions.forEach(t => {
      const color = 
        t.type === 'ADD' ? '#34d399' :
        t.type === 'SALE' ? '#f87171' :
        t.type === 'RETURN' ? '#a5b4fc' : '#fbbf24';
        
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

  function switchView(targetView) {
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.toggle('active', link.getAttribute('data-view') === targetView);
    });
    
    document.querySelectorAll('.view').forEach(view => {
      view.style.display = (view.id === `view-${targetView}`) ? 'block' : 'none';
    });

    if (targetView === 'dashboard') {
      updateDashboard();
    } else if (['add-stock', 'sell', 'return', 'damage'].includes(targetView)) {
      populateProductDropdowns();
      attachActionListeners();
    } else if (targetView === 'ledger') {
      renderLedger();
    } else if (targetView === 'stock') {
      renderStockTable();
      attachActionListeners();
    } else if (targetView === 'add-product') {
      attachActionListeners();
    }
  }

  function populateProductDropdowns() {
    const products = Array.from(DB.products.keys()).sort();
    ['addStockProduct', 'sellProduct', 'returnProduct', 'damageProduct'].forEach(id => {
      const select = document.getElementById(id);
      if (!select) return;
      select.innerHTML = '';
      if (products.length === 0) {
        const opt = document.createElement('option');
        opt.textContent = '⚠️ Add product first!';
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
    const searchTerm = document.getElementById('stockSearch')?.value.toLowerCase() || '';
    const rows = document.querySelectorAll('#stockTableBody tr');
    rows.forEach(row => {
      const productCell = row.cells[0];
      const isVisible = !searchTerm || productCell.textContent.toLowerCase().includes(searchTerm);
      row.style.display = isVisible ? '' : 'none';
    });
  }

  function clearFilters() {
    document.getElementById('stockSearch').value = '';
    applyStockFilters();
  }

  function checkBackupReminder() {
    const lastBackup = localStorage.getItem('feel365_last_backup');
    const now = Date.now();
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
    const alertEl = document.getElementById('backupAlert');
    if (alertEl) {
      alertEl.style.display = !lastBackup || (now - parseInt(lastBackup)) > SEVEN_DAYS ? 'flex' : 'none';
    }
  }

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
          alert('✅ Data restored successfully!');
          renderStockTable();
          updateDashboard();
          document.getElementById('importModal').style.display = 'none';
        } else {
          throw new Error('Invalid backup file');
        }
      } catch (err) {
        alert('❌ Invalid or corrupted backup file.');
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
    window.open(`https://wa.me/919016211040?text=${encodeURIComponent(msg)}`, '_blank');
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
    window.open(`https://wa.me/919016211040?text=${encodeURIComponent(msg)}`, '_blank');
  }

  function enforcePositiveInput(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.addEventListener('input', () => {
      let val = parseInt(input.value) || 0;
      if (val < 1) input.value = 1;
      else input.value = val;
    });
  }

  // ======================
  // ACTION LISTENERS (SAFE)
  // ======================

  function attachActionListeners() {
    // Add Product
    const saveProductBtn = document.getElementById('saveProductBtn');
    if (saveProductBtn && !saveProductBtn.dataset.attached) {
      saveProductBtn.dataset.attached = 'true';
      saveProductBtn.onclick = () => {
        const name = document.getElementById('newProductName')?.value.trim();
        if (!name) return alert('Product name is required.');
        if (DB.products.has(name)) return alert('⚠️ Product already exists!');
        DB.addProduct(name);
        alert('✅ Product added!');
        document.getElementById('newProductName').value = '';
        populateProductDropdowns();
        updateDashboard();
        renderStockTable();
      };
    }

    // Add Stock
    const saveAddStockBtn = document.getElementById('saveAddStockBtn');
    if (saveAddStockBtn && !saveAddStockBtn.dataset.attached) {
      saveAddStockBtn.dataset.attached = 'true';
      saveAddStockBtn.onclick = () => {
        const product = document.getElementById('addStockProduct')?.value;
        const qty = parseInt(document.getElementById('addStockQty')?.value);
        if (!product || !DB.products.has(product)) return alert('Select a valid product.');
        if (!qty || qty <= 0) return alert('Valid quantity required.');
        DB.addTransaction(product, qty, 'ADD');
        alert('✅ Stock added!');
        document.getElementById('addStockQty').value = '';
        updateDashboard();
        renderStockTable();
      };
    }

    // Sell
    const saveSellBtn = document.getElementById('saveSellBtn');
    if (saveSellBtn && !saveSellBtn.dataset.attached) {
      saveSellBtn.dataset.attached = 'true';
      saveSellBtn.onclick = () => {
        const product = document.getElementById('sellProduct')?.value;
        const qty = parseInt(document.getElementById('sellQty')?.value);
        if (!product || !DB.products.has(product)) return alert('Select a valid product.');
        const current = DB.products.get(product) || 0;
        if (current < qty) return alert(`❌ Not enough stock! Only ${current} available.`);
        if (!qty || qty <= 0) return alert('Valid quantity required.');
        DB.addTransaction(product, -qty, 'SALE');
        alert('✅ Sale recorded!');
        document.getElementById('sellQty').value = '';
        updateDashboard();
        renderStockTable();
      };
    }

    // Return
const saveReturnBtn = document.getElementById('saveReturnBtn');
if (saveReturnBtn && !saveReturnBtn.dataset.attached) {
  saveReturnBtn.dataset.attached = 'true';
  saveReturnBtn.onclick = () => {
    const product = document.getElementById('returnProduct')?.value;
    const qty = parseInt(document.getElementById('returnQty')?.value);

    if (!product || !DB.products.has(product)) return alert('Select a valid product.');
    if (!qty || qty <= 0) return alert('Valid quantity required.');

    // Get total sales for this product
    const totalSales = DB.getTotalSalesForProduct(product);
    
    // Prevent returning more than what was sold
    if (qty > totalSales) {
      alert(`⚠️ Cannot return ${qty} units. Only ${totalSales} units were sold.`);
      return;
    }

    DB.addTransaction(product, qty, 'RETURN');
    alert('✅ Return recorded!');
    document.getElementById('returnQty').value = '';
    updateDashboard();
    renderStockTable();
  };
}

    // Damage
const saveDamageBtn = document.getElementById('saveDamageBtn');
if (saveDamageBtn && !saveDamageBtn.dataset.attached) {
  saveDamageBtn.dataset.attached = 'true';
  saveDamageBtn.onclick = () => {
    const product = document.getElementById('damageProduct')?.value;
    const qty = parseInt(document.getElementById('damageQty')?.value);
    if (!product || !DB.products.has(product)) return alert('Select a valid product.');
    const current = DB.products.get(product) || 0;
    if (current < qty) return alert(`❌ Not enough stock! Only ${current} available.`);
    if (!qty || qty <= 0) return alert('Valid quantity required.');
    DB.addTransaction(product, -qty, 'DAMAGE');
    alert('✅ Damage reported!');
    document.getElementById('damageQty').value = '';
    updateDashboard();
    renderStockTable();
  };
}

    // WhatsApp buttons
    const whatsappStockBtn = document.getElementById('whatsappStockBtn');
    if (whatsappStockBtn && !whatsappStockBtn.dataset.attached) {
      whatsappStockBtn.dataset.attached = 'true';
      whatsappStockBtn.onclick = whatsappStockReport;
    }

    const whatsappLedgerBtn = document.getElementById('whatsappLedgerBtn');
    if (whatsappLedgerBtn && !whatsappLedgerBtn.dataset.attached) {
      whatsappLedgerBtn.dataset.attached = 'true';
      whatsappLedgerBtn.onclick = whatsappLedgerReport;
    }

    // Backup buttons
    const backupNowBtn = document.getElementById('backupNowBtn');
    if (backupNowBtn && !backupNowBtn.dataset.attached) {
      backupNowBtn.dataset.attached = 'true';
      backupNowBtn.onclick = exportBackup;
    }

    const exportLedgerBtn = document.getElementById('exportLedgerBtn');
    if (exportLedgerBtn && !exportLedgerBtn.dataset.attached) {
      exportLedgerBtn.dataset.attached = 'true';
      exportLedgerBtn.onclick = exportBackup;
    }

    // Import button
    const importDataBtn = document.getElementById('importDataBtn');
    if (importDataBtn && !importDataBtn.dataset.attached) {
      importDataBtn.dataset.attached = 'true';
      importDataBtn.onclick = () => {
        document.getElementById('importModal').style.display = 'flex';
      };
    }

    // Import file handler
    const importFile = document.getElementById('importFile');
    if (importFile) {
      importFile.onchange = (e) => {
        const file = e.target.files[0];
        if (file && file.type === 'application/json') {
          document.getElementById('confirmImportBtn').onclick = () => {
            importDataFromFile(file);
          };
        }
      };
    }

    // Threshold slider
    const thresholdSlider = document.getElementById('lowStockThreshold');
    if (thresholdSlider && !thresholdSlider.dataset.attached) {
      thresholdSlider.dataset.attached = 'true';
      thresholdSlider.oninput = (e) => {
        LOW_STOCK_THRESHOLD = parseInt(e.target.value);
        localStorage.setItem('lowStockThreshold', LOW_STOCK_THRESHOLD);
        updateThresholdDisplay();
        renderStockTable();
      };
    }

    // Search
    const stockSearch = document.getElementById('stockSearch');
    if (stockSearch && !stockSearch.dataset.attached) {
      stockSearch.dataset.attached = 'true';
      stockSearch.oninput = applyStockFilters;
    }

    // Clear Filters
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');
    if (clearFiltersBtn && !clearFiltersBtn.dataset.attached) {
      clearFiltersBtn.dataset.attached = 'true';
      clearFiltersBtn.onclick = clearFilters;
    }

    // Enforce positive numbers
    ['addStockQty', 'sellQty', 'returnQty', 'damageQty'].forEach(id => {
      if (document.getElementById(id) && !document.getElementById(id).dataset.validated) {
        document.getElementById(id).dataset.validated = 'true';
        enforcePositiveInput(id);
      }
    });
  }

  // ======================
  // MODAL HANDLERS
  // ======================

 // ===== MODAL & EVENT SETUP (UNCHANGED LOGIC) =====
  document.querySelector('.delete-close')?.addEventListener('click', () => {
    document.getElementById('deleteModal').style.display = 'none';
  });

  document.getElementById('confirmDeleteBtn')?.addEventListener('click', () => {
    if (currentDeleteProduct && DB.products.has(currentDeleteProduct)) {
      DB.products.delete(currentDeleteProduct);
      DB.save();
      alert(`✅ "${currentDeleteProduct}" deleted.`);
      renderStockTable();
      populateProductDropdowns();
      updateDashboard();
    }
    document.getElementById('deleteModal').style.display = 'none';
  });

  document.querySelector('.import-close')?.addEventListener('click', () => {
    document.getElementById('importModal').style.display = 'none';
  });

  const dateFilter = document.getElementById('dateFilter');
  if (dateFilter) {
    dateFilter.valueAsDate = new Date();
    document.getElementById('filterLedgerBtn')?.addEventListener('click', () => {
      renderLedger(dateFilter.value || null);
    });
  }

  document.querySelectorAll('.flip-card, .metric-card').forEach((el, i) => {
    if (i === 0) el.addEventListener('click', () => switchView('add-product'));
    if (i === 1) el.addEventListener('click', () => switchView('sell'));
  });

  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      switchView(link.getAttribute('data-view'));
    });
  });

  autoRefreshInterval = setInterval(() => {
    const activeView = document.querySelector('.nav-link.active')?.getAttribute('data-view');
    if (['dashboard', 'stock', 'ledger'].includes(activeView)) {
      if (activeView === 'dashboard') updateDashboard();
      else if (activeView === 'stock') renderStockTable();
      else if (activeView === 'ledger') renderLedger();
    }
  }, 30000);

  updateThresholdDisplay();
  switchView('dashboard');
  checkBackupReminder();
  attachActionListeners();
});