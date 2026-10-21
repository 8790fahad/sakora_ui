/**
 * @deprecated Prefer `./salesDocuments` — HTML print like AA ERP.
 * Re-exports kept so existing imports keep working.
 */
export {
  PAPER_FORMATS,
  ORIENTATIONS,
  COLOR_MODES,
  getDocPrintSettings,
  resolvePaperFormat,
  resolveOrientation,
  resolveColorMode,
  isInvoiceEnabled,
  isWaybillEnabled,
  buildInvoiceHtml,
  buildWaybillHtml,
  getDocumentPreviewSrc,
  printSalesInvoice,
  printSalesWaybill,
  downloadSalesInvoiceHtml,
  downloadSalesWaybillHtml,
  downloadSalesInvoicePdf,
  downloadSalesWaybillPdf,
  getSalesInvoiceBlobUrl,
  getSalesWaybillBlobUrl,
} from "./salesDocuments";
