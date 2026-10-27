export const APP_GUIDE_COPY = {
  "/dashboard":
    "This is Home. You see today’s sales, low stock, recent orders, and the link to your online shop.",
  "/products":
    "Products is your catalog. Add each item with its price and how many you have in stock.",
  "/sales":
    "Sales is the counter. Record what a customer bought, take payment, and give them a receipt.",
  "/orders":
    "Orders are purchases customers place on your online store. Open one to see what they bought and update it as you fulfill it.",
  "/storefront":
    "Storefront is your public shop. Turn it on, save your Squad keys, and copy the link you send customers. Invoices sit under this menu once the shop is on.",
  "/invoices":
    "Invoices are bills you send. Create one for a customer and see whether it has been paid.",
  "/quotations":
    "Quotations are price offers. Send one before a sale, then turn it into a sale when the customer agrees.",
  "/purchases":
    "Purchases are stock you buy. Record them so the items and the money you spent stay on the books.",
  "/expenses":
    "Expenses are other costs, such as rent, transport, and supplies. Log them here.",
  "/customers":
    "Customers are the people who buy from you. Save a customer so the next sale is faster.",
  "/suppliers":
    "Suppliers are the people you buy stock from. Save their name and phone here.",
  "/reports":
    "Reports show how the business is doing: sales, profit, and what sold.",
  "/vat":
    "VAT shows the tax you collected on sales and what you still need to pay.",
  "/team":
    "Team is where you add staff and choose which parts of Sakora each person can open.",
  "/billing":
    "Billing is your Sakora plan. Starter is ₦4,000 a month, Growth is ₦12,000, and Business is ₦20,000. Pay here with Squad.",
  "/referrals":
    "Referrals is your invite code. Share it, and you earn a commission when that business subscribes.",
  "/support":
    "Support is how you ask Sakora for help when something is stuck.",
  "/settings":
    "Settings holds the business profile, logo, phone numbers, colors, and how you get paid.",
};

export const pageGuideKey = (userId, path) =>
  `sakora.guide.page.${userId}.${path}`;

export const isNewAccount = (business) => {
  if (!business?.createdAt) return business?.needsProfileDetails === true;
  const created = new Date(business.createdAt).getTime();
  if (Number.isNaN(created)) return business?.needsProfileDetails === true;
  return Date.now() - created < 7 * 24 * 60 * 60 * 1000;
};
