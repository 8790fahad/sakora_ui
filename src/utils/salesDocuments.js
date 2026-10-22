/**
 * Standardized sales documents (invoice + waybill) — HTML print like AA ERP.
 */

export const PAPER_FORMATS = [
  { id: "a4", label: "A4 (Standard)" },
  { id: "a5", label: "A5" },
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
  if (paperFormat === "a6") paperFormat = "a5";
  if (!["a4", "a5", "thermal"].includes(paperFormat)) {
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
    const value = String(format).toLowerCase() === "a6" ? "a5" : String(format).toLowerCase();
    return ["a4", "a5", "thermal"].includes(value) ? value : "a4";
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

const CURRENCIES = {
  NGN: { symbol: "₦", major: "NAIRA", minor: "KOBO" },
  USD: { symbol: "$", major: "DOLLARS", minor: "CENTS" },
  EUR: { symbol: "€", major: "EUROS", minor: "CENTS" },
  GBP: { symbol: "£", major: "POUNDS", minor: "PENCE" },
};

const currencyOf = (business) => {
  const code = String(business?.currency || "NGN").toUpperCase();
  if (CURRENCIES[code]) return CURRENCIES[code];
  return {
    symbol: business?.currencySymbol || code,
    major: code,
    minor: "CENTS",
  };
};

const money = (amount, business) =>
  `${currencyOf(business).symbol}${Number(amount || 0).toLocaleString("en-NG", {
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

const phoneKey = (phone) => {
  const digits = String(phone || "").replace(/\D/g, "");
  if (/^234\d{10}$/.test(digits)) return digits.slice(3);
  if (/^0\d{10}$/.test(digits)) return digits.slice(1);
  return digits;
};

const businessPhones = (business) => {
  const raw = [
    ...(Array.isArray(business?.phones) ? business.phones : []),
    business?.phone,
  ];
  const seen = new Set();
  const phones = [];
  raw.forEach((value) => {
    String(value || "")
      .split(/[\n,;/|]+/)
      .map((phone) => phone.trim())
      .filter(Boolean)
      .forEach((phone) => {
        const key = phoneKey(phone);
        if (!key || seen.has(key)) return;
        seen.add(key);
        phones.push(phone);
      });
  });
  return phones;
};

const telMarkup = (business, attrs) => {
  const phones = businessPhones(business);
  if (!phones.length) return "";
  return `<div ${attrs}>Tel: ${esc(phones.join(", "))}</div>`;
};

const letterDate = (value) => {
  const formatted = new Date(value || Date.now()).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return formatted.replace(/ (\d{4})$/, ", $1");
};

const amountPlain = (amount) =>
  Number(amount || 0).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const ONES = [
  "",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
];
const TENS = [
  "",
  "",
  "twenty",
  "thirty",
  "forty",
  "fifty",
  "sixty",
  "seventy",
  "eighty",
  "ninety",
];

const chunkToWords = (value) => {
  const words = [];
  let n = value;
  if (n >= 100) {
    words.push(ONES[Math.floor(n / 100)], "hundred");
    n %= 100;
  }
  if (n >= 20) {
    words.push(TENS[Math.floor(n / 10)]);
    if (n % 10) words.push(ONES[n % 10]);
  } else if (n > 0) {
    words.push(ONES[n]);
  }
  return words.filter(Boolean).join(" ");
};

const integerToWords = (value) => {
  let n = Math.floor(Math.abs(Number(value) || 0));
  if (!n) return "zero";
  const scales = ["", "thousand", "million", "billion"];
  const parts = [];
  let scale = 0;
  while (n > 0 && scale < scales.length) {
    const chunk = n % 1000;
    if (chunk) {
      const words = chunkToWords(chunk);
      parts.unshift(scales[scale] ? `${words} ${scales[scale]}` : words);
    }
    n = Math.floor(n / 1000);
    scale += 1;
  }
  return parts.join(" ");
};

const amountInWords = (amount, business) => {
  const { major, minor } = currencyOf(business);
  const value = Math.round(Number(amount || 0) * 100) / 100;
  const whole = Math.floor(Math.abs(value));
  const fraction = Math.round((Math.abs(value) - whole) * 100);
  const singular = {
    DOLLARS: "DOLLAR",
    EUROS: "EURO",
    POUNDS: "POUND",
    CENTS: "CENT",
    PENCE: "PENNY",
  };
  const majorName = whole === 1 && singular[major] ? singular[major] : major;
  const minorName = fraction === 1 && singular[minor] ? singular[minor] : minor;
  const wholeWords = integerToWords(whole).toUpperCase();
  const fractionWords = fraction
    ? ` AND ${integerToWords(fraction).toUpperCase()} ${minorName}`
    : "";
  return `${wholeWords} ${majorName}${fractionWords} ONLY`;
};

const paymentLabel = (method) => {
  const labels = {
    cash: "Cash",
    card: "Card",
    bank: "Bank",
    credit: "Credit",
    mobile: "Mobile",
    pos: "POS",
  };
  const key = String(method || "cash").toLowerCase();
  return labels[key] || key.replace(/^\w/, (c) => c.toUpperCase());
};

const preparedByName = (sale) => {
  const creator = sale?.creator || sale?.createdBy || sale?.user;
  if (creator && typeof creator === "object") {
    const full = [creator.firstName, creator.lastName].filter(Boolean).join(" ");
    if (full) return full;
    if (creator.name) return creator.name;
  }
  return sale?.cashierName || "";
};

const formatRc = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const rest = raw.replace(/^RC\.?\s*/i, "");
  return rest ? `RC. ${rest}` : raw;
};

function letterheadMarkup({
  business,
  address,
  title,
  lines,
  showBusiness,
  colorMode,
}) {
  const phones = businessPhones(business);
  const rc = formatRc(business?.registrationNumber);
  const email = String(business?.email || "").trim();
  const fax = String(business?.fax || "").trim();
  const description = String(business?.description || "").trim();
  const faxEmail = [fax ? `Fax: ${fax}` : "", email ? `Email: ${email}` : ""]
    .filter(Boolean)
    .join(" | ");
  const addressLine = String(address || "").replace(/-/g, "\u2011");
  const telLine = phones.length
    ? `<p class="letterhead-line"><span class="letterhead-keep">Tel:</span> ${phones
        .map((phone) => `<span class="letterhead-keep">${esc(phone)}</span>`)
        .join('<span class="letterhead-sep">, </span>')}</p>`
    : "";
  const details = showBusiness
    ? `${description ? `<p class="letterhead-desc">${esc(description)}</p>` : ""}
       ${addressLine ? `<p class="letterhead-line">${esc(addressLine)}</p>` : ""}
       ${telLine}
       ${faxEmail ? `<p class="letterhead-line">${esc(faxEmail)}</p>` : ""}`
    : "";
  const boxLines = (lines || []).filter(([label]) => label !== "Date");
  const dateLine = (lines || []).find(([label]) => label === "Date");
  const ink = colorMode === "mono" ? "letterhead-bw" : "letterhead-color";

  return `
    <div class="letterhead ${ink}">
      <div class="letterhead-row">
        <div class="letterhead-main">
          ${
            business?.logo
              ? `<div class="letterhead-logo-frame"><img class="letterhead-logo" src="${esc(business.logo)}" alt="" /></div>`
              : ""
          }
          <div class="letterhead-copy">
            <div class="letterhead-name-row">
              <h1 class="letterhead-name">${esc(business?.name || "Sakora")}</h1>
              ${rc ? `<p class="letterhead-rc">${esc(rc)}</p>` : ""}
            </div>
            ${details}
          </div>
        </div>
        <div class="letterhead-side">
          <div class="letterhead-doc">
            <p class="letterhead-doc-title">${esc(title)}</p>
            ${boxLines
              .map(([label, value]) => {
                if (label === "No") {
                  return `<p class="letterhead-doc-no">${esc(label)}: ${esc(value)}</p>`;
                }
                return `<p class="letterhead-doc-extra"><span>${esc(label)}: </span>${esc(value)}</p>`;
              })
              .join("")}
          </div>
          ${
            dateLine
              ? `<p class="letterhead-date">Date: ${esc(dateLine[1])}</p>`
              : ""
          }
        </div>
      </div>
    </div>
  `;
}

const logoMarkup = (business, { size = 56, center = false } = {}) =>
  business?.logo
    ? `<img src="${esc(business.logo)}" alt="" style="width:${size}px;height:${size}px;object-fit:contain;display:block;margin:${center ? "0 auto 6px" : "0 0 6px"}" />`
    : "";

const itemName = (item) =>
  item.product?.name || item.name || item.description || "Item";

const itemUnit = (item) => item.product?.unit || item.unit || "pcs";

function docContext(business = {}, sale = {}, overrides = {}) {
  const receipt = business.receiptSettings || {};
  const kind =
    overrides.kind === "waybill"
      ? "waybill"
      : overrides.kind === "quotation"
        ? "quotation"
        : "invoice";
  const settingsKind = kind === "quotation" ? "invoice" : kind;
  const paperFormat = resolvePaperFormat(business, overrides.format, settingsKind);
  const orientation = resolveOrientation(
    business,
    overrides.orientation,
    settingsKind
  );
  const colorMode = resolveColorMode(business, overrides.colorMode, settingsKind);
  const brand = business.primaryColor || "#0D9488";
  const accent = colorMode === "mono" ? "#111111" : brand;
  const street = String(business.address || "").trim();
  const address = [street, business.city, business.state]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .filter(
      (part, index) =>
        index === 0 || !street.toLowerCase().includes(part.toLowerCase())
    )
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
    kind,
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
  const paperMm = Number.parseFloat(sheetWidth) || 210;
  const headScale =
    paperFormat === "thermal"
      ? 1
      : Math.round((paperMm / 210) * 1000) / 1000;
  const hs = (size) => `${Math.round(size * headScale * 10) / 10}px`;
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
      .center { text-align: center; overflow-wrap: anywhere; }
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
      .letterhead {
        width: 100%;
        border: 2px solid #111;
        margin: 0 0 ${hs(6)};
        padding: ${hs(8)} ${hs(10)};
      }
      .letterhead-bw { background: #fff; color: #111; border-color: #111; }
      .letterhead-color { background: ${accent}; color: #fff; border-color: ${accent}; }
      .letterhead-row { display: flex; align-items: flex-start; justify-content: space-between; gap: ${hs(10)}; }
      .letterhead-main { min-width: 0; flex: 1; display: flex; align-items: flex-start; gap: ${hs(10)}; }
      .letterhead-logo-frame {
        flex: 0 0 auto;
        width: ${hs(84)};
        aspect-ratio: 1;
        overflow: hidden;
        border: 2px solid #111;
        background: #fff;
        padding: ${hs(3)};
      }
      .letterhead-color .letterhead-logo-frame { border-color: #fff; }
      .letterhead-logo { width: 100%; height: 100%; object-fit: contain; display: block; }
      .letterhead-bw .letterhead-logo { filter: grayscale(1) contrast(1.25); }
      .letterhead-copy { min-width: 0; flex: 1; }
      .letterhead-name-row { display: flex; flex-wrap: wrap; align-items: baseline; column-gap: ${hs(8)}; row-gap: ${hs(2)}; width: 100%; }
      .letterhead-name {
        margin: 0;
        min-width: 0;
        font-size: ${hs(20)};
        font-weight: 800;
        text-transform: uppercase;
        line-height: 1.1;
        letter-spacing: 0;
      }
      .letterhead-rc {
        margin: 0;
        font-size: ${hs(11)};
        font-weight: 600;
        white-space: nowrap;
        opacity: 0.85;
      }
      .letterhead-desc, .letterhead-line {
        margin: ${hs(3)} 0 0;
        font-size: ${hs(12)};
        line-height: 1.35;
        opacity: 0.92;
        overflow-wrap: break-word;
        word-break: normal;
        hyphens: none;
      }
      .letterhead-desc { font-style: italic; }
      .letterhead-keep { white-space: nowrap; }
      .letterhead-sep { white-space: pre; }
      .letterhead-side {
        width: ${hs(128)};
        max-width: 34%;
        flex: 0 0 auto;
        display: flex;
        flex-direction: column;
        align-items: stretch;
        gap: ${hs(3)};
      }
      .letterhead-doc {
        width: 100%;
        text-align: center;
        border: 2px solid #111;
        padding: ${hs(4)};
        background: transparent;
        color: inherit;
      }
      .letterhead-color .letterhead-doc {
        border-color: rgba(255,255,255,0.35);
        background: rgba(255,255,255,0.1);
      }
      .letterhead-doc-title {
        margin: 0;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        line-height: 1.15;
        font-size: ${hs(12)};
      }
      .letterhead-doc-no {
        margin: ${hs(2)} 0 0;
        font-weight: 700;
        line-height: 1.15;
        font-size: ${hs(11)};
      }
      .letterhead-doc-extra {
        margin: ${hs(2)} 0 0;
        line-height: 1.15;
        font-size: ${hs(10)};
      }
      .letterhead-doc-extra span { font-weight: 600; opacity: 0.8; }
      .letterhead-date {
        margin: 0;
        text-align: right;
        font-weight: 600;
        font-size: ${hs(12)};
        white-space: nowrap;
      }
      .billto { width: 100%; border: 1px solid #111; border-collapse: collapse; margin: ${compact ? "4px 0" : "6px 0"}; color: #111; }
      .billto th { text-align: left; font-size: ${compact ? "10px" : "11px"}; letter-spacing: 0.06em; padding: 3px 6px; border-bottom: 1px solid #111; background: #fff; }
      .billto td { padding: 4px 6px; font-size: ${compact ? "10px" : "12px"}; }
      .inv { width: 100%; border-collapse: collapse; border: 1px solid #111; color: #111; margin-bottom: ${compact ? "6px" : "8px"}; }
      .inv th, .inv td { border: 1px solid #111; padding: ${compact ? "3px 4px" : "5px 6px"}; font-size: ${compact ? "9px" : "11px"}; background: #fff; color: #111; }
      .inv th { font-weight: 700; text-align: center; }
      .inv .desc { text-align: left; }
      .inv .num { text-align: right; white-space: nowrap; }
      .inv .ctr { text-align: center; }
      .inv .label { text-align: right; font-weight: 700; }
      .inv .grand td { font-weight: 800; font-size: ${compact ? "10px" : "12px"}; }
      .inv td.words { text-align: left; font-weight: 600; font-size: ${compact ? "9px" : "11px"}; }
      .paybox, .meta-box { border: 1px solid #111; color: #111; background: #fff; }
      .paybox { margin-bottom: ${compact ? "6px" : "8px"}; }
      .paybox h4, .meta-box h4 { margin: 0; padding: 4px 6px; border-bottom: 1px solid #111; font-size: ${compact ? "10px" : "12px"}; font-weight: 800; letter-spacing: 0.02em; }
      .paybox p { margin: 0; padding: 6px; font-size: ${compact ? "10px" : "12px"}; }
      .meta-split { display: flex; gap: ${compact ? "6px" : "8px"}; margin-bottom: ${compact ? "6px" : "8px"}; align-items: stretch; }
      .meta-box { flex: 1; min-width: 0; display: flex; flex-direction: column; }
      .meta-box .meta-body { padding: 6px; font-size: ${compact ? "10px" : "12px"}; line-height: 1.45; flex: 1; display: flex; flex-direction: column; }
      .sig-block { margin-top: auto; }
      .barcode { display: block; margin: 6px 0; height: 38px; max-width: 100%; }
      .sig-space { height: ${compact ? "36px" : "52px"}; }
      .wb-ack { margin: ${compact ? "10px 2px 4px" : "16px 4px 6px"}; color: #111; font-size: ${compact ? "10px" : "12px"}; }
      .wb-row { display: flex; gap: ${compact ? "16px" : "36px"}; margin-bottom: ${compact ? "12px" : "18px"}; }
      .wb-field { flex: 1; min-width: 0; display: flex; align-items: flex-end; gap: 8px; }
      .wb-label { white-space: nowrap; }
      .wb-fill { flex: 1; border-bottom: 1px solid #111; min-height: 1.15em; padding: 0 4px 1px; }
      .wb-sign { margin-top: ${compact ? "8px" : "14px"}; }
      .wb-sign-line { display: flex; align-items: flex-end; gap: 8px; }
      .wb-who { margin-top: ${compact ? "18px" : "28px"}; text-align: right; }
      .wb-who .role { letter-spacing: 0.14em; font-size: ${compact ? "9px" : "11px"}; }
      .wb-who .name { font-weight: 800; text-transform: uppercase; margin-top: 2px; }
      .sig-caption { text-align: center; letter-spacing: 0.08em; font-size: ${compact ? "10px" : "11px"}; }
      .for-biz { text-align: center; font-weight: 800; margin-top: 8px; text-transform: uppercase; }
      .thanks { text-align: center; font-style: italic; font-size: ${compact ? "9px" : "11px"}; margin: 8px 4px 2px; line-height: 1.35; white-space: pre-line; }
      .powered-line { text-align: center; font-size: ${compact ? "8px" : "10px"}; margin-bottom: 2px; }
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
    kind,
  } = ctx;

  const isQuote = kind === "quotation";
  const isWaybill = kind === "waybill";
  const waybillNote =
    String(business.receiptSettings?.waybillFooterText || "").trim() ||
    business.receiptSettings?.waybillNote ||
    footer;
  const thanks = isWaybill ? waybillNote : footer;
  const subtotal = Number(sale.subtotal || 0);
  const taxAmount = Number(sale.taxAmount || 0);
  const discount = Number(sale.discountAmount || 0);
  const total = Number(sale.total || subtotal + taxAmount - discount);
  const paid = Number(sale.paidAmount ?? total);
  const balance = Math.max(0, total - paid);
  const notes = String(sale.notes || "").trim();
  const warehouse = sale.branch?.name || sale.warehouse || "";
  const accountNo = sale.customer?.code || sale.customerCode || "";
  const mode = paymentLabel(sale.paymentMethod);
  const preparedBy = preparedByName(sale);
  const totalQty = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

  const columnCount = isWaybill ? 3 : 5;
  const rows = showItems
    ? items
        .map((item, i) => {
          const qty = Number(item.quantity || 0);
          const unitPrice = Number(item.unitPrice || 0);
          const amount = Number(item.totalPrice ?? qty * unitPrice);
          const unit = itemUnit(item);
          const description = unit
            ? `${itemName(item)} (${unit})`
            : itemName(item);
          if (isWaybill) {
            return `<tr>
            <td class="ctr">${i + 1}</td>
            <td class="desc">${esc(description)}</td>
            <td class="ctr">${esc(qtyFmt(qty))}</td>
          </tr>`;
          }
          return `<tr>
            <td class="ctr">${i + 1}</td>
            <td class="desc">${esc(description)}</td>
            <td class="ctr">${esc(qtyFmt(qty))}</td>
            <td class="num">${esc(amountPlain(unitPrice))}</td>
            <td class="num">${esc(amountPlain(amount))}</td>
          </tr>`;
        })
        .join("")
    : `<tr><td colspan="${columnCount}">No line items</td></tr>`;

  const billBits = [`Account Name: ${esc(customerName)}`];
  if (accountNo) billBits.push(`Account No: ${esc(accountNo)}`);
  if (warehouse) billBits.push(`Warehouse: ${esc(warehouse)}`);
  if (!accountNo && customerPhone) billBits.push(esc(customerPhone));

  const payBits = isQuote
    ? [`Quoted amount: ${esc(money(total, business))}`, ...(notes ? [esc(notes)] : [])]
    : [
        `Mode: ${esc(mode)}`,
        `${esc(mode)} received: ${esc(money(paid, business))}`,
        ...(notes ? [esc(notes)] : []),
        ...(balance > 0 ? [`Balance due: ${esc(money(balance, business))}`] : []),
      ];

  const docLines = [
    ["No", invoiceNo],
    ...(warehouse ? [["Warehouse", warehouse]] : []),
    ["Date", letterDate(sale.date)],
  ];

  const compact = paperFormat === "a5" || paperFormat === "a6";
  const body = `
    <div class="sheet">
      ${letterheadMarkup({
        business,
        address,
        title: isWaybill ? "WAYBILL" : isQuote ? "QUOTATION" : "SALES INVOICE",
        compact,
        showBusiness,
        colorMode,
        lines: docLines,
      })}

      <table class="billto">
        <thead><tr><th>BILL TO</th></tr></thead>
        <tbody><tr><td>${billBits.join(" | ")}</td></tr></tbody>
      </table>

      <table class="inv">
        <thead>
          <tr>
            <th style="width:6%">#</th>
            <th>Description/Size</th>
            <th style="width:${isWaybill ? "18%" : "14%"}">Quantity</th>
            ${
              isWaybill
                ? ""
                : `<th style="width:18%">Unit Price(${esc(currencyOf(business).symbol)})</th>
            <th style="width:18%">Amount(${esc(currencyOf(business).symbol)})</th>`
            }
          </tr>
        </thead>
        <tbody>
          ${rows}
          ${
            isWaybill
              ? `<tr>
            <td colspan="2"></td>
            <td class="ctr bold">${esc(qtyFmt(totalQty))}</td>
          </tr>`
              : `<tr>
            <td colspan="2"></td>
            <td class="ctr bold">${esc(qtyFmt(totalQty))}</td>
            <td class="label">SUBTOTAL:</td>
            <td class="num bold">${esc(amountPlain(subtotal))}</td>
          </tr>
          ${
            taxAmount > 0
              ? `<tr><td colspan="4" class="label">VAT${business.taxRate ? ` (${esc(business.taxRate)}%)` : ""}:</td><td class="num">${esc(amountPlain(taxAmount))}</td></tr>`
              : ""
          }
          ${
            discount > 0
              ? `<tr><td colspan="4" class="label">DISCOUNT:</td><td class="num">${esc(amountPlain(discount))}</td></tr>`
              : ""
          }
          <tr class="grand">
            <td colspan="4" class="label">GRAND TOTAL:</td>
            <td class="num">${esc(money(total, business))}</td>
          </tr>
          <tr>
            <td colspan="5" class="words">Amount in words: ${esc(amountInWords(total, business))}</td>
          </tr>`
          }
        </tbody>
      </table>

      ${
        isWaybill
          ? ""
          : `<div class="paybox">
        <h4>${isQuote ? "QUOTED AMOUNT" : "HOW THIS INVOICE IS PAID"}</h4>
        <p>${payBits.join(" | ")}</p>
      </div>`
      }

      ${
        isWaybill
          ? `<div class="wb-ack">
        <div class="wb-row">
          <div class="wb-field">
            <span class="wb-label">Received by:</span>
            <span class="wb-fill"></span>
          </div>
          <div class="wb-field">
            <span class="wb-label">Delivered by:</span>
            <span class="wb-fill"></span>
          </div>
        </div>
        <div class="wb-row">
          <div class="wb-field">
            <span class="wb-label">Vehicle No:</span>
            <span class="wb-fill"></span>
          </div>
          <div class="wb-field">
            <span class="wb-label">Date:</span>
            <span class="wb-fill"></span>
          </div>
        </div>
        <div class="wb-sign">
          <div class="wb-sign-line">
            <span class="wb-label">Signature of Consignee:</span>
            <span class="wb-fill"></span>
          </div>
          <div class="wb-who">
            <div class="role">CONSIGNEE</div>
            <div class="name">${esc(customerName)}</div>
          </div>
        </div>
      </div>`
          : `<div class="meta-split">
        <div class="meta-box">
          <h4>${isQuote ? "Quotation Details" : "Invoice Details"}</h4>
          <div class="meta-body">
            ${
              isQuote
                ? ""
                : `<div>Goods Issue Note No: GIN-${esc(invoiceNo)}</div>`
            }
            <div class="sig-block">
              <div class="sig-space"></div>
              <div class="sig-caption">CUSTOMER SIGNATURE</div>
              <div class="for-biz">${esc(customerName)}</div>
            </div>
          </div>
        </div>
        <div class="meta-box">
          <h4>Prepared Details</h4>
          <div class="meta-body">
            <div>Prepared By: ${esc(preparedBy || "—")}</div>
            <div class="sig-block">
              <div class="sig-space"></div>
              <div class="sig-caption">SIGNATURE</div>
              <div class="for-biz">FOR ${esc(business.name || "Sakora")}</div>
            </div>
          </div>
        </div>
      </div>`
      }

      <div class="thanks">${esc(thanks)}</div>
      <div class="powered-line">This solution is powered by Nexifour Limited</div>
    </div>
  `;

  const docName = isWaybill ? "Waybill" : isQuote ? "Quotation" : "Invoice";
  return wrapHtml(
    `${docName} ${invoiceNo}`,
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
    kind,
  } = ctx;

  const isWaybill = kind === "waybill";
  const waybillNote =
    String(business.receiptSettings?.waybillFooterText || "").trim() ||
    business.receiptSettings?.waybillNote ||
    footer;
  const thanks = isWaybill ? waybillNote : footer;
  const totalQty = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

  const rows = showItems
    ? items
        .map((item) => {
          const qty = Number(item.quantity || 0);
          if (isWaybill) {
            return `<tr>
            <td>${esc(itemName(item))}</td>
            <td class="tr-qty">${esc(qtyFmt(qty))}</td>
          </tr>`;
          }
          const amount = Number(item.totalPrice ?? qty * Number(item.unitPrice || 0));
          return `<tr>
            <td>${esc(itemName(item))} × ${esc(qtyFmt(qty))}</td>
            <td class="tr-qty">${esc(money(amount, business))}</td>
          </tr>`;
        })
        .join("")
    : "";

  const body = `
    ${logoMarkup(business, { size: 40, center: true })}
    <div class="center bold" style="font-size:15px">${esc(business.name || "Sakora")}</div>
    ${address ? `<div class="center" style="font-size:11px">${esc(address)}</div>` : ""}
    ${telMarkup(business, 'class="center" style="font-size:11px"')}
    ${
      business.email || business.registrationNumber
        ? `<div class="center" style="font-size:10px;white-space:nowrap">${[
            business.email ? esc(business.email) : "",
            business.registrationNumber
              ? `Reg. No: ${esc(business.registrationNumber)}`
              : "",
          ]
            .filter(Boolean)
            .join(" &nbsp; ")}</div>`
        : ""
    }
    ${business.taxTin ? `<div class="center" style="font-size:11px">TIN: ${esc(business.taxTin)}</div>` : ""}
    <div class="tr-divider"></div>
    <div class="center bold">${isWaybill ? "WAYBILL" : "SALES INVOICE"}</div>
    <div>No: ${esc(invoiceNo)}</div>
    <div>Date: ${esc(date)}</div>
    <div class="tr-divider"></div>
    <div class="bold">Bill To</div>
    <div>${esc(customerName)}</div>
    ${customerPhone ? `<div>${esc(customerPhone)}</div>` : ""}
    <div class="tr-divider"></div>
    <table class="tr-items">
      <thead><tr><th>Item</th><th class="tr-qty">${isWaybill ? "Qty" : "Amount"}</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="tr-divider"></div>
    ${
      isWaybill
        ? `<div style="display:flex;justify-content:space-between"><span class="bold">Total Qty</span><span class="bold">${esc(qtyFmt(totalQty))}</span></div>
    <div class="tr-divider"></div>
    <div>Received by: ________________</div>
    <div>Delivered by: ________________</div>
    <div>Vehicle No: ________________</div>
    <div>Date: ________________</div>
    <div style="margin-top:8px">Signature of Consignee: ________________</div>
    <div style="text-align:right;margin-top:10px;letter-spacing:0.12em;font-size:11px">CONSIGNEE</div>
    <div style="text-align:right;font-weight:800">${esc(customerName)}</div>`
        : `<div style="display:flex;justify-content:space-between"><span>Subtotal</span><span>${esc(money(sale.subtotal, business))}</span></div>
    ${Number(sale.taxAmount) > 0 ? `<div style="display:flex;justify-content:space-between"><span>VAT</span><span>${esc(money(sale.taxAmount, business))}</span></div>` : ""}
    <div style="display:flex;justify-content:space-between" class="bold"><span>Total</span><span>${esc(money(sale.total, business))}</span></div>
    <div class="tr-note">${esc(amountInWords(sale.total, business))}</div>
    <div class="tr-divider"></div>
    <div>${esc(String(sale.paymentMethod || "cash"))} · ${esc(String(sale.paymentStatus || "paid"))}</div>`
    }
    <div class="tr-note" style="white-space:pre-line">${esc(thanks)}</div>
    <div class="tr-powered">Powered by Nexifour Limited</div>
  `;

  return wrapHtml(
    `${isWaybill ? "Waybill" : "Invoice"} ${invoiceNo}`,
    pageCss({ paperFormat, orientation, colorMode, accent }),
    body
  );
}

export function buildQuotationHtml(options = {}) {
  const ctx = docContext(options.business, options.sale, {
    ...options,
    kind: "quotation",
  });
  return buildStandardInvoiceHtml(ctx);
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
  if (ctx.paperFormat === "thermal") return buildThermalInvoiceHtml(ctx);
  return buildStandardInvoiceHtml(ctx);
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
    "position:fixed;left:0;top:0;width:210mm;height:297mm;border:0;opacity:0;pointer-events:none;z-index:-1";
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
    return true;
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
  return true;
}

export function printQuotation(options = {}) {
  const html = buildQuotationHtml(options);
  return openPrintPage(html, "Quotation");
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
