# Account-first Workspace Routing and Auth Plan

Tanggal: 2026-05-21

## Purpose

Refactor signup, login, onboarding, and workspace routing from the current tenant-first model into an account-first model.

The product direction is:

- signup creates a global account, not a fully configured tenant
- one account can own or access multiple workspaces
- workspace operational URLs stay subdomain-based
- onboarding becomes the first-run workspace setup flow
- tenant/workspace admin routes continue using clean workspace URLs like `https://gaming-demo.bookinaja.com/admin/bookings/calendar`

This plan assumes the old database can be dropped. Compatibility with old tenant rows is not a constraint.

## Current Routing and Auth Map

### Root domain

Current root-domain routes include:

- `https://bookinaja.com/login`
- `https://bookinaja.com/admin/login`
- `https://bookinaja.com/register`
- `https://bookinaja.com/user/login`
- `https://bookinaja.com/user/register`
- `https://bookinaja.com/dashboard/*`

Current meanings:

- `/login` is platform admin login.
- `/admin/login` is central tenant admin auth.
- `/register` creates a tenant, owner, branding defaults, and starter seed data in one flow.
- `/user/*` is customer account/auth.
- `/dashboard/*` is platform admin area.

### Workspace subdomain

Current workspace URLs look like:

```text
https://gaming-demo.bookinaja.com/admin/bookings/calendar
```

The frontend proxy reads `gaming-demo` from the host and rewrites the request internally to:

```text
/(dashboard)/[tenant]/admin/bookings/calendar
```

So the browser path is clean, but the Next.js app internally resolves through the `[tenant]` segment.

### Current admin auth behavior

Current flow:

1. User opens `https://gaming-demo.bookinaja.com/admin/bookings/calendar`.
2. If no `auth_token`, proxy redirects to `/admin/login` on the same subdomain.
3. Tenant-local `/admin/login` redirects to root-domain `/admin/login?tenant=gaming-demo&next=/admin/bookings/calendar`.
4. Root-domain admin login authenticates against tenant slug.
5. After login, frontend redirects back to `https://gaming-demo.bookinaja.com/admin/bookings/calendar`.

Current limitations:

- admin login is tenant-scoped
- `auth_token` represents a tenant user session
- `current_tenant_slug` is used as session context
- the user model assumes a direct `user -> tenant` relationship
- creating a tenant, owner account, starter resources, and onboarding defaults happens in one register flow

## Product Decision

Workspace URLs should remain subdomain-based.

Do not move admin routes to path-based URLs like:

```text
https://bookinaja.com/workspaces/gaming-demo/admin/bookings/calendar
```

Keep this:

```text
https://gaming-demo.bookinaja.com/admin/bookings/calendar
```

Reason:

- stronger tenant branding
- cleaner customer-facing public pages
- clearer operational context
- simpler mental model for staff and owner
- compatible with future custom domains

What changes is not workspace URL shape. What changes is auth and workspace selection.

## Target Routing Map

### Global account auth

Root domain only:

```text
https://bookinaja.com/signup
https://bookinaja.com/login
https://bookinaja.com/forgot-password
```

Signup collects only account identity:

- name
- email
- password or Google identity

Signup does not collect:

- workspace slug
- business category
- timezone
- WhatsApp business number
- bootstrap mode
- first resource
- payment setup

### Global account app

Root domain authenticated account area:

```text
https://bookinaja.com/app
https://bookinaja.com/app/workspaces
https://bookinaja.com/app/workspaces/new
https://bookinaja.com/app/account
```

Purpose:

- account home
- workspace switcher
- account settings
- create new workspace entry

### First workspace onboarding

Root domain authenticated onboarding:

```text
https://bookinaja.com/app/onboarding
https://bookinaja.com/app/onboarding/workspace
https://bookinaja.com/app/onboarding/template
https://bookinaja.com/app/onboarding/resource
https://bookinaja.com/app/onboarding/business
https://bookinaja.com/app/onboarding/payments
https://bookinaja.com/app/onboarding/first-booking
https://bookinaja.com/app/onboarding/done
```

Purpose:

- create first workspace
- explain product purpose
- choose starting mode
- create first resource
- configure business basics
- review payment method
- guide first booking

### Workspace admin

Subdomain workspace area remains:

```text
https://{workspace}.bookinaja.com/admin/dashboard
https://{workspace}.bookinaja.com/admin/bookings/calendar
https://{workspace}.bookinaja.com/admin/resources
https://{workspace}.bookinaja.com/admin/settings/bisnis
```

Example with two workspaces owned by one account:

```text
https://gaming-demo.bookinaja.com/admin/bookings/calendar
https://sport-hub.bookinaja.com/admin/bookings/calendar
```

The same account token can access both if the account has membership in both workspaces.

## Target Guard Rules

### Root app

- unauthenticated user opening `/app/*` redirects to `/login`
- authenticated user without workspace membership redirects to `/app/onboarding/workspace`
- authenticated user with an incomplete first workspace redirects to the correct `/app/onboarding/*` step
- authenticated user with at least one ready workspace can open `/app/workspaces`

### Workspace subdomain admin

When user opens:

```text
https://gaming-demo.bookinaja.com/admin/bookings/calendar
```

Guard should resolve:

- is account token valid?
- does account have membership for workspace slug `gaming-demo`?
- what role and permissions does this account have in that workspace?
- is workspace onboarding complete enough to allow admin area?

Outcomes:

- valid member: allow
- not logged in: redirect to `https://bookinaja.com/login?next=https%3A%2F%2Fgaming-demo.bookinaja.com%2Fadmin%2Fbookings%2Fcalendar`
- logged in but not member: redirect to `https://bookinaja.com/app/workspaces?reason=no-access`
- onboarding incomplete: redirect to `https://bookinaja.com/app/onboarding`

## Target Data Model

### accounts

Global identity.

Suggested fields:

- `id`
- `name`
- `email`
- `password_hash`
- `google_subject`
- `email_verified_at`
- `created_at`
- `updated_at`

### workspaces

Business workspace, replacing tenant as the product-facing term.

Suggested fields:

- `id`
- `tenant_id`
- `owner_user_id`
- `name`
- `slug`
- `business_category`
- `business_type`
- `status`
- `plan`
- `subscription_status`
- `timezone`
- `whatsapp_number`
- `created_at`
- `updated_at`

### workspace_memberships

Account-to-workspace access.

Suggested fields:

- `id`
- `account_id`
- `workspace_id`
- `admin_user_id`
- `role`
- `permission_keys`
- `status`
- `created_at`
- `updated_at`

Important constraints:

- unique `(account_id, workspace_id)`
- unique `(workspace_id, admin_user_id)`
- unique workspace slug

Compatibility note:

- `accounts`, `workspaces`, and `workspace_memberships` are the canonical auth/access model.
- `tenants` and `users` remain as backing records while the existing admin modules still read tenant/user context.
- `workspace_memberships.admin_user_id` is the bridge from canonical account membership to the current admin user context. Do not resolve account-token admin access from `workspaces.owner_user_id` except as owner metadata.

### workspace_onboarding_states

First-run setup progress.

Suggested fields:

- `workspace_id`
- `current_step`
- `completed_steps`
- `selected_start_mode`
- `is_completed`
- `started_at`
- `completed_at`
- `updated_at`

### workspace_onboarding_events

Audit and funnel analytics.

Suggested fields:

- `id`
- `workspace_id`
- `account_id`
- `event_key`
- `step_key`
- `metadata`
- `created_at`

## Target API Map

### Auth

```text
POST /auth/signup
POST /auth/login
POST /auth/google/signup
POST /auth/google/login
POST /auth/logout
GET  /auth/account/me
```

Token should be account-scoped.

Token should not require a workspace id.

`/auth/account/me` is used during the transition because the legacy tenant-admin API already uses `/auth/me`.

### App workspaces

```text
GET  /app/workspaces
POST /app/workspaces
GET  /app/workspaces/:workspaceId
POST /app/workspaces/:workspaceId/select
```

### Onboarding

```text
GET  /app/workspaces/:workspaceId/onboarding
PUT  /app/workspaces/:workspaceId/onboarding/workspace
PUT  /app/workspaces/:workspaceId/onboarding/template
PUT  /app/workspaces/:workspaceId/onboarding/resource
PUT  /app/workspaces/:workspaceId/onboarding/business
PUT  /app/workspaces/:workspaceId/onboarding/payments
PUT  /app/workspaces/:workspaceId/onboarding/first-booking
POST /app/workspaces/:workspaceId/onboarding/complete
```

### Workspace admin bootstrap

```text
GET /admin/me/bootstrap
```

This endpoint should resolve context from:

- account token
- workspace slug from host or request context

It returns:

- account profile
- workspace profile
- membership role
- permission keys
- plan features
- onboarding status

## Onboarding Flow Design

### Step 1: Welcome

Goal:

- explain what Bookinaja will help set up
- reduce uncertainty before forms start

No heavy input.

### Step 2: Workspace

Inputs:

- workspace name
- suggested slug
- business category

Output:

- workspace record
- owner membership
- onboarding state

### Step 3: Template

Inputs:

- blank
- guided starter
- sample setup

Output:

- selected start mode
- optional sample data seed

### Step 4: First Resource

Inputs:

- resource name
- duration unit
- base price

Output:

- first resource
- first main price package

### Step 5: Business Basics

Inputs:

- WhatsApp business number
- timezone
- business type
- operating hours
- optional logo

Output:

- workspace profile usable by public page and admin

### Step 6: Payments

Inputs:

- first active payment method

Output:

- workspace can accept booking payment flow

### Step 7: First Booking

Modes:

- create a sample booking
- preview public booking page

Output:

- owner sees the operational loop end to end

### Step 8: Done

Output:

- route to `https://{workspace}.bookinaja.com/admin/dashboard`

## Frontend Implementation Map

### New root routes

```text
frontend/src/app/signup/page.tsx
frontend/src/app/app/layout.tsx
frontend/src/app/app/page.tsx
frontend/src/app/app/workspaces/page.tsx
frontend/src/app/app/workspaces/new/page.tsx
frontend/src/app/app/onboarding/page.tsx
frontend/src/app/app/onboarding/workspace/page.tsx
frontend/src/app/app/onboarding/template/page.tsx
frontend/src/app/app/onboarding/resource/page.tsx
frontend/src/app/app/onboarding/business/page.tsx
frontend/src/app/app/onboarding/payments/page.tsx
frontend/src/app/app/onboarding/first-booking/page.tsx
frontend/src/app/app/onboarding/done/page.tsx
```

### New frontend clients

```text
frontend/src/lib/auth-client.ts
frontend/src/lib/workspace-client.ts
```

### Refactor existing helpers

Keep:

- `getTenantUrl`

Deprecate:

- `getCentralTenantRegisterUrl`
- tenant-query-based `getCentralAdminAuthUrl` flow
- `welcome=1`

### Proxy behavior

Keep:

- subdomain extraction
- subdomain rewrite to internal `[tenant]` route

Change:

- `current_tenant_slug` becomes a UX hint only
- security comes from account token plus workspace membership check

## Backend Implementation Map

### New module

```text
backend/internal/account/model.go
backend/internal/account/repository.go
backend/internal/account/service.go
backend/internal/account/handler.go
```

### Middleware changes

Add:

- `RequireAccountAuth`
- `RequireWorkspaceMembershipFromHost`

### Router changes

Root routes:

- register `/auth/*`

Protected app routes:

- register `/app/*`

Workspace routes:

- keep `/admin/*`
- resolve workspace context from host/subdomain

## Cutover Plan

### Sprint 1

- add account/workspace schema
- add account-scoped auth endpoints
- add `/app/workspaces`
- add simple `/signup` and global `/login`

### Sprint 2

- add onboarding state APIs
- add `/app/onboarding/*`
- move `bootstrap_mode` and sample seeding from register into onboarding

### Sprint 3

- refactor subdomain admin bootstrap to account token plus workspace membership
- update proxy and admin guard behavior
- add admin shell workspace-switch entry back to `/app/workspaces`
- bridge account-token admin access through `workspace_memberships.admin_user_id`

### Sprint 4

- replace old `/register`
- remove tenant-first login query dependency
- update mobile parity after web flow is stable

## Non-goals

Do not solve these in the first refactor:

- custom domain setup
- advanced workspace invitations
- enterprise organization hierarchy
- multi-brand portfolio dashboards
- legacy tenant migration

Those can be added after the account/workspace foundation is stable.
