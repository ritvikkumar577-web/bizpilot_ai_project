/**
 * BizPilot AI — Core Application & State Orchestrator
 * Seamlessly manages state, navigation, alerts evaluation, and dual online/offline sync.
 */

class BizPilotApp {
  constructor() {
    this.apiBaseUrl = "http://localhost:8000";
    this.isBackendConnected = false;

    // Load from local storage or defaults
    this.products = this.loadState("bizpilot_products", window.BizPilotData.INITIAL_PRODUCTS);
    this.invoices = this.loadState("bizpilot_invoices", window.BizPilotData.INITIAL_INVOICES);
    this.alerts = [];
    this.currentTab = "dashboard";

    this.init();
  }

  loadState(key, fallback) {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  saveState() {
    localStorage.setItem("bizpilot_products", JSON.stringify(this.products));
    localStorage.setItem("bizpilot_invoices", JSON.stringify(this.invoices));
  }

  async init() {
    // 1. Evaluate stock alerts immediately
    this.evaluateAlerts();

    // 2. Setup navigation listeners
    this.setupNavigation();

    // 3. Test backend connection
    await this.checkBackendStatus();

    // 4. Render initial tab
    this.renderCurrentTab();

    // 5. Global search listener
    this.setupSearch();
  }

  async checkBackendStatus() {
    const pill = document.getElementById("backend-status-pill");
    const label = document.getElementById("backend-status-text");
    try {
      const res = await fetch(`${this.apiBaseUrl}/`, { method: "GET", headers: { "Accept": "application/json" } });
      if (res.ok) {
        this.isBackendConnected = true;
        if (pill) pill.style.background = "#10b981";
        if (label) label.textContent = "FastAPI Backend Synced";
      } else {
        throw new Error();
      }
    } catch (e) {
      this.isBackendConnected = false;
      if (pill) pill.style.background = "#6366f1";
      if (label) label.textContent = "Autonomous AI Engine";
    }
  }

  setupNavigation() {
    const navItems = document.querySelectorAll(".nav-item");
    navItems.forEach(item => {
      item.addEventListener("click", (e) => {
        e.preventDefault();
        const tab = item.getAttribute("data-tab");
        if (tab) {
          this.switchTab(tab);
        }
      });
    });
  }

  switchTab(tabId) {
    this.currentTab = tabId;

    // Update sidebar active states
    document.querySelectorAll(".nav-item").forEach(item => {
      if (item.getAttribute("data-tab") === tabId) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });

    // Update tab panes
    document.querySelectorAll(".tab-pane").forEach(pane => {
      if (pane.id === `tab-${tabId}`) {
        pane.classList.add("active");
      } else {
        pane.classList.remove("active");
      }
    });

    this.renderCurrentTab();
  }

  renderCurrentTab() {
    this.evaluateAlerts();
    this.updateBadges();

    if (this.currentTab === "dashboard" && window.BizPilotDashboard) {
      window.BizPilotDashboard.render();
    } else if (this.currentTab === "invoices" && window.BizPilotInvoices) {
      window.BizPilotInvoices.render();
    } else if (this.currentTab === "inventory" && window.BizPilotInventory) {
      window.BizPilotInventory.render();
    } else if (this.currentTab === "alerts" && window.BizPilotAlerts) {
      window.BizPilotAlerts.render();
    } else if (this.currentTab === "ai" && window.BizPilotAI) {
      window.BizPilotAI.render();
    }
  }

  evaluateAlerts() {
    this.alerts = [];
    this.products.forEach(p => {
      if (p.current_stock === 0) {
        this.alerts.push({
          id: `alert-${p.id}`,
          productId: p.id,
          productName: p.name,
          sku: p.sku,
          severity: "critical",
          message: `OUT OF STOCK: '${p.name}' has 0 units remaining! Restock urgent.`,
          recommendedReorder: Math.max(p.min_stock_alert * 2, 20)
        });
      } else if (p.current_stock <= (p.min_stock_alert * 0.35)) {
        this.alerts.push({
          id: `alert-${p.id}`,
          productId: p.id,
          productName: p.name,
          sku: p.sku,
          severity: "critical",
          message: `CRITICAL DEPLETION: '${p.name}' down to ${p.current_stock} units (Threshold: ${p.min_stock_alert}).`,
          recommendedReorder: Math.max(p.min_stock_alert * 2 - p.current_stock, 10)
        });
      } else if (p.current_stock <= p.min_stock_alert) {
        this.alerts.push({
          id: `alert-${p.id}`,
          productId: p.id,
          productName: p.name,
          sku: p.sku,
          severity: "warning",
          message: `LOW STOCK WARNING: '${p.name}' is at ${p.current_stock} units (Threshold: ${p.min_stock_alert}).`,
          recommendedReorder: Math.max(p.min_stock_alert * 1.5 - p.current_stock, 10)
        });
      }
    });
  }

  updateBadges() {
    const alertBadge = document.getElementById("alerts-badge");
    if (alertBadge) {
      alertBadge.textContent = this.alerts.length;
      if (this.alerts.length === 0) {
        alertBadge.classList.add("safe");
      } else {
        alertBadge.classList.remove("safe");
      }
    }

    const pendingInvoices = this.invoices.filter(i => i.status === "pending_review").length;
    const invBadge = document.getElementById("invoices-badge");
    if (invBadge) {
      invBadge.textContent = pendingInvoices;
      invBadge.style.display = pendingInvoices > 0 ? "inline-block" : "none";
    }
  }

  setupSearch() {
    const searchInput = document.getElementById("global-search-input");
    if (!searchInput) return;

    searchInput.addEventListener("input", (e) => {
      const q = e.target.value.toLowerCase().trim();
      if (!q) return;

      // If user types, direct to inventory or show instant results
      if (this.currentTab !== "inventory") {
        this.switchTab("inventory");
      }
      if (window.BizPilotInventory) {
        window.BizPilotInventory.filterQuery(q);
      }
    });
  }

  showToast(message, type = "success") {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    const icon = type === "success" ? "✓" : (type === "danger" ? "✕" : "ℹ");
    toast.innerHTML = `<strong>${icon}</strong> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(100%)";
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }
}

window.app = new BizPilotApp();
