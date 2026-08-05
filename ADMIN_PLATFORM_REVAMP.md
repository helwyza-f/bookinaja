# Admin Platform Revamp Checklist

## Current Issues

### 1. **Tenant Detail Not Clickable**
- Problem: Tenant list view exists but lacks navigation to detail page
- Backend: API endpoint exists at `GET /api/v1/platform/tenants/:tenant_id`
- Frontend: Missing navigation or detail page implementation
- Impact: Users can't view individual tenant details

### 2. **Missing Frontend Pages**
- [ ] Tenant List Dashboard
- [ ] Tenant Detail Page  
- [ ] Tenant Metrics/Analytics
- [ ] Tenant Subscription Management
- [ ] Tenant Customers View
- [ ] Tenant Transactions View

### 3. **Backend Endpoints Available (Not Used in Frontend)**
```
- GET /api/v1/platform/tenants              # List tenants
- GET /api/v1/platform/tenants/:tenant_id   # Get tenant details
- PATCH /api/v1/platform/tenants/:tenant_id/subscription  # Change plan
- GET /api/v1/platform/tenants/:tenant_id/customers
- GET /api/v1/platform/tenants/:tenant_id/transactions
- GET /api/v1/platform/tenants/:tenant_id/balance
- GET /api/v1/platform/tenants/:tenant_id/notif-history
```

## Recommended Changes

### Frontend Structure
```
/admin
  /dashboard
    - Platform admin home
    - Revenue overview
    - Top tenants
    
  /tenants
    /page.tsx (List all tenants with search/filters)
    /[tenant_id]
      /page.tsx (Detail view with tabs)
        - Overview
        - Subscriptions
        - Customers
        - Transactions
        - Balance/Ledger
```

### UI Components Needed
- Tenant List Table (sortable, searchable, clickable rows)
- Tenant Detail Card
- Subscription Management Panel
- Tenant Metrics Dashboard
- Transaction History

## Security Considerations
- Platform admin JWT token validation
- Role-based access (currently "platform_admin")
- Audit logging for admin actions
- Sensitive data masking (passwords, secrets)

## Priority
**HIGH** - Core functionality for platform operations
