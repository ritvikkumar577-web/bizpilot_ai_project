/**
 * BizPilot AI — Inventory Management Module
 * Product catalog, stock thresholds, inline quick adjustments, and categorization.
 */

window.BizPilotInventory = {
  currentCategoryFilter: "All",
  currentStockFilter: "All",
  searchQuery: "",

  render() {
    this.populateCategoryFilter();
    this.renderProductsTable();
    this.updateInventorySummary();
  },

  populateCategoryFilter() {
    const select = document.getElementById("inventory-category-select");
    if (!select) return;

    const categories = ["All", ...new Set(window.app.products.map(p => p.category))];
    select.innerHTML = categories.map(c => `<option value="${c}">${c}</option>`).join("");
    select.value = this.currentCategoryFilter;

    select.onchange = (e) => {
      this.currentCategoryFilter = e.target.value;
      this.renderProductsTable();
    };
  },

  filterQuery(query) {
    this.searchQuery = query;
    this.renderProductsTable();
  },

  setStockFilter(filter) {
    this.currentStockFilter = filter;
    document.querySelectorAll(".stock-filter-pill").forEach(btn => {
      if (btn.getAttribute("data-filter") === filter) {
        btn.classList.add("active");
        btn.style.borderColor = "var(--accent-indigo)";
      } else {
        btn.classList.remove("active");
        btn.style.borderColor = "var(--border-subtle)";
      }
    });
    this.renderProductsTable();
  },

  renderProductsTable() {
    const tbody = document.getElementById("inventory-table-body");
    if (!tbody) return;

    let filtered = window.app.products;

    // Filter by category
    if (this.currentCategoryFilter !== "All") {
      filtered = filtered.filter(p => p.category === this.currentCategoryFilter);
    }

    // Filter by stock status
    if (this.currentStockFilter === "low") {
      filtered = filtered.filter(p => p.current_stock <= p.min_stock_alert);
    } else if (this.currentStockFilter === "out") {
      filtered = filtered.filter(p => p.current_stock === 0);
    } else if (this.currentStockFilter === "healthy") {
      filtered = filtered.filter(p => p.current_stock > p.min_stock_alert);
    }

    // Search query
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(q) || 
        p.sku.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    }

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:36px; color:var(--text-muted);">No products match your filters.</td></tr>`;
      return;
    }

    let html = "";
    filtered.forEach(p => {
      const isZero = p.current_stock === 0;
      const isLow = p.current_stock <= p.min_stock_alert;
      
      let fillClass = "fill-green";
      let statusBadge = `<span class="badge badge-success">Healthy</span>`;

      if (isZero) {
        fillClass = "fill-red";
        statusBadge = `<span class="badge badge-danger">Out of Stock</span>`;
      } else if (isLow) {
        fillClass = "fill-amber";
        statusBadge = `<span class="badge badge-warning">Low Stock</span>`;
      }

      // Max capacity display ratio
      const maxVisualCap = Math.max(p.min_stock_alert * 2.5, 40);
      const fillPct = Math.min(Math.round((p.current_stock / maxVisualCap) * 100), 100);

      const marginPct = p.selling_price > 0 ? (((p.selling_price - p.cost_price) / p.selling_price) * 100).toFixed(0) : 0;

      html += `
        <tr>
          <td>
            <div style="font-weight:600; color:#fff;">${p.name}</div>
            <div style="font-size:0.78rem; color:var(--text-muted); margin-top:2px;">Supplier: ${p.supplier_name || 'N/A'}</div>
          </td>
          <td><span class="sku-badge">${p.sku}</span></td>
          <td><span class="badge badge-info">${p.category}</span></td>
          <td>
            <div class="stock-bar-wrapper">
              <div style="display:flex; justify-content:space-between; font-size:0.8rem;">
                <span style="font-weight:700; font-family:var(--font-mono);">${p.current_stock}</span>
                <span style="color:var(--text-dim);">Min: ${p.min_stock_alert}</span>
              </div>
              <div class="stock-bar-bg">
                <div class="stock-bar-fill ${fillClass}" style="width: ${fillPct}%;"></div>
              </div>
            </div>
          </td>
          <td>
            <div class="qty-adjuster">
              <button class="btn-qty" onclick="window.BizPilotInventory.quickAdjustStock(${p.id}, -1)">-</button>
              <span class="qty-val">${p.current_stock}</span>
              <button class="btn-qty" onclick="window.BizPilotInventory.quickAdjustStock(${p.id}, 1)">+</button>
            </div>
          </td>
          <td>
            <div style="font-family:var(--font-mono); font-size:0.88rem;">$${p.selling_price.toFixed(2)}</div>
            <div style="font-size:0.75rem; color:var(--text-dim);">Cost: $${p.cost_price.toFixed(2)} (${marginPct}% mgn)</div>
          </td>
          <td>
            <div style="display:flex; align-items:center; gap:8px;">
              ${statusBadge}
              <button class="btn btn-secondary" style="padding:4px 8px; font-size:0.75rem;" onclick="window.BizPilotInventory.deleteProduct(${p.id})">
                ✕
              </button>
            </div>
          </td>
        </tr>
      `;
    });
    tbody.innerHTML = html;
  },

  quickAdjustStock(productId, delta) {
    const prod = window.app.products.find(p => p.id === productId);
    if (!prod) return;

    if (prod.current_stock + delta < 0) {
      window.app.showToast("Stock cannot drop below 0", "danger");
      return;
    }

    prod.current_stock += delta;
    window.app.saveState();
    window.app.evaluateAlerts();

    this.renderProductsTable();
    this.updateInventorySummary();
    window.app.updateBadges();
  },

  deleteProduct(productId) {
    const idx = window.app.products.findIndex(p => p.id === productId);
    if (idx === -1) return;

    const name = window.app.products[idx].name;
    window.app.products.splice(idx, 1);
    window.app.saveState();
    window.app.evaluateAlerts();

    this.renderProductsTable();
    this.updateInventorySummary();
    window.app.updateBadges();
    window.app.showToast(`Product "${name}" deleted.`, "info");
  },

  updateInventorySummary() {
    const products = window.app.products;
    const totalUnits = products.reduce((acc, p) => acc + p.current_stock, 0);
    const totalValuation = products.reduce((acc, p) => acc + (p.current_stock * p.cost_price), 0);

    const valEl = document.getElementById("inv-summary-val");
    const countEl = document.getElementById("inv-summary-count");
    if (valEl) valEl.textContent = `$${totalValuation.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (countEl) countEl.textContent = `${totalUnits} units in stock`;
  },

  openAddModal() {
    const modal = document.getElementById("add-product-modal");
    if (modal) modal.classList.add("active");
  },

  closeAddModal() {
    const modal = document.getElementById("add-product-modal");
    if (modal) modal.classList.remove("active");
  },

  handleSaveNewProduct(e) {
    e.preventDefault();
    const name = document.getElementById("new-prod-name").value.trim();
    const sku = document.getElementById("new-prod-sku").value.trim();
    const category = document.getElementById("new-prod-cat").value.trim() || "General";
    const stock = parseInt(document.getElementById("new-prod-stock").value) || 0;
    const minAlert = parseInt(document.getElementById("new-prod-min").value) || 10;
    const cost = parseFloat(document.getElementById("new-prod-cost").value) || 0;
    const sell = parseFloat(document.getElementById("new-prod-sell").value) || 0;
    const supplier = document.getElementById("new-prod-supplier").value.trim() || "Local Supplier";

    if (!name || !sku) {
      window.app.showToast("Product name and SKU are required", "danger");
      return;
    }

    // Check duplicate SKU
    if (window.app.products.some(p => p.sku.toLowerCase() === sku.toLowerCase())) {
      window.app.showToast(`Product with SKU '${sku}' already exists!`, "danger");
      return;
    }

    const newProd = {
      id: Date.now(),
      sku,
      name,
      category,
      current_stock: stock,
      min_stock_alert: minAlert,
      cost_price: cost,
      selling_price: sell,
      supplier_name: supplier
    };

    window.app.products.unshift(newProd);
    window.app.saveState();
    window.app.evaluateAlerts();

    this.closeAddModal();
    document.getElementById("add-product-form").reset();
    this.render();
    window.app.updateBadges();
    window.app.showToast(`Product "${name}" cataloged successfully!`, "success");
  }
};
