# sakora_ui

Frontend for sakora Mobile — React + Vite inventory management app.

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The marketing page is the home screen. Sign in and Get started go to `/login` and `/register`. Signed-in users opening `/` land on the dashboard. Each page, including the landing page, loads only when that route is opened.

## Scripts

- `npm run dev` — start development server
- `npm run build` — production build
- `npm run preview` — preview production build

## Environment

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API URL. Local default: `http://localhost:5100/api`. Production: `https://nexifour.ng/sakora_api` |

## GitHub Pages

`.github/workflows/pages.yml` builds this app and deploys `dist` when `main` is pushed. The landing page and the merchant app are the same site, so `sakora.shop` serves both.

1. In **sakora_ui** (not the landing repo): Settings → Pages → Source: **GitHub Actions**. Leave the Jekyll and Static HTML starters alone — this app has to be built first.
2. Set the custom domain to `sakora.shop` on this repository. A custom domain can only be attached to one Pages site, so remove it from any other repo first.
3. In Hostinger, open **DNS / Nameservers** (do not click **Create or migrate your website**, and do not change nameservers — parking nameservers already keep DNS and `@sakora.shop` email on Hostinger). In DNS records:
   - Delete the existing `A` record for `@` that points at the parking IP (`2.57.91.91`)
   - Add `A` records for `@`: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - Add or update `CNAME` for `www` → `8790fahad.github.io`
   - Leave MX records unchanged so business email keeps working
4. Push `main`. The workflow publishes the site and `public/CNAME` keeps the custom domain.
