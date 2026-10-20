/**
 * BizPilot AI — Dashboard Module
 * Visual KPI metrics, inventory health gauges, spend analytics, and urgent restock radar.
 */

window.BizPilotDashboard = {
  render() {
    const products = window.app.products;
    const invoices = window.app.invoices;
    const alerts = window.app.alerts;

    // Financial Metrics
    const totalInventoryValue = products.reduce((acc, p) => acc + (p.current_stock * p.cost_price), 0);
    const potentialRetailValue = products.reduce((acc, p) => acc + (p.current_stock * p.selling_price), 0);
    const grossMarginPct = potentialRetailValue > 0 ? (((potentialRetailValue - totalInventoryValue) / potentialRetailValue) * 100).toFixed(1) : 0;

    // Inventory Health
    const healthyCount = products.filter(p => p.current_stock > p.min_stock_alert).length;
    const lowCount = products.filter(p => p.current_stock > 0 && p.current_stock <= p.min_stock_alert).length;
    const outOfStockCount = products.filter(p => p.current_stock === 0).length;
    const healthScore = products.length > 0 ? Math.round((healthyCount / products.length) * 100) : 100;

    // Invoices Spend
    const approvedSpend = invoices.filter(i => i.status === "approved").reduce((acc, i) => acc + i.total_amount, 0);
    const pendingInvoices = invoices.filter(i => i.status === "pending_review");

    // Populate KPI Elements
    document.getElementById("kpi-stock-value").textContent = `$${totalInventoryValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    document.getElementById("kpi-retail-margin").textContent = `+${grossMarginPct}% projected margin`;

    document.getElementById("kpi-health-score").textContent = `${healthScore}%`;
    document.getElementById("kpi-health-breakdown").textContent = `${healthyCount} Healthy · ${lowCount} Low · ${outOfStockCount} Out`;

    document.getElementById("kpi-invoices-spend").textContent = `$${approvedSpend.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    document.getElementById("kpi-pending-invoices").textContent = `${pendingInvoices.length} pending approval`;

    document.getElementById("kpi-active-alerts").textContent = alerts.length;
    const criticalAlerts = alerts.filter(a => a.severity === "critical").length;
    document.getElementById("kpi-critical-alerts").textContent = `${criticalAlerts} critical stockouts`;

    // Render Visual Chart
    this.renderCategoryChart(products);

    // Render Urgent Restock Radar
    this.renderRestockRadar(alerts);

    // Render Recent Invoices Feed
    this.renderRecentInvoices(invoices);
  },

  renderCategoryChart(products) {
    const container = document.getElementById("dashboard-chart-container");
    if (!container) return;

    const categories = {};
    products.forEach(p => {
      categories[p.category] = (categories[p.category] || 0) + p.current_stock;
    });

    const maxVal = Math.max(...Object.values(categories), 20);

    let html = `<div style="display:flex; flex-direction:column; gap:16px;">`;
    for (const [cat, qty] of Object.entries(categories)) {
      const pct = Math.min(Math.round((qty / maxVal) * 100), 100);
      html += `
        <div>
          <div style="display:flex; justify-content:space-between; font-size:0.85rem; margin-bottom:6px;">
            <span style="font-weight:600; color:var(--text-main);">${cat}</span>
            <span style="font-family:var(--font-mono); color:var(--text-muted);">${qty} units in stock</span>
          </div>
          <div class="stock-bar-bg" style="height:10px;">
            <div class="stock-bar-fill fill-green" style="width: ${pct}%;"></div>
          </div>
        </div>
      `;
    }
    html += `</div>`;
    container.innerHTML = html;
  },

  renderRestockRadar(alerts) {
    const container = document.getElementById("restock-radar-list");
    if (!container) return;

    if (alerts.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding:32px 16px; color:var(--text-muted);">
          <div style="font-size:1.8rem; margin-bottom:8px;">✅</div>
          <div style="font-weight:600; color:var(--text-main);">Inventory In Optimal Condition</div>
          <div style="font-size:0.84rem; margin-top:4px;">No products require immediate replenishment.</div>
        </div>
      `;
      return;
    }

    let html = "";
    alerts.slice(0, 4).forEach(a => {
      const badgeClass = a.severity === "critical" ? "badge-danger" : "badge-warning";
      html += `
        <div style="display:flex; align-items:center; justify-content:space-between; padding:12px 14px; background:var(--bg-surface); border:1px solid var(--border-subtle); border-radius:var(--radius-md); margin-bottom:10px;">
          <div>
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="badge ${badgeClass}">${a.severity}</span>
              <span style="font-weight:600; font-size:0.9rem;">${a.productName}</span>
              <span class="sku-badge">${a.sku}</span>
            </div>
            <div style="font-size:0.8rem; color:var(--text-muted); margin-top:4px;">
              Suggested order: <strong style="color:var(--accent-emerald);">${a.recommendedReorder} units</strong>
            </div>
          </div>
          <button class="btn btn-secondary" style="padding:6px 12px; font-size:0.78rem;" onclick="window.BizPilotAlerts.createQuickPO('${a.sku}')">
            Reorder
          </button>
        </div>
      `;
    });
    container.innerHTML = html;
  },

  renderRecentInvoices(invoices) {
    const container = document.getElementById("recent-invoices-feed");
    if (!container) return;

    if (invoices.length === 0) {
      container.innerHTML = `<div style="color:var(--text-muted); padding:20px; text-align:center;">No invoices uploaded yet.</div>`;
      return;
    }

    let html = "";
    invoices.slice(0, 4).forEach(inv => {
      const isApproved = inv.status === "approved";
      const statusBadge = isApproved 
        ? `<span class="badge badge-success">Approved</span>` 
        : `<span class="badge badge-warning">Needs Review</span>`;

      html += `
        <div style="display:flex; align-items:center; justify-content:space-between; padding:14px; border-bottom:1px solid rgba(255,255,255,0.05);">
          <div>
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-weight:600; font-size:0.92rem;">${inv.vendor_name}</span>
              <span class="sku-badge">${inv.invoice_number}</span>
            </div>
            <div style="font-size:0.8rem; color:var(--text-muted); margin-top:4px;">
              ${inv.invoice_date} · ${inv.items.length} line items
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-weight:700; font-family:var(--font-mono); font-size:0.96rem;">$${inv.total_amount.toFixed(2)}</div>
            <div style="margin-top:4px;">${statusBadge}</div>
          </div>
        </div>
      `;
    });
    container.innerHTML = html;
  }
};
