"""
Python Rule-Based Smart Alert Engine for BizPilot AI.
Detects low-stock conditions, generates alert notifications, and computes recommended reorder quantities.
Does not require expensive external AI models; runs fast, deterministic business logic.
"""
from datetime import datetime
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from . import models


def evaluate_product_stock_alerts(db: Session, user_id: int) -> List[Dict[str, Any]]:
    """
    Evaluates all products owned by user against rule thresholds:
    1. Out of stock (current_stock == 0) -> Critical Alert
    2. Deep depletion (current_stock <= min_stock_alert * 0.3) -> Critical Alert
    3. Low stock (current_stock <= min_stock_alert) -> Warning Alert
    4. Automatically resolves past alerts if current_stock has replenished.
    """
    products = db.query(models.Product).filter(models.Product.user_id == user_id).all()
    generated_alerts = []

    for product in products:
        existing_active_alert = db.query(models.Alert).filter(
            models.Alert.product_id == product.id,
            models.Alert.is_resolved == False
        ).first()

        # Rule 1: Critically low or zero stock
        if product.current_stock == 0:
            severity = "critical"
            recommended_reorder = max(product.min_stock_alert * 2, 20)
            message = (f"OUT OF STOCK: '{product.name}' (SKU: {product.sku}) has 0 units remaining! "
                       f"Immediate stockout risk. Suggested reorder: {recommended_reorder} units.")

            if existing_active_alert:
                existing_active_alert.severity = severity
                existing_active_alert.message = message
            else:
                new_alert = models.Alert(
                    user_id=user_id,
                    product_id=product.id,
                    severity=severity,
                    message=message,
                    is_resolved=False
                )
                db.add(new_alert)
            generated_alerts.append({"product_id": product.id, "severity": severity, "message": message})

        # Rule 2: Depleted below 30% of threshold
        elif product.current_stock <= (product.min_stock_alert * 0.3):
            severity = "critical"
            recommended_reorder = int((product.min_stock_alert * 1.5) - product.current_stock)
            message = (f"CRITICAL DEPLETION: '{product.name}' has only {product.current_stock} units left "
                       f"(Threshold: {product.min_stock_alert}). Reorder minimum {recommended_reorder} units.")

            if existing_active_alert:
                existing_active_alert.severity = severity
                existing_active_alert.message = message
            else:
                new_alert = models.Alert(
                    user_id=user_id,
                    product_id=product.id,
                    severity=severity,
                    message=message,
                    is_resolved=False
                )
                db.add(new_alert)
            generated_alerts.append({"product_id": product.id, "severity": severity, "message": message})

        # Rule 3: Below warning threshold
        elif product.current_stock <= product.min_stock_alert:
            severity = "warning"
            recommended_reorder = int(product.min_stock_alert * 1.5 - product.current_stock)
            message = (f"LOW STOCK WARNING: '{product.name}' is down to {product.current_stock} units "
                       f"(Threshold: {product.min_stock_alert}). Suggested reorder: {recommended_reorder} units.")

            if existing_active_alert:
                existing_active_alert.severity = severity
                existing_active_alert.message = message
            else:
                new_alert = models.Alert(
                    user_id=user_id,
                    product_id=product.id,
                    severity=severity,
                    message=message,
                    is_resolved=False
                )
                db.add(new_alert)
            generated_alerts.append({"product_id": product.id, "severity": severity, "message": message})

        else:
            # Stock is healthy; auto-resolve past active alerts
            if existing_active_alert:
                existing_active_alert.is_resolved = True
                existing_active_alert.resolved_at = datetime.utcnow()

    db.commit()
    return generated_alerts


def calculate_stock_health_summary(db: Session, user_id: int) -> Dict[str, Any]:
    """
    Computes real-time health metrics for the dashboard KPI cards.
    """
    products = db.query(models.Product).filter(models.Product.user_id == user_id).all()
    total_products = len(products)
    out_of_stock = sum(1 for p in products if p.current_stock == 0)
    low_stock = sum(1 for p in products if 0 < p.current_stock <= p.min_stock_alert)
    healthy_stock = sum(1 for p in products if p.current_stock > p.min_stock_alert)
    total_inventory_value = sum(p.current_stock * p.cost_price for p in products)
    potential_revenue = sum(p.current_stock * p.selling_price for p in products)

    health_score = int((healthy_stock / total_products * 100)) if total_products > 0 else 100

    return {
        "total_products": total_products,
        "healthy_count": healthy_stock,
        "low_stock_count": low_stock,
        "out_of_stock_count": out_of_stock,
        "health_score_pct": health_score,
        "total_inventory_value": round(total_inventory_value, 2),
        "potential_revenue": round(potential_revenue, 2)
    }
