/**
 * BizPilot AI — Smart Alerts & Automated Restock Engine
 * Identifies low-stock conditions, calculates reorder volumes, and drafts purchase orders.
 */

window.BizPilotAlerts = {
  currentFilter: "all",

  render() {
    window.app.evaluateAlerts();
    this.renderAlertCards();
    this.updateStats();
  },

  updateStats() {
    const alerts = window.app.alerts;
    const criticalCount = alerts.filter(a => a.severity === "critical").length;
    const warningCount = alerts.filter(a => a.severity === "warning").length;

    const critEl = document.getElementById("alerts-crit-count");
    const warnEl = document.getElementById("alerts-warn-count");
    if (critEl) critEl.textContent = `${criticalCount} Urgent`;
    if (warnEl) warnEl.textContent = `${warningCount} Low Stock`;
  },

  setAlertFilter(filter) {
    this.currentFilter = filter;
    document.querySelectorAll(".alert-tab-btn").forEach(btn => {
      if (btn.getAttribute("data-filter") === filter) {
        btn.classList.add("btn-primary");
        btn.classList.remove("btn-secondary");
      } else {
        btn.classList.remove("btn-primary");
        btn.classList.add("btn-secondary");
      }
    });
    this.renderAlertCards();
  },

  renderAlertCards() {
    const container = document.getElementById("alerts-cards-container");
    if (!container) return;

    let filtered = window.app.alerts;
    if (this.currentFilter === "critical") {
      filtered = filtered.filter(a => a.severity === "critical");
    } else if (this.currentFilter === "warning") {
      filtered = filtered.filter(a => a.severity === "warning");
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="card" style="text-align:center; padding:64px 20px;">
          <div style="font-size:3rem; margin-bottom:12px;">🛡️</div>
          <h3 style="font-size:1.3rem; font-weight:700;">All Products Well Stocked</h3>
          <p style="color:var(--text-muted); max-width:400px; margin:8px auto 0;">
            No items are below minimum safety stock levels. BizPilot AI rule engine continuously checks inventory levels.
          </p>
        </div>
      `;
      return;
    }

    let html = "";
    filtered.forEach(a => {
      const isCritical = a.severity === "critical";
      const borderClr = isCritical ? "rgba(244, 63, 94, 0.4)" : "rgba(245, 158, 11, 0.4)";
      const bgClr = isCritical ? "rgba(244, 63, 94, 0.08)" : "rgba(245, 158, 11, 0.08)";
      const badgeClass = isCritical ? "badge-danger" : "badge-warning";

      const product = window.app.products.find(p => p.id === a.productId);
      const estCost = product ? (a.recommendedReorder * product.cost_price).toFixed(2) : "0.00";
      const supplier = product ? product.supplier_name : "Vendor";

      html += `
        <div class="card" style="border-color:${borderClr}; background:${bgClr}; margin-bottom:16px;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:16px;">
            <div style="flex:1; min-width:280px;">
              <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
                <span class="badge ${badgeClass}">${a.severity.toUpperCase()}</span>
                <span class="sku-badge">${a.sku}</span>
                <span style="font-size:0.8rem; color:var(--text-muted);">Supplier: <strong>${supplier}</strong></span>
              </div>
              <h4 style="font-size:1.15rem; font-weight:700; color:#fff; margin-bottom:6px;">${a.productName}</h4>
              <p style="font-size:0.9rem; color:var(--text-muted); line-height:1.5;">${a.message}</p>
            </div>

            <div style="display:flex; align-items:center; gap:20px; background:rgba(15,21,35,0.7); padding:12px 18px; border-radius:var(--radius-md); border:1px solid var(--border-subtle);">
              <div>
                <div style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase;">Recommended Order</div>
                <div style="font-size:1.25rem; font-weight:800; font-family:var(--font-mono); color:var(--accent-emerald);">
                  ${a.recommendedReorder} units
                </div>
                <div style="font-size:0.75rem; color:var(--text-dim);">Est: ~$${estCost}</div>
              </div>
              <button class="btn btn-primary" onclick="window.BizPilotAlerts.createQuickPO('${a.sku}')">
                Draft PO
              </button>
            </div>
          </div>
        </div>
      `;
    });
    container.innerHTML = html;
  },

  createQuickPO(sku) {
    const product = window.app.products.find(p => p.sku === sku);
    if (!product) return;

    const alert = window.app.alerts.find(a => a.sku === sku);
    const qty = alert ? alert.recommendedReorder : Math.max(product.min_stock_alert * 2, 20);
    const totalCost = (qty * product.cost_price).toFixed(2);

    const modal = document.getElementById("po-modal");
    const content = document.getElementById("po-modal-content");
    if (!modal || !content) return;

    content.innerHTML = `
      <div style="background:rgba(15,21,35,0.6); padding:16px; border-radius:var(--radius-md); border:1px solid var(--border-subtle); margin-bottom:20px;">
        <div style="display:flex; justify-content:space-between; margin-bottom:12px;">
          <div>
            <div style="font-size:0.8rem; color:var(--text-muted);">PURCHASE ORDER</div>
            <div style="font-weight:700; font-family:var(--font-mono);">PO-2026-${Math.floor(1000 + Math.random()*9000)}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:0.8rem; color:var(--text-muted);">VENDOR</div>
            <div style="font-weight:600;">${product.supplier_name || 'Direct Wholesale'}</div>
          </div>
        </div>

        <div style="border-top:1px solid rgba(255,255,255,0.06); padding-top:12px;">
          <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
            <span><strong>${product.name}</strong> (${product.sku})</span>
            <span style="font-family:var(--font-mono);">${qty} × $${product.cost_price.toFixed(2)}</span>
          </div>
          <div style="display:flex; justify-content:space-between; margin-top:10px; font-weight:700; font-size:1.05rem; color:var(--accent-emerald);">
            <span>Order Subtotal:</span>
            <span style="font-family:var(--font-mono);">$${totalCost}</span>
          </div>
        </div>
      </div>

      <div style="display:flex; justify-content:flex-end; gap:12px;">
        <button class="btn btn-secondary" onclick="window.BizPilotAlerts.closePOModal()">Cancel</button>
        <button class="btn btn-emerald" onclick="window.BizPilotAlerts.confirmQuickPO(${product.id}, ${qty})">
          Confirm Order & Restock
        </button>
      </div>
    `;
    modal.classList.add("active");
  },

  confirmQuickPO(productId, qty) {
    const product = window.app.products.find(p => p.id === productId);
    if (!product) return;

    product.current_stock += qty;
    window.app.saveState();
    window.app.evaluateAlerts();

    this.closePOModal();
    this.render();
    window.app.updateBadges();
    window.app.showToast(`Purchase order executed: +${qty} units of "${product.name}" added!`, "success");
  },

  closePOModal() {
    const modal = document.getElementById("po-modal");
    if (modal) modal.classList.remove("active");
  }
};
