"""
BizPilot AI — FastAPI Backend Application.
Provides RESTful APIs for Invoices, Products, Inventory, Alerts, and AI Assistant.
"""
from typing import List, Optional
from datetime import datetime
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .database import engine, Base, get_db
from . import models, schemas, ocr_engine, alerts_engine, ai_assistant

# Ensure database tables exist
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="BizPilot AI API",
    description="Automated Invoicing, Inventory Management & AI Business Assistant for Small Businesses",
    version="1.0.0"
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Helper to get or create a default demo user
def get_current_user_id(db: Session) -> int:
    demo_user = db.query(models.User).filter(models.User.email == "owner@bizpilot.ai").first()
    if not demo_user:
        demo_user = models.User(
            email="owner@bizpilot.ai",
            hashed_password="hashed_demo_pw",
            business_name="Craft & Tech Retail Co.",
            currency="USD"
        )
        db.add(demo_user)
        db.commit()
        db.refresh(demo_user)
        # Prepopulate demo products if new
        _seed_initial_products(db, demo_user.id)
    return demo_user.id


def _seed_initial_products(db: Session, user_id: int):
    initial_items = [
        {"sku": "SKU-ELC-001", "name": "USB-C Braided Fast Cable (2m)", "category": "Electronics", "stock": 42, "min": 15, "cost": 4.50, "sell": 14.99, "supplier": "Apex Tech Global"},
        {"sku": "SKU-ELC-002", "name": "Wireless Ergonomic Mouse", "category": "Electronics", "stock": 4, "min": 10, "cost": 12.00, "sell": 29.99, "supplier": "Apex Tech Global"},
        {"sku": "SKU-OFF-003", "name": "Heavy Duty Packaging Tape 6-Pack", "category": "Packaging", "stock": 2, "min": 12, "cost": 6.80, "sell": 16.50, "supplier": "Metro Warehouse Supplies"},
        {"sku": "SKU-OFF-004", "name": "Corrugated Shipping Boxes (12x10x8)", "category": "Packaging", "stock": 85, "min": 25, "cost": 1.20, "sell": 3.49, "supplier": "Metro Warehouse Supplies"},
        {"sku": "SKU-BEV-005", "name": "Organic Arabica Coffee Beans (1kg)", "category": "Pantry", "stock": 0, "min": 8, "cost": 11.50, "sell": 24.00, "supplier": "GreenValley Roasters"},
        {"sku": "SKU-ELC-006", "name": "Multi-Port 7-in-1 USB Hub", "category": "Electronics", "stock": 18, "min": 10, "cost": 19.50, "sell": 44.99, "supplier": "Apex Tech Global"},
    ]
    for item in initial_items:
        prod = models.Product(
            user_id=user_id,
            sku=item["sku"],
            name=item["name"],
            category=item["category"],
            current_stock=item["stock"],
            min_stock_alert=item["min"],
            cost_price=item["cost"],
            selling_price=item["sell"],
            supplier_name=item["supplier"]
        )
        db.add(prod)
    db.commit()
    alerts_engine.evaluate_product_stock_alerts(db, user_id)


# --- Health & Root ---
@app.get("/")
def read_root():
    return {
        "status": "online",
        "app": "BizPilot AI",
        "description": "AI-powered Invoice, Inventory and Alert Automation Engine",
        "version": "1.0.0"
    }


# --- Dashboard Stats ---
@app.get("/api/dashboard/stats")
def get_dashboard_stats(db: Session = Depends(get_db)):
    user_id = get_current_user_id(db)
    health = alerts_engine.calculate_stock_health_summary(db, user_id)
    
    invoices = db.query(models.Invoice).filter(models.Invoice.user_id == user_id).all()
    pending_invoices = sum(1 for inv in invoices if inv.status == "pending_review")
    total_approved_spend = sum(inv.total_amount for inv in invoices if inv.status == "approved")

    alerts = db.query(models.Alert).filter(models.Alert.user_id == user_id, models.Alert.is_resolved == False).all()

    return {
        "inventory": health,
        "invoices": {
            "total_count": len(invoices),
            "pending_count": pending_invoices,
            "approved_spend": round(total_approved_spend, 2)
        },
        "alerts_count": len(alerts),
        "recent_alerts": [
            {"id": a.id, "severity": a.severity, "message": a.message, "created_at": a.created_at} 
            for a in alerts[:5]
        ]
    }


# --- Product / Inventory Endpoints ---
@app.get("/api/products", response_model=List[schemas.ProductResponse])
def list_products(category: Optional[str] = None, low_stock: Optional[bool] = None, db: Session = Depends(get_db)):
    user_id = get_current_user_id(db)
    query = db.query(models.Product).filter(models.Product.user_id == user_id)
    if category:
        query = query.filter(models.Product.category == category)
    if low_stock:
        query = query.filter(models.Product.current_stock <= models.Product.min_stock_alert)
    return query.order_by(models.Product.current_stock.asc()).all()


@app.post("/api/products", response_model=schemas.ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(product_in: schemas.ProductCreate, db: Session = Depends(get_db)):
    user_id = get_current_user_id(db)
    
    # Check duplicate SKU
    existing = db.query(models.Product).filter(
        models.Product.user_id == user_id, 
        models.Product.sku == product_in.sku
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Product with SKU '{product_in.sku}' already exists.")

    new_prod = models.Product(
        user_id=user_id,
        **product_in.model_dump()
    )
    db.add(new_prod)
    db.commit()
    db.refresh(new_prod)

    # Re-evaluate alerts
    alerts_engine.evaluate_product_stock_alerts(db, user_id)
    return new_prod


@app.put("/api/products/{product_id}", response_model=schemas.ProductResponse)
def update_product(product_id: int, prod_update: schemas.ProductUpdate, db: Session = Depends(get_db)):
    user_id = get_current_user_id(db)
    prod = db.query(models.Product).filter(models.Product.id == product_id, models.Product.user_id == user_id).first()
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found")

    for key, val in prod_update.model_dump(exclude_unset=True).items():
        setattr(prod, key, val)

    prod.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(prod)

    alerts_engine.evaluate_product_stock_alerts(db, user_id)
    return prod


@app.delete("/api/products/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db)):
    user_id = get_current_user_id(db)
    prod = db.query(models.Product).filter(models.Product.id == product_id, models.Product.user_id == user_id).first()
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found")
    db.delete(prod)
    db.commit()
    return {"message": "Product deleted successfully"}


@app.post("/api/products/{product_id}/adjust")
def adjust_stock(product_id: int, adj: schemas.StockAdjustment, db: Session = Depends(get_db)):
    user_id = get_current_user_id(db)
    prod = db.query(models.Product).filter(models.Product.id == product_id, models.Product.user_id == user_id).first()
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found")

    new_stock = prod.current_stock + adj.change_quantity
    if new_stock < 0:
        raise HTTPException(status_code=400, detail="Stock level cannot drop below 0")

    prod.current_stock = new_stock
    prod.updated_at = datetime.utcnow()

    history = models.StockHistory(
        product_id=prod.id,
        change_quantity=adj.change_quantity,
        stock_after=new_stock,
        reason=adj.reason,
        reference_id=adj.reference_id
    )
    db.add(history)
    db.commit()

    alerts_engine.evaluate_product_stock_alerts(db, user_id)
    return {
        "product_id": prod.id,
        "sku": prod.sku,
        "name": prod.name,
        "new_stock": prod.current_stock
    }


# --- Invoice & AI OCR Endpoints ---
@app.get("/api/invoices", response_model=List[schemas.InvoiceResponse])
def list_invoices(db: Session = Depends(get_db)):
    user_id = get_current_user_id(db)
    return db.query(models.Invoice).filter(models.Invoice.user_id == user_id).order_by(models.Invoice.created_at.desc()).all()


@app.post("/api/invoices/upload-and-scan")
async def upload_invoice(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    Receives an uploaded bill/invoice, triggers AI OCR extraction,
    and returns parsed line items with matched inventory products.
    """
    user_id = get_current_user_id(db)
    contents = await file.read()
    
    # Run OCR & line item structure extraction
    extracted = ocr_engine.extract_invoice_from_bytes(contents, file.filename)

    # Match extracted line items with existing catalog products
    products = db.query(models.Product).filter(models.Product.user_id == user_id).all()
    
    matched_items = []
    for item in extracted.get("items", []):
        matched_prod = None
        desc_lower = item["description"].lower()
        for p in products:
            if p.name.lower() in desc_lower or desc_lower in p.name.lower() or p.sku.lower() in desc_lower:
                matched_prod = p
                break
        
        matched_items.append({
            "description": item["description"],
            "quantity": item["quantity"],
            "unit_price": item["unit_price"],
            "total_price": item["total_price"],
            "matched_product_id": matched_prod.id if matched_prod else None,
            "matched_product_name": matched_prod.name if matched_prod else None,
            "is_new_product": matched_prod is None
        })

    # Create invoice in 'pending_review' state
    inv = models.Invoice(
        user_id=user_id,
        invoice_number=extracted.get("invoice_number", f"INV-{int(datetime.utcnow().timestamp())}"),
        vendor_name=extracted.get("vendor_name", "Vendor / Supplier"),
        subtotal=extracted.get("subtotal", 0.0),
        tax_amount=extracted.get("tax_amount", 0.0),
        total_amount=extracted.get("total_amount", 0.0),
        status="pending_review",
        raw_ocr_text=extracted.get("raw_ocr_text", "")
    )
    db.add(inv)
    db.commit()
    db.refresh(inv)

    for item in matched_items:
        inv_item = models.InvoiceItem(
            invoice_id=inv.id,
            product_id=item["matched_product_id"],
            description=item["description"],
            quantity=item["quantity"],
            unit_price=item["unit_price"],
            total_price=item["total_price"]
        )
        db.add(inv_item)
    db.commit()

    return {
        "invoice_id": inv.id,
        "invoice_number": inv.invoice_number,
        "vendor_name": inv.vendor_name,
        "subtotal": inv.subtotal,
        "tax_amount": inv.tax_amount,
        "total_amount": inv.total_amount,
        "status": inv.status,
        "items": matched_items,
        "raw_ocr_text": inv.raw_ocr_text
    }


@app.post("/api/invoices/{invoice_id}/approve")
def approve_invoice(invoice_id: int, db: Session = Depends(get_db)):
    """
    Approves an invoice and updates product stock quantities automatically.
    Logs audit history and re-evaluates low-stock alerts.
    """
    user_id = get_current_user_id(db)
    inv = db.query(models.Invoice).filter(models.Invoice.id == invoice_id, models.Invoice.user_id == user_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")

    if inv.status == "approved":
        raise HTTPException(status_code=400, detail="Invoice is already approved")

    items = db.query(models.InvoiceItem).filter(models.InvoiceItem.invoice_id == inv.id).all()
    updated_products = []

    for item in items:
        # If product was linked, replenish stock
        prod = None
        if item.product_id:
            prod = db.query(models.Product).filter(models.Product.id == item.product_id).first()
        else:
            # Auto-create product if brand new
            sku_slug = "SKU-" + "".join(w[:3].upper() for w in item.description.split()[:2])
            prod = models.Product(
                user_id=user_id,
                sku=f"{sku_slug}-{int(datetime.utcnow().timestamp())%1000}",
                name=item.description,
                category="General",
                current_stock=0,
                min_stock_alert=10,
                cost_price=item.unit_price,
                selling_price=round(item.unit_price * 1.5, 2),
                supplier_name=inv.vendor_name
            )
            db.add(prod)
            db.commit()
            db.refresh(prod)
            item.product_id = prod.id

        if prod:
            old_stock = prod.current_stock
            prod.current_stock += item.quantity
            prod.cost_price = item.unit_price  # update latest cost
            prod.updated_at = datetime.utcnow()

            # Record stock history entry
            history = models.StockHistory(
                product_id=prod.id,
                change_quantity=item.quantity,
                stock_after=prod.current_stock,
                reason="invoice_approval",
                reference_id=inv.invoice_number
            )
            db.add(history)
            updated_products.append({
                "product_id": prod.id,
                "name": prod.name,
                "added_qty": item.quantity,
                "new_stock": prod.current_stock
            })

    inv.status = "approved"
    inv.approved_at = datetime.utcnow()
    db.commit()

    # Re-evaluate low-stock alerts
    alerts_engine.evaluate_product_stock_alerts(db, user_id)

    return {
        "message": f"Invoice {inv.invoice_number} successfully approved!",
        "invoice_id": inv.id,
        "status": inv.status,
        "updated_products": updated_products
    }


# --- Alerts Endpoints ---
@app.get("/api/alerts")
def get_alerts(resolved: bool = False, db: Session = Depends(get_db)):
    user_id = get_current_user_id(db)
    # Refresh alert states
    alerts_engine.evaluate_product_stock_alerts(db, user_id)
    
    query = db.query(models.Alert).filter(models.Alert.user_id == user_id)
    if not resolved:
        query = query.filter(models.Alert.is_resolved == False)
    
    alerts = query.order_by(models.Alert.created_at.desc()).all()
    results = []
    for a in alerts:
        results.append({
            "id": a.id,
            "product_id": a.product_id,
            "product_name": a.product.name if a.product else "Unknown",
            "product_sku": a.product.sku if a.product else "N/A",
            "severity": a.severity,
            "message": a.message,
            "is_resolved": a.is_resolved,
            "created_at": a.created_at
        })
    return results


@app.post("/api/alerts/{alert_id}/resolve")
def resolve_alert(alert_id: int, db: Session = Depends(get_db)):
    user_id = get_current_user_id(db)
    alert = db.query(models.Alert).filter(models.Alert.id == alert_id, models.Alert.user_id == user_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.is_resolved = True
    alert.resolved_at = datetime.utcnow()
    db.commit()
    return {"message": "Alert marked as resolved"}


# --- AI Assistant Endpoints ---
@app.post("/api/assistant/chat", response_model=schemas.ChatResponse)
def chat_with_assistant(chat_req: schemas.ChatRequest, db: Session = Depends(get_db)):
    """
    AI business assistant answers questions about stock levels, valuation, invoices, and reordering.
    """
    user_id = get_current_user_id(db)
    response = ai_assistant.query_business_assistant(db, user_id, chat_req.message)
    return schemas.ChatResponse(
        reply=response["reply"],
        action_suggested=response.get("action_suggested"),
        related_products=response.get("related_products")
    )
