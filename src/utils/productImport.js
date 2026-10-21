import * as XLSX from "xlsx";

export const PRODUCT_IMPORT_HEADERS = [
  "Name",
  "SKU",
  "Barcode",
  "Category",
  "Description",
  "Unit",
  "Cost Price",
  "Selling Price",
  "Opening Stock",
  "Reorder Point",
  "Expiry Date",
];

const HEADER_ALIASES = {
  name: ["name", "product", "product name", "item", "item name"],
  sku: ["sku", "product code", "code"],
  barcode: ["barcode", "bar code", "ean", "upc"],
  category: ["category", "category name", "group"],
  description: ["description", "details", "notes"],
  unit: ["unit", "uom", "unit of measure"],
  costPrice: ["cost price", "cost", "buy price", "purchase price"],
  sellingPrice: [
    "selling price",
    "sell price",
    "price",
    "sale price",
    "retail price",
  ],
  openingStock: [
    "opening stock",
    "stock",
    "quantity",
    "qty",
    "current stock",
    "initial stock",
  ],
  lowStockThreshold: [
    "reorder point",
    "low stock",
    "low stock threshold",
    "reorder",
  ],
  expiryDate: ["expiry date", "expiry", "expiration", "expires"],
};

const normalizeHeader = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const mapHeaderKey = (header) => {
  const normalized = normalizeHeader(header);
  for (const [key, aliases] of Object.entries(HEADER_ALIASES)) {
    if (aliases.includes(normalized)) return key;
  }
  return null;
};

const excelDateToIso = (value) => {
  if (value == null || value === "") return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return "";
    const month = String(parsed.m).padStart(2, "0");
    const day = String(parsed.d).padStart(2, "0");
    return `${parsed.y}-${month}-${day}`;
  }
  const text = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  const asDate = new Date(text);
  if (!Number.isNaN(asDate.getTime())) return asDate.toISOString().slice(0, 10);
  return text;
};

const cellNumber = (value) => {
  if (value == null || value === "") return undefined;
  if (typeof value === "number") return value;
  const cleaned = String(value).replace(/,/g, "").replace(/[^\d.-]/g, "");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : undefined;
};

export function downloadProductImportTemplate() {
  const sample = [
    {
      Name: "Premium Rice 5kg",
      SKU: "",
      Barcode: "",
      Category: "Food & Beverages",
      Description: "Long grain rice",
      Unit: "piece",
      "Cost Price": 7000,
      "Selling Price": 8500,
      "Opening Stock": 40,
      "Reorder Point": 10,
      "Expiry Date": "",
    },
    {
      Name: "Cooking Oil 2L",
      SKU: "",
      Barcode: "",
      Category: "Food & Beverages",
      Description: "",
      Unit: "piece",
      "Cost Price": 3500,
      "Selling Price": 4200,
      "Opening Stock": 25,
      "Reorder Point": 8,
      "Expiry Date": "",
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sample, {
    header: PRODUCT_IMPORT_HEADERS,
  });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Products");
  XLSX.writeFile(workbook, "sakora-product-import-template.xlsx");
}

export function parseProductImportFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: "array", cellDates: true });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
          reject(new Error("The spreadsheet has no sheets"));
          return;
        }

        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, {
          defval: "",
          raw: false,
          dateNF: "yyyy-mm-dd",
        });

        if (!rows.length) {
          reject(new Error("No product rows found in the file"));
          return;
        }

        const firstKeys = Object.keys(rows[0] || {});
        const keyMap = {};
        firstKeys.forEach((header) => {
          const mapped = mapHeaderKey(header);
          if (mapped) keyMap[header] = mapped;
        });

        if (!Object.values(keyMap).includes("name")) {
          reject(
            new Error(
              'Missing "Name" column. Download the template and try again.'
            )
          );
          return;
        }

        const products = rows
          .map((row, index) => {
            const mapped = {};
            Object.entries(row).forEach(([header, value]) => {
              const key = keyMap[header];
              if (!key) return;
              mapped[key] = value;
            });

            const name = String(mapped.name || "").trim();
            if (!name) return null;

            return {
              name,
              sku: String(mapped.sku || "").trim() || undefined,
              barcode: String(mapped.barcode || "").trim() || undefined,
              category: String(mapped.category || "").trim() || undefined,
              description:
                String(mapped.description || "").trim() || undefined,
              unit: String(mapped.unit || "piece").trim() || "piece",
              costPrice: cellNumber(mapped.costPrice) ?? 0,
              sellingPrice: cellNumber(mapped.sellingPrice) ?? 0,
              openingStock: cellNumber(mapped.openingStock) ?? 0,
              lowStockThreshold: cellNumber(mapped.lowStockThreshold) ?? 10,
              expiryDate: excelDateToIso(mapped.expiryDate) || undefined,
              _row: index + 2,
            };
          })
          .filter(Boolean);

        if (!products.length) {
          reject(new Error("No valid product rows found"));
          return;
        }

        resolve(products);
      } catch (error) {
        reject(
          error instanceof Error
            ? error
            : new Error("Could not read the spreadsheet")
        );
      }
    };
    reader.onerror = () => reject(new Error("Could not read the file"));
    reader.readAsArrayBuffer(file);
  });
}
