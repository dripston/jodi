# Jodi Design System

This is the visual and interaction contract for everything in `frontend/`. The frontend agent must follow it exactly. If something isn't covered here, choose the **quieter, simpler** option and note it in `docs/requests.md`.

---

## 1. Design intent

Jodi is used by **district health officials, ASHAs and judges watching a live demo**. It must feel like a **calm, trustworthy, premium health-tech product**: think Linear, Stripe Dashboard, Vercel and Notion, not a hackathon template.

**Five principles:**

1. **Calm over loud.** Neutral surfaces, one brand colour used sparingly, colour reserved for meaning (status). No gradients, glows, glassmorphism, neon, or decorative blobs.
2. **Clarity over density.** Every screen answers one question first (e.g. "Who needs help right now?"). Secondary information is progressively disclosed (drawers, tabs, expanders).
3. **Status is sacred.** Red, amber and green mean clinical risk and are used for nothing else. Never rely on colour alone; always pair with a label and an icon.
4. **Plain language.** Show "Baby feeding less than usual", never `feeding_poor`. Sentence case everywhere. No jargon, no acronyms without explanation on first use.
5. **Consistency is the premium feel.** Same spacing, radii, type sizes and component patterns on every page. A premium UI is mostly *restraint and repetition*.

### Anti-patterns (instant rejection)

- ❌ Gradient backgrounds, gradient text, glowing borders, glass cards, heavy drop shadows
- ❌ Emoji used as icons in the product UI (use `lucide-react` icons)
- ❌ Random hex colours inside components (only design tokens)
- ❌ Centered "card soup" landing layouts for app pages; walls of identical cards
- ❌ More than one primary button per view
- ❌ ALL CAPS headings, Title Case Everywhere, exclamation marks in UI copy
- ❌ Spinners for whole pages (use skeletons); blank screens on error
- ❌ Lorem ipsum, "Test", "asdf", or real patient data
- ❌ Mixed icon sets, mixed border radii, mixed font families
- ❌ Inline `style={{…}}` for anything other than truly dynamic values (e.g. progress width)

---

## 2. Foundations (tokens)

Implement as CSS variables in `src/styles/tokens.css` and map them in `tailwind.config.ts`. Components use Tailwind classes that reference tokens (`bg-surface`, `text-muted`), **never raw hex**.

### Colour

| Token | Light value | Use |
|---|---|---|
| `--bg` | `#FAFAF9` | app background (stone-50) |
| `--surface` | `#FFFFFF` | cards, panels, tables |
| `--surface-muted` | `#F5F5F4` | table headers, subtle fills |
| `--border` | `#E7E5E4` | 1px borders, dividers |
| `--border-strong` | `#D6D3D1` | inputs, focused containers |
| `--text` | `#1C1917` | primary text |
| `--text-muted` | `#57534E` | secondary text |
| `--text-subtle` | `#A8A29E` | placeholders, timestamps |
| `--brand` | `#3730A3` | primary actions, active nav, links (indigo-800, used sparingly) |
| `--brand-soft` | `#EEF2FF` | selected rows, active nav background |
| `--focus` | `#6366F1` | focus ring (2px, offset 2px) |
| `--red-fg` / `--red-bg` / `--red-border` | `#B91C1C` / `#FEF2F2` / `#FECACA` | red status |
| `--amber-fg` / `--amber-bg` / `--amber-border` | `#B45309` / `#FFFBEB` / `#FDE68A` | amber status |
| `--green-fg` / `--green-bg` / `--green-border` | `#15803D` / `#F0FDF4` / `#BBF7D0` | green status |
| `--info-fg` / `--info-bg` | `#1D4ED8` / `#EFF6FF` | neutral info notices |

Dark mode is **out of scope** for the hackathon. Do not half-implement it.

### Source-label colours (provenance badges)

| Source | Style |
|---|---|
| Mother-reported | neutral outline badge, icon `MessageCircle` |
| Family-reported | neutral outline badge, icon `Users` |
| ASHA-measured | `--info` soft badge, icon `Stethoscope` |
| Doctor-verified | `--brand-soft` badge with `--brand` text, icon `BadgeCheck` |
| From discharge slip | neutral soft badge, icon `FileText` |

Reported entries look **lighter** than measured or verified ones. That visual difference is part of the product's honesty.

### Typography

- **Font:** `Inter` (variable) for UI; `Noto Sans Kannada` for Kannada text. Load from Google Fonts. Numbers in vitals and KPIs use `font-variant-numeric: tabular-nums`.
- **Scale (px / line-height / weight):**

| Token | Size | LH | Weight | Use |
|---|---|---|---|---|
| `display` | 30 | 36 | 600 | KPI numbers, page hero numbers |
| `h1` | 24 | 32 | 600 | page titles |
| `h2` | 18 | 28 | 600 | section titles, card titles |
| `h3` | 15 | 22 | 600 | sub-sections |
| `body` | 14 | 20 | 400 | default text |
| `body-strong` | 14 | 20 | 500 | emphasis, table primary column |
| `small` | 13 | 18 | 400 | meta, helper text |
| `caption` | 12 | 16 | 500 | badges, table headers (not uppercase; use `--text-muted`) |

**Projector mode** (`/live`) scales the root font size to 18px, so everything grows proportionally. Never hand-tune sizes per element.

### Spacing, radius, elevation

- **Spacing scale:** 4, 8, 12, 16, 20, 24, 32, 40, 48, 64. Page padding 32 (desktop) / 16 (mobile). Card padding 20. Gap between cards 16 or 24.
- **Radius:** `--radius-sm` 6px (badges, inputs), `--radius` 10px (cards, buttons), `--radius-lg` 14px (drawers, modals). Never use full-round pills except status pills and avatars.
- **Elevation:** cards use a **1px border + no shadow**. Shadows only for floating layers: dropdowns/popovers `0 4px 16px rgba(0,0,0,0.08)`, drawers/modals `0 12px 40px rgba(0,0,0,0.12)`.

### Motion

- Durations: 120ms (hover/press), 180ms (popovers, tabs), 240ms (drawers, new timeline items).
- Easing: `cubic-bezier(0.2, 0, 0, 1)`.
- New timeline entry: fade + 8px slide-down, plus a 1.5s soft highlight (`--brand-soft`) that fades out.
- New red alert: a single 600ms ring pulse on the status pill. **Never** loop animations or blink.
- Respect `prefers-reduced-motion` (disable movement, keep fades).

### Iconography

- `lucide-react` only, 16px in dense UI, 20px in navigation and headers, stroke width 1.75.
- Mother = `User`, Baby = `Baby`, Alert = `TriangleAlert` (amber) / `Siren` (red), Call = `Phone`, ASHA = `Stethoscope`, Record integrity = `ShieldCheck`.

---

## 3. Layout

### App shell (all pages except `/live` and `/asha/*`)

```
┌──────────────┬───────────────────────────────────────────────────────┐
│  Jodi logo   │  Top bar: page title · district switcher · search ⌘K │
│              ├───────────────────────────────────────────────────────┤
│  Overview    │                                                       │
│  Alerts  (3) │                 Page content (max-w 1280px)           │
│  Mothers     │                                                       │
│  Onboard     │                                                       │
│  ASHAs       │                                                       │
│  Calls       │                                                       │
│  ─────────   │                                                       │
│  Live demo   │                                                       │
│  Record log  │                                                       │
│              │                                                       │
│  Pilot: Demo │                                                       │
│  District    │                                                       │
└──────────────┴───────────────────────────────────────────────────────┘
```

- Sidebar 240px, `--surface`, right border. Active item: `--brand-soft` background, `--brand` text, 3px left indicator. Alerts item shows a count badge (red if any red alerts).
- Top bar 56px, bottom border. Page title on the left; actions on the right.
- Content: `max-w-[1280px]`, centered, 32px padding.
- Mobile (< 768px): sidebar collapses into a sheet behind a menu button.

### Page anatomy

1. **Page header:** title (`h1`) + one-line description (`small`, muted) + right-aligned actions (max one primary button).
2. **Primary region:** the answer to the page's main question.
3. **Secondary region:** supporting detail, filters, tables.

---

## 4. Components (build these once in `src/components/ui`, reuse everywhere)

Base them on **shadcn/ui** (Radix primitives) and restyle to the tokens above. Each component lives in its own file with typed props.

| Component | Spec |
|---|---|
| `Button` | variants: `primary` (brand), `secondary` (surface + border), `ghost`, `danger` (red, only for destructive actions). Sizes `sm` 32px, `md` 36px, `lg` 44px. Icon + label, label never wraps. Loading state replaces icon with a small spinner and keeps width. |
| `Card` | surface, 1px border, radius 10, padding 20. Optional `CardHeader` (h2 + muted description + actions) and `CardFooter`. |
| `StatusPill` | `green` / `amber` / `red` + label ("Stable", "Needs check today", "Urgent"). Soft bg, fg text, border, leading dot icon. Optional `pulse` prop for new reds. |
| `SourceBadge` | per the source-label table above. |
| `KpiTile` | label (small, muted), value (display, tabular), delta/sub-label (small). No icons in circles, no gradients. |
| `DyadHeader` | mother and baby side by side: name, day since delivery, delivery type, baby age and weight, both `StatusPill`s. This is the signature "jodi" component; make it beautiful. |
| `Timeline` / `TimelineItem` | vertical rail; item = time (small, muted, relative + absolute on hover), subject icon (mother/baby), plain-language fact (body-strong), quote in italics (small, muted, in quotes), `SourceBadge`, and a rule chip if it triggered a rule. Group by day ("Day 5 · 13 Nov"). |
| `AlertCard` | level pill, reason text, subjects, `TicketStepper`, escalation countdown ("Escalates to ASHA in 6:42"), "Dismissed by family" warning badge, actions (Acknowledge / Mark reached). |
| `TicketStepper` | 5 steps: Open, Notified, Acknowledged, Reached, Closed; completed = brand, current = ring, future = border. |
| `DataTable` | sticky header (`--surface-muted`, caption style), 48px rows, hover `--surface-muted`, row click opens detail, empty and loading states built in. |
| `Drawer` | right side, 480px, for quick views (mother quick view from tables). |
| `EmptyState` | lucide icon (24px, muted), one-line title, one-line description, optional action. |
| `Skeleton` | shimmer-free pulse blocks matching the final layout. |
| `Toast` | bottom-right, neutral; error toasts never block the page. |
| `ChainBadge` | `ShieldCheck` + "Record verified · 42 entries" (green) or `ShieldAlert` + "Record altered at entry #17" (red). |
| `CallChip` | phone icon + purpose + duration + answered/missed state. |
| `Kbd`, `Tooltip`, `Tabs`, `Select`, `Input`, `Textarea`, `Dropdown`, `Dialog`, `Avatar` | shadcn defaults restyled to tokens. |

---

## 5. Page specifications

### `/` Overview (district programme dashboard; the government customer's view)

Main question: **"How are our mothers and babies doing, and who needs help now?"**

```
Page header: "Overview" · "Demo District · last 42 days"           [Export] (secondary)
┌ KPI row (4 tiles) ─────────────────────────────────────────────────────────┐
│ Mothers enrolled │ Open alerts (red/amber) │ Median time to contact │ ASHA visits to flagged families < 24h │
└────────────────────────────────────────────────────────────────────────────┘
┌ Needs attention now (2/3 width) ───────────┐ ┌ Today (1/3 width) ─────────┐
│ AlertCard list (red first, then amber)     │ │ Calls scheduled · completed │
│                                            │ │ · missed; ASHA tasks open   │
└────────────────────────────────────────────┘ └─────────────────────────────┘
┌ Mothers by status (stacked bar by day since delivery 0–42) ─────────────────┐
└────────────────────────────────────────────────────────────────────────────┘
```

### `/alerts` Alerts queue

Tabs: **Open** (default) · Acknowledged · Closed. List of `AlertCard`s sorted red → amber → oldest. Clicking opens the mother profile at the alert.

### `/mothers` Mothers list

`DataTable` columns: Mother (name + phone masked `+91 98•••• 0001`), Baby, Day, Status (mother + baby pills), Last check-in, Next call, ASHA. Filters: status, day range, ASHA, high-risk only. Search by name or last 4 digits. Row click opens a `Drawer` quick view; "Open profile" goes to the detail page.

### `/mothers/:id` Dyad profile (the hero page)

```
DyadHeader (mother | baby, both statuses, risk tags, ASHA, decision-maker)
Tabs: Timeline (default) · Vitals · Alerts · Calls · Details
Timeline: grouped by day; filters [Both | Mother | Baby] [All sources ▾]
Right rail (320px): Open alert card · Next scheduled call · ChainBadge · "Hear summary" (shows the exact text Jodi reads to a doctor)
```

Vitals tab: BP, weight and breaths per minute over time as small, clean line charts (Recharts, 1px lines, no area fills, tokens only), each point with its source badge in the tooltip.

### `/onboard` Onboarding

Two-column flow: left = dropzone (or camera on mobile) for the discharge slip; right = extracted fields form with per-field confidence (thin bar + "Check" tag under 0.75), all marked "Pending voice confirmation". Primary action: "Start onboarding call". After the call confirms, fields switch to "Confirmed by mother" with a check.

### `/ashas` and `/asha/:id` ASHA view (mobile-first, no app shell)

Single column, 16px padding, large touch targets (min 44px). Header: ASHA name + today's date + count of visits. List cards: priority number, mother name, reason in plain words, status pill, "Call" (tel: link) and "Mark reached" buttons. Sorted red → amber → missed calls → routine.

### `/calls` Call log

`DataTable`: time, mother, purpose, direction, duration, outcome, flags raised. Row click opens transcript in a `Drawer` with extracted facts highlighted inline.

### `/live` Live demo board (projector; no sidebar)

Full-screen, 18px root size, three columns: **DyadHeader + next call** | **Live timeline** (new items animate in) | **Alerts + ASHA top 5**. Bottom bar: `ChainBadge` and **Demo controls** (Reset · Advance day · Start onboarding call · Start check-in call · Inject transcript) in a discreet bar that can be hidden with `H`.

### `/audit` Record log

Per mother: the hash chain as a table (entry #, time, source, short hash `9f1c…a83b`), verify button, result banner.

---

## 6. States, copy and accessibility

- **Every data view has 4 states:** loading (skeleton), empty (`EmptyState` with a helpful sentence), error (inline message + retry, polling continues), and success.
- **Copy:** sentence case; verbs on buttons ("Mark reached", not "Submit"); times relative under 24h ("4 min ago"), absolute after; dates `13 Nov`; phone numbers masked in lists.
- **Labels map:** keep all code → human label strings in `src/lib/labels.ts` (English + Kannada). Never render a raw code.
- **Accessibility:** WCAG AA contrast; visible focus ring (`--focus`); every icon-only button has `aria-label`; status always has text; keyboard navigable tables and tabs; `⌘K` command palette is optional polish.
- **Responsiveness:** desktop-first for Overview, Mothers and Profile (≥ 1280 ideal, works at 1024); mobile-first for ASHA pages; `/live` targets 1920×1080.
