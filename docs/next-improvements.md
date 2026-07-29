# Next Value Improvements

A living backlog of the highest-leverage improvements for Bookinaja, ordered by
value-to-effort. Written after the friction-review cycle that shipped the DP
disclosure, onboarding fixes, tenant 404, dashboard revamp, and the resource
detail page. Use this to point the next cycle at the core loop:

> set up units → share booking link → receive bookings → run the session → get paid, with an audit trail.

---

## Shipped this cycle (context)

- **Booking DP disclosure** — the real "pay now" amount + total/remaining shown before commit (was three hedging badges).
- **Onboarding** — ends on a shareable booking link (copy + WhatsApp), captures operating hours, and replaces "duration in minutes" with human choices (per jam / per sesi / per hari + duration chips).
- **Tenant 404** — customer-facing "page unavailable", no session/cache internals leaked.
- **Booking ask** — "Nama" (not "Nama Sesuai KTP"), no force-uppercase, tamed auto-scroll, optional promo, clearer WhatsApp validation.
- **Dashboard revamp** — hero with revenue vs-yesterday delta, Live-now floor view, consolidated action queue; owner + staff.
- **Scope discipline** — deleted the orphaned second welcome flow, dead nav export; gated Discovery behind a flag; gated Smart-Point as a Pro/Scale feature.
- **Resource detail page** (`/resources/[id]`) — gallery, package comparison, info, sticky Book CTA; card split-affordance (learn vs quick-book).
- **Resource item dialog** — pola-jual cards + human duration chips (matches onboarding); surfaces real save errors.

---

## Priority 1 — Trust & correctness on the money path

### 1.1 Server-authoritative total + DP preview
Today the booking screen computes the DP client-side by mirroring the backend
formula, and the total is only exact until a **promo** is applied (uses the promo
preview's `final_amount`). Add a small `POST /public/bookings/preview` that returns
the server-computed `{ grand_total, deposit_amount, balance_due }` for the current
selection + promo. Removes any chance of client/server drift at the point of sale.
- **Value:** high (every booking). **Effort:** small backend + wire one call.

### 1.2 Allow free items / add-ons
`AddItem` marks `price` as `binding:"required"`, which Go rejects on a **zero**
value — so a free add-on or promo item fails with a generic error. Relax the
binding (accept `>= 0`) and keep validation in the service.
- **Value:** medium. **Effort:** tiny.

---

## Priority 2 — Explore → book (finish the PDP pattern)

### 2.1 "Unit lain" comparison strip on the detail page
Add a bottom strip of other resources on `/resources/[id]` so a customer can jump
between options without going back to the grid. Cheap, big comparison payoff.

### 2.2 Quick-view sheet from the catalog (optional)
A bottom-sheet peek from the grid (gallery + packages + Book CTA) for effortless
in-grid comparison — layers on top of the detail page without replacing it.

### 2.3 Inline booking on the detail page (bigger)
Eventually fold the booking flow into the detail page as its final section (one
page, sticky CTA) instead of a separate `/bookings/[id]` route. Higher effort;
revisit once the detail page proves itself.

---

## Priority 3 — Operational rollout of gated features

### 3.1 Smart-Point plan-matrix self-heal
Existing environments seeded `platform_feature_settings` **before** `smart_device`
existed, so Pro/Scale tenants won't get it until the matrix is re-saved (and Redis
cache cleared). Add a migration/seed that appends `smart_device` to the stored
Pro/Scale rows so existing deploys self-heal. Fresh installs already seed correctly.

### 3.2 Discovery re-enable criteria
`DISCOVERY_PUBLIC_ENABLED` is off (a marketplace needs tenant density). Define the
trigger (e.g. N active tenants in a city) and, when met, flip the flag and restore
the "Jelajah" marketing links. Consider server-driving the flag instead of a const.

---

## Priority 4 — Polish & consistency

- **Onboarding:** pre-select the first duration for `per jam` so the Continue
  button is valid on load without an extra click.
- **Admin resource detail page:** align its visual language with the onboarding /
  item-dialog look (the item dialog is done; the surrounding page can follow).
- **Dashboard staff edge:** a `pos.read`-only staffer (without `bookings.read`)
  currently loses the action-queue section; show it on either permission.
- **Live-now freshness:** the dashboard's "sisa menit" is computed at render;
  confirm the realtime refresh cadence keeps it honest during a long session.
- **Booking name:** consider not force-uppercasing stored names anywhere in the
  admin/POS surfaces for consistency with the customer flow.

---

## Guardrails to keep

- Every change should serve the **core loop** above; gate or defer anything that
  doesn't, rather than letting surface area accrete.
- Keep customer-facing pages free of internal/plumbing language (see the 404 fix).
- Keep the owner's mental model human — no raw minutes, no unexplained DP.
