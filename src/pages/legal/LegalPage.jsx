import React from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const documents = {
  terms: {
    title: "General Terms of Use",
    updated: "22 September 2026",
    sections: [
      {
        heading: "1. The service",
        body: "Sakora is a business app for inventory, sales, invoices, a shareable online shop, WhatsApp selling, and payments. By creating an account, you agree to these General Terms of Use.",
      },
      {
        heading: "2. Your account",
        body: "You must provide accurate details and keep your login details safe. You are responsible for activity on your account, including actions by staff you invite.",
      },
      {
        heading: "3. Acceptable use",
        body: "Do not use Sakora for fraud, illegal goods, abuse of payment tools, or to impersonate another business. We may suspend accounts that break these terms.",
      },
      {
        heading: "4. Content and shop",
        body: "You own your product, customer, and business data. You grant Sakora a licence to host and display that data so the app, shop, invoices, and messages can work.",
      },
      {
        heading: "5. Payments",
        body: "Card, transfer, and USSD checkout is processed by Squad. Squad’s rules apply to those payments. Sakora does not store full card numbers.",
      },
      {
        heading: "6. Changes",
        body: "We may update these terms. Continued use after an update means you accept the new terms. If you do not agree, stop using the service and close your account.",
      },
    ],
  },
  "merchant-terms": {
    title: "Merchant Terms of Use",
    updated: "22 September 2026",
    sections: [
      {
        heading: "1. Merchant role",
        body: "If you sell through Sakora, you are the merchant. You set prices, stock, delivery, refunds, and customer support. Customers contract with you, not with Sakora, for the goods or services they buy.",
      },
      {
        heading: "2. Shop and invoices",
        body: "Your shop link, WhatsApp shares, and invoices must describe products honestly. You must fulfil paid orders or refund the customer.",
      },
      {
        heading: "3. WhatsApp and messages",
        body: "You are responsible for messages you send to customers. Only contact people who expect to hear from your business, and follow WhatsApp and local messaging rules.",
      },
      {
        heading: "4. Settlement",
        body: "Payouts for Squad checkouts follow your Squad merchant account. Fees, chargebacks, and settlement timing are between you and Squad.",
      },
      {
        heading: "5. Prohibited goods",
        body: "You may not list illegal items, stolen goods, or anything payment partners disallow. We can take a shop offline if it puts other merchants or customers at risk.",
      },
    ],
  },
  privacy: {
    title: "General Privacy Policy",
    updated: "22 September 2026",
    sections: [
      {
        heading: "1. Data we collect",
        body: "We collect the name, email, phone, and business details you submit, plus products, sales, orders, invoices, and device/session data needed to run the app.",
      },
      {
        heading: "2. How we use it",
        body: "We use this data to create your account, run your shop, send order and invoice messages, process payments with Squad, and improve the product.",
      },
      {
        heading: "3. Marketing",
        body: "If you tick the marketing box at signup, we may send business tips and product updates by email or SMS. You can opt out at any time by asking support or turning the preference off.",
      },
      {
        heading: "4. Sharing",
        body: "We share data with providers that help us operate Sakora, including hosting, email (Mailtrap), SMS, and Squad for payments. We do not sell your customer list.",
      },
      {
        heading: "5. Retention and rights",
        body: "We keep account data while your business is active and as required by law. You can request a copy or deletion of your personal data, subject to records we must keep for tax or disputes.",
      },
    ],
  },
};

const LegalPage = () => {
  const { slug } = useParams();
  const doc = documents[slug];

  if (!doc) {
    return <Navigate to="/legal/terms" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-teal-700 text-white">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <Link
            to="/register"
            className="inline-flex items-center gap-2 text-teal-100 text-sm mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to signup
          </Link>
          <p className="text-xs uppercase tracking-wide text-teal-100">Sakora</p>
          <h1 className="text-2xl font-bold mt-1">{doc.title}</h1>
          <p className="text-sm text-teal-100 mt-1">Last updated {doc.updated}</p>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <nav className="flex flex-wrap gap-2 text-sm">
          <Link className="px-3 py-1 rounded-full bg-white border" to="/legal/terms">
            General Terms of Use
          </Link>
          <Link
            className="px-3 py-1 rounded-full bg-white border"
            to="/legal/merchant-terms"
          >
            Merchant Terms of Use
          </Link>
          <Link className="px-3 py-1 rounded-full bg-white border" to="/legal/privacy">
            General Privacy Policy
          </Link>
        </nav>
        {doc.sections.map((section) => (
          <section key={section.heading} className="bg-white rounded-2xl p-5 border">
            <h2 className="font-semibold mb-2">{section.heading}</h2>
            <p className="text-slate-600 leading-relaxed">{section.body}</p>
          </section>
        ))}
      </main>
    </div>
  );
};

export default LegalPage;
