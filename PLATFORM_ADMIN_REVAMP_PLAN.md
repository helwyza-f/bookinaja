# Platform Admin Dashboard - Complete Revamp Plan

## Design Principles
- **Minimalist**: Remove clutter, focus on essentials only
- **Operational**: Show what admins need to act on NOW
- **Clear**: Strong visual hierarchy, easy to scan
- **Fast**: Keyboard shortcuts, quick actions, fast navigation

---

## Page Structure Redesign

### 1. Navigation Sidebar (Left)
```
Platform Admin
├── Dashboard (overview)
├── Tenants (all tenants)
├── Revenue (money flow)
├── Emails (send/logs)
├── Settings
└── Logout
```

### 2. Dashboard Overview (`/dashboard/overview`)
**Status Cards (4 columns):**
- Active Tenants (with trend ↑↓)
- MRR/Revenue (monthly)
- New Signups (this month)
- Critical Alerts (red badge if any)

**Tenants Table (simplified):**
| Tenant | Status | MRR | Customers | Action |
|--------|--------|-----|-----------|--------|
| Gaming Hub | 🟢 Active | Rp X.XXX.XXX | 428 | [View] |

**Recent Activity (timeline):**
- New tenant signup
- Billing issue
- High churn alert

---

### 3. Tenants List (`/dashboard/tenants`)
**Search + Quick Filters:**
```
[Search tenant...]  [Status: All ▼]  [Plan: All ▼]  [Sort: MRR ▼]
```

**Table - Minimal columns:**
| Tenant | Status | Plan | MRR | Customers | Days Active |
|--------|--------|------|-----|-----------|-------------|
| Playzone | 🟢 Active | Pro | Rp 12.5M | 428 | 180 |

**Quick Actions:**
- Click row → Detail page
- [⋮] menu → Change plan / Suspend / View logs

---

### 4. Tenant Detail (`/dashboard/tenants/[id]`)
**Header:**
```
Playzone Gaming Hub
🟢 Active | Pro Plan | 180 days
```

**4 Quick Stats Cards:**
```
[MRR: Rp 12.5M] [Customers: 428] [Bookings: 2,840] [Churn Rate: 2.3%]
```

**Tabs (minimal):**
- **Overview** - Key metrics, recent activity
- **Billing** - Invoices, payment method, subscription
- **Customers** - Top customers, retention metrics
- **Actions** - Change plan, suspend, send email

---

### 5. Emails Page (`/dashboard/emails`)
**Quick Send Panel:**
```
To: [email input]
Subject: [input]
Template: [dropdown - Select template]
[Send Button]
```

**Recent Sends Table:**
| Recipient | Subject | Status | Sent | |
|-----------|---------|--------|------|---|
| admin@gaming.id | Welcome | ✓ | 2h ago | [Resend] |

---

### 6. Revenue Dashboard (`/dashboard/revenue`)
**Top Section - MRR Metrics:**
```
[MRR: Rp 500M ↑8%]  [Churn: 3.2%]  [LTV: Rp 180M]  [CAC: Rp 2.5M]
```

**Chart: Revenue Trend (30-day line chart)**

**Top Tenants by Revenue:**
```
1. Playzone - Rp 12.5M (38% of MRR)
2. Mini Golf - Rp 8.2M (25%)
...
```

---

## Design Changes

### Colors & Styling
- **Background**: White (light) / Dark slate (dark mode)
- **Primary**: Blue 600 (actions)
- **Status**: 🟢 Green (active), 🟡 Yellow (trial), 🔴 Red (suspended)
- **Danger**: Red 600 (delete, suspend)

### Typography
- Headlines: Bold, 18-24px
- Body: Regular, 14px
- Labels: Small caps, 11px

### Spacing
- Card padding: 20px
- Column gaps: 16px
- Row gaps: 12px

### Components
- Buttons: Rounded corners, minimal padding
- Tables: Striped rows, no borders
- Cards: Subtle shadow, no background color
- Modals: Overlay, centered, minimal

---

## Implementation Priority

### Phase 1 (MVP - Most Important)
1. ✅ Dashboard Overview - KPIs only
2. ✅ Tenants List - Simplified table
3. ✅ Tenant Detail - Overview tab only
4. ✅ Top navigation & sidebar

### Phase 2 (Complete)
5. Tenants Detail - Other tabs
6. Revenue Dashboard
7. Emails Page
8. Settings

---

## Removed/Simplified
- ❌ Verbose descriptions (show numbers)
- ❌ Multiple tabs for less-used features
- ❌ "Test plan" buttons (move to admin panel only)
- ❌ Email filters (keep it simple)
- ❌ Pagination for most tables (limit to 50 rows)
- ✅ Keep: Discovery analytics (move to separate page)

