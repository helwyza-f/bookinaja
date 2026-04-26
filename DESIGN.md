---
name: Bookinaja
description: All-in-One Booking Platform SaaS with a clean, modern aesthetic designed for business operations management across rental and reservation industries.
colors:
  light:
    background: oklch(1 0 0)
    foreground: oklch(0.145 0 0)
    card: oklch(1 0 0)
    card-foreground: oklch(0.145 0 0)
    popover: oklch(1 0 0)
    popover-foreground: oklch(0.145 0 0)
    primary: oklch(0.205 0 0)
    primary-foreground: oklch(0.985 0 0)
    secondary: oklch(0.97 0 0)
    secondary-foreground: oklch(0.205 0 0)
    muted: oklch(0.97 0 0)
    muted-foreground: oklch(0.556 0 0)
    accent: oklch(0.97 0 0)
    accent-foreground: oklch(0.205 0 0)
    destructive: oklch(0.577 0.245 27.325)
    border: oklch(0.922 0 0)
    input: oklch(0.922 0 0)
    ring: oklch(0.708 0 0)
    chart-1: oklch(0.87 0 0)
    chart-2: oklch(0.556 0 0)
    chart-3: oklch(0.439 0 0)
    chart-4: oklch(0.371 0 0)
    chart-5: oklch(0.269 0 0)
    sidebar: oklch(0.985 0 0)
    sidebar-foreground: oklch(0.145 0 0)
    sidebar-primary: oklch(0.205 0 0)
    sidebar-primary-foreground: oklch(0.985 0 0)
    sidebar-accent: oklch(0.97 0 0)
    sidebar-accent-foreground: oklch(0.205 0 0)
    sidebar-border: oklch(0.922 0 0)
    sidebar-ring: oklch(0.708 0 0)
    hero-glow: rgba(59, 130, 246, 0.1)
  dark:
    background: oklch(0.145 0 0)
    foreground: oklch(0.985 0 0)
    card: oklch(0.205 0 0)
    card-foreground: oklch(0.985 0 0)
    popover: oklch(0.205 0 0)
    popover-foreground: oklch(0.985 0 0)
    primary: oklch(0.922 0 0)
    primary-foreground: oklch(0.205 0 0)
    secondary: oklch(0.269 0 0)
    secondary-foreground: oklch(0.985 0 0)
    muted: oklch(0.269 0 0)
    muted-foreground: oklch(0.708 0 0)
    accent: oklch(0.269 0 0)
    accent-foreground: oklch(0.985 0 0)
    destructive: oklch(0.704 0.191 22.216)
    border: oklch(1 0 0 / 10%)
    input: oklch(1 0 0 / 15%)
    ring: oklch(0.556 0 0)
    chart-1: oklch(0.87 0 0)
    chart-2: oklch(0.556 0 0)
    chart-3: oklch(0.439 0 0)
    chart-4: oklch(0.371 0 0)
    chart-5: oklch(0.269 0 0)
    sidebar: oklch(0.205 0 0)
    sidebar-foreground: oklch(0.985 0 0)
    sidebar-primary: oklch(0.488 0.243 264.376)
    sidebar-primary-foreground: oklch(0.985 0 0)
    sidebar-accent: oklch(0.269 0 0)
    sidebar-accent-foreground: oklch(0.985 0 0)
    sidebar-border: oklch(1 0 0 / 10%)
    sidebar-ring: oklch(0.556 0 0)
    hero-glow: rgba(59, 130, 246, 0.2)
typography:
  sans:
    fontFamily: Inter
    fontWeights:
      normal: 400
      medium: 500
      semibold: 600
      bold: 700
      black: 900
  display:
    fontFamily: Plus Jakarta Sans
    usage: Hero headlines and brand emphasis
  headings:
    fontFamily: Syne
    usage: Section headings and accent typography
  mono:
    fontFamily: Geist Mono
    usage: Code and technical data
  scale:
    xs: 12px
    sm: 14px
    base: 16px
    lg: 18px
    xl: 20px
    2xl: 24px
    3xl: 30px
    4xl: 36px
    5xl: 48px
    6xl: 60px
    7xl: 72px
rounded:
  base: 0.625rem
  sm: 0.375rem
  md: 0.5rem
  lg: 0.625rem
  xl: 0.875rem
  2xl: 1.125rem
  3xl: 1.375rem
  4xl: 1.625rem
  pill: 9999px
spacing:
  base: 4px
  unit: 0.25rem
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  3xl: 64px
motion:
  duration-fast: 150ms
  duration-normal: 300ms
  duration-slow: 500ms
  easing: ease-in-out
  animations:
    - pulse
    - spin-slow
    - fade-in
    - slide-up
shadow:
  sm: 0 1px 2px 0 rgb(0 0 0 / 0.05)
  md: 0 4px 6px -1px rgb(0 0 0 / 0.1)
  lg: 0 10px 15px -3px rgb(0 0 0 / 0.1)
  xl: 0 20px 25px -5px rgb(0 0 0 / 0.1)
  2xl: 0 18px 42px -28px rgba(15, 23, 42, 0.45)
elevation:
  surface:
    light: Pure white background
    dark: Dark slate (oklch 0.145 lightness)
  cards:
    light: oklch(1 0 0) - matches background for seamless appearance
    dark: oklch(0.205 0 0) - elevated one tone above background
components:
  button:
    default:
      backgroundColor: "{colors.primary}"
      textColor: "{colors.primary-foreground}"
      borderRadius: rounded-lg
      padding: "px-2.5 py-0 h-8"
    outline:
      backgroundColor: transparent
      textColor: "{colors.foreground}"
      borderRadius: rounded-lg
      border: "{colors.border}"
    secondary:
      backgroundColor: "{colors.secondary}"
      textColor: "{colors.secondary-foreground}"
      borderRadius: rounded-lg
    ghost:
      backgroundColor: transparent
      textColor: "{colors.foreground}"
      borderRadius: rounded-lg
      hoverBackground: "{colors.muted}"
    destructive:
      backgroundColor: "{colors.destructive}/10"
      textColor: "{colors.destructive}"
      borderRadius: rounded-lg
  input:
    backgroundColor: "{colors.input}"
    textColor: "{colors.foreground}"
    borderRadius: rounded-lg
    border: "{colors.border}"
    focusRing: "{colors.ring}"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    borderRadius: rounded-xl
    padding: p-6
    shadow: shadow-sm
  badge:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.muted-foreground}"
    borderRadius: rounded-full
    fontSize: text-xs
    fontWeight: font-medium
  dialog:
    backgroundColor: "{colors.popover}"
    borderRadius: rounded-xl
    overlayBackground: rgba(0, 0, 0, 0.5)
  sheet:
    backgroundColor: "{colors.background}"
    borderRadius: "rounded-l-2xl"
---

## Brand & Style

Bookinaja is a modern SaaS booking platform designed for Indonesian business operations. The design system embodies **professional clarity with a touch of warmth** — balancing the seriousness of business management tools with approachable, human-centered interfaces.

The visual identity uses a neutral slate palette accented by a subtle blue glow in hero areas, creating a trustworthy yet innovative atmosphere. The interface is clean, spacious, and action-oriented — designed for efficiency while maintaining visual elegance.

## Colors

The palette centers on neutral grays for a professional foundation, with strategic use of color to guide attention and action.

- **Primary**: A near-black slate (oklch 0.205) that anchors the interface in light mode, inverting to near-white (oklch 0.922) in dark mode for clear contrast.
- **Secondary & Muted**: Light gray tones (oklch 0.97) that recede into backgrounds, maintaining hierarchy without competing for attention.
- **Accent**: Subtle blue glow (rgba 59, 130, 246) applied sparingly to hero sections and focal points, suggesting innovation and trust.
- **Destructive**: Warm red with slight orange tint (oklch 0.577 0.245 27.325) for error states — urgent but not harsh.
- **Sidebar**: In light mode, a near-white surface. In dark mode, the sidebar gains a distinctive blue accent (oklch 0.488 0.243 264.376) for brand reinforcement.

## Typography

**Inter** serves as the primary workhorse font — geometric, neutral, and exceptionally readable at all sizes. Its variable weight axis allows subtle emphasis without visual disruption.

**Plus Jakarta Sans** brings warmth to brand moments — used sparingly for hero headlines and marketing copy to add personality.

**Syne** handles display typography and section headings, bringing geometric character and distinction where hierarchy matters most.

The text scale favors generous sizes for body copy (18px base) with clear hierarchy progression. Ultra-bold weights (900, 1000) appear in feature labels and callouts, creating visual anchors.

## Layout & Spacing

The layout uses an 8px base grid with generous whitespace. Content areas are breathable, with `lg` and `xl` spacing between sections.

- **Cards and containers** use `rounded-xl` (14px) for a soft, modern feel
- **Action elements** (buttons, inputs) use `rounded-lg` (10px) for a tactile, clickable appearance
- **Hero sections** employ extreme rounding (2-3rem) for a contemporary, approachable aesthetic
- **Responsive**: Mobile-first with fluid typography using `clamp()` for smooth scaling

## Elevation & Depth

Elevation is achieved through tonal shifts rather than heavy shadows. Cards float subtly above the background with soft shadows that intensify on hover.

- **Shadow-2xl**: The signature shadow — highly diffused and spread (18px blur) with a subtle slate undertone, creating depth without heaviness.
- **Light mode**: Near-zero elevation difference between background and cards; shadows provide the separation.
- **Dark mode**: Cards sit one tone above the background (oklch 0.205 vs 0.145), creating natural visual hierarchy.

## Shapes

The shape language is defined by **rounded corners with substantial presence**.

- **Buttons & inputs**: `rounded-lg` (10px) — clickable and friendly without being childish
- **Cards & containers**: `rounded-xl` to `rounded-2xl` (14-18px) — spacious and modern
- **Hero elements**: Extreme rounding (`rounded-[2rem]`, `rounded-[3rem]`) — contemporary and memorable
- **Icons**: Lucide React with consistent 2px stroke weight and rounded caps

## Motion

Motion is purposeful and understated, providing feedback without distraction.

- **Transitions**: 150ms for micro-interactions, 300ms for state changes, 500ms for page-level transitions
- **Easing**: `ease-in-out` throughout for smooth, natural movement
- **Focus states**: Visible but not aggressive — 3px ring with 50% opacity in light mode
- **Hover feedback**: Subtle background shifts and gentle `translate-y-px` on button press for tactile feedback