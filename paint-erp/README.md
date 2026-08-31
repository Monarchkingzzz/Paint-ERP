# Kenyan Paint Hardware ERP & PWA

A working implementation of the spec: RBAC (Owner vs Staff), the paint
color catalog with bulk CSV upload, the Paint PIN mixing/lookup engine,
POS checkout with a mocked M-Pesa STK push flow, stock deduction, a live
P&L view, fundi credit accounts, and an append-only audit log — plus an
installable, offline-capable PWA frontend.

## What's real vs mocked (read this first)

This runs end-to-end on your machine, but two things need work before
it's production-ready:

1. **M-Pesa / Co-op Bank integration is mocked.** `POST
   /api/pos/mpesa/stk-push` fakes sending an STK push and creates a
   `Pending` payment record. In real life you'd call Safaricom's Daraja
   API (`/mpesa/stkpush/v1/processrequest`) with your Consumer
   Key/Secret, Shortcode, and Passkey. Safaricom then calls **your**
   webhook — `POST /api/pos/mpesa/callback` — when the customer enters
   their PIN. That callback route is real and wired to mark invoices
   `Paid`; you just need to point Safaricom at it (and add signature
   verification) instead of calling it yourself.
2. **Bluetooth sticker printing and camera barcode scanning aren't
   implemented.** The PWA shows a "Paint PIN generated" confirmation
   where a real Bluetooth print job would fire. Wire up the [Web
   Bluetooth API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API)
   for your specific sticker printer model, and a library like
   [html5-qrcode](https://github.com/mebjas/html5-qrcode) for barcode
   scanning via the camera — both need HTTPS to work on a phone.

Everything else — RBAC, the color engine, stock math, P&L, credit
tracking, and the audit log — is fully functional against a real SQLite
database.

## Project layout

```
paint-erp/
├── backend/
│   ├── server.js          Express app entry point
│   ├── db.js               SQLite connection + first-run seeding
│   ├── schema.sql          Full table definitions
│   ├── audit.js             Shared audit-log writer
│   ├── middleware/auth.js  Session tokens + requireAuth/requireOwner
│   ├── routes/             auth, colors, paintpin, pos, stock, reports, audit
│   └── seed/                sample_colors.csv + seed.js (starter stock)
└── frontend/
    ├── index.html
    ├── manifest.json        PWA manifest (add real icons before shipping)
    ├── service-worker.js    Offline app-shell caching
    ├── css/style.css
    └── js/
        ├── app.js            All UI logic (vanilla JS, no build step)
        └── db-offline.js     IndexedDB: cached colors + offline invoice queue
```

## Running it locally

```bash
cd paint-erp/backend
npm install
npm run seed      # loads starter stock, sample colors, a demo credit account
npm start         # http://localhost:4000
```

Open **http://localhost:4000** in your browser. Two demo accounts are
created automatically on first run (printed in the console too):

| Role  | Phone         | Password  |
|-------|---------------|-----------|
| Owner | 254700000000  | owner123  |
| Staff | 254711111111  | staff123  |

**Change these passwords** (`backend/db.js`, seed block) before using
real data. Password hashing here is a simple salted SHA-256 for demo
purposes — swap in `bcrypt` or `argon2` before going live.

## Trying the core flows

- **Mix Paint tab**: search a color (try "Gold" or "Crown"), pick a
  base tin, and generate a Paint PIN. It's added to the POS cart
  automatically — set the retail price per litre at checkout.
- **POS Checkout tab**: add hardware lines, choose Cash / M-Pesa /
  Credit, and check out. M-Pesa fires the mocked STK push; you can
  simulate Safaricom's webhook manually:
  ```bash
  curl -X POST http://localhost:4000/api/pos/mpesa/callback \
    -H "Content-Type: application/json" \
    -d '{"checkout_request_id":"ws_CO_xxxx","mpesa_receipt_code":"RSH8192KDL","success":true}'
  ```
- **Stock tab**: Owner can manually adjust quantities (logged to the
  audit trail); everyone can see current levels and low-stock rows
  highlighted in red.
- **Upload Colors tab** (Owner only): upload a CSV in the format from
  the spec (`backend/seed/sample_colors.csv` is a working example).
- **P&L tab** (Owner only): live revenue, cost of goods, gross profit,
  and outstanding fundi credit.
- **Audit Log tab** (Owner only): every login, mix, checkout, price
  override attempt, and manual stock adjustment, newest first.

Try logging in as **Staff** and opening the browser dev tools network
tab to hit `/api/reports/pnl` or `/api/audit/log` directly — you'll get
a `403` because `requireOwner` enforces it server-side, not just by
hiding buttons in the UI.

## Offline behaviour

Turn off your Wi-Fi and try the Mix Paint search and a Cash checkout:
- Color search falls back to the last-cached catalog in IndexedDB.
- An invoice created while offline is queued in IndexedDB
  (`pending_invoices`) instead of failing, and syncs to the server
  automatically the moment the browser fires its `online` event.

The service worker only caches the static app shell (HTML/CSS/JS) —
API calls always go to the network, and the offline queue in
`db-offline.js` is what makes writes resilient.

## Extending it in VS Code

Some natural next steps, roughly in priority order:
1. Swap the demo password hashing for `bcrypt`, and session tokens for
   signed JWTs with expiry.
2. Wire the real Daraja API (sandbox first) in `routes/pos.js`.
3. Add an `overheads` table (rent, salaries, utilities) and subtract it
   in `GET /api/reports/pnl` for true net profit, not just gross.
4. Add real PWA icons in `frontend/icons/` (192x192 and 512x512 PNGs)
   referenced by `manifest.json`.
5. Add a barcode-scan-to-search flow using the device camera for fast
   hardware product lookup at checkout.
