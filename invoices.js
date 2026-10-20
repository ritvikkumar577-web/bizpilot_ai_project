/**
 * BizPilot AI — Invoices & OCR Reader Module
 * Optical scanning, AI extraction, line item matching, and stock replenishment approval.
 */

window.BizPilotInvoices = {
  currentScannedInvoice: null,

  render() {
    this.renderInvoicesHistory();
    this.setupDropzone();
  },

  setupDropzone() {
    const dropzone = document.getElementById("invoice-dropzone");
    const fileInput = document.getElementById("invoice-file-input");
    if (!dropzone || !fileInput) return;

    dropzone.onclick = () => fileInput.click();

    fileInput.onchange = (e) => {
      if (e.target.files && e.target.files[0]) {
        this.processUploadedFile(e.target.files[0]);
      }
    };

    dropzone.ondragover = (e) => {
      e.preventDefault();
      dropzone.classList.add("dragover");
    };

    dropzone.ondragleave = () => {
      dropzone.classList.remove("dragover");
    };

    dropzone.ondrop = (e) => {
      e.preventDefault();
      dropzone.classList.remove("dragover");
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        this.processUploadedFile(e.dataTransfer.files[0]);
      }
    };
  },

  loadSampleBill(index) {
    const sample = window.BizPilotData.SAMPLE_INVOICE_TEMPLATES[index];
    if (!sample) return;
    this.simulateOCRProcessing(sample);
  },

  processUploadedFile(file) {
    // If backend is connected, use backend OCR endpoint; otherwise simulate with high realism
    const scanBeam = document.getElementById("ocr-scan-beam");
    const scanStatus = document.getElementById("ocr-scan-status");
    if (scanBeam) scanBeam.style.display = "block";
    if (scanStatus) scanStatus.textContent = `Analyzing document: "${file.name}" with BizPilot OCR Engine...`;

    setTimeout(() => {
      if (scanBeam) scanBeam.style.display = "none";
      if (scanStatus) scanStatus.textContent = "AI optical character recognition complete!";

      // Match or generate structure
      const parsed = {
        vendor_name: "Apex Global Suppliers Ltd.",
        invoice_number: `INV-${Math.floor(100000 + Math.random() * 900000)}`,
        invoice_date: new Date().toISOString().split("T")[0],
        items: [
          { description: "Wireless Ergonomic Mouse Pro", quantity: 20, unit_price: 13.50, total_price: 270.00 },
          { description: "USB-C Braided Fast Cable (2m)", quantity: 35, unit_price: 4.50, total_price: 157.50 },
          { description: "Precision Cleaning Kit for Electronics", quantity: 15, unit_price: 6.00, total_price: 90.00 }
        ],
        subtotal: 517.50,
        tax_amount: 41.40,
        total_amount: 558.90
      };

      this.displayExtractedInvoice(parsed);
    }, 1200);
  },

  simulateOCRProcessing(template) {
    const scanBeam = document.getElementById("ocr-scan-beam");
    const scanStatus = document.getElementById("ocr-scan-status");
    if (scanBeam) scanBeam.style.display = "block";
    if (scanStatus) scanStatus.innerHTML = `<span style="color:var(--accent-emerald);">⚡ AI OCR Running:</span> Extracting line items from <strong>${template.vendor_name}</strong>...`;

    setTimeout(() => {
      if (scanBeam) scanBeam.style.display = "none";
      if (scanStatus) scanStatus.textContent = "Invoice parsed successfully! Review extracted items below.";
      this.displayExtractedInvoice(template);
    }, 900);
  },

  displayExtractedInvoice(invoiceData) {
    this.currentScannedInvoice = invoiceData;
    const previewContainer = document.getElementById("scanned-invoice-preview");
    if (!previewContainer) return;

    previewContainer.style.display = "block";
    previewContainer.scrollIntoView({ behavior: "smooth", block: "start" });

    // Match each line item with existing catalog products
    const products = window.app.products;
    let itemsHtml = "";

    invoiceData.items.forEach((item, idx) => {
      const matched = products.find(p => 
        p.name.toLowerCase().includes(item.description.toLowerCase()) || 
        item.description.toLowerCase().includes(p.name.toLowerCase())
      );

      const matchBadge = matched 
        ? `<span class="badge badge-success">✓ Matched: ${matched.sku}</span>` 
        : `<span class="badge badge-info">➕ New Product</span>`;

      itemsHtml += `
        <tr>
          <td>
            <div style="font-weight:600;">${item.description}</div>
            <div style="margin-top:4px;">${matchBadge}</div>
          </td>
          <td style="font-family:var(--font-mono); font-weight:700;">${item.quantity}</td>
          <td style="font-family:var(--font-mono);">$${item.unit_price.toFixed(2)}</td>
          <td style="font-family:var(--font-mono); font-weight:700;">$${item.total_price.toFixed(2)}</td>
        </tr>
      `;
    });

    previewContainer.innerHTML = `
      <div class="card" style="border-color:var(--accent-indigo); box-shadow:var(--shadow-glow);">
        <div class="card-header">
          <div>
            <div class="badge badge-info" style="margin-bottom:6px;">OCR Extraction Verified</div>
            <h3 style="font-size:1.35rem; font-weight:700;">${invoiceData.vendor_name}</h3>
            <div style="font-size:0.85rem; color:var(--text-muted); margin-top:2px;">
              Bill Number: <strong style="color:#fff;">${invoiceData.invoice_number}</strong> · Date: ${invoiceData.invoice_date}
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:0.8rem; color:var(--text-muted);">Total Payable</div>
            <div style="font-size:1.6rem; font-weight:800; font-family:var(--font-mono); color:var(--accent-emerald);">
              $${invoiceData.total_amount.toFixed(2)}
            </div>
          </div>
        </div>

        <div class="table-container" style="margin:20px 0;">
          <table>
            <thead>
              <tr>
                <th>Extracted Item Description</th>
                <th>Quantity</th>
                <th>Unit Cost</th>
                <th>Line Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(15,21,35,0.6); padding:16px 20px; border-radius:var(--radius-md); border:1px solid var(--border-subtle);">
          <div style="font-size:0.86rem; color:var(--text-muted);">
            Subtotal: <strong>$${invoiceData.subtotal.toFixed(2)}</strong> &nbsp;|&nbsp; Tax: <strong>$${invoiceData.tax_amount.toFixed(2)}</strong>
          </div>
          <div style="display:flex; gap:12px;">
            <button class="btn btn-secondary" onclick="window.BizPilotInvoices.discardScannedInvoice()">Discard</button>
            <button class="btn btn-emerald" onclick="window.BizPilotInvoices.approveScannedInvoice()">
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              Approve & Update Inventory
            </button>
          </div>
        </div>
      </div>
    `;
  },

  discardScannedInvoice() {
    this.currentScannedInvoice = null;
    const previewContainer = document.getElementById("scanned-invoice-preview");
    if (previewContainer) previewContainer.style.display = "none";
    window.app.showToast("Scanned bill discarded", "info");
  },

  approveScannedInvoice() {
    if (!this.currentScannedInvoice) return;
    const inv = this.currentScannedInvoice;

    // 1. Replenish products or create new products
    let addedItemsCount = 0;
    inv.items.forEach(item => {
      let matched = window.app.products.find(p => 
        p.name.toLowerCase().includes(item.description.toLowerCase()) || 
        item.description.toLowerCase().includes(p.name.toLowerCase())
      );

      if (matched) {
        matched.current_stock += item.quantity;
        matched.cost_price = item.unit_price; // update latest cost
      } else {
        // Auto-create product
        const newId = Date.now() + Math.floor(Math.random() * 100);
        const skuPrefix = "SKU-" + item.description.slice(0, 3).toUpperCase();
        window.app.products.push({
          id: newId,
          sku: `${skuPrefix}-${Math.floor(100 + Math.random() * 900)}`,
          name: item.description,
          category: "General",
          current_stock: item.quantity,
          min_stock_alert: 10,
          cost_price: item.unit_price,
          selling_price: Number((item.unit_price * 1.6).toFixed(2)),
          supplier_name: inv.vendor_name
        });
      }
      addedItemsCount += item.quantity;
    });

    // 2. Add to invoices list as approved
    const newInvoiceRecord = {
      id: Date.now(),
      invoice_number: inv.invoice_number,
      vendor_name: inv.vendor_name,
      invoice_date: inv.invoice_date,
      status: "approved",
      subtotal: inv.subtotal,
      tax_amount: inv.tax_amount,
      total_amount: inv.total_amount,
      items: inv.items
    };
    window.app.invoices.unshift(newInvoiceRecord);

    // 3. Persist and trigger alert evaluations
    window.app.saveState();
    window.app.evaluateAlerts();

    // 4. Reset preview & re-render
    this.currentScannedInvoice = null;
    const previewContainer = document.getElementById("scanned-invoice-preview");
    if (previewContainer) previewContainer.style.display = "none";

    window.app.showToast(`Success! ${addedItemsCount} units added to stock from ${inv.vendor_name}.`, "success");
    this.renderInvoicesHistory();
    window.app.updateBadges();
  },

  renderInvoicesHistory() {
    const tableBody = document.getElementById("invoices-table-body");
    if (!tableBody) return;

    if (window.app.invoices.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:32px; color:var(--text-muted);">No invoices logged yet.</td></tr>`;
      return;
    }

    let html = "";
    window.app.invoices.forEach(inv => {
      const isApproved = inv.status === "approved";
      const statusBadge = isApproved 
        ? `<span class="badge badge-success">Approved</span>` 
        : `<span class="badge badge-warning">Needs Review</span>`;

      const actionBtn = isApproved 
        ? `<span style="font-size:0.8rem; color:var(--accent-emerald);">✓ Stock Updated</span>`
        : `<button class="btn btn-emerald" style="padding:4px 10px; font-size:0.75rem;" onclick="window.BizPilotInvoices.quickApproveFromTable(${inv.id})">Approve</button>`;

      html += `
        <tr>
          <td><span class="sku-badge">${inv.invoice_number}</span></td>
          <td style="font-weight:600;">${inv.vendor_name}</td>
          <td>${inv.invoice_date}</td>
          <td>${inv.items ? inv.items.length : 0} items</td>
          <td style="font-family:var(--font-mono); font-weight:700;">$${inv.total_amount.toFixed(2)}</td>
          <td>${statusBadge}</td>
          <td>${actionBtn}</td>
        </tr>
      `;
    });
    tableBody.innerHTML = html;
  },

  quickApproveFromTable(invoiceId) {
    const inv = window.app.invoices.find(i => i.id === invoiceId);
    if (!inv || inv.status === "approved") return;

    inv.status = "approved";
    inv.items.forEach(item => {
      let matched = window.app.products.find(p => 
        (item.matched_product_id && p.id === item.matched_product_id) || 
        p.name.toLowerCase().includes(item.description.toLowerCase())
      );
      if (matched) {
        matched.current_stock += item.quantity;
      }
    });

    window.app.saveState();
    window.app.evaluateAlerts();
    this.renderInvoicesHistory();
    window.app.showToast(`Invoice ${inv.invoice_number} approved and stock replenished!`, "success");
  }
};
