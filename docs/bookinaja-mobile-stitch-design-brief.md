# Bookinaja Mobile Stitch Design Brief

## 1. Purpose

This document is the full design brief for designing the **Bookinaja mobile app** in Stitch.

The goal is not just to make the app usable.
The goal is to make the app:

- emotionally resonant
- engaging, personal, and alive
- premium
- smooth
- delightful
- playful in the right places
- operationally sharp
- memorable enough that people want to talk about it

Bookinaja is not a generic admin app or a generic booking app.
It should feel like a **live operating system for modern gaming and rental businesses**, while still giving customers a warm, exciting, low-friction booking experience.

Use this brief to design:

- the visual language
- the design system
- the navigation patterns
- the screen inventory
- the motion language
- the feedback system
- the end-to-end mobile flows

This brief is intentionally detailed so Stitch can design the product screen by screen without guessing.

---

## 2. Product Summary

### 2.1 What Bookinaja is

Bookinaja is a mobile and web product for businesses such as:

- PC gaming venues
- PlayStation rentals
- game lounges
- private rooms
- hybrid rental + F&B venues

It has two core mobile audiences:

1. **Customer side**
   Customers discover venues, choose resources, book sessions, pay, monitor live sessions, and manage orders.

2. **Admin side**
   Tenant operators manage bookings, live sessions, direct sales, customers, resources, F&B, and expenses from a mobile command center.

### 2.2 The emotional promise

Bookinaja should not feel like a dry operational tool.
It should feel like:

- **live**
- **responsive**
- **energized**
- **sharp**
- **intentional**
- **premium**

When people use Bookinaja, they should feel:

- in control
- fast
- guided
- reassured
- excited to interact with the product again

### 2.3 The positioning

This is not:

- a generic marketplace app
- a generic admin dashboard
- a spreadsheet wrapper
- a plain CRUD tool

This is:

- a **real-time booking and operations system**
- a **mobile-first command center**
- a product that should feel **alive, branded, and story-rich**

---

## 3. Core Experience Principles

### 3.1 Emotional design

Every screen should leave a feeling.

The feeling should be:

- calm when reading
- energized when acting
- satisfying when completing
- playful in moments of success
- confident in operational moments

### 3.2 Engaging, personal, alive

The UI must avoid dead, generic SaaS energy.

The product should feel alive through:

- animated transitions
- responsive states
- real-time signals
- brand motifs
- expressive section headers
- feedback that feels designed, not default

### 3.3 Premium

Premium here does **not** mean luxury-for-luxury.
It means:

- spacing is intentional
- hierarchy is crisp
- motion feels expensive
- feedback feels crafted
- colors feel controlled
- no accidental clutter
- typography rhythm is disciplined

### 3.4 Useful is not enough

The product must not stop at “it works.”

It must also feel:

- smooth
- polished
- satisfying
- signature

### 3.5 Polish matters

Polish is required in:

- micro transitions
- tab selection
- active states
- pressed states
- success/error feedback
- empty states
- loading states
- field focus states
- confirmation moments

### 3.6 Character motion

Motion should communicate:

- state change
- confidence
- energy
- liveness

Motion should never feel ornamental for no reason.

### 3.7 Response to user

Every important interaction should respond clearly:

- tap
- select
- submit
- create
- verify
- complete
- fail
- refresh
- load

The app should never feel silent.

---

## 4. Brand Direction For Stitch

### 4.1 The Bookinaja feeling

Bookinaja should combine three qualities:

1. **Operational confidence**
   Feels like a command center.

2. **Live pulse**
   Feels like things are happening now.

3. **Signature warmth**
   Feels branded and memorable, not enterprise-generic.

### 4.2 Visual metaphor

Use the Bookinaja identity as a **signal / target / pulse / command** motif.

That means the visual language can borrow from:

- radar
- tracking
- live pulse
- orbit
- timing rings
- slot grids
- active markers

Do not make it military.
Do not make it cyberpunk.
Do not make it childish.

It should feel:

- contemporary
- alive
- slightly playful
- very controlled

### 4.3 Brand personality

Bookinaja should feel:

- smart
- lively
- direct
- modern
- premium
- operational
- human

Avoid:

- stiff corporate enterprise UI
- plain bootstrap feeling
- empty white generic productivity layout
- noisy gamer aesthetic
- purple startup clichés

### 4.4 Color direction

Base direction:

- cool light foundation
- sharp electric blue as main action/accent
- signal green for success/live
- warm amber for pending/waiting/review
- restrained red for destructive states
- slate neutrals for reading and structure

Accent colors should feel like **signals**, not decoration.

### 4.5 Shape language

Preferred shapes:

- rounded rectangles
- strong chips
- soft panels
- subtle orbital motifs
- nested pill/button relationships

Avoid:

- plain rectangles everywhere
- default Material-like repetition
- every card looking identical

### 4.6 Typography direction

Typography must feel:

- bold at the top
- compact in operational areas
- calm in support text

Use:

- strong titles
- tight action labels
- short, high-signal descriptions

Avoid:

- long explanations
- verbose helper copy everywhere

---

## 5. Design System Requirements

This is the system Stitch should define first before designing all screens.

### 5.1 Foundations

Define:

- color tokens
- semantic role colors
- elevation/shadow rules
- radius system
- spacing scale
- typography scale
- icon rules
- motion timing scale

### 5.2 Surface system

Create distinct surface types:

1. **Page surface**
   Main background.

2. **Hero surface**
   Strong branded panel near top of page.

3. **Card surface**
   Standard modular block.

4. **Muted surface**
   Supporting detail block.

5. **Live/signal surface**
   Active/monitoring/state block.

6. **Critical surface**
   Warning/review/error block.

### 5.3 Primitive components

These must be designed as reusable components first.

#### Navigation

- app shell
- floating tab bar
- top header shell
- back row
- segmented control

#### Reading and grouping

- section header
- eyebrow label
- status pill
- stat tile
- inline summary row
- list row
- keyline/info row
- empty state

#### Actions

- primary CTA
- secondary CTA
- destructive CTA
- icon button
- quick action tile
- featured action panel
- action bar

#### Input

- text field
- number field
- multiline field
- search field
- segmented selector
- filter chip
- date chip
- time slot chip
- duration chip
- toggles

#### Feedback

- toast
- inline validation
- success state
- loading skeleton
- loading spinner
- empty state
- confirmation modal
- review modal
- bottom sheet header

### 5.4 Motion system

Define rules for:

- page entry
- section stagger
- chip selection
- tab selection
- CTA press response
- card press response
- sheet open/close
- toast enter/exit
- success confirmation
- live state pulse

Motion should feel:

- quick
- soft
- slightly elastic where appropriate
- never laggy

### 5.5 Feedback system

Every important action must have feedback:

- immediate pressed response
- optimistic or loading response
- result feedback
- retry guidance on failure

Feedback hierarchy:

1. micro press state
2. inline loading
3. toast
4. modal for important confirmation/destructive decisions
5. sheet for rich review/info content

---

## 6. App Information Architecture

### 6.1 Root structure

The current mobile app has these top-level areas:

- landing / redirect
- registration
- discovery
- tenant storefront
- admin auth + admin app
- customer auth + customer app

### 6.2 Current route map

#### Root

- `/`
- `/register`
- `/discovery`

#### Tenant storefront

- `/tenant/[slug]`
- `/tenant/[slug]/resource/[resourceId]`

#### Admin

- `/admin/login`
- `/admin/dashboard`
- `/admin/bookings`
- `/admin/operations`
- `/admin/customers`
- `/admin/workspace`
- `/admin/bookings/new`
- `/admin/bookings/[id]`
- `/admin/orders/new`
- `/admin/orders/[id]`
- `/admin/resources`
- `/admin/resources/[id]`
- `/admin/menu`
- `/admin/expenses`
- `/admin/customers/[id]`
- `/admin/business`

#### Customer auth and account

- `/user/login`
- `/user/register`
- `/user/google-claim`
- `/user/me`
- `/user/me/explore`
- `/user/me/active`
- `/user/me/profile`
- `/user/me/history`
- `/user/me/bookings/[id]`
- `/user/me/bookings/[id]/payment`
- `/user/me/bookings/[id]/live`
- `/user/me/orders/[id]`
- `/user/me/orders/[id]/payment`

---

## 7. Primary Personas

### 7.1 Customer persona

Wants:

- discover venue quickly
- understand available resources
- choose session easily
- trust the process
- pay with minimal friction
- monitor active booking confidently

Feels should be:

- excited
- guided
- reassured
- satisfied

### 7.2 Admin persona

Wants:

- know what needs attention now
- move fast
- make fewer mistakes
- control live operations
- manage catalog and resources without feeling trapped in forms

Feels should be:

- sharp
- in control
- fast
- supported
- never lost

---

## 8. Screen Pattern System

Stitch should design these pattern types first.

### 8.1 Pattern A: Dashboard

Purpose:

- summarize now
- create focus
- point to the next action

Must include:

- top hero with branded signal
- 2 to 4 stats
- one featured “what matters now” block
- quick actions grid
- a short live queue or recent list

Feel:

- energized
- editorial
- actionable

### 8.2 Pattern B: List

Purpose:

- scan quickly
- filter fast
- select confidently

Must include:

- search
- chips/filters
- live or summary count
- recognizable list rows
- trailing state or badge
- empty state

Feel:

- sharp
- compact
- confident

### 8.3 Pattern C: Detail / Action

Purpose:

- understand state
- decide what to do next
- execute with confidence

Must include:

- top hero/state block
- status pills
- primary action zone
- support action grid
- summary below
- lower priority historical sections

Feel:

- command center
- state-first
- smooth under pressure

### 8.4 Pattern D: Form / Create

Purpose:

- guide creation without feeling like a boring form

Must include:

- compact hero/context
- grouped sections
- visible progress or implied sequence
- field rhythm
- short helper copy
- summary before submit
- confirmation checkpoint

Feel:

- guided
- calm
- fast

### 8.5 Pattern E: Picker / Sheet

Purpose:

- select items
- review rich information
- adjust quantities

Must include:

- strong sheet header
- search/filter when needed
- scroll-safe content
- sticky summary/footer
- clear close/commit behavior

Feel:

- fluid
- tactile
- responsive

---

## 9. Customer App Screen Inventory

This section tells Stitch what customer-facing screens must exist and how they should feel.

### 9.1 Root redirect

Route:

- `/`

Purpose:

- route users based on session

States:

- loading
- redirect to customer
- redirect to admin
- redirect to auth

Design notes:

- keep simple
- strong loading identity

### 9.2 Discovery home

Route:

- `/discovery`

Purpose:

- browse venues
- entry point for unauthenticated users

Sections:

- hero / value prop
- search/discover
- featured venues
- categories or quick filters
- CTA to browse more or sign in

Feel:

- exciting
- modern
- slightly playful

### 9.3 Tenant storefront

Route:

- `/tenant/[slug]`

Purpose:

- show venue identity
- explain what can be booked
- route to resource detail

Sections:

- venue hero
- business identity
- resource list/grid
- booking CTA
- login CTA when needed

Feel:

- branded by venue
- trustworthy
- lively

### 9.4 Resource detail / booking builder

Route:

- `/tenant/[slug]/resource/[resourceId]`

Purpose:

- configure a booking

Sections:

- resource hero
- package selector
- add-on selector
- date picker
- session timetable
- slot states
- total summary
- proceed CTA

Critical states:

- available
- selected
- booked
- passed
- max session reached

Feel:

- guided
- responsive
- rewarding when selecting

### 9.5 Customer login

Route:

- `/user/login`

Purpose:

- sign in fast

Must support:

- email/password
- Google path

Feel:

- simple
- short
- polished

### 9.6 Customer register

Route:

- `/user/register`

Purpose:

- create account with minimal friction

Feel:

- low effort
- progress visible
- optimistic

### 9.7 Google claim flow

Route:

- `/user/google-claim`

Purpose:

- resolve Google-linked account continuation

### 9.8 Customer tabs

Routes:

- `/user/me`
- `/user/me/explore`
- `/user/me/active`
- `/user/me/profile`
- `/user/me/history`

#### Home

Purpose:

- personal dashboard

Sections:

- welcome
- active booking shortcut
- recent activity
- recommended venue/resource

#### Explore

Purpose:

- browse again

#### Active

Purpose:

- show current active booking/order first

#### Profile

Purpose:

- account and settings

#### History

Purpose:

- booking/order history

### 9.9 Booking detail

Route:

- `/user/me/bookings/[id]`

Purpose:

- show booking summary and next step

Potential sections:

- booking state hero
- payment state
- live session entry
- resource/package/add-ons
- support/help

### 9.10 Booking payment

Route:

- `/user/me/bookings/[id]/payment`

Purpose:

- guide payment completion

Feel:

- trustworthy
- calm
- clear

### 9.11 Booking live

Route:

- `/user/me/bookings/[id]/live`

Purpose:

- real-time live session monitoring

Sections:

- live state
- session timer
- current resource/package
- extend CTA if allowed
- F&B/add-on order actions

Feel:

- alive
- exciting
- game-session-like

### 9.12 Order detail and payment

Routes:

- `/user/me/orders/[id]`
- `/user/me/orders/[id]/payment`

Purpose:

- direct sale order review and payment

---

## 10. Admin App Screen Inventory

This is the most important part for the operational side.

### 10.1 Admin login

Route:

- `/admin/login`

Purpose:

- select tenant
- log in fast

Must support:

- tenant search/select
- Google login
- manual login

Feel:

- premium
- short
- clear

### 10.2 Admin tab structure

Routes:

- `/admin/dashboard`
- `/admin/bookings`
- `/admin/operations`
- `/admin/customers`
- `/admin/workspace`

The tab bar should feel:

- floating
- premium
- signature
- alive when active

### 10.3 Admin dashboard

Route:

- `/admin/dashboard`

Purpose:

- what matters now

Sections:

- business hero
- focus block
- today stats
- quick start actions
- recent bookings
- active session list

Must answer instantly:

- what needs action
- what is active now
- what should I do next

### 10.4 Bookings list

Route:

- `/admin/bookings`

Purpose:

- scan queue
- filter by need
- jump into action

Sections:

- create booking CTA
- queue control hero
- search
- status filters
- booking rows

List rows should show:

- customer
- resource
- date/time
- total
- payment status
- booking state

### 10.5 Booking creation

Route:

- `/admin/bookings/new`

Purpose:

- manual booking creation

Step sequence:

1. booking mode
2. customer identity
3. choose resource
4. choose main package
5. choose add-ons
6. choose date
7. choose time slot
8. choose duration
9. review summary
10. create booking

Must feel:

- fast
- guided
- not like a boring admin form

### 10.6 Booking detail / action center

Route:

- `/admin/bookings/[id]`

Purpose:

- operational command center for one booking

Sections:

- top booking hero
- state pills
- payment snapshot
- primary action panel
- support action grid
- payment action panel
- manual payment review queue
- lower priority booking snapshot
- customer shortcut
- service/add-on/F&B/timeline

Possible actions:

- confirm booking
- start session
- end session
- extend session
- cancel booking
- choose payment method
- record DP
- record cash
- verify payment attempt
- reject payment attempt
- add F&B
- add add-on
- open customer
- send receipt

### 10.7 Operations tab

Route:

- `/admin/operations`

Purpose:

- live operational control center

Sections:

- ops hero
- fast booking/direct-sale actions
- queue cards
- resource health snapshot
- menu/F&B readiness
- expense shortcut

This screen should feel like:

- the nerve center
- not a generic menu page

### 10.8 Direct sale creation

Route:

- `/admin/orders/new`

Purpose:

- create a walk-up order or direct sale

Flow:

1. choose resource if relevant
2. open catalog
3. build cart
4. review
5. choose payment
6. create order

### 10.9 Direct sale detail

Route:

- `/admin/orders/[id]`

Purpose:

- manage an open order

Sections:

- order hero
- status and payment pills
- next action
- cart content
- payment methods
- verification queue
- settlement actions

### 10.10 Customers list

Route:

- `/admin/customers`

Purpose:

- light CRM

Sections:

- customer hero/summary
- search
- customer list

### 10.11 Customer detail

Route:

- `/admin/customers/[id]`

Purpose:

- customer summary and fast contact actions

Sections:

- identity hero
- tier/spend/visits
- WhatsApp
- phone
- recent bookings/orders

### 10.12 Resources list

Route:

- `/admin/resources`

Purpose:

- monitor and manage resources

Sections:

- resource snapshot
- search/create
- resource cards

### 10.13 Resource detail

Route:

- `/admin/resources/[id]`

Purpose:

- manage one resource deeply

Sections:

- resource overview
- edit basics
- main packages
- add-ons
- default package

### 10.14 Menu F&B

Route:

- `/admin/menu`

Purpose:

- manage sellable items

Sections:

- snapshot
- search/filter
- menu rows/cards
- create/edit modal

### 10.15 Expenses

Route:

- `/admin/expenses`

Purpose:

- record and manage operational costs

Sections:

- summary
- search/filter
- expense list
- add/edit modal

### 10.16 Workspace

Route:

- `/admin/workspace`

Purpose:

- tenant setup and admin utilities

Sections:

- workspace hero
- role/setup/billing stats
- modules
- billing handoff
- session tools

### 10.17 Business detail

Route:

- `/admin/business`

Purpose:

- business setup and tenant profile context

---

## 11. Global State And Feedback Requirements

Stitch should explicitly design these states.

### 11.1 Loading

Need:

- full-screen boot loading
- list skeleton
- card skeleton
- button loading
- modal loading

### 11.2 Empty states

Need:

- no bookings
- no results
- no active session
- no menu items
- no expenses
- no resources

Each empty state should:

- explain what is missing
- tell what to do next
- still feel branded

### 11.3 Success states

Need polished feedback for:

- booking created
- payment verified
- F&B added
- expense saved
- resource created

Use:

- toast
- subtle delight
- motion

### 11.4 Error states

Need:

- inline field validation
- toast error
- retry hints
- network error fallback

### 11.5 Live states

Need clear visuals for:

- connecting
- live
- syncing
- offline
- pending review

### 11.6 Confirmation states

Rules:

- simple yes/no destructive decisions use centered modal
- rich review uses sheet
- success uses toast

---

## 12. Motion And Delight Rules

### 12.1 Brand motion

The app should have subtle “signal” motion language.

Possible expressions:

- ripple
- pulse
- ring activation
- small orbit highlight
- active dot blink

### 12.2 Where to use motion

Use motion in:

- dashboard hero entry
- tab focus change
- list card press
- chip selection
- active/live indicators
- success toasts
- bottom sheet open
- quantity stepper response

### 12.3 Motion style

Motion should feel:

- modern
- soft
- a little bouncy in light moments
- tighter in admin operational moments

### 12.4 Delight opportunities

Delight should happen in:

- completing payment
- starting a session
- creating a booking
- adding F&B
- restoring an item to ready
- successful verification

Do not overdo delight in destructive or tense flows.

---

## 13. Content And Copy Direction

### 13.1 Copy style

Copy should be:

- short
- human
- useful
- not robotic

### 13.2 Avoid

- long explanations everywhere
- “AI demo” sounding language
- repeated headers and helper lines

### 13.3 Prefer

- action-first labels
- short state descriptions
- compact guidance

Examples:

- good: `Butuh review`
- good: `Mulai sesi`
- good: `Catat DP`
- avoid: long paragraphs explaining obvious actions

---

## 14. Accessibility Requirements

Stitch should respect:

- large enough tap targets
- readable contrast
- state not conveyed by color alone
- obvious hierarchy
- keyboard-safe layouts
- safe-area aware components

Especially on admin mobile:

- critical buttons must remain visible
- bottom dock must never cover content
- scroll must always reach the real end of content

---

## 15. Step-by-Step Journeys

These are the exact experience journeys Stitch should support.

### 15.1 Customer journey: discover to booking

1. user opens app
2. sees discovery or tenant page
3. explores resource
4. selects package
5. selects add-ons
6. selects date and time
7. reviews summary
8. logs in or continues through auth if needed
9. completes booking
10. moves to payment or live status

### 15.2 Customer journey: active booking

1. user opens active tab
2. sees live session card
3. sees time remaining / current status
4. optionally extends
5. adds F&B if available
6. monitors status
7. session completes

### 15.3 Admin journey: start of shift

1. admin opens dashboard
2. sees today focus
3. checks bookings needing action
4. checks active sessions
5. enters bookings or ops

### 15.4 Admin journey: manual booking

1. admin opens bookings
2. taps scheduled or walk-in
3. fills customer
4. chooses resource
5. chooses package
6. chooses date/time/duration
7. reviews total
8. confirms booking
9. lands on booking detail

### 15.5 Admin journey: running a live booking

1. admin opens booking detail
2. sees status and payment state
3. confirms booking if needed
4. starts session
5. monitors active session
6. adds F&B or add-on as needed
7. extends session if needed
8. ends session
9. settles payment

### 15.6 Admin journey: direct sale

1. admin opens ops or new order
2. builds cart
3. chooses payment path
4. creates order
5. opens order detail
6. verifies/settles payment
7. closes order

### 15.7 Admin journey: maintain catalog

1. open menu
2. filter/search
3. edit or create item
4. upload image
5. set ready/stop
6. save
7. receive feedback

### 15.8 Admin journey: maintain resources

1. open resources
2. scan status
3. open resource detail
4. edit main package/add-on
5. save
6. return to list

### 15.9 Admin journey: record expense

1. open expenses
2. tap add
3. fill title/category/amount/date
4. upload receipt
5. save
6. receive success feedback

---

## 16. Screen Design Order For Stitch

This is the recommended design sequence.

### Phase 1: foundations

1. foundations and tokens
2. app shell
3. floating tab bars
4. primitives
5. motion rules

### Phase 2: pattern library

1. dashboard pattern
2. list pattern
3. detail/action pattern
4. form/create pattern
5. sheet pattern

### Phase 3: customer high-value screens

1. discovery
2. tenant storefront
3. resource detail / booking builder
4. customer login/register
5. active booking
6. booking payment

### Phase 4: admin high-value screens

1. admin login
2. dashboard
3. bookings list
4. booking detail
5. operations
6. direct sale new
7. direct sale detail

### Phase 5: admin support modules

1. customers list/detail
2. resources list/detail
3. menu
4. expenses
5. workspace
6. business setup

### Phase 6: state pass

Design all major:

- loading
- empty
- error
- success
- offline
- live
- confirmation

---

## 17. Stitch Instructions

Use these instructions while generating the designs.

### 17.1 What Stitch must do

- design the app as a memorable branded product, not a generic ops tool
- make it feel alive and responsive
- preserve strong operational clarity
- keep copy short
- use more icon-led grouping
- use more grid-based organization where appropriate
- create stronger visual signatures for hero, status, and live sections
- treat motion and feedback as first-class design features

### 17.2 What Stitch must avoid

- do not make it look like a generic admin dashboard
- do not make it look like a bootstrap or template app
- do not make every screen a stack of identical white cards
- do not overuse purple startup visuals
- do not turn the app into a childish game UI
- do not make forms feel like paperwork

### 17.3 North star

Bookinaja should feel like:

- a premium live operating system
- a mobile command center
- a product with energy and personality
- a product that people remember after using it

---

## 18. Final Deliverable Expectation From Stitch

Stitch should produce:

1. a complete mobile visual language
2. a design system and reusable primitives
3. screen designs for both customer and admin experiences
4. state variations
5. motion/feedback ideas
6. a clearly branded Bookinaja experience

The result should make someone say:

- this feels smooth
- this feels premium
- this feels alive
- this does not feel like a generic operational app

