# Marketplace Growth Architecture

## Goal

Bookinaja should separate:

- core business profile
- discovery presentation
- content / posts
- feed ranking / analytics

so the admin panel stays operational-centric while still giving businesses a place to manage visibility and engagement inside the platform.

## Product modules

### 1. Business Profile

Purpose:

- identity and operational metadata
- brand basics
- landing page defaults

Examples:

- business name
- slug
- address
- open hours
- logo
- banner
- WhatsApp
- SEO metadata

Admin placement:

- `Settings > Konfigurasi Bisnis`

### 2. Discovery Profile

Purpose:

- how a business appears in discovery feed and marketplace cards

Examples:

- discovery headline
- short pitch
- highlight copy
- featured image
- tags
- badges

Admin placement:

- `Settings > Growth Hub > Discovery Profile`

Rules:

- tenant only controls presentation
- platform controls ranking, slotting, and automated boosts

### 3. Posts & Content

Purpose:

- ongoing marketplace presence
- visual/content-based promotion
- event/promo/update storytelling

Examples:

- photo update
- short video
- promo card
- event post
- announcement

Admin placement:

- `Settings > Growth Hub > Posts & Content`

Rules:

- posts are separate feed items
- a business can appear because of its profile or because of a specific post

### 4. Discovery Insights

Purpose:

- measure visibility, engagement, and downstream booking intent

Examples:

- impressions
- clicks
- CTR
- profile opens
- booking starts
- top post
- top discovery asset

Admin placement:

- `Settings > Growth Hub > Discovery Insights`

## Feed model

Current state:

- feed is primarily tenant-profile-based with smart ranking

Target state:

- feed should rank `feed items`, not only tenants

Feed item types:

- business profile card
- promo card
- post card
- video card
- event card
- resource highlight card

## Ranking layers

1. Eligibility

- active tenant
- publishable profile or post
- content minimum fulfilled

2. Quality

- image quality / cover present
- title clarity
- tags/badges completeness
- post formatting completeness

3. Performance

- impression to click
- profile view
- booking start
- recency of engagement

4. Personalization

- preferred categories
- preferred business types
- previously visited tenants
- budget fit
- time-of-day match

5. Diversity

- limit same tenant repeating too often
- prevent single category dominance
- reserve exploration slots for new businesses/content

## Admin IA principle

Operational nav should stay focused on:

- dashboard
- bookings
- POS
- resources
- customers
- expenses
- staff

Growth should live in its own sub-area so users managing visibility do not pollute operational flows.

## Suggested database evolution

### Existing

- `tenants`
- `discovery_feed_events`

### Add next

- `tenant_discovery_profiles`
- `tenant_posts`
- `tenant_post_metrics`

## Suggested rollout

### Phase 1

- keep current discovery profile on tenant-backed storage
- separate growth IA in admin
- prepare posts UI and insights UI

### Phase 2

- add `tenant_posts`
- allow photo/video/promo post creation
- render posts as feed items

### Phase 3

- add post metrics and profile-to-booking attribution
- improve personalized feed with post relevance

### Phase 4

- scheduling
- moderation
- experimentation / slot testing
- richer content analytics
