"""
Pydantic Schemas for Request & Response Data Models in BizPilot AI.
"""
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field


# --- Product Schemas ---
class ProductBase(BaseModel):
    sku: str
    name: str
    description: Optional[str] = None
    category: str = "General"
    current_stock: int = Field(default=0, ge=0)
    min_stock_alert: int = Field(default=10, ge=0)
    cost_price: float = Field(default=0.0, ge=0.0)
    selling_price: float = Field(default=0.0, ge=0.0)
    supplier_name: Optional[str] = None


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    current_stock: Optional[int] = None
    min_stock_alert: Optional[int] = None
    cost_price: Optional[float] = None
    selling_price: Optional[float] = None
    supplier_name: Optional[str] = None


class ProductResponse(ProductBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# --- Invoice Item Schemas ---
class InvoiceItemBase(BaseModel):
    description: str
    quantity: int = Field(default=1, gt=0)
    unit_price: float = Field(default=0.0, ge=0.0)
    total_price: float = Field(default=0.0, ge=0.0)
    product_id: Optional[int] = None


class InvoiceItemCreate(InvoiceItemBase):
    pass


class InvoiceItemResponse(InvoiceItemBase):
    id: int
    invoice_id: int

    class Config:
        from_attributes = True


# --- Invoice Schemas ---
class InvoiceBase(BaseModel):
    invoice_number: str
    vendor_name: str
    invoice_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    subtotal: float = 0.0
    tax_amount: float = 0.0
    total_amount: float = 0.0


class InvoiceCreate(InvoiceBase):
    items: List[InvoiceItemCreate] = []


class InvoiceResponse(InvoiceBase):
    id: int
    user_id: int
    status: str
    raw_ocr_text: Optional[str] = None
    file_path: Optional[str] = None
    created_at: datetime
    approved_at: Optional[datetime] = None
    items: List[InvoiceItemResponse] = []

    class Config:
        from_attributes = True


# --- Alert Schemas ---
class AlertResponse(BaseModel):
    id: int
    user_id: int
    product_id: int
    product_name: Optional[str] = None
    product_sku: Optional[str] = None
    severity: str
    message: str
    is_resolved: bool
    created_at: datetime

    class Config:
        from_attributes = True


# --- Stock Adjustment Schema ---
class StockAdjustment(BaseModel):
    change_quantity: int
    reason: str = "manual_adjustment"
    reference_id: Optional[str] = None


# --- AI Chat Schemas ---
class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []


class ChatResponse(BaseModel):
    reply: str
    action_suggested: Optional[str] = None
    related_products: Optional[List[dict]] = None
