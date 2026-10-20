"""
Database Seeder Script for BizPilot AI.
Pre-populates sample users, products, invoices, and alerts into PostgreSQL or SQLite.
"""
from datetime import datetime
from app.database import engine, Base, SessionLocal
from app import models, alerts_engine


def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Check if user already exists
        user = db.query(models.User).filter(models.User.email == "demo@bizpilot.ai").first()
        if not user:
            user = models.User(
                email="demo@bizpilot.ai",
                hashed_password="demo_secure_hash",
                business_name="Urban Craft & Tech Supplies",
                currency="USD"
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            print(f"Created demo user: {user.email} (ID: {user.id})")

        # Check products
        if db.query(models.Product).filter(models.Product.user_id == user.id).count() == 0:
            sample_products = [
                models.Product(user_id=user.id, sku="SKU-ELC-101", name="USB-C Braided Fast Cable (2m)", category="Electronics", current_stock=42, min_stock_alert=15, cost_price=4.50, selling_price=14.99, supplier_name="Apex Tech Global"),
                models.Product(user_id=user.id, sku="SKU-ELC-102", name="Wireless Ergonomic Mouse Pro", category="Electronics", current_stock=4, min_stock_alert=12, cost_price=13.50, selling_price=29.99, supplier_name="Apex Tech Global"),
                models.Product(user_id=user.id, sku="SKU-PKG-201", name="Heavy Duty Packaging Tape (6-Pack)", category="Packaging", current_stock=3, min_stock_alert=15, cost_price=6.80, selling_price=16.50, supplier_name="Metro Warehouse Supplies"),
                models.Product(user_id=user.id, sku="SKU-PKG-202", name="Corrugated Shipping Boxes M (12x10x8)", category="Packaging", current_stock=95, min_stock_alert=25, cost_price=1.25, selling_price=3.49, supplier_name="Metro Warehouse Supplies"),
                models.Product(user_id=user.id, sku="SKU-BEV-301", name="Organic Arabica Coffee Beans (1kg)", category="Pantry", current_stock=0, min_stock_alert=8, cost_price=11.50, selling_price=24.00, supplier_name="GreenValley Roasters"),
                models.Product(user_id=user.id, sku="SKU-ELC-103", name="Multi-Port Aluminum USB-C Hub 7-in-1", category="Electronics", current_stock=19, min_stock_alert=10, cost_price=19.50, selling_price=44.99, supplier_name="Apex Tech Global")
            ]
            db.add_all(sample_products)
            db.commit()
            print("Populated initial products catalog.")

        # Re-evaluate smart alerts
        alerts_engine.evaluate_product_stock_alerts(db, user.id)
        print("Stock alerts calculated and generated.")

        print("Database seeding completed successfully!")
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
