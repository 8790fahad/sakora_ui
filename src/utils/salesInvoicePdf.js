import { jsPDF } from "jspdf";

const PAPER = {
  a4: { format: "a4", margin: 14 },
  a5: { format: "a5", margin: 10 },
  a6: { format: "a6", margin: 8 },
  thermal: { format: [80, 220], margin: 4, thermal: true },
};

const money = (amount) =>
  `NGN ${Number(amount || 0).toLocaleString("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

const itemName = (item) =>
  item.product?.name || item.name || item.description || "Item";

const itemUnit = (item) => item.product?.unit || item.unit || "piece";

function clip(doc, text, maxWidth) {
  const source = String(text || "");
  if (doc.getTextWidth(source) <= maxWidth) return source;
  let value = source;
  while (value.length > 1 && doc.getTextWidth(`${value}…`) > maxWidth) {
    value = value.slice(0, -1);
  }
  return `${value}…`;
}

function buildDocument({ business = {}, sale, format = "a4", includeWaybill = true }) {
  const paper = PAPER[format] || PAPER.a4;
  const receipt = business.receiptSettings || {};
  const showBusiness = receipt.includeBusinessInfo !== false;
  const showItems = receipt.includeItemDetails !== false;
  const withWaybill = includeWaybill && receipt.includeWaybill !== false;
  const footer = receipt.footerText || "Thank you for your business!";
  const invoiceNo = sale.saleNumber || "INV-SAMPLE";
  const date = new Date(sale.date || Date.now()).toLocaleDateString();
  const customerName = sale.customer?.name || sale.customerName || "Walk-in customer";
  const customerPhone = sale.customer?.phone || sale.customerPhone || "";
  const items = sale.items || [];
  const address = [business.address, business.city, business.state]
    .filter(Boolean)
    .join(", ");

  const height = paper.thermal
    ? Math.max(220, 140 + items.length * 16 + (withWaybill ? 90 : 20))
    : undefined;
  const doc = new jsPDF({
    unit: "mm",
    format: paper.thermal ? [80, height] : paper.format,
  });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = paper.margin;
  const right = pageWidth - margin;

  const ensureSpace = (y, needed) => {
    if (paper.thermal || y + needed < pageHeight - 12) return y;
    doc.addPage();
    return 16;
  };

  const drawStandardHeader = (title, number) => {
    if (paper.thermal) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(business.name || "Sakora", pageWidth / 2, 8, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      let y = 13;
      [address, business.phone, business.taxTin ? `TIN ${business.taxTin}` : ""]
        .filter(Boolean)
        .forEach((line) => {
          doc.text(clip(doc, line, pageWidth - 8), pageWidth / 2, y, { align: "center" });
          y += 4;
        });
      doc.setFont("helvetica", "bold");
      doc.text(title, pageWidth / 2, y + 2, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.text(number, pageWidth / 2, y + 6, { align: "center" });
      return y + 12;
    }

    doc.setFillColor(13, 148, 136);
    doc.rect(0, 0, pageWidth, 24, "F");
    doc.setTextColor(255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(paper.format === "a6" ? 11 : 14);
    doc.text(business.name || "Sakora", margin, 10);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    if (showBusiness && address) doc.text(clip(doc, address, pageWidth * 0.55), margin, 15);
    if (showBusiness && business.phone) doc.text(String(business.phone), margin, 19);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(paper.format === "a6" ? 9 : 11);
    doc.text(title, right, 10, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(number, right, 16, { align: "right" });
    doc.setTextColor(17, 24, 39);
    return 32;
  };

  const drawPoweredBy = (y) => {
    const next = ensureSpace(y, 10);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(paper.thermal ? 7 : 8);
    doc.setTextColor(107, 114, 128);
    doc.text("Powered by Nexifour Limited", paper.thermal ? pageWidth / 2 : margin, next, {
      align: paper.thermal ? "center" : "left",
    });
    doc.setTextColor(17, 24, 39);
    return next + 5;
  };

  let y = drawStandardHeader("SALES INVOICE", invoiceNo);
  doc.setFontSize(paper.thermal ? 8 : 9);
  doc.text(`Date ${date}`, margin, y);
  y += 5;
  doc.text(clip(doc, `Bill to: ${customerName}`, right - margin), margin, y);
  y += 4;
  if (customerPhone) {
    doc.text(customerPhone, margin, y);
    y += 4;
  }
  y += 3;

  if (showItems) {
    items.forEach((item) => {
      y = ensureSpace(y, 8);
      const qty = Number(item.quantity || 0);
      const amount = item.totalPrice ?? qty * Number(item.unitPrice || 0);
      const nameWidth = paper.thermal ? right - margin - 28 : right - margin - 46;
      doc.setFont("helvetica", "normal");
      doc.text(clip(doc, itemName(item), nameWidth), margin, y);
      doc.text(
        paper.thermal ? money(amount) : `${qty} ${itemUnit(item)}`,
        paper.thermal ? right : margin + nameWidth + 2,
        y,
        { align: paper.thermal ? "right" : "left" }
      );
      if (!paper.thermal) {
        doc.text(money(amount), right, y, { align: "right" });
      }
      y += paper.thermal ? 5 : 6;
    });
  }

  y += 2;
  doc.setFont("helvetica", "bold");
  [
    ["Subtotal", money(sale.subtotal)],
    ["VAT", money(sale.taxAmount)],
    ["Total", money(sale.total)],
  ].forEach(([label, value]) => {
    y = ensureSpace(y, 6);
    doc.text(label, margin, y);
    doc.text(value, right, y, { align: "right" });
    y += 5;
  });
  doc.setFont("helvetica", "normal");
  y = ensureSpace(y, 8);
  doc.text(`${sale.paymentMethod || "cash"} · ${sale.paymentStatus || "paid"}`, margin, y);
  y += 6;
  doc.setTextColor(75, 85, 99);
  doc.text(clip(doc, footer, right - margin), margin, y);
  y += 6;
  y = drawPoweredBy(y);

  if (withWaybill) {
    if (!paper.thermal) doc.addPage();
    y = paper.thermal ? y + 4 : drawStandardHeader("WAYBILL", `WB-${invoiceNo}`);
    if (paper.thermal) {
      doc.setFont("helvetica", "bold");
      doc.text("WAYBILL", pageWidth / 2, y, { align: "center" });
      doc.setFont("helvetica", "normal");
      y += 5;
      doc.text(`WB-${invoiceNo}`, pageWidth / 2, y, { align: "center" });
      y += 6;
    }
    doc.setFontSize(paper.thermal ? 8 : 9);
    doc.setTextColor(17, 24, 39);
    doc.text(clip(doc, `Deliver to: ${customerName}`, right - margin), margin, y);
    y += 5;
    if (showItems) {
      items.forEach((item) => {
        y = ensureSpace(y, 6);
        doc.text(clip(doc, itemName(item), right - margin - 24), margin, y);
        doc.text(String(Number(item.quantity || 0)), right, y, { align: "right" });
        y += 5;
      });
    }
    y += 10;
    y = ensureSpace(y, 16);
    doc.line(margin, y, margin + (right - margin) * 0.4, y);
    doc.line(margin + (right - margin) * 0.55, y, right, y);
    doc.setFontSize(7);
    doc.setTextColor(107, 114, 128);
    doc.text("Dispatched by", margin, y + 4);
    doc.text("Received by", margin + (right - margin) * 0.55, y + 4);
    drawPoweredBy(y + 12);
  }

  return doc;
}

export function downloadSalesInvoicePdf(options) {
  const sale = options.sale || {};
  const doc = buildDocument(options);
  doc.save(`${sale.saleNumber || "invoice"}-${options.format || "a4"}.pdf`);
}

export function printSalesInvoice(options) {
  const doc = buildDocument(options);
  const url = doc.output("bloburl");
  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", "Sales invoice");
  iframe.style.cssText = "position:fixed;width:0;height:0;border:0;right:0;bottom:0";
  iframe.src = url;
  document.body.appendChild(iframe);
  iframe.onload = () => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
  };
}
