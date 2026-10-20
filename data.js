/**
 * BizPilot AI — Initial Mock Data & Sample Bills
 * Provides realistic small-business inventory, invoices, and supplier documents.
 */

const INITIAL_PRODUCTS = [
  {
    id: 1,
    sku: "SKU-ELC-101",
    name: "USB-C Braided Fast Cable (2m)",
    category: "Electronics",
    current_stock: 42,
    min_stock_alert: 15,
    cost_price: 4.50,
    selling_price: 14.99,
    supplier_name: "Apex Tech Global"
  },
  {
    id: 2,
    sku: "SKU-ELC-102",
    name: "Wireless Ergonomic Mouse Pro",
    category: "Electronics",
    current_stock: 4,
    min_stock_alert: 12,
    cost_price: 13.50,
    selling_price: 29.99,
    supplier_name: "Apex Tech Global"
  },
  {
    id: 3,
    sku: "SKU-PKG-201",
    name: "Heavy Duty Packaging Tape (6-Pack)",
    category: "Packaging",
    current_stock: 3,
    min_stock_alert: 15,
    cost_price: 6.80,
    selling_price: 16.50,
    supplier_name: "Metro Warehouse Supplies"
  },
  {
    id: 4,
    sku: "SKU-PKG-202",
    name: "Corrugated Shipping Boxes M (12x10x8)",
    category: "Packaging",
    current_stock: 95,
    min_stock_alert: 25,
    cost_price: 1.25,
    selling_price: 3.49,
    supplier_name: "Metro Warehouse Supplies"
  },
  {
    id: 5,
    sku: "SKU-BEV-301",
    name: "Organic Arabica Coffee Beans (1kg)",
    category: "Pantry",
    current_stock: 0,
    min_stock_alert: 8,
    cost_price: 11.50,
    selling_price: 24.00,
    supplier_name: "GreenValley Roasters"
  },
  {
    id: 6,
    sku: "SKU-ELC-103",
    name: "Multi-Port Aluminum USB-C Hub 7-in-1",
    category: "Electronics",
    current_stock: 19,
    min_stock_alert: 10,
    cost_price: 19.50,
    selling_price: 44.99,
    supplier_name: "Apex Tech Global"
  },
  {
    id: 7,
    sku: "SKU-OFC-401",
    name: "Thermal Receipt Paper Rolls (50-Pack)",
    category: "Office",
    current_stock: 8,
    min_stock_alert: 10,
    cost_price: 14.00,
    selling_price: 27.50,
    supplier_name: "Metro Warehouse Supplies"
  }
];

const INITIAL_INVOICES = [
  {
    id: 101,
    invoice_number: "INV-2026-8841",
    vendor_name: "Apex Tech Global",
    invoice_date: "2026-10-14",
    status: "approved",
    subtotal: 675.00,
    tax_amount: 54.00,
    total_amount: 729.00,
    items: [
      { description: "USB-C Braided Fast Cable (2m)", quantity: 50, unit_price: 4.50, total_price: 225.00, matched_product_id: 1 },
      { description: "Multi-Port Aluminum USB-C Hub 7-in-1", quantity: 20, unit_price: 19.50, total_price: 390.00, matched_product_id: 6 },
      { description: "Shipping & Handling", quantity: 1, unit_price: 60.00, total_price: 60.00, matched_product_id: null }
    ]
  },
  {
    id: 102,
    invoice_number: "INV-2026-9022",
    vendor_name: "Metro Warehouse Supplies",
    invoice_date: "2026-10-18",
    status: "pending_review",
    subtotal: 342.50,
    tax_amount: 27.40,
    total_amount: 369.90,
    items: [
      { description: "Corrugated Shipping Boxes M (12x10x8)", quantity: 100, unit_price: 1.25, total_price: 125.00, matched_product_id: 4 },
      { description: "Heavy Duty Packaging Tape (6-Pack)", quantity: 25, unit_price: 6.80, total_price: 170.00, matched_product_id: 3 },
      { description: "Bubble Wrap Roll 100ft", quantity: 3, unit_price: 15.83, total_price: 47.50, matched_product_id: null }
    ]
  }
];

// Sample pre-formatted invoices for instant 1-click OCR demo testing
const SAMPLE_INVOICE_TEMPLATES = [
  {
    name: "Tech Hardware Bill (Apex Tech)",
    vendor_name: "Apex Tech Global Distributors",
    invoice_number: "INV-AT-4491",
    invoice_date: "2026-10-20",
    items: [
      { description: "Wireless Ergonomic Mouse Pro", quantity: 30, unit_price: 13.50, total_price: 405.00 },
      { description: "USB-C Braided Fast Cable (2m)", quantity: 40, unit_price: 4.50, total_price: 180.00 },
      { description: "Mechanical RGB Gaming Keyboard", quantity: 15, unit_price: 32.00, total_price: 480.00 }
    ],
    subtotal: 1065.00,
    tax_amount: 85.20,
    total_amount: 1150.20
  },
  {
    name: "Coffee Roastery Bill (GreenValley)",
    vendor_name: "GreenValley Roasters Inc.",
    invoice_number: "INV-GVR-9912",
    invoice_date: "2026-10-19",
    items: [
      { description: "Organic Arabica Coffee Beans (1kg)", quantity: 25, unit_price: 11.50, total_price: 287.50 },
      { description: "Colombian Supremo Ground (500g)", quantity: 20, unit_price: 7.20, total_price: 144.00 }
    ],
    subtotal: 431.50,
    tax_amount: 34.52,
    total_amount: 466.02
  },
  {
    name: "Warehouse Packaging (Metro Supplies)",
    vendor_name: "Metro Warehouse Supplies",
    invoice_number: "INV-MWS-7731",
    invoice_date: "2026-10-20",
    items: [
      { description: "Heavy Duty Packaging Tape (6-Pack)", quantity: 40, unit_price: 6.80, total_price: 272.00 },
      { description: "Thermal Receipt Paper Rolls (50-Pack)", quantity: 20, unit_price: 14.00, total_price: 280.00 }
    ],
    subtotal: 552.00,
    tax_amount: 44.16,
    total_amount: 596.16
  }
];

window.BizPilotData = {
  INITIAL_PRODUCTS,
  INITIAL_INVOICES,
  SAMPLE_INVOICE_TEMPLATES
};
