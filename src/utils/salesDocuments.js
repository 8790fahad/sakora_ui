/**
 * Standardized sales documents (invoice + waybill) — HTML print like AA ERP.
 */

export const PAPER_FORMATS = [
  { id: "a4", label: "A4 (Standard)" },
  { id: "a5", label: "A5" },
  { id: "a6", label: "A6" },
  { id: "thermal", label: "Thermal" },
];

export const ORIENTATIONS = [
  { id: "portrait", label: "Portrait" },
  { id: "landscape", label: "Landscape" },
];

export const COLOR_MODES = [
  { id: "color", label: "Color" },
  { id: "mono", label: "Black & white" },
];

/**
 * Per-document print settings. Falls back to legacy top-level
 * paperFormat / orientation / colorMode when nested keys are missing.
 */
export function getDocPrintSettings(business, kind = "invoice") {
  const receipt = business?.receiptSettings || {};
  const nested = receipt[kind] || {};
  const legacyFormat = receipt.paperFormat;
  const legacyOrientation = receipt.orientation;
  const legacyColor = receipt.colorMode;

  const defaults =
    kind === "waybill"
      ? { paperFormat: "thermal", orientation: "portrait", colorMode: "mono" }
      : { paperFormat: "a4", orientation: "portrait", colorMode: "color" };

  let paperFormat = String(
    nested.paperFormat || legacyFormat || defaults.paperFormat
  ).toLowerCase();
  if (!["a4", "a5", "a6", "thermal"].includes(paperFormat)) {
    paperFormat = defaults.paperFormat;
  }

  let orientation = String(
    nested.orientation || legacyOrientation || defaults.orientation
  ).toLowerCase();
  orientation = orientation === "landscape" ? "landscape" : "portrait";

  let colorMode = String(
    nested.colorMode || legacyColor || defaults.colorMode
  ).toLowerCase();
  colorMode = colorMode === "mono" ? "mono" : "color";

  if (paperFormat === "thermal") {
    orientation = "portrait";
    colorMode = "mono";
  }

  return { paperFormat, orientation, colorMode };
}

export function resolvePaperFormat(business, format, kind = "invoice") {
  if (format) {
    const value = String(format).toLowerCase();
    return ["a4", "a5", "a6", "thermal"].includes(value) ? value : "a4";
  }
  return getDocPrintSettings(business, kind).paperFormat;
}

export function resolveOrientation(business, orientation, kind = "invoice") {
  const paper = resolvePaperFormat(business, undefined, kind);
  if (paper === "thermal") return "portrait";
  if (orientation) {
    return String(orientation).toLowerCase() === "landscape"
      ? "landscape"
      : "portrait";
  }
  return getDocPrintSettings(business, kind).orientation;
}

export function resolveColorMode(business, colorMode, kind = "invoice") {
  const paper = resolvePaperFormat(business, undefined, kind);
  if (paper === "thermal") return "mono";
  if (colorMode) {
    return String(colorMode).toLowerCase() === "mono" ? "mono" : "color";
  }
  return getDocPrintSettings(business, kind).colorMode;
}

export function isInvoiceEnabled(business) {
  return business?.receiptSettings?.includeInvoice !== false;
}

export function isWaybillEnabled(business) {
  return business?.receiptSettings?.includeWaybill !== false;
}

const money = (amount) =>
  `₦${Number(amount || 0).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const qtyFmt = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0";
  const rounded = Math.round(n * 100) / 100;
  const whole = Math.abs(rounded - Math.round(rounded)) < 0.0005;
  return rounded.toLocaleString("en-NG", {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  });
};

const esc = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const itemName = (item) =>
  item.product?.name || item.name || item.description || "Item";

const itemUnit = (item) => item.product?.unit || item.unit || "pcs";

function docContext(business = {}, sale = {}, overrides = {}) {
  const receipt = business.receiptSettings || {};
  const kind = overrides.kind === "waybill" ? "waybill" : "invoice";
  const paperFormat = resolvePaperFormat(business, overrides.format, kind);
  const orientation = resolveOrientation(
    business,
    overrides.orientation,
    kind
  );
  const colorMode = resolveColorMode(business, overrides.colorMode, kind);
  const brand = business.primaryColor || "#0D9488";
  const accent = colorMode === "mono" ? "#111111" : brand;
  const address = [business.address, business.city, business.state]
    .filter(Boolean)
    .join(", ");
  const invoiceNo = sale.saleNumber || "INV-SAMPLE";
  const date = new Date(sale.date || Date.now()).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const customerName =
    sale.customer?.name || sale.customerName || "Walk-in customer";
  const customerPhone = sale.customer?.phone || sale.customerPhone || "";
  const items = sale.items || [];
  const footer =
    receipt.footerText || "Thank you for your business!";
  return {
    business,
    sale,
    receipt,
    paperFormat,
    orientation,
    colorMode,
    accent,
    address,
    invoiceNo,
    date,
    customerName,
    customerPhone,
    items,
    footer,
    showBusiness: receipt.includeBusinessInfo !== false,
    showItems: receipt.includeItemDetails !== false,
  };
}

function pageCss({ paperFormat, orientation, colorMode, accent }) {
  const sizeMap = {
    a4: "A4",
    a5: "A5",
    a6: "A6",
    thermal: "80mm auto",
  };
  const sheetWidthMap = {
    a4: orientation === "landscape" ? "297mm" : "210mm",
    a5: orientation === "landscape" ? "210mm" : "148mm",
    a6: orientation === "landscape" ? "148mm" : "105mm",
  };
  const pageSize =
    paperFormat === "thermal"
      ? "80mm auto"
      : `${sizeMap[paperFormat] || "A4"} ${orientation}`;
  const mono = colorMode === "mono";
  const compact = paperFormat === "a5" || paperFormat === "a6";
  const sheetWidth = sheetWidthMap[paperFormat] || sheetWidthMap.a4;
  const pageMargin = paperFormat === "thermal" ? "2mm" : compact ? "6mm" : "12mm";
  // Mono matches AA ERP Verification Points B&W: white header, black borders.
  const headerBg = mono ? "#ffffff" : accent;
  const headerFg = mono ? "#111111" : "#ffffff";
  const headerBorder = mono ? "#111111" : accent;
  const softBg = mono ? "#ffffff" : "#eff6ff";
  const softBorder = mono ? "#111111" : "#bfdbfe";
  const softLabel = mono ? "#111111" : accent;

  return `
    @page { size: ${pageSize}; margin: ${pageMargin}; }
    * { box-sizing: border-box; }
    html, body {
      margin: 0; padding: 0;
      background: ${paperFormat === "thermal" ? "#fff" : "#e5e7eb"};
      color: #111;
      font-family: ${
        paperFormat === "thermal"
          ? `"Courier New", Courier, monospace`
          : `"Source Sans 3", "Segoe UI", "Helvetica Neue", Arial, sans-serif`
      };
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body { padding: ${paperFormat === "thermal" ? "1mm" : "12px"}; }
    .doc { width: 100%; max-width: 100%; }
    .sheet {
      width: 100%;
      max-width: ${sheetWidth};
      margin: 0 auto;
      background: #fff;
      border: 2px solid ${headerBorder};
      padding: ${compact ? "6px" : "10px"};
    }
    .muted { color: ${mono ? "#333" : "#64748b"}; }
    .accent { color: ${accent}; }
    .bold { font-weight: 700; }
    .right { text-align: right; }
    .center { text-align: center; }
    table { width: 100%; border-collapse: collapse; }
    th, td { vertical-align: top; }
    .sig-line { border-bottom: 1px solid ${mono ? "#111" : "#94a3b8"}; height: ${compact ? "22px" : "28px"}; margin-top: ${compact ? "18px" : "28px"}; }
    .powered { margin-top: ${compact ? "8px" : "16px"}; font-size: ${compact ? "9px" : "10px"}; color: #94a3b8; text-align: center; }
    ${
      paperFormat === "thermal"
        ? `
      body { font-size: 15px; line-height: 1.25; width: 72mm; max-width: 72mm; color: #000; background: #fff; padding: 1mm; }
      .sheet { border: 0; max-width: 72mm; padding: 0; }
      .tr-divider { border-top: 1px dashed #000; margin: 6px 0; }
      .tr-items th { border-bottom: 1px solid #000; font-size: 12px; padding: 2px 0; text-align: left; }
      .tr-items td { padding: 2px 0; font-size: 14px; }
      .tr-qty { text-align: right; width: 22%; }
      .tr-note { font-size: 11px; font-style: italic; margin-top: 4px; text-align: center; line-height: 1.35; }
      .tr-powered { font-size: 9px; margin-top: 3px; text-align: center; line-height: 1.3; }
      .tr-field { margin-top: 6px; }
      .tr-line { border-bottom: 1px solid #000; min-height: 14px; margin: 1px 0 8px; }
    `
        : `
      body { font-size: ${compact ? "11px" : "12px"}; color: #0f172a; }
      .doc-header {
        display: flex; justify-content: space-between; gap: ${compact ? "8px" : "12px"};
        margin-bottom: ${compact ? "8px" : "12px"};
        padding: ${compact ? "8px" : "12px"};
        background: ${headerBg}; color: ${headerFg};
        border: 2px solid ${headerBorder};
      }
      .biz-name { font-size: ${compact ? "14px" : "18px"}; font-weight: 700; margin: 0 0 2px; text-transform: uppercase; letter-spacing: 0.02em; color: ${headerFg}; }
      .biz-line { font-size: ${compact ? "10px" : "12px"}; color: ${mono ? "rgba(0,0,0,0.75)" : "rgba(255,255,255,0.85)"}; line-height: 1.35; }
      .title-box {
        border: 2px solid ${mono ? "#111" : "rgba(255,255,255,0.45)"};
        background: ${mono ? "transparent" : "rgba(255,255,255,0.12)"};
        padding: ${compact ? "4px 6px" : "6px 8px"};
        text-align: center; min-width: ${compact ? "88px" : "110px"};
      }
      .doc-title { font-size: ${compact ? "11px" : "13px"}; font-weight: 800; margin: 0 0 4px; letter-spacing: 0.06em; color: ${headerFg}; }
      .title-meta { font-size: ${compact ? "9px" : "10px"}; color: ${headerFg}; line-height: 1.35; }
      .title-meta .bold { font-weight: 700; }
      .box {
        background: ${softBg}; border: 1px solid ${softBorder};
        padding: ${compact ? "6px 8px" : "10px 12px"}; margin-bottom: ${compact ? "8px" : "12px"};
      }
      .box-label { font-size: ${compact ? "9px" : "10px"}; font-weight: 700; color: ${softLabel}; letter-spacing: 0.06em; margin-bottom: 2px; text-transform: uppercase; }
      .items { border: 1px solid ${mono ? "#111" : "#cbd5e1"}; }
      .items thead th {
        background: ${mono ? "#ffffff" : headerBg}; color: ${mono ? "#111" : headerFg};
        padding: ${compact ? "5px 4px" : "8px 6px"};
        font-size: ${compact ? "10px" : "11px"}; text-align: left;
        border-bottom: 1px solid ${mono ? "#111" : "transparent"};
        border-right: 1px solid ${mono ? "#111" : "rgba(255,255,255,0.25)"};
      }
      .items thead th:last-child { border-right: 0; }
      .items tbody td {
        padding: ${compact ? "5px 4px" : "7px 6px"};
        border-bottom: 1px solid ${mono ? "#111" : "#e2e8f0"};
        border-right: 1px solid ${mono ? "#111" : "#e2e8f0"};
      }
      .items tbody td:last-child { border-right: 0; }
      .items tbody tr:nth-child(even) td { background: ${mono ? "#ffffff" : "#f8fafc"}; }
      .totals { width: ${compact ? "200px" : "260px"}; margin-left: auto; margin-top: ${compact ? "8px" : "12px"}; }
      .totals td { padding: ${compact ? "3px 0" : "4px 0"}; }
      .totals .grand td {
        background: ${mono ? "#ffffff" : headerBg}; color: ${mono ? "#111" : headerFg};
        font-weight: 700; padding: ${compact ? "6px 8px" : "8px 10px"};
        border: ${mono ? "1px solid #111" : "0"};
      }
      .notes { margin-top: ${compact ? "8px" : "14px"}; white-space: pre-wrap; color: #334155; }
      .sigs { display: flex; justify-content: space-between; gap: ${compact ? "16px" : "24px"}; margin-top: ${compact ? "16px" : "28px"}; }
      .sig { width: 42%; }
      .sig-label { font-size: ${compact ? "9px" : "10px"}; color: #64748b; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.04em; }
      .footer-note { margin-top: ${compact ? "8px" : "16px"}; font-style: italic; }
    `
    }
    @media print {
      html, body { background: #fff !important; padding: 0 !important; }
      .sheet { border-color: ${headerBorder}; max-width: 100%; width: 100%; }
      .no-print { display: none !important; }
    }
  `;
}

function wrapHtml(title, css, bodyHtml) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${esc(title)}</title>
  <style>${css}</style>
</head>
<body>
  <div class="doc">${bodyHtml}</div>
</body>
</html>`;
}

function buildStandardInvoiceHtml(ctx) {
  const {
    business,
    sale,
    accent,
    address,
    invoiceNo,
    date,
    customerName,
    customerPhone,
    items,
    footer,
    showBusiness,
    showItems,
    paperFormat,
    orientation,
    colorMode,
  } = ctx;

  const subtotal = Number(sale.subtotal || 0);
  const taxAmount = Number(sale.taxAmount || 0);
  const discount = Number(sale.discountAmount || 0);
  const total = Number(sale.total || subtotal + taxAmount - discount);
  const paid = Number(sale.paidAmount ?? total);
  const balance = Math.max(0, total - paid);
  const notes = String(sale.notes || "").trim();

  const rows = showItems
    ? items
        .map((item, i) => {
          const qty = Number(item.quantity || 0);
          const unitPrice = Number(item.unitPrice || 0);
          const amount = Number(item.totalPrice ?? qty * unitPrice);
          return `<tr>
            <td>${i + 1}</td>
            <td>${esc(itemName(item))}</td>
            <td class="right">${esc(qtyFmt(qty))}</td>
            <td class="right">${esc(itemUnit(item))}</td>
            <td class="right">${esc(money(unitPrice))}</td>
            <td class="right bold">${esc(money(amount))}</td>
          </tr>`;
        })
        .join("")
    : `<tr><td colspan="6" class="muted">No line items</td></tr>`;

  const body = `
    <div class="sheet">
      <div class="doc-header">
        <div>
          <p class="biz-name">${esc(business.name || "Sakora")}</p>
          ${
            showBusiness
              ? `${address ? `<div class="biz-line">${esc(address)}</div>` : ""}
                 ${business.phone ? `<div class="biz-line">Tel: ${esc(business.phone)}</div>` : ""}
                 ${business.email ? `<div class="biz-line">Email: ${esc(business.email)}</div>` : ""}
                 ${business.taxTin ? `<div class="biz-line bold">TIN: ${esc(business.taxTin)}</div>` : ""}`
              : ""
          }
        </div>
        <div class="title-box">
          <p class="doc-title">INVOICE</p>
          <div class="title-meta">No: <span class="bold">${esc(invoiceNo)}</span></div>
          <div class="title-meta">Date: <span class="bold">${esc(date)}</span></div>
          <div class="title-meta">Payment: <span class="bold">${esc(String(sale.paymentMethod || "cash").toUpperCase())}</span></div>
          <div class="title-meta">Status: <span class="bold">${esc(String(sale.paymentStatus || "paid").toUpperCase())}</span></div>
        </div>
      </div>

      <div class="box">
        <div class="box-label">Bill To</div>
        <div class="bold">${esc(customerName)}</div>
        ${customerPhone ? `<div class="muted">${esc(customerPhone)}</div>` : ""}
      </div>

      <table class="items">
        <thead>
          <tr>
            <th style="width:6%">#</th>
            <th>Description</th>
            <th class="right" style="width:10%">Qty</th>
            <th class="right" style="width:10%">Unit</th>
            <th class="right" style="width:16%">Unit Price</th>
            <th class="right" style="width:16%">Amount</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <table class="totals">
        <tr><td class="muted">Subtotal</td><td class="right">${esc(money(subtotal))}</td></tr>
        ${
          taxAmount > 0
            ? `<tr><td class="muted">VAT${business.taxRate ? ` (${esc(business.taxRate)}%)` : ""}</td><td class="right">${esc(money(taxAmount))}</td></tr>`
            : ""
        }
        ${
          discount > 0
            ? `<tr><td class="muted">Discount</td><td class="right">−${esc(money(discount))}</td></tr>`
            : ""
        }
        <tr class="grand"><td>TOTAL</td><td class="right">${esc(money(total))}</td></tr>
        <tr><td class="muted">Amount Paid</td><td class="right">${esc(money(paid))}</td></tr>
        ${
          balance > 0
            ? `<tr><td class="bold" style="color:#b91c1c">Balance Due</td><td class="right bold" style="color:#b91c1c">${esc(money(balance))}</td></tr>`
            : ""
        }
      </table>

      ${
        notes
          ? `<div class="notes"><div class="box-label">Payment Details</div>${esc(notes)}</div>`
          : ""
      }

      <p class="muted footer-note">${esc(footer)}</p>

      <div class="sigs">
        <div class="sig"><div class="sig-line"></div><div class="sig-label">Authorized Signature</div></div>
        <div class="sig"><div class="sig-line"></div><div class="sig-label">Customer Signature</div></div>
      </div>
      <div class="powered">Powered by Nexifour Limited</div>
    </div>
  `;

  return wrapHtml(
    `Invoice ${invoiceNo}`,
    pageCss({ paperFormat, orientation, colorMode, accent }),
    body
  );
}

function buildStandardWaybillHtml(ctx) {
  const {
    business,
    accent,
    address,
    invoiceNo,
    date,
    customerName,
    customerPhone,
    items,
    footer,
    showBusiness,
    showItems,
    paperFormat,
    orientation,
    colorMode,
  } = ctx;

  const rows = showItems
    ? items
        .map((item, i) => {
          const qty = Number(item.quantity || 0);
          return `<tr>
            <td class="center">${i + 1}</td>
            <td class="bold">${esc(itemName(item))}</td>
            <td class="center">${esc(qtyFmt(qty))}</td>
            <td class="center">${esc(itemUnit(item))}</td>
          </tr>`;
        })
        .join("")
    : `<tr><td colspan="4" class="muted">No items</td></tr>`;

  const totalQty = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const waybillNote =
    business.receiptSettings?.waybillNote ||
    footer ||
    "Thank you for patronizing us. Goods sold in good condition are final.";

  const body = `
    <div class="sheet">
      <div class="doc-header">
        <div>
          <p class="biz-name">${esc(business.name || "Sakora")}</p>
          ${
            showBusiness
              ? `${address ? `<div class="biz-line">${esc(address)}</div>` : ""}
                 ${business.phone ? `<div class="biz-line">Tel: ${esc(business.phone)}</div>` : ""}
                 ${business.email ? `<div class="biz-line">Email: ${esc(business.email)}</div>` : ""}
                 ${business.taxTin ? `<div class="biz-line bold">TIN: ${esc(business.taxTin)}</div>` : ""}`
              : `${address ? `<div class="biz-line">${esc(address)}</div>` : ""}
                 ${business.phone ? `<div class="biz-line">Tel: ${esc(business.phone)}</div>` : ""}`
          }
        </div>
        <div class="title-box">
          <p class="doc-title">WAYBILL</p>
          <div class="title-meta">No: <span class="bold">WB-${esc(invoiceNo)}</span></div>
          <div class="title-meta">Date: <span class="bold">${esc(date)}</span></div>
          <div class="title-meta">Invoice: <span class="bold">${esc(invoiceNo)}</span></div>
        </div>
      </div>

      <div class="box">
        <div class="box-label">Deliver To</div>
        <div class="bold">${esc(customerName)}</div>
        ${customerPhone ? `<div class="muted">${esc(customerPhone)}</div>` : ""}
      </div>

      <table class="items">
        <thead>
          <tr>
            <th class="center" style="width:8%">#</th>
            <th>Description</th>
            <th class="center" style="width:16%">Quantity</th>
            <th class="center" style="width:14%">Unit</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <table class="totals">
        <tr class="grand"><td>TOTAL QTY</td><td class="right">${esc(qtyFmt(totalQty))}</td></tr>
      </table>

      <p class="muted footer-note">${esc(waybillNote)}</p>

      <div class="sigs">
        <div class="sig"><div class="sig-line"></div><div class="sig-label">Dispatched by</div></div>
        <div class="sig"><div class="sig-line"></div><div class="sig-label">Received by</div></div>
      </div>
      <div class="powered">Powered by Nexifour Limited</div>
    </div>
  `;

  return wrapHtml(
    `Waybill WB-${invoiceNo}`,
    pageCss({ paperFormat, orientation, colorMode, accent }),
    body
  );
}

/** Thermal Goods Issue Note — AA ERP style (qty only, monospace). */
function buildThermalWaybillHtml(ctx) {
  const {
    business,
    sale,
    address,
    invoiceNo,
    date,
    customerName,
    customerPhone,
    items,
    showItems,
    paperFormat,
    orientation,
    colorMode,
    accent,
  } = ctx;

  const totalQty = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const note =
    business.receiptSettings?.waybillNote ||
    "Thank you for patronizing us. We look forward to your return and to continuing to do business with you, and all goods sold in good condition are final. No refunds or exchanges will be accepted after purchase.";

  const rows = showItems
    ? items
        .map(
          (item) => `<tr>
            <td>${esc(itemName(item))}</td>
            <td class="tr-qty">${esc(qtyFmt(item.quantity))}</td>
          </tr>`
        )
        .join("")
    : "";

  const body = `
    <div class="center bold" style="font-size:15px">${esc(business.name || "Sakora")}</div>
    ${address ? `<div class="center" style="font-size:11px">${esc(address)}</div>` : ""}
    ${business.phone ? `<div class="center" style="font-size:11px">Tel: ${esc(business.phone)}</div>` : ""}
    <div class="tr-divider"></div>
    <div class="center bold">GOODS ISSUE NOTE</div>
    <div>No: GIN-${esc(invoiceNo)}</div>
    <div>Date: ${esc(date)}</div>
    <div>Invoice: ${esc(invoiceNo)}</div>
    <div class="tr-divider"></div>
    <div class="bold">Issue To</div>
    <div>${esc(customerName)}</div>
    ${customerPhone ? `<div>${esc(customerPhone)}</div>` : ""}
    <div class="tr-divider"></div>
    <table class="tr-items">
      <thead><tr><th>Item</th><th class="tr-qty">Qty</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="tr-divider"></div>
    <div style="display:flex;justify-content:space-between">
      <span class="bold">Total Qty</span>
      <span class="bold">${esc(qtyFmt(totalQty))}</span>
    </div>
    <div class="tr-divider"></div>
    <div class="bold">Approval Details</div>
    <div class="tr-divider"></div>
    <div class="tr-field">Prepared: <span class="bold">${esc(
      sale.createdBy?.name || sale.user?.name || sale.cashierName || "—"
    )}</span></div>
    <div class="tr-divider"></div>
    <div class="tr-note">${esc(note)}</div>
    <div class="tr-powered">This solution is powered by Nexifour Limited</div>
  `;

  return wrapHtml(
    `GIN-${invoiceNo}`,
    pageCss({ paperFormat, orientation, colorMode, accent }),
    body
  );
}

function buildThermalInvoiceHtml(ctx) {
  const {
    business,
    sale,
    address,
    invoiceNo,
    date,
    customerName,
    customerPhone,
    items,
    showItems,
    footer,
    paperFormat,
    orientation,
    colorMode,
    accent,
  } = ctx;

  const rows = showItems
    ? items
        .map((item) => {
          const qty = Number(item.quantity || 0);
          const amount = Number(item.totalPrice ?? qty * Number(item.unitPrice || 0));
          return `<tr>
            <td>${esc(itemName(item))} × ${esc(qtyFmt(qty))}</td>
            <td class="tr-qty">${esc(money(amount))}</td>
          </tr>`;
        })
        .join("")
    : "";

  const body = `
    <div class="center bold" style="font-size:15px">${esc(business.name || "Sakora")}</div>
    ${address ? `<div class="center" style="font-size:11px">${esc(address)}</div>` : ""}
    ${business.phone ? `<div class="center" style="font-size:11px">Tel: ${esc(business.phone)}</div>` : ""}
    ${business.taxTin ? `<div class="center" style="font-size:11px">TIN: ${esc(business.taxTin)}</div>` : ""}
    <div class="tr-divider"></div>
    <div class="center bold">SALES INVOICE</div>
    <div>No: ${esc(invoiceNo)}</div>
    <div>Date: ${esc(date)}</div>
    <div class="tr-divider"></div>
    <div class="bold">Bill To</div>
    <div>${esc(customerName)}</div>
    ${customerPhone ? `<div>${esc(customerPhone)}</div>` : ""}
    <div class="tr-divider"></div>
    <table class="tr-items">
      <thead><tr><th>Item</th><th class="tr-qty">Amount</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="tr-divider"></div>
    <div style="display:flex;justify-content:space-between"><span>Subtotal</span><span>${esc(money(sale.subtotal))}</span></div>
    ${Number(sale.taxAmount) > 0 ? `<div style="display:flex;justify-content:space-between"><span>VAT</span><span>${esc(money(sale.taxAmount))}</span></div>` : ""}
    <div style="display:flex;justify-content:space-between" class="bold"><span>Total</span><span>${esc(money(sale.total))}</span></div>
    <div class="tr-divider"></div>
    <div>${esc(String(sale.paymentMethod || "cash"))} · ${esc(String(sale.paymentStatus || "paid"))}</div>
    <div class="tr-note">${esc(footer)}</div>
    <div class="tr-powered">Powered by Nexifour Limited</div>
  `;

  return wrapHtml(
    `Invoice ${invoiceNo}`,
    pageCss({ paperFormat, orientation, colorMode, accent }),
    body
  );
}

export function buildInvoiceHtml(options = {}) {
  const ctx = docContext(options.business, options.sale, {
    ...options,
    kind: "invoice",
  });
  if (ctx.paperFormat === "thermal") return buildThermalInvoiceHtml(ctx);
  return buildStandardInvoiceHtml(ctx);
}

export function buildWaybillHtml(options = {}) {
  const ctx = docContext(options.business, options.sale, {
    ...options,
    kind: "waybill",
  });
  if (ctx.paperFormat === "thermal") return buildThermalWaybillHtml(ctx);
  return buildStandardWaybillHtml(ctx);
}

export function getDocumentPreviewSrc(html) {
  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}

function openPrintFrame(html, title) {
  let frame = document.getElementById("sakora-doc-print-frame");
  if (frame) frame.remove();
  frame = document.createElement("iframe");
  frame.id = "sakora-doc-print-frame";
  frame.setAttribute("title", title || "Print");
  frame.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none";
  document.body.appendChild(frame);
  const win = frame.contentWindow;
  const doc = frame.contentDocument || win?.document;
  doc.open();
  doc.write(html);
  doc.close();
  const go = () => {
    try {
      win.focus();
      win.print();
    } catch {
      /* ignore */
    }
  };
  setTimeout(go, 250);
}

/** Open a real tab/window with the document, then trigger the print dialog. */
function openPrintPage(html, title) {
  const win = window.open("", "_blank");
  if (!win) {
    openPrintFrame(html, title);
    return;
  }
  const doc = win.document;
  doc.open();
  doc.write(html);
  doc.close();
  if (title) doc.title = title;
  setTimeout(() => {
    try {
      win.focus();
      win.print();
    } catch {
      /* ignore */
    }
  }, 300);
}

export function printSalesInvoice(options = {}) {
  const openAsPage = options.openAsPage === true;
  const html = buildInvoiceHtml(options);
  if (openAsPage) openPrintPage(html, "Sales invoice");
  else openPrintFrame(html, "Sales invoice");
}

export function printSalesWaybill(options = {}) {
  const openAsPage = options.openAsPage === true;
  const html = buildWaybillHtml(options);
  if (openAsPage) openPrintPage(html, "Sales waybill");
  else openPrintFrame(html, "Sales waybill");
}

export function downloadSalesInvoiceHtml(options = {}) {
  const sale = options.sale || {};
  const html = buildInvoiceHtml(options);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${sale.saleNumber || "invoice"}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadSalesWaybillHtml(options = {}) {
  const sale = options.sale || {};
  const html = buildWaybillHtml(options);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `WB-${sale.saleNumber || "waybill"}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

/** @deprecated Prefer printSalesInvoice / HTML preview */
export function downloadSalesInvoicePdf(options) {
  printSalesInvoice(options);
}

/** @deprecated Prefer printSalesWaybill / HTML preview */
export function downloadSalesWaybillPdf(options) {
  printSalesWaybill(options);
}

export function getSalesInvoiceBlobUrl(options) {
  return getDocumentPreviewSrc(buildInvoiceHtml(options));
}

export function getSalesWaybillBlobUrl(options) {
  return getDocumentPreviewSrc(buildWaybillHtml(options));
}
