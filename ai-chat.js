/**
 * BizPilot AI — Conversational Business Copilot Module
 * Answers natural language inquiries about inventory, stockouts, invoices, and profitability.
 */

window.BizPilotAI = {
  chatHistory: [
    {
      role: "assistant",
      content: `👋 Hello! I am **BizPilot AI**, your autonomous business assistant.\n\nI continuously monitor your inventory levels, incoming supplier invoices, and stockout risks.\n\nAsk me anything or click one of the quick suggestions below!`
    }
  ],

  render() {
    this.renderMessages();
    this.setupListeners();
  },

  setupListeners() {
    const input = document.getElementById("ai-chat-input");
    const sendBtn = document.getElementById("ai-chat-send-btn");

    if (input && !input.dataset.listener) {
      input.dataset.listener = "true";
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          this.handleSendMessage();
        }
      });
    }

    if (sendBtn && !sendBtn.dataset.listener) {
      sendBtn.dataset.listener = "true";
      sendBtn.addEventListener("click", () => this.handleSendMessage());
    }
  },

  askPrompt(promptText) {
    const input = document.getElementById("ai-chat-input");
    if (input) {
      input.value = promptText;
      this.handleSendMessage();
    }
  },

  async handleSendMessage() {
    const input = document.getElementById("ai-chat-input");
    if (!input) return;

    const message = input.value.trim();
    if (!message) return;

    // Append User Message
    this.chatHistory.push({ role: "user", content: message });
    input.value = "";
    this.renderMessages();

    // Show typing state
    this.showTypingIndicator();

    // Call backend API if connected; otherwise query local business intelligence engine
    if (window.app.isBackendConnected) {
      try {
        const res = await fetch(`${window.app.apiBaseUrl}/api/assistant/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message, history: this.chatHistory })
        });
        if (res.ok) {
          const data = await res.json();
          this.removeTypingIndicator();
          this.chatHistory.push({ role: "assistant", content: data.reply });
          this.renderMessages();
          return;
        }
      } catch (e) {
        // Fall back to local AI
      }
    }

    // Local Autonomous AI Engine response
    setTimeout(() => {
      this.removeTypingIndicator();
      const reply = this.computeLocalAIResponse(message);
      this.chatHistory.push({ role: "assistant", content: reply });
      this.renderMessages();
    }, 700);
  },

  computeLocalAIResponse(query) {
    const q = query.toLowerCase();
    const products = window.app.products;
    const invoices = window.app.invoices;
    const alerts = window.app.alerts;

    // 1. Low stock / restock queries
    if (q.includes("running low") || q.includes("low stock") || q.includes("restock") || q.includes("out of stock") || q.includes("shortage")) {
      const lowItems = products.filter(p => p.current_stock <= p.min_stock_alert);
      if (lowItems.length === 0) {
        return `✅ **Great news!** All **${products.length} catalog items** are currently above their safety thresholds. No replenishment is needed today.`;
      }

      let reply = `⚠️ **${lowItems.length} products currently require restocking:**\n\n`;
      lowItems.forEach(p => {
        const isDepleted = p.current_stock === 0;
        const status = isDepleted ? "🚨 **OUT OF STOCK**" : `⚠️ ${p.current_stock} left (Min: ${p.min_stock_alert})`;
        const suggested = Math.max(p.min_stock_alert * 2 - p.current_stock, 15);
        reply += `- **${p.name}** (${p.sku}): ${status} · Reorder: **${suggested} units** (~$${(suggested * p.cost_price).toFixed(2)})\n`;
      });
      reply += `\n👉 You can automatically draft a purchase order in the **Smart Alerts** tab.`;
      return reply;
    }

    // 2. Valuation & Financials
    if (q.includes("valuation") || q.includes("inventory value") || q.includes("worth") || q.includes("margin") || q.includes("financial")) {
      const totalUnits = products.reduce((acc, p) => acc + p.current_stock, 0);
      const totalCost = products.reduce((acc, p) => acc + (p.current_stock * p.cost_price), 0);
      const totalRetail = products.reduce((acc, p) => acc + (p.current_stock * p.selling_price), 0);
      const margin = totalRetail - totalCost;
      const marginPct = totalRetail > 0 ? ((margin / totalRetail) * 100).toFixed(1) : 0;

      return (
        `📊 **Inventory Valuation & Financial Health:**\n\n` +
        `- **Total Stock on Hand:** ${totalUnits.toLocaleString()} physical units across ${products.length} SKUs\n` +
        `- **Total Holding Cost:** **$${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}**\n` +
        `- **Potential Retail Value:** **$${totalRetail.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}**\n` +
        `- **Projected Gross Profit:** **$${margin.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${marginPct}% margin)**\n\n` +
        `Your warehouse capital efficiency is operating within target margins.`
      );
    }

    // 3. Invoices & Suppliers
    if (q.includes("invoice") || q.includes("bill") || q.includes("spend") || q.includes("supplier") || q.includes("vendor")) {
      const pending = invoices.filter(i => i.status === "pending_review");
      const approved = invoices.filter(i => i.status === "approved");
      const approvedTotal = approved.reduce((acc, i) => acc + i.total_amount, 0);
      const pendingTotal = pending.reduce((acc, i) => acc + i.total_amount, 0);

      let reply = (
        `🧾 **Invoice & Spend Breakdown:**\n\n` +
        `- **Approved Invoices:** ${approved.length} totaling **$${approvedTotal.toFixed(2)}**\n` +
        `- **Pending Invoices:** ${pending.length} totaling **$${pendingTotal.toFixed(2)}**\n`
      );

      if (pending.length > 0) {
        reply += `\n⚠️ **Action Required:** Invoice **#${pending[0].invoice_number}** from **${pending[0].vendor_name}** ($${pending[0].total_amount.toFixed(2)}) is awaiting approval. Once approved, BizPilot AI will automatically update product stock levels!`;
      }
      return reply;
    }

    // 4. Default intelligent business response
    return (
      `I am connected to your live inventory & invoices database:\n\n` +
      `- **${products.length}** Products cataloged\n` +
      `- **${invoices.length}** Invoices processed\n` +
      `- **${alerts.length}** Active alerts\n\n` +
      `Try asking:\n` +
      `• *"Which products are running low?"*\n` +
      `• *"What is our total inventory holding value?"*\n` +
      `• *"Show me pending invoices that need review"*`
    );
  },

  showTypingIndicator() {
    const container = document.getElementById("ai-chat-messages");
    if (!container) return;

    const row = document.createElement("div");
    row.id = "chat-typing-indicator";
    row.className = "chat-bubble-row assistant";
    row.innerHTML = `
      <div class="chat-bubble" style="padding:12px 18px; color:var(--text-muted); font-style:italic;">
        BizPilot AI is analyzing your business records...
      </div>
    `;
    container.appendChild(row);
    container.scrollTop = container.scrollHeight;
  },

  removeTypingIndicator() {
    const el = document.getElementById("chat-typing-indicator");
    if (el) el.remove();
  },

  renderMessages() {
    const container = document.getElementById("ai-chat-messages");
    if (!container) return;

    let html = "";
    this.chatHistory.forEach(msg => {
      const isAssistant = msg.role === "assistant";
      const formattedContent = this.formatMarkdown(msg.content);

      html += `
        <div class="chat-bubble-row ${isAssistant ? 'assistant' : 'user'}">
          ${isAssistant ? '<div class="ai-avatar" style="width:34px; height:34px; font-size:0.8rem; flex-shrink:0;">AI</div>' : ''}
          <div class="chat-bubble">
            ${formattedContent}
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
    container.scrollTop = container.scrollHeight;
  },

  formatMarkdown(text) {
    let out = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code style="background:rgba(255,255,255,0.1); padding:2px 6px; border-radius:4px; font-family:var(--font-mono);">$1</code>')
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n- /g, '<br>• ')
      .replace(/\n/g, '<br>');
    return out;
  }
};
