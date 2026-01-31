// js/ui.js — Fully Fixed and Complete
document.addEventListener('DOMContentLoaded', () => {
  let currentDeleteProduct = null;


  let idleTimeout;
const IDLE_TIME = 1 * 60 * 1000; // 5 minutes
const PIN = '5544';

// Reset idle timer on user activity
function resetIdleTimer() {
  clearTimeout(idleTimeout);
  idleTimeout = setTimeout(lockApp, IDLE_TIME);
}

// Lock the app
function lockApp() {
  document.getElementById('lockScreen').style.display = 'flex';
  document.body.style.overflow = 'hidden';
  document.getElementById('pinInput').value = '';
  document.getElementById('pinError').textContent = '';
  document.getElementById('pinInput').focus();
}

// Unlock the app
function unlockApp() {
  const pin = document.getElementById('pinInput').value;
  if (pin === PIN) {
    document.getElementById('lockScreen').style.display = 'none';
    document.body.style.overflow = '';
    resetIdleTimer(); // Restart timer
  } else {
    document.getElementById('pinError').textContent = '❌ Incorrect PIN';
    document.getElementById('pinInput').value = '';
    document.getElementById('pinInput').focus();
  }
}


  // Safe Hard Refresh (clears SW + cache, keeps localStorage)
function hardRefresh() {
  // Unregister all service workers
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      registrations.forEach(reg => reg.unregister());
    });
  }

  // Clear all caches
  if ('caches' in window) {
    caches.keys().then(names => {
      names.forEach(name => caches.delete(name));
    });
  }

  // Force reload from server (bypass cache)
  window.location.replace(window.location.href);
}

  // ======================
  // CURRENT STOCK PREVIEW
  // ======================

  function updateStockPreview(selectId, previewId) {
    const select = document.getElementById(selectId);
    const preview = document.getElementById(previewId);
    if (!select || !preview) return;

    const showPreview = () => {
      const name = select.value;
      preview.classList.remove('show');
      if (!name || !DB.products.has(name)) return;

      const qty = DB.products.get(name) || 0;
      if (qty <= 0) {
        preview.innerHTML = `<i class="fas fa-times-circle"></i> <span>❌ Out of Stock</span>`;
        preview.className = 'stock-preview out-of-stock show';
      } else {
        preview.innerHTML = `<i class="fas fa-box"></i> <span>📦 In Stock: ${qty}</span>`;
        preview.className = 'stock-preview success show';
      }
    };

    select.removeEventListener('change', showPreview);
    select.addEventListener('change', showPreview);
    showPreview(); // initial
  }

// Re-show current stock preview in active view
function refreshStockPreviews() {
  const currentView = document.querySelector('.view[style*="display: block"]')?.id?.replace('view-', '');
  if (currentView === 'add-stock') {
    updateStockPreview('addStockProduct', 'addStockCurrentStock');
  } else if (currentView === 'sell') {
    updateStockPreview('sellProduct', 'sellCurrentStock');
  } else if (currentView === 'damage') {
    updateStockPreview('damageProduct', 'damageCurrentStock');
  }
}

function showEditProductModal(productName) {
  document.getElementById('editProductName').textContent = productName;
  document.getElementById('editProductCategory').value = DB.getCategory?.(productName) || '';
  document.getElementById('editProductThreshold').value = DB.getThreshold?.(productName) || 5;
  document.getElementById('editProductModal').style.display = 'flex';
  window.currentEditProduct = productName;
}

function saveEditedProduct() {
  const name = window.currentEditProduct;
  if (!name || !DB.products.has(name)) return;

  const category = document.getElementById('editProductCategory').value.trim();
  const threshold = parseInt(document.getElementById('editProductThreshold').value) || 5;

  // Update category (store empty string as no category)
  if (category) {
    DB.productCategories.set(name, category);
  } else {
    DB.productCategories.delete(name);
  }

  // Update threshold
  DB.productLowStockThresholds.set(name, threshold);

  DB.save();
  renderStockTable();
  document.getElementById('editProductModal').style.display = 'none';
  alert('✅ Product updated!');
}

function saveEditedProduct() {
  const name = window.currentEditProduct;
  if (!name || !DB.products.has(name)) return;

  const category = document.getElementById('editProductCategory').value.trim();
  const threshold = parseInt(document.getElementById('editProductThreshold').value) || 5;

  // Update category
  if (category) {
    DB.productCategories.set(name, category);
  } else {
    DB.productCategories.delete(name);
  }

  // Update threshold
  DB.productLowStockThresholds.set(name, threshold);

  DB.save();
  renderStockTable();
  document.getElementById('editProductModal').style.display = 'none';
  alert('✅ Product updated!');
}

  // ======================
  // CATEGORY & PRODUCT DROPDOWNS
  // ======================

  function populateCategoryDropdowns() {
    const categories = DB.getAllCategories();
    const views = ['sell', 'return', 'damage', 'addStock'];
    views.forEach(view => {
      const select = document.getElementById(`${view}Category`);
      if (!select) return;
      select.innerHTML = '<option value="">— View All —</option>';
      categories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        select.appendChild(opt);
      });
    });
  }

  function populateProductDropdownByCategory(view, selectedCategory = '') {
    const select = document.getElementById(`${view}Product`);
    if (!select) return;

    select.innerHTML = '';

    const allProducts = Array.from(DB.products.keys()).sort();
    let filteredProducts = allProducts;

    if (selectedCategory) {
      filteredProducts = allProducts.filter(name =>
        DB.getCategory(name) === selectedCategory
      );
    }

    if (filteredProducts.length === 0) {
      const opt = document.createElement('option');
      opt.textContent = '— No products —';
      opt.disabled = true;
      select.appendChild(opt);
      return;
    }

    filteredProducts.forEach(name => {
      const category = DB.getCategory(name);
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = category ? `${name} (${category})` : name;
      select.appendChild(opt);
    });
  }

  // ======================
  // CORE RENDER FUNCTIONS
  // ======================

  function updateDashboard() {
    document.getElementById('totalProducts').textContent = DB.products.size;
    document.getElementById('todaySales').textContent = DB.getTodaySales();

  }

function renderStockTable() {
  const container = document.getElementById('stockListContainer');
  if (!container) return;

  const products = Array.from(DB.products.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  if (products.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:30px; color:var(--text-dim);">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" style="opacity:0.6; margin:0 auto 16px;">
          <path d="M4 19H20" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          <path d="M4 13H20" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          <path d="M4 7H12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          <path d="M16 6L16 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          <path d="M19 6L19 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <div style="font-size:1.1rem; margin-bottom:8px;">No products yet</div>
        <div style="font-size:0.9rem;">Tap <strong>+ Add Stock</strong> to get started</div>
      </div>
    `;
    return;
  }

  container.innerHTML = '';
  const fragment = document.createDocumentFragment();

  products.forEach(([name, qty]) => {
    const category = DB.getCategory ? DB.getCategory(name) : 'Uncategorized';
    const threshold = DB.getThreshold ? DB.getThreshold(name) : 5;

    const item = document.createElement('div');
    item.className = 'stock-item';

    if (qty <= threshold && qty > 0) {
      item.classList.add('pulsing');
      item.addEventListener('animationend', () => item.classList.remove('pulsing'), { once: true });
    }

    // Badge style
    let badgeBg = '';
    let badgeColor = '';
    if (qty <= 0) {
      badgeBg = 'rgba(244, 63, 94, 0.15)';
      badgeColor = 'var(--danger)';
    } else if (qty <= threshold) {
      badgeBg = 'rgba(245, 158, 11, 0.15)';
      badgeColor = 'var(--warning)';
    } else {
      badgeBg = 'rgba(16, 185, 129, 0.15)';
      badgeColor = 'var(--success)';
    }

    // 1. Left: Product name + category
    const leftDiv = document.createElement('div');
    leftDiv.style.flex = '1';
    leftDiv.style.minWidth = '0';
    leftDiv.innerHTML = `
      <h4 style="font-size:1rem; font-weight:600; margin-bottom:4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${name}</h4>
      <p style="font-size:0.8rem; color:var(--text-dim); margin-bottom:0;">${category || 'Uncategorized'}</p>
    `;

    // 2. Center: Stock units (bold badge)
    const centerDiv = document.createElement('div');
    centerDiv.style.textAlign = 'center';
    centerDiv.style.minWidth = '100px';
    centerDiv.innerHTML = `
      <div style="
        background: ${badgeBg};
        color: ${badgeColor};
        padding: 6px 12px;
        border-radius: 10px;
        font-weight: 700;
        font-size: 0.9rem;
        display: inline-block;
        white-space: nowrap;
      ">${qty} units</div>
    `;

    // 3. Right: Edit + Delete buttons
    const rightDiv = document.createElement('div');
    rightDiv.style.textAlign = 'right';
    rightDiv.style.display = 'flex';
    rightDiv.style.flexDirection = 'column';
    rightDiv.style.gap = '6px';
    rightDiv.style.justifyContent = 'center';

    const editBtn = document.createElement('button');
    editBtn.className = 'btn btn-ghost';
    editBtn.style.padding = '6px';
    editBtn.style.fontSize = '0.85rem';
    editBtn.innerHTML = '<i class="fas fa-edit"></i>';
    editBtn.onclick = () => showEditProductModal(name);
    rightDiv.appendChild(editBtn);

    const deleteBtn = document.createElement('button');
deleteBtn.className = 'btn btn-danger delete-btn';
deleteBtn.style.padding = '6px';
deleteBtn.style.fontSize = '0.85rem';
deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
deleteBtn.onclick = () => {
  window.currentDeleteProduct = name;
  document.getElementById('deleteProductName').textContent = name;
  document.getElementById('deleteModal').style.display = 'flex';
};
    rightDiv.appendChild(deleteBtn);

    // Assemble the row (3-column layout)
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.gap = '12px';
    row.style.width = '100%';
    row.appendChild(leftDiv);
    row.appendChild(centerDiv);
    row.appendChild(rightDiv);

    item.appendChild(row);
    fragment.appendChild(item);
  });

  container.appendChild(fragment);
  applyStockFilters();
}

  function renderLedger(filterDate = null) {
    const container = document.getElementById('ledgerItems');
    if (!container) return;

    const transactions = DB.getTransactions(filterDate);
    const today = new Date().toISOString().slice(0, 10);

    if (transactions.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding:30px; color:var(--text-dim);">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" style="opacity:0.6; margin:0 auto 16px;">
            <path d="M3 8V6A2 2 0 0 1 5 4H19A2 2 0 0 1 21 6V8" stroke="currentColor" stroke-width="1.5"/>
            <path d="M8 4V20" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M16 4V20" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <rect x="3" y="12" width="18" height="8" rx="2" stroke="currentColor" stroke-width="1.5"/>
          </svg>
          <div style="font-size:1.1rem; margin-bottom:8px;">No records found</div>
          <div style="font-size:0.9rem;">Transactions will appear here automatically</div>
        </div>
      `;
      return;
    }

    container.innerHTML = '';
    const fragment = document.createDocumentFragment();

    transactions.forEach(t => {
      const item = document.createElement('div');
      item.className = 'stock-item';
      item.style.marginBottom = '10px';

      if (t.date === today) {
        item.style.borderLeft = '3px solid var(--primary)';
        item.style.paddingLeft = '12px';
      }

      const color = t.type === 'ADD' ? 'var(--success)' :
                    t.type === 'SALE' ? 'var(--danger)' :
                    t.type === 'RETURN' ? 'var(--accent)' : 'var(--warning)';
      const sign = t.qty > 0 ? '+' : '';

      const info = document.createElement('div');
      info.className = 'stock-info';
      info.innerHTML = `<h4>${t.product}</h4><p>${t.date} • ${t.type}</p>`;

      const value = document.createElement('div');
      value.style.color = color;
      value.style.fontWeight = '600';
      value.style.fontSize = '1.1rem';
      value.textContent = `${sign}${Math.abs(t.qty)}`;

      item.style.display = 'flex';
      item.style.justifyContent = 'space-between';
      item.style.alignItems = 'center';
      item.appendChild(info);
      item.appendChild(value);
      fragment.appendChild(item);
    });

    container.appendChild(fragment);
  }


  function updateExistingCategoriesHint() {
  const hintEl = document.getElementById('existingCategoriesHint');
  if (!hintEl) return;

  const categories = DB.getAllCategories();
  if (categories.length === 0) {
    hintEl.textContent = 'No categories yet.';
  } 
}

function setupAddProductCategoryInput() {
  const select = document.getElementById('newProductCategory');
  const input = document.getElementById('newCategoryInput');
  if (!select || !input) return;

  // Load existing categories
  const categories = DB.getAllCategories();
  select.innerHTML = '<option value="">— Select or type new —</option>';

  // Add existing categories
  categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    select.appendChild(opt);
  });

  // Add "Add New" option at the bottom
  const addNewOpt = document.createElement('option');
  addNewOpt.value = 'ADD_NEW';
  addNewOpt.textContent = '➕ Add New Category';
  select.appendChild(addNewOpt);

  // Toggle input visibility
  select.addEventListener('change', () => {
    if (select.value === 'ADD_NEW') {
      input.style.display = 'block';
      input.focus();
      select.style.display = 'none'; // Hide select
    } else {
      input.style.display = 'none';
      select.style.display = 'block'; // Show select
    }
  });

  // Optional: focus input when user clicks the select
  select.addEventListener('click', () => {
    if (select.value === '') {
      // Do nothing — let user choose from list
    }
  });
}

  // ======================
  // VIEW MANAGEMENT
  // ======================

  function switchView(targetView) {
    document.querySelectorAll('.view').forEach(view => {
      view.style.display = 'none';
    });

    const target = document.getElementById(`view-${targetView}`);
    if (target) target.style.display = 'block';

    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.view === targetView);
    });

    if (targetView === 'dashboard') {
      updateDashboard();
    }
    else if (targetView === 'stock') {
      renderStockTable();
    }
    else if (targetView === 'ledger') {
      renderLedger();
    }
    else if (targetView === 'add-product') {
      updateExistingCategoriesHint(); 
      setupAddProductCategoryInput();
      // No special init
    }
    else if (['add-stock', 'sell', 'return', 'damage'].includes(targetView)) {
      const prefixMap = {
        'add-stock': 'addStock',
        'sell': 'sell',
        'return': 'return',
        'damage': 'damage'
      };
      const prefix = prefixMap[targetView];

      populateCategoryDropdowns();
      populateProductDropdownByCategory(prefix, '');

      if (targetView === 'add-stock') {
        updateStockPreview('addStockProduct', 'addStockCurrentStock');
      } else if (targetView === 'sell') {
        updateStockPreview('sellProduct', 'sellCurrentStock');
      } else if (targetView === 'damage') {
        updateStockPreview('damageProduct', 'damageCurrentStock');
      }
    }
  }

  // Keyboard shortcuts
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    if (!e.altKey) return;
    e.preventDefault();

    switch (e.key.toLowerCase()) {
      case 's': switchView('sell'); break;          // Alt+S → Sell
      case 'a': switchView('add-stock'); break;     // Alt+A → Add Stock
      case 'i': switchView('stock'); break;         // Alt+I → Inventory
      case 'd': switchView('damage'); break;        // Alt+D → Damage
      case 'h': switchView('ledger'); break;        // Alt+H → History
      case 'r': switchView('return'); break;        // Alt+R → Returns
      case 'n': switchView('add-product'); break;   // Alt+N → New Product
      case 'w': 
        document.getElementById('whatsappStockBtn')?.click();
        break; // Alt+W → WhatsApp
      case 'home': 
        switchView('dashboard'); 
        break; // Alt+Home → Dashboard
    }
  });
}

  

  // ======================
  // UTILITIES
  // ======================

  function applyStockFilters() {
    const searchTerm = document.getElementById('stockSearch')?.value.toLowerCase() || '';
    document.querySelectorAll('#stockListContainer .stock-item').forEach(item => {
      const text = item.textContent.toLowerCase();
      item.style.display = text.includes(searchTerm) ? '' : 'none';
    });
  }

  // ======================
  // ACTION HANDLERS
  // ======================

  function attachActionListeners() {
// Add inside attachActionListeners()
document.getElementById('unlockBtn')?.addEventListener('click', unlockApp);
document.getElementById('pinInput')?.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') unlockApp();
});

document.getElementById('hardRefreshBtn')?.addEventListener('click', hardRefresh);
    // Add Product
document.getElementById('saveProductBtn')?.addEventListener('click', () => {

  const name = document.getElementById('newProductName')?.value.trim();
  if (!name) return alert('Product name required.');
  if (DB.products.has(name)) return alert('Product already exists!');

 

  // Get category: from input if visible, otherwise from select
  const input = document.getElementById('newCategoryInput');
  let category = '';
  if (input.style.display === 'block') {
    category = input.value.trim();
  } else {
    const selectValue = document.getElementById('newProductCategory')?.value.trim() || '';
    // If user didn't select anything, treat as empty category
    if (selectValue !== 'ADD_NEW' && selectValue !== '') {
      category = selectValue;
    }
    // If they selected "Add New" but didn't type anything, use empty string
    if (selectValue === 'ADD_NEW') {
      category = input.value.trim(); // Fallback to input value
    }
  }

  const threshold = document.getElementById('newProductThreshold')?.value.trim() || '5';

  DB.addProduct(name, category, threshold);
  alert('✅ Product registered!');
  
  // Reset form
  document.getElementById('newProductName').value = '';
  document.getElementById('newProductCategory').value = '';
  document.getElementById('newCategoryInput').value = '';
  document.getElementById('newCategoryInput').style.display = 'none';
  document.getElementById('newProductCategory').style.display = 'block';
  document.getElementById('newProductThreshold').value = '5';

  // Refresh UI
  populateCategoryDropdowns();
  updateDashboard();
  renderStockTable();
  updateExistingCategoriesHint();
  setupAddProductCategoryInput(); // Re-init dropdown
});

    document.getElementById('flip-add-product')?.addEventListener('click', () => switchView('add-product'));
    document.querySelector('.logo')?.addEventListener('click', () => switchView('dashboard'));
    document.getElementById('saveEditProductBtn')?.addEventListener('click', saveEditedProduct);

    // Add Stock
    document.getElementById('saveAddStockBtn')?.addEventListener('click', () => {
      const product = document.getElementById('addStockProduct')?.value;
      const qty = parseInt(document.getElementById('addStockQty')?.value);
      if (!product || !DB.products.has(product)) return alert('Select a valid product.');
      if (!qty || qty <= 0) return alert('Valid quantity required.');
      DB.addTransaction(product, qty, 'ADD');
      alert('✅ Stock added!');
      document.getElementById('addStockQty').value = '';
      updateDashboard();
      renderStockTable();
      refreshStockPreviews(); // 👈 ADD THIS
    });

    // Sell
    document.getElementById('saveSellBtn')?.addEventListener('click', () => {
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
      refreshStockPreviews(); // 👈 ADD THIS
    });

    // Return
    document.getElementById('saveReturnBtn')?.addEventListener('click', () => {
      const product = document.getElementById('returnProduct')?.value;
      const qty = parseInt(document.getElementById('returnQty')?.value);
      if (!product || !DB.products.has(product)) return alert('Select a valid product.');
      const totalSales = DB.getTotalSalesForProduct(product);
      if (qty > totalSales) return alert(`⚠️ Cannot return ${qty} units. Only ${totalSales} sold.`);
      if (!qty || qty <= 0) return alert('Valid quantity required.');
      DB.addTransaction(product, qty, 'RETURN');
      alert('✅ Return recorded!');
      document.getElementById('returnQty').value = '';
      updateDashboard();
      renderStockTable();
    });

    // Damage
    document.getElementById('saveDamageBtn')?.addEventListener('click', () => {
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
      refreshStockPreviews(); // 👈 ADD THIS
    });

    // WhatsApp
    document.getElementById('whatsappStockBtn')?.addEventListener('click', () => {
      window.open('https://wa.me/919825531314', '_blank');
    });
    document.getElementById('whatsappLedgerBtn')?.addEventListener('click', whatsappLedgerReport);
    document.getElementById('whatsappStockReportBtn')?.addEventListener('click', whatsappStockReport);

    // Backup
    document.getElementById('backupNowBtn')?.addEventListener('click', exportBackup);
    document.getElementById('exportLedgerBtn')?.addEventListener('click', exportBackup);

    // Import
    document.getElementById('importLedgerBtn')?.addEventListener('click', () => {
      document.getElementById('importModal').style.display = 'flex';
    });
    document.getElementById('importFile')?.addEventListener('change', e => {
      const file = e.target.files[0];
      if (file && file.type === 'application/json') {
        document.getElementById('confirmImportBtn').onclick = () => importDataFromFile(file);
      }
    });

    // Close import modal on outside click
    document.getElementById('importModal')?.addEventListener('click', (e) => {
      if (e.target === document.getElementById('importModal')) {
        document.getElementById('importModal').style.display = 'none';
      }
    });

    // Filters
    document.getElementById('filterLedgerBtn')?.addEventListener('click', () => {
      renderLedger(document.getElementById('dateFilter').value || null);
    });
    document.getElementById('stockSearch')?.addEventListener('input', applyStockFilters);
  }

  // ======================
  // MODAL & UTILS
  // ======================

  document.getElementById('confirmDeleteBtn')?.addEventListener('click', () => {
  const productName = window.currentDeleteProduct; // 👈 Use global
  if (productName && DB.products.has(productName)) {
    DB.products.delete(productName);
    DB.productCategories.delete(productName);
    DB.productLowStockThresholds.delete(productName);
    DB.save();
    alert(`✅ Deleted "${productName}".`);
    renderStockTable();
    updateDashboard();
  }
  document.getElementById('deleteModal').style.display = 'none';
  window.currentDeleteProduct = null; // 👈 Clean up
});

  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      switchView(item.dataset.view);
    });
  });

  // Fix: Stock card opens Stock view
  document.getElementById('go-to-stock')?.addEventListener('click', () => switchView('stock'));
  document.getElementById('go-to-sales')?.addEventListener('click', () => switchView('sell'));

  // Category change listeners
  ['sell', 'return', 'damage', 'addStock'].forEach(view => {
    const catSelect = document.getElementById(`${view}Category`);
    if (catSelect) {
      catSelect.addEventListener('change', (e) => {
        populateProductDropdownByCategory(view, e.target.value);
      });
    }
  });

  // ======================
  // REPORTS
  // ======================

  function exportBackup() {
    const data = localStorage.getItem('feel365_data');
    if (!data) return;
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FEEL365_Stock_Backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    localStorage.setItem('feel365_last_backup', Date.now());
    checkBackupReminder();
  }

  function importDataFromFile(file) {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.products && data.transactions) {
          localStorage.setItem('feel365_data', JSON.stringify(data));
          localStorage.setItem('feel365_last_backup', Date.now());
          DB.init();
          alert('✅ Restored!');
          renderStockTable();
          updateDashboard();
          document.getElementById('importModal').style.display = 'none';
        } else throw new Error('Invalid');
      } catch (err) {
        alert('❌ Invalid backup file.');
      }
    };
    reader.readAsText(file);
  }

  function whatsappLedgerReport() {
  const today = new Date().toISOString().slice(0, 10);
  const todayLabel = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  let msg = `FEEL365 DAILY LEDGER\n`;
  msg += `Date: ${todayLabel}\n\n`;

  const transactions = DB.getTransactions(today);
  if (transactions.length === 0) {
    msg += '📭 No transactions recorded today.';
  } else {
    let totalIn = 0, totalOut = 0;

    transactions.forEach(t => {
      const sign = t.qty > 0 ? '+' : '–';
      const absQty = Math.abs(t.qty);
      let icon = '📦';
      if (t.type === 'SALE') {
        icon = '🛒';
        totalOut += absQty;
      } else if (t.type === 'ADD') {
        icon = '📥';
        totalIn += absQty;
      } else if (t.type === 'RETURN') {
        icon = '↩️';
        totalIn += absQty;
      } else if (t.type === 'DAMAGE') {
        icon = '⚠️';
        totalOut += absQty;
      }

      msg += `${icon} ${t.product}\n  ${sign}${absQty} | ${t.type}\n`;
    });

    msg += `\n📊 Summary\n📥 In: ${totalIn} units\n📤 Out: ${totalOut} units`;
  }

  msg += `\n🧾 Generated by FEEL365`;

  const url = `https://wa.me/919016211040?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
}

function whatsappStockReport() {
  const today = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  // Use plain text (no markdown asterisks) to avoid rendering issues
  let msg = `FEEL365 STOCK REPORT\n`;
  msg += `Date: ${today}\n\n`;

  const products = Array.from(DB.products.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  if (products.length === 0) {
    msg += '📭 No products in inventory.';
  } else {
    products.forEach(([name, qty]) => {
      const category = DB.getCategory(name) || 'Uncategorized';
      const threshold = DB.getThreshold(name);
      const status = qty <= 0 ? '❌ OUT' : (qty <= threshold ? '⚠️ LOW' : '✅ OK');
      msg += `• ${name}\n  🏷️ ${category} | 📊 ${qty} units [${status}]\n`;
    });
  }

  msg += `\n💡 Tip: Restock items marked ⚠️ or ❌\n🧾 Generated by FEEL365`;

  // ✅ Emoji-safe encoding
  const url = `https://wa.me/919016211040?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
}

  function checkBackupReminder() {
    const last = localStorage.getItem('feel365_last_backup');
    const now = Date.now();
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
    const alertEl = document.getElementById('backupAlert');
    if (alertEl) {
      alertEl.style.display = (!last || (now - parseInt(last)) > SEVEN_DAYS) ? 'flex' : 'none';
    }
  }

  // ======================
  // CHART
  // ======================



  // Add this at the very end of ui.js (after attachActionListeners())
document.addEventListener('mousemove', resetIdleTimer);
document.addEventListener('keydown', resetIdleTimer);
document.addEventListener('touchstart', resetIdleTimer);

  // ======================
  // INIT
  // ======================

  switchView('dashboard');
  checkBackupReminder();
  resetIdleTimer();
  setupKeyboardShortcuts();
  attachActionListeners();
});
