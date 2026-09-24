const SCRIPT_SRC = "https://checkout.squadco.com/widget/squad.min.js";

const loadSquadScript = () =>
  new Promise((resolve, reject) => {
    if (window.squad) {
      resolve();
      return;
    }
    const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", reject);
      return;
    }
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Squad checkout"));
    document.body.appendChild(script);
  });

export const openSquadCheckout = async ({
  publicKey,
  email,
  amount,
  currency = "NGN",
  transactionRef,
  customerName,
  callbackUrl,
}) => {
  if (!publicKey) {
    throw new Error("Squad public key is missing");
  }

  await loadSquadScript();

  return new Promise((resolve) => {
    const squadInstance = new window.squad({
      onClose: () => resolve({ closed: true }),
      onLoad: () => {},
      onSuccess: () => resolve({ success: true }),
      key: publicKey,
      email,
      amount: Math.round(Number(amount) * 100),
      currency_code: currency,
      transaction_ref: transactionRef,
      customer_name: customerName,
      callback_url: callbackUrl,
      payment_channels: ["card", "bank", "ussd", "transfer"],
    });
    squadInstance.setup();
    squadInstance.open();
  });
};
