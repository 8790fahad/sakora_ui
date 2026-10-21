/** Customer shops on the website: https://sakora.shop/{businessSlug} */
const STOREFRONT_ORIGIN = (
  import.meta.env.VITE_STOREFRONT_URL || "http://localhost:5174"
).replace(/\/$/, "");

/** Public shop URL: https://sakora.shop/{businessSlug} */
export const shopUrl = (slug) => `${STOREFRONT_ORIGIN}/${slug}`;

export const productUrl = (slug, productId) =>
  `${STOREFRONT_ORIGIN}/${slug}?product=${productId}`;

/** Order + payment verification: https://sakora.shop/{slug}/{orderNumber} */
export const orderUrl = (slug, orderNumber) =>
  `${STOREFRONT_ORIGIN}/${slug}/${orderNumber}`;

export const trackOrderUrl = (slug = "", orderNumber = "") => {
  const params = new URLSearchParams();
  if (slug) params.set("shop", slug);
  if (orderNumber) params.set("order", orderNumber);
  const query = params.toString();
  return `${STOREFRONT_ORIGIN}/track${query ? `?${query}` : ""}`;
};

export const toWhatsAppNumber = (phone) => {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("234")) return digits;
  if (digits.startsWith("0")) return `234${digits.slice(1)}`;
  return digits;
};

export const whatsappLink = (phone, text) => {
  const number = toWhatsAppNumber(phone);
  const encoded = encodeURIComponent(text);
  return number
    ? `https://wa.me/${number}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;
};

export const shareShopText = (storeName, url) =>
  `Shop with ${storeName} 🛍️\n${url}\nPay with Squad (card, transfer, USSD).`;

export const shareProductText = (storeName, product, url) =>
  `${product.name} — ₦${parseFloat(product.sellingPrice || 0).toLocaleString()}\n${
    product.description ? `${product.description}\n` : ""
  }Order here: ${url}`;

export const copyText = async (value) => {
  await navigator.clipboard.writeText(value);
};

export const asSettings = (value) => {
  if (!value) return {};
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch (error) {
    return {};
  }
};
