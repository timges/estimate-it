---
name: estimate-it
description: Real-time planning poker for bias-free story estimation
colors:
  accent-blue: "#3b82f6"
  accent-violet: "#8b5cf6"
  accent-sky: "#60a5fa"
  deck-navy-top: "#1a1a2e"
  deck-navy-bottom: "#16213e"
  deck-navy-selected-top: "#0f2440"
  deck-navy-selected-bottom: "#1e3a5f"
  deck-edge: "#2a2a4a"
  bg-void: "#0a0a0a"
  bg-surface: "#171717"
  bg-raised: "#262626"
  bg-hover: "#333333"
  text-primary: "#e5e5e5"
  text-secondary: "#a3a3a3"
  text-muted: "#737373"
  text-placeholder: "#525252"
  border-default: "#333333"
  border-subtle: "#262626"
  border-strong: "#404040"
  status-success: "#4ade80"
  status-warning: "#f59e0b"
  status-error: "#ef4444"
typography:
  display:
    fontFamily: "Space Grotesk, system-ui, sans-serif"
    fontSize: "42px"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-1px"
  headline:
    fontFamily: "Space Grotesk, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "normal"
  title:
    fontFamily: "Space Grotesk, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "normal"
  body:
    fontFamily: "Space Grotesk, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "Space Grotesk, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "1px"
  numeral:
    fontFamily: "Space Grotesk, system-ui, sans-serif"
    fontSize: "26px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "normal"
    fontFeature: "tabular-nums"
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  card: "12px"
  xl: "16px"
  full: "9999px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "20px"
  "6": "24px"
  "8": "32px"
  "10": "40px"
  "12": "48px"
  "16": "64px"
components:
  button-primary:
    backgroundColor: "{colors.accent-blue}"
    textColor: "#ffffff"
    rounded: "{rounded.lg}"
    padding: "12px"
  button-secondary:
    backgroundColor: "{colors.border-subtle}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
    padding: "12px"
  input:
    backgroundColor: "{colors.bg-void}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
    padding: "12px 16px"
  vote-card:
    backgroundColor: "{colors.deck-navy-top}"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.card}"
    width: "68px"
    height: "96px"
  vote-card-selected:
    backgroundColor: "{colors.deck-navy-selected-top}"
    textColor: "{colors.accent-sky}"
    rounded: "{rounded.card}"
    width: "68px"
    height: "96px"
  estimate-card:
    backgroundColor: "{colors.bg-surface}"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.lg}"
    width: "64px"
---

# Design System: estimate-it

## 1. Overview

**Creative North Star: "Quiet Vote, Bright Reveal"**

estimate-it has two emotional beats, and the design serves both. During the vote it is a quiet room: a near-black surface, muted neutrals, no movement, nothing that could leak or nudge another person's number. Each player holds their hand of cards in private. Then everyone reveals at once, and the surface comes alive: cards lift, the blue→violet signature gradient blooms across the stats, the distribution bars animate in, success-green confirms consensus. Focus during concentration, play once the decision is made. The interface earns its personality by staying out of the way until the moment it's allowed to celebrate.

The metaphor is a real planning-poker table. Voting cards are tall, physical playing cards (68×96px) cut from a dark navy deck, and they respond to touch: an 8px lift on hover, a 12px lift with a glow when chosen. This tactility is deliberate and central, not decoration. The deck has its own navy identity (`#1a1a2e`→`#16213e`), distinct from the app's gray chrome, so the cards always read as "the thing you play."

This system explicitly rejects heavyweight enterprise agile tooling: no Jira-style dense boards, no busy multi-gradient dashboards, no cramped backlog-management chrome. It also rejects generic AI-slop SaaS patterns: no identical icon-heading-text card grids, no hero-metric templates. Warmth lives in the room codes and the reveal, never in clutter.

**Key Characteristics:**
- Dark-only, near-black canvas (`#0a0a0a`) built for screen-shared remote sessions
- Two-phase rhythm: still and muted during the vote, animated and bright at reveal
- A physical card deck with its own navy palette as the signature object
- A blue→violet gradient as the recurring brand signal
- Space Grotesk throughout, geometric and a touch playful
- Tabular numerals everywhere a value is compared

## 2. Colors

A near-black neutral foundation tinted cool, lit by a single blue→violet signature gradient and a separate navy "deck" palette for the cards.

### Primary
- **Signal Blue** (#3b82f6): The lead of the signature gradient. Anchors the primary action, focus outlines, selected-card borders, and the start of every distribution bar. This is the color of "go" and "chosen."
- **Signal Violet** (#8b5cf6): The tail of the signature gradient, paired with Signal Blue at 135°. Appears on the primary button, the wordmark dot, and the end of distribution bars. Never used alone as a flat fill; its job is to give the blue depth.
- **Sky Highlight** (#60a5fa): The lighter blue a card's numeral turns when hovered or selected. The "active glow" color.

### Secondary
- **Deck Navy** (#1a1a2e → #16213e): The voting card body, a vertical-ish 145° gradient. This is a self-contained palette that belongs only to the cards, giving the deck a physical identity separate from the gray chrome.
- **Deck Navy, Played** (#0f2440 → #1e3a5f): The deeper, bluer navy a card shifts to when selected, paired with a Signal-Blue border and a glow.
- **Deck Edge** (#2a2a4a): The 2px resting border around each card, the dark seam of the deck.

### Neutral
- **Void** (#0a0a0a): The page background. The quiet room.
- **Surface** (#171717): Cards, panels, story containers, reveal estimate cards. The raised plane.
- **Raised** (#262626): Secondary surfaces, rename inputs, hover backgrounds.
- **Hover** (#333333): Topmost neutral step; also the default border color.
- **Text Primary** (#e5e5e5): Headings and body. Never pure white.
- **Text Secondary** (#a3a3a3): Subtitles, descriptions, participant status, button-secondary labels.
- **Text Muted** (#737373) / **Placeholder** (#525252): Eyebrow labels and input placeholders.
- **Borders** — Subtle (#262626), Default (#333333), Strong (#404040): a three-step ladder for separating surfaces without lines shouting.

### Tertiary (status)
- **Consensus Green** (#4ade80): "Voted" status, the reveal title, and the consensus readout. The color of agreement.
- **Warning** (#f59e0b) / **Error** (#ef4444): Reserved for genuine warning and error states.

### Named Rules
**The Deck-Is-Separate Rule.** The navy deck palette (`#1a1a2e` family) is reserved exclusively for voting and estimate cards. Never paint chrome, panels, or buttons in deck navy, and never paint a card in neutral gray. The deck must always look like a deck.

**The Two-Beat Color Rule.** During the vote, the surface stays neutral and muted; saturated color is held back. The signature gradient and Consensus Green arrive *at reveal*. Color is a reward for finishing the vote, not ambient decoration.

## 3. Typography

**Display / Body / Label Font:** Space Grotesk (with system-ui, sans-serif fallback)
**Numeral treatment:** Space Grotesk with `tabular-nums`

**Character:** Space Grotesk is a geometric grotesque with just enough quirk (the distinctive `a`, `g`, and angled terminals) to feel friendly rather than corporate. One family carries the whole system; hierarchy comes from scale and weight, not from font-switching.

### Hierarchy
- **Display** (700, 42px, letter-spacing −1px): The landing wordmark `estimate-it.` only. Tight tracking for a confident lockup.
- **Headline** (700, 24px): Room-level and section headings.
- **Title** (600, 18px): Story titles, prominent labels.
- **Body** (400, 15px, line-height 1.6): Story descriptions and running text. Keep prose to 65–75ch.
- **Label** (500–600, 11–13px, uppercase, letter-spacing 1–2px): Eyebrow labels ("Create a Room", "Your hand"). The recurring structural cue across panels.
- **Numeral** (800, 26px, tabular-nums): Card values and revealed estimates. Heavy weight gives the cards their playing-card presence.

### Named Rules
**The Tabular Rule.** Every number a human compares against another number, card values, revealed estimates, distribution counts, uses `tabular-nums`. Estimates must align in a column at a glance; proportional digits are forbidden on values.

**The One-Family Rule.** Space Grotesk does all the work. Do not introduce a second display or mono face; reach for weight (400 → 600 → 700 → 800) and the uppercase label treatment instead.

## 4. Elevation

A flat-by-default system. Surfaces sit on the void as flat planes separated by the three-step border ladder, not by ambient shadows. Shadow is spent in exactly one place: the cards, and only in response to interaction. This keeps the vote phase calm and makes the lift of a card feel like a genuine physical event.

### Shadow Vocabulary
- **Card Hover Lift** (`box-shadow: 0 8px 24px rgba(59, 130, 246, 0.15)` + `translateY(-8px)`): A blue-tinted shadow that appears as a card rises under the cursor.
- **Card Selected Glow** (`box-shadow: 0 0 20px rgba(96, 165, 250, 0.2), 0 12px 32px rgba(59, 130, 246, 0.2)` + `translateY(-12px)`): A two-layer glow-plus-cast-shadow when a card is played. The strongest elevation in the system, reserved for the player's own committed choice.

### Named Rules
**The Earned-Shadow Rule.** Shadows are forbidden at rest. They exist only as a response to hover and selection on cards. If a static surface has a shadow, it is wrong; flatten it and let the borders do the separating.

## 5. Components

### Buttons
- **Shape:** Gently rounded (10px, `{rounded.lg}`), full-width inside panels.
- **Primary:** The blue→violet signature gradient (`linear-gradient(135deg, #3b82f6, #8b5cf6)`), white text, 600 weight, 12px padding. Hover lifts 1px and drops opacity to 0.9. This is the only gradient-filled control.
- **Secondary:** Flat `border-subtle` (#262626) fill, primary text; hover steps up to `border-default` (#333333). The quiet sibling.
- **Reveal actions** use a slightly tighter radius (8px) and 10px/24px padding for the inline action row.
- **Disabled:** opacity 0.4, `not-allowed` cursor.
- **Focus:** 2px Signal-Blue outline, 2px offset, on every interactive element.

### Inputs / Fields
- **Style:** Void (#0a0a0a) fill against the Surface panel, 1px `border-default` stroke, 10px radius, 15px text.
- **Focus:** border shifts to Signal Blue *and* a 2px Signal-Blue outline at 2px offset (deliberately doubled for visibility on dark).
- **Placeholder:** Placeholder gray (#525252).

### Vote Card (signature component)
- **Shape:** Tall playing card, 68×96px, 12px radius, 2px `deck-edge` border.
- **Resting:** Deck Navy gradient (`linear-gradient(145deg, #1a1a2e, #16213e)`), secondary-gray numeral, 800 weight, 26px.
- **Hover:** Lifts 8px, border → Signal Blue, numeral → Sky Highlight, blue-tinted shadow.
- **Selected:** Lifts 12px, deeper "played" navy gradient, Signal-Blue border, Sky numeral, two-layer glow. The card visibly leaves the deck.
- **Disabled (pre-reveal lock / not your turn):** opacity 0.4, `not-allowed`.

### Estimate Card (reveal)
- **Shape:** 64px wide, 10px radius, 2px `border-default`, Surface fill. Flatter and quieter than a vote card, because the moment of choosing has passed; now it is data.
- **Value:** 26px / 800, tabular numerals.

### Distribution Bars (reveal)
- **Track:** `bg-void` (#0a0a0a), 14px tall, 7px radius.
- **Fill:** The signature gradient horizontally (`linear-gradient(90deg, #3b82f6, #8b5cf6)`), width-animated over 0.4s ease. Counts and values in tabular numerals.

### Participant List
- **Style:** A right sidebar separated by a single 1px `border-default` left edge (a structural divider, never a colored accent stripe). Rows are 8px-padded, 8px-radius, with a barely-there `rgba(255,255,255,0.03)` hover.
- **Status:** "Voted" turns Consensus Green; default is secondary gray. Avatars are 32px circles.

### Cards / Containers
- **Corner Style:** 16px on the landing panels, 12px on story/content cards.
- **Background:** Surface (#171717) on Void; 1px `border-subtle` or `border-default`.
- **Padding:** 20–28px internal.
- **Shadow:** none at rest (see Elevation). Never nest a card inside a card.

## 6. Do's and Don'ts

### Do:
- **Do** keep the vote phase quiet: neutral surfaces, no saturated color, no motion that competes with the decision. Save the signature gradient and Consensus Green for the reveal (The Two-Beat Color Rule). The ambient particle background is an exception — it is always-on decoration, not vote-phase motion.
- **Do** reserve the navy deck palette (`#1a1a2e` family) for voting and estimate cards only (The Deck-Is-Separate Rule).
- **Do** use `tabular-nums` on every compared value (The Tabular Rule).
- **Do** keep elevation off resting surfaces; let card hover (−8px) and selection (−12px) be the only shadows (The Earned-Shadow Rule).
- **Do** tint neutrals cool toward the deck; never use pure `#000` or `#fff` (text tops out at #e5e5e5, the page bottoms out at #0a0a0a).
- **Do** give every interactive element the 2px Signal-Blue focus outline, and honor `prefers-reduced-motion` (already wired globally) so the reveal still resolves without animation.

### Don't:
- **Don't** build dense, Jira-style boards or busy multi-gradient dashboards. This is a table, not a backlog suite.
- **Don't** ship identical icon-heading-text card grids or hero-metric templates (big-number-plus-label SaaS cliché).
- **Don't** use the blue→violet gradient as text via `background-clip: text`. The one existing exception is the single wordmark dot on the landing page; do not extend gradient text to headings or anywhere else.
- **Don't** add `border-left`/`border-right` greater than 1px as a colored accent stripe on rows, cards, or callouts. The participant sidebar's 1px left border is a structural divider, the only acceptable side border.
- **Don't** paint chrome or buttons in deck navy, or paint a vote card in neutral gray. The deck must always look like a deck.
- **Don't** introduce a second font family. Space Grotesk plus weight and the uppercase label treatment cover the whole hierarchy.
- **Don't** animate during the vote or leak vote state through any pre-reveal visual cue. *Exception: the global ambient particle background (`ParticleBackground` component) runs continuously at a subtle level across all phases — it is decorative ambience, not motion that competes with the voting surface, and is gated by `prefers-reduced-motion`.*
