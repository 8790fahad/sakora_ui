import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./landing.css";

const STORIES = [
  {
    youtubeId: "T_2NB_9YJEI",
    name: "Small business owner",
    shop: "Spice trade, Kano",
    quote: "I run the shop from my phone and still know what sold today.",
  },
  {
    youtubeId: "SCBghr7cqR8",
    name: "Provision seller",
    shop: "Everyday groceries",
    quote: "Recording sales used to live in a book. Now I see the day at a glance.",
  },
  {
    youtubeId: "700BxGXs3l4",
    name: "Store founder",
    shop: "Provision store",
    quote: "If you can stock the shop, you can share it and keep selling.",
  },
];

const PLANS = [
  {
    name: "Starter",
    month: "Free",
    year: "Free",
    summary: "Start selling from your phone at no cost.",
    features: [
      "1 shop and 1 user",
      "Up to 50 products",
      "Record cash and transfer sales",
      "Basic inventory",
    ],
    cta: "Create free shop",
    tone: "ghost",
  },
  {
    name: "Shop",
    month: "₦5,000/mo",
    year: "₦45,000/yr",
    summary: "Online shop, WhatsApp selling, and invoices.",
    features: [
      "Unlimited products",
      "Shareable shop + WhatsApp",
      "Invoices and online orders",
      "Email and SMS alerts",
      "Up to 3 staff",
      "Squad checkout",
    ],
    cta: "Start Shop plan",
    tone: "primary",
    popular: true,
  },
  {
    name: "Business",
    month: "₦15,000/mo",
    year: "₦120,000/yr",
    summary: "For teams, branches, and growing stores.",
    features: [
      "Everything in Shop",
      "Unlimited staff and roles",
      "Multiple branches",
      "Advanced reports",
      "Priority support",
    ],
    cta: "Start Business",
    tone: "dark",
  },
];

const thumb = (id) => `https://img.youtube.com/vi/${id}/hqdefault.jpg`;

const LandingPage = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [interval, setInterval] = useState("month");
  const [activeStory, setActiveStory] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Sakora — Selling made easy";
    const previousScroll = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = "smooth";

    const items = document.querySelectorAll(".landing .reveal-on-scroll");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
          }
        });
      },
      { threshold: 0.16 }
    );
    items.forEach((item) => observer.observe(item));

    return () => {
      document.title = previousTitle;
      document.documentElement.style.scrollBehavior = previousScroll;
      observer.disconnect();
    };
  }, []);

  const closeMenu = () => setMenuOpen(false);
  const story = STORIES[activeStory];

  return (
    <div className="landing">
      <header className={`nav${menuOpen ? " open" : ""}`}>
        <div className="wrap nav-inner">
          <a className="brand" href="#top" onClick={closeMenu}>
            <img src="/brand.svg" alt="" />
            Sakora
          </a>
          <nav className="nav-links">
            <a href="#features" onClick={closeMenu}>
              Features
            </a>
            <a href="#stories" onClick={closeMenu}>
              Stories
            </a>
            <a href="#pricing" onClick={closeMenu}>
              Pricing
            </a>
            <a href="#faq" onClick={closeMenu}>
              FAQ
            </a>
          </nav>
          <div className="nav-cta">
            <Link className="btn btn-ghost" to="/login">
              Sign in
            </Link>
            <Link className="btn btn-primary" to="/register">
              Get started
            </Link>
          </div>
          <button
            className="menu-btn"
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            ☰
          </button>
        </div>
      </header>

      <main id="top">
        <section className="hero">
          <div className="wrap hero-grid">
            <div className="hero-copy reveal">
              <p className="kicker">Selling made easy</p>
              <h1>Manage your store from anywhere.</h1>
              <p className="lead">
                If you sell from a supermarket, pharmacy, stall, or WhatsApp,
                Sakora keeps inventory, daily sales, invoices, and your online
                shop in one place. No computer required.
              </p>
              <div className="hero-actions">
                <Link className="btn btn-primary btn-lg" to="/register">
                  Create your shop
                </Link>
                <a className="btn btn-dark btn-lg" href="#features">
                  See how it works
                </a>
              </div>
              <p className="hero-note">
                Free to start. Share a shop link in minutes.
              </p>
            </div>

            <div className="phone-wrap reveal delay-2">
              <div className="phone float">
                <div className="phone-screen">
                  <div className="phone-home">
                    <p>Good morning, Ada</p>
                    <h3>Ada&apos;s Provisions</h3>
                    <strong>₦128,400</strong>
                    <p>14 sales today</p>
                    <div className="phone-pills">
                      <span className="pill pill-light">Share shop</span>
                      <span className="pill pill-glass">Copy link</span>
                    </div>
                  </div>
                  <div className="phone-grid">
                    <div className="mini">
                      Record sale<b>POS</b>
                    </div>
                    <div className="mini">
                      Add product<b>Stock</b>
                    </div>
                    <div className="mini">
                      Invoice<b>WhatsApp</b>
                    </div>
                    <div className="mini">
                      Orders<b>Online</b>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="who">
          <div className="wrap reveal-on-scroll">
            <p className="kicker">Built for everyday sellers</p>
            <h2>
              Sakora makes it easy to run your retail business and sell online.
            </h2>
            <p className="lead">
              Keep track of inventory, monitor daily sales, send invoices, and
              collect payment with Squad — from your phone.
            </p>
            <div className="who">
              <article>
                <h3>Supermarkets</h3>
                <p>
                  Record sales fast and know what is running low before the day
                  ends.
                </p>
              </article>
              <article>
                <h3>Pharmacies</h3>
                <p>
                  Track stock, suppliers, and every sale without a bulky
                  back-office setup.
                </p>
              </article>
              <article>
                <h3>Groceries & stalls</h3>
                <p>
                  Share products on WhatsApp and still keep a proper sales
                  record.
                </p>
              </article>
              <article>
                <h3>Home sellers</h3>
                <p>
                  Get a shop link customers can browse, order from, and pay on.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="section alt" id="features">
          <div className="wrap split reveal-on-scroll">
            <div className="copy">
              <p className="kicker">Your phone is enough</p>
              <h2>No computer, UPS, or barcode scanner.</h2>
              <p>
                Manage day-to-day sales, products, cash, and how much the
                business is making with just your mobile phone. Add staff when
                you grow.
              </p>
            </div>
            <div className="feature-card">
              <h3>On your home screen</h3>
              <p>
                Today’s sales, share shop, record sale, create invoice, and
                open orders.
              </p>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="wrap split reveal-on-scroll">
            <div className="feature-card">
              <h3>WhatsApp + website</h3>
              <p>
                Share a product, send an invoice, or drop your shop link in a
                status. Customers can also pay with Squad.
              </p>
            </div>
            <div className="copy">
              <p className="kicker">Sell where your customers are</p>
              <h2>See your sales go up, day by day.</h2>
              <p>
                View sales by day, week, or month. Create invoices, fulfil
                online orders, and keep stock in sync after every sale.
              </p>
            </div>
          </div>
        </section>

        <section className="section alt" id="stories">
          <div className="wrap reveal-on-scroll">
            <p className="kicker">Customer stories</p>
            <h2>Hear from sellers like you.</h2>
            <p className="lead">
              Shop owners talking about running a store from their phone — the
              same way Sakora is built to work.
            </p>
            <div className="stories">
              <div className="story-player">
                <div className="story-frame">
                  {playing ? (
                    <iframe
                      key={story.youtubeId}
                      src={`https://www.youtube.com/embed/${story.youtubeId}?autoplay=1&rel=0&modestbranding=1`}
                      title={story.name}
                      allow="autoplay; encrypted-media"
                      allowFullScreen
                    />
                  ) : (
                    <>
                      <img
                        src={thumb(story.youtubeId)}
                        alt={story.name}
                        loading="lazy"
                        decoding="async"
                      />
                      <button
                        className="story-play"
                        type="button"
                        aria-label="Play testimonial"
                        onClick={() => setPlaying(true)}
                      >
                        <span>▶</span>
                      </button>
                    </>
                  )}
                </div>
                <blockquote>“{story.quote}”</blockquote>
                <p className="story-meta">
                  {story.name} · {story.shop}
                </p>
              </div>
              <div className="story-list">
                {STORIES.map((item, index) => (
                  <button
                    key={item.youtubeId}
                    type="button"
                    className={`story-card${index === activeStory ? " is-active" : ""}`}
                    onClick={() => {
                      setActiveStory(index);
                      setPlaying(true);
                    }}
                  >
                    <img
                      src={thumb(item.youtubeId)}
                      alt=""
                      loading="lazy"
                      decoding="async"
                    />
                    <div>
                      <strong>{item.name}</strong>
                      <span>{item.shop}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="how">
          <div className="wrap reveal-on-scroll">
            <p className="kicker">Get going</p>
            <h2>Create your shop, add products, start selling.</h2>
            <div className="steps">
              <article>
                <div className="num">1</div>
                <h3>Create your shop</h3>
                <p>
                  Sign up with your business name. You get a shop link
                  immediately.
                </p>
              </article>
              <article>
                <div className="num">2</div>
                <h3>Add what you sell</h3>
                <p>
                  Name, price, and stock. Show items in your online shop with
                  one tap.
                </p>
              </article>
              <article>
                <div className="num">3</div>
                <h3>Share and get paid</h3>
                <p>
                  Send the shop or an invoice on WhatsApp. Collect payment with
                  Squad.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="section" id="pricing">
          <div className="wrap reveal-on-scroll">
            <p className="kicker">Pricing</p>
            <h2>Simple plans. Pay monthly or save yearly.</h2>
            <p className="lead">
              Start free. Upgrade when you need an online shop, staff, or more
              than one branch. Paid with Squad.
            </p>
            <div className="price-toggle" role="group" aria-label="Billing period">
              <button
                type="button"
                className={interval === "month" ? "is-active" : ""}
                onClick={() => setInterval("month")}
              >
                Monthly
              </button>
              <button
                type="button"
                className={interval === "year" ? "is-active" : ""}
                onClick={() => setInterval("year")}
              >
                Yearly · save 25%
              </button>
            </div>
            <div className="pricing">
              {PLANS.map((plan) => (
                <article
                  key={plan.name}
                  className={plan.popular ? "popular" : undefined}
                >
                  {plan.popular ? <p className="badge">Most popular</p> : null}
                  <h3>{plan.name}</h3>
                  <p className="price">{plan[interval]}</p>
                  <p>{plan.summary}</p>
                  <ul>
                    {plan.features.map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                  <Link className={`btn btn-${plan.tone}`} to="/register">
                    {plan.cta}
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="cta-band">
          <div className="wrap reveal-on-scroll">
            <h2>Download, set up, and start selling.</h2>
            <p>Open Sakora on the web, create your shop, and share it today.</p>
            <Link className="btn btn-primary btn-lg" to="/register">
              Start free
            </Link>
          </div>
        </section>

        <section className="section" id="faq">
          <div className="wrap faq reveal-on-scroll">
            <p className="kicker">Questions</p>
            <h2>Before you start</h2>
            <details open>
              <summary>Do I need a computer?</summary>
              <p>
                No. Sakora is built for your phone. You can also use a tablet
                or laptop if you want a bigger screen.
              </p>
            </details>
            <details>
              <summary>How do customers pay?</summary>
              <p>
                They can pay through your shop checkout with Squad, or you can
                record a cash or transfer sale yourself.
              </p>
            </details>
            <details>
              <summary>Can I sell on WhatsApp?</summary>
              <p>
                Yes. Share a product, invoice, or your full shop link.
                Customers message you or pay online.
              </p>
            </details>
            <details>
              <summary>Is it free to start?</summary>
              <p>
                Yes. Starter is free: 50 products, 1 user, and sales from your
                phone. Upgrade to Shop or Business when you need a website,
                WhatsApp invoices, or a team.
              </p>
            </details>
            <details>
              <summary>How much does Sakora cost?</summary>
              <p>
                Shop is ₦5,000 a month or ₦45,000 a year. Business is ₦15,000 a
                month or ₦120,000 a year. You pay with Squad from Billing in
                the app.
              </p>
            </details>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="wrap footer-grid">
          <div>
            <div className="brand">
              <img src="/brand.svg" alt="" loading="lazy" decoding="async" /> Sakora
            </div>
            <p className="blurb">
              Selling made easy. Inventory, WhatsApp sales, invoices, and an
              online shop for Nigerian businesses.
            </p>
          </div>
          <div>
            <p>
              <strong>Product</strong>
            </p>
            <p>
              <a href="#features">Features</a>
            </p>
            <p>
              <a href="#stories">Stories</a>
            </p>
            <p>
              <a href="#pricing">Pricing</a>
            </p>
            <p>
              <Link to="/register">Create shop</Link>
            </p>
            <p>
              <Link to="/login">Sign in</Link>
            </p>
          </div>
          <div>
            <p>
              <strong>Legal</strong>
            </p>
            <p>
              <Link to="/legal/terms">General Terms of Use</Link>
            </p>
            <p>
              <Link to="/legal/merchant-terms">Merchant Terms of Use</Link>
            </p>
            <p>
              <Link to="/legal/privacy">General Privacy Policy</Link>
            </p>
          </div>
        </div>
        <div className="wrap footer-bottom">
          © {new Date().getFullYear()} Sakora. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
