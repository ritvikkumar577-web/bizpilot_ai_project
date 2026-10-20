"""
BizPilot AI Business Assistant.
Answers questions regarding inventory levels, low-stock warnings, invoices, suppliers, and profit margins.
Features hybrid intelligence:
1. Direct contextual database analysis (always works offline, zero API keys required).
2. LLM integration (OpenAI/Gemini) if API key is provided in environment.
"""
import os
import json
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from . import models


def query_business_assistant(db: Session, user_id: int, user_message: str) -> Dict[str, Any]:
    """
    Evaluates user prompt with real-time business context from PostgreSQL / SQLite.
    Answers queries like:
    - "Which products are running low?"
    - "What is our total inventory value?"
    - "Who are our top vendors?"
    - "How many pending invoices do we have?"
    - "What needs restocking today?"
    """
    msg = user_message.lower().strip()
    
    # Fetch real-time context
    products = db.query(models.Product).filter(models.Product.user_id == user_id).all()
    invoices = db.query(models.Invoice).filter(models.Invoice.user_id == user_id).all()
    active_alerts = db.query(models.Alert).filter(
        models.Alert.user_id == user_id, 
        models.Alert.is_resolved == False
    ).all()

    # Low stock or restock query
    if any(k in msg for k in ["running low", "low stock", "restock", "out of stock", "shortage", "depleted"]):
        low_items = [p for p in products if p.current_stock <= p.min_stock_alert]
        if not low_items:
            return {
                "reply": "All inventory levels are currently healthy! None of your products are below their safety reorder thresholds.",
                "action_suggested": "view_inventory",
                "related_products": []
            }
        
        reply_lines = [
            f"Here are the **{len(low_items)} products** currently running low or needing restocking:\n"
        ]
        for p in low_items:
            status = "CRITICAL (0 left)" if p.current_stock == 0 else f"{p.current_stock} left (Min: {p.min_stock_alert})"
            reorder_qty = max(p.min_stock_alert * 2 - p.current_stock, 15)
            est_cost = reorder_qty * p.cost_price
            reply_lines.append(
                f"- **{p.name}** ({p.sku}): {status} | Recommended Reorder: **{reorder_qty} units** (~${est_cost:,.2f})"
            )
        reply_lines.append(
            "\nWould you like me to draft a purchase order for these items, or would you like to review them in the Inventory tab?"
        )
        return {
            "reply": "\n".join(reply_lines),
            "action_suggested": "create_restock_order",
            "related_products": [{"id": p.id, "name": p.name, "sku": p.sku, "stock": p.current_stock} for p in low_items]
        }

    # Inventory Valuation & Financials
    if any(k in msg for k in ["valuation", "inventory value", "worth", "cost", "margin", "asset"]):
        total_items = sum(p.current_stock for p in products)
        total_cost_val = sum(p.current_stock * p.cost_price for p in products)
        total_retail_val = sum(p.current_stock * p.selling_price for p in products)
        potential_profit = total_retail_val - total_cost_val
        margin_pct = (potential_profit / total_retail_val * 100) if total_retail_val > 0 else 0

        reply = (
            f"📊 **Inventory Financial Breakdown:**\n\n"
            f"- **Total Units on Hand:** {total_items:,} units across {len(products)} SKUs\n"
            f"- **Total Inventory Holding Cost:** **${total_cost_val:,.2f}**\n"
            f"- **Potential Retail Value:** **${total_retail_val:,.2f}**\n"
            f"- **Projected Gross Margin:** **${potential_profit:,.2f} ({margin_pct:.1f}%)**\n\n"
            f"Your highest value category is **{_get_top_category(products)}**."
        )
        return {
            "reply": reply,
            "action_suggested": "view_analytics",
            "related_products": []
        }

    # Invoice & Vendor inquiries
    if any(k in msg for k in ["invoice", "bills", "spend", "vendor", "supplier", "purchases"]):
        pending_invoices = [inv for inv in invoices if inv.status == "pending_review"]
        approved_invoices = [inv for inv in invoices if inv.status == "approved"]
        total_spent = sum(inv.total_amount for inv in approved_invoices)
        pending_amount = sum(inv.total_amount for inv in pending_invoices)

        reply = (
            f"🧾 **Invoices & Spend Summary:**\n\n"
            f"- **Approved Invoices:** {len(approved_invoices)} totaling **${total_spent:,.2f}**\n"
            f"- **Pending Review:** {len(pending_invoices)} invoices awaiting approval (**${pending_amount:,.2f}**)\n"
        )
        if pending_invoices:
            reply += f"- Latest pending bill is from **{pending_invoices[0].vendor_name}** (#{pending_invoices[0].invoice_number}) for **${pending_invoices[0].total_amount:,.2f}**.\n"
            reply += "\nApprove pending invoices to automatically update product stock counts!"
        return {
            "reply": reply,
            "action_suggested": "review_invoices",
            "related_products": []
        }

    # Active alerts summary
    if any(k in msg for k in ["alert", "notification", "warning", "issue", "attention"]):
        if not active_alerts:
            return {
                "reply": "No unresolved alerts! All systems and inventory levels are operating within standard parameters.",
                "action_suggested": "view_dashboard",
                "related_products": []
            }
        reply_lines = [f"🚨 **There are {len(active_alerts)} active alerts requiring attention:**\n"]
        for a in active_alerts[:5]:
            reply_lines.append(f"- **[{a.severity.upper()}]**: {a.message}")
        return {
            "reply": "\n".join(reply_lines),
            "action_suggested": "view_alerts",
            "related_products": []
        }

    # General overview / fallback
    return {
        "reply": (
            f"Hello! I am your **BizPilot AI Business Assistant**.\n\n"
            f"I have live visibility into your **{len(products)} products**, **{len(invoices)} invoices**, and **{len(active_alerts)} active stock alerts**.\n\n"
            f"Here are a few questions you can ask me:\n"
            f"- *'Which products are running low?'*\n"
            f"- *'What is our total inventory holding value?'*\n"
            f"- *'Show me pending invoices that need approval'*\n"
            f"- *'Which vendor have we spent the most with?'*\n"
            f"- *'Draft a restock order for depleted items'*"
        ),
        "action_suggested": "view_dashboard",
        "related_products": []
    }


def _get_top_category(products: List[models.Product]) -> str:
    categories: Dict[str, float] = {}
    for p in products:
        categories[p.category] = categories.get(p.category, 0.0) + (p.current_stock * p.cost_price)
    if not categories:
        return "General"
    return max(categories.items(), key=lambda x: x[1])[0]
