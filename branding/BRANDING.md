# OperatorOne — Brand Guide (Draft)

> Status: **Working draft** — refining before implementation

---

## The Story

Every solopreneur is already an operator. They're running sales, support, invoicing, hiring, marketing — all of it, often alone. But their tools are scattered across a dozen SaaS apps that don't talk to each other.

**OperatorOne is the command center they deserve.** One platform, one AI, one place to run everything. The name says it directly: *you are Operator One — the person running this operation — and this is your system.*

For the MSP deploying it for clients, the name works differently: *this is the one operator platform you deploy for every client.* Same name, different resonance, both true.

The "One" carries triple meaning:
- **One platform** — replaces the SaaS sprawl
- **One AI** — a single intelligence layer across all systems
- **Teams of one** — built for the solopreneur first

---

## Target Audiences

### Primary: Solopreneurs & Micro-Teams (1-10 people)
- Running everything themselves
- Drowning in SaaS subscriptions
- Want clarity and control, not complexity
- Not technical, but not afraid of technology

### Secondary: MSPs & Consultants
- Deploy operations stacks for clients
- Need a repeatable, brandable template
- Care about infrastructure cost and maintainability
- Technical audience comfortable with self-hosted tooling

---

## Name System

| Context | Usage |
|---|---|
| **Full product name** | OperatorOne |
| **Casual reference** | "Operator" |
| **Written shorthand** | O·1 (with interpunct) or Op1 |
| **Domain (primary)** | `operatorone.ai` |
| **Domain (future)** | `operatorone.com` (acquirable from HugeDomains) |
| **npm/package scope** | `@operatorone/admin`, `@operatorone/console` |
| **Docker prefix** | `op1-traefik`, `op1-console`, `op1-postgres` |
| **Networks** | `op1-frontend`, `op1-backend` |
| **GitHub** | `operatorone` or `op1-platform` |
| **CLI (future)** | `op1 init`, `op1 deploy`, `op1 status` |

> **Note on "O1"**: OpenAI uses "o1" for their reasoning model. Avoid bare "O1" in marketing. Use "Op1" or "O·1" (with interpunct) to differentiate.

---

## Taglines

### Primary Candidates (pick one)
- *"You're the operator. This is your system."* — empowering, direct, cyberpunk
- *"One operator. Every system."* — terse, confident
- *"Run everything from one place."* — plain-spoken, clear for solopreneurs

### Supporting Lines
- *"AI-powered ops for teams that ship."*
- *"Your business. Your grid. Your call."*
- *"Deploy once. Operate everything."* — MSP audience
- *"Stop juggling SaaS. Start operating."* — problem/solution

### Campaign-Style
- *"Built for operators, not enterprises."*
- *"The $50/month operations platform that replaces $2,000 in SaaS."*
- *"One AI. Every workflow. No IT department required."*

---

## Brand Voice

The Operator voice is **calm, competent, and direct**. Think: the person in the chair who's already handled it. Not shouting, not selling — just stating facts.

### Voice Principles
- **Terse over verbose.** Say it in fewer words.
- **Confident, not arrogant.** "Systems online" not "We're the best platform ever."
- **Treat the user as capable.** Never condescending, never dumbing down.
- **Slightly dramatic.** The cyberpunk aesthetic gives permission for cinematic moments.
- **No exclamation marks.** Never "Oops!" or "Yay!" or "Great job!"

### Copy Examples

| Situation | Copy |
|---|---|
| Login page | "Identify yourself." |
| Dashboard header | "All systems operational." / "3 items need attention." |
| Empty state | "Nothing in the queue. Rare, but earned." |
| AI greeting | "Operator One standing by. What do we need?" |
| Loading | "Initializing..." |
| Error | "Connection interrupted. Retrying." |
| Success toast | "Done." / "Request submitted." / "Updated." |
| Onboarding step 1 | "Let's get your systems online." |
| Onboarding complete | "You're operational." |
| Update available | "System update ready: v2.1.0" |
| AI thinking | "Working on it..." |
| No results | "Nothing matches. Adjust your filters." |
| Logout | "Signing off." |

---

## Visual Identity

### Aesthetic
The core aesthetic is **"the operator's console"** — a high-end control interface with a cyberpunk edge. Inspired by Tron: Ares and the thegridcn library. Dark mode only. Everything should feel like a live system being monitored.

### Source of Truth
All styles are defined in `modules/console/app/src/styles/globals.css`. The brand identity is built directly on this existing theme system — not a separate design spec.

### Logo — Console Badge

The mark is a **rounded square badge** with "O1" set inside in monospace — like a hardware label, system badge, or app icon. The "O" represents the operator (the user), the "1" represents the unified platform.

**Locked specifications:**

| Property | Value | Notes |
|---|---|---|
| Border weight | Hairline (1.5px at full size) | Increases progressively at smaller sizes for legibility |
| Corner radius | Moderate (12px at 120px viewBox) | Technical but not sharp — between hardware and app icon |
| Fill | Panel fill (`--color-grid-dark` / `#0d0d14`) | Not transparent — the badge has its own surface |
| Text color | Split: O = `--color-text-primary`, 1 = `--color-neon-cyan` | The "1" carries the brand color |
| Border color | `--color-neon-cyan` (`#00e5ff`) | |
| Glow | **Hover/active only** — not static | Uses `--shadow-glow-cyan` on hover/focus via CSS transition |
| Font weight | 500 at full size, increasing to 700-800 at small sizes | Maintains legibility at scale |

**Size scaling rules:**
- **128px+**: Hairline border (1.5px), weight 500
- **64px**: Border 2.5px, weight 600
- **48px**: Border 3px, weight 600
- **32px**: Border 4.5px, weight 700, radius increases slightly
- **24px**: Border 6px, weight 700
- **16px (favicon)**: Border 10px, weight 800, solid fill, max radius

**Lockup — Stacked Beside (primary, for inline/navigation):**
- Badge on the left, text stacked to the right
- "OPERATOR" on top line in `--color-text-primary`
- "ONE" on bottom line in `--color-neon-cyan`
- Both lines: JetBrains Mono, 500 weight, uppercase, 1.5px letter-spacing
- Used in: sidebar, nav bars, email headers, horizontal layouts

**Lockup — Stacked Centered (secondary, for splash/centered):**
- Badge centered above text
- "OPERATOR" centered below badge in `--color-text-primary`
- "ONE" centered below that in `--color-neon-cyan`
- Used in: login page, loading screen, marketing splash, about page

**Wordmark (without badge):**
- `OPERATORONE` in JetBrains Mono, all caps, 1px letter-spacing
- Color split: "OPERATOR" in `--color-text-primary`, "ONE" in `--color-neon-cyan`
- No space between words — reads as a single name
- Used in: text-only contexts, small UI, metadata

**On light backgrounds:**
- Badge fill switches to `--color-grid-black` (`#0a0a0f`)
- Border switches to `--color-grid-black`
- Text colors remain: O = `--color-text-primary`, 1 = `--color-neon-cyan`
- The dark badge becomes a self-contained branded element

**SVG Assets** (`assets/`):

| File | Description |
|---|---|
| `mark-primary.svg` | Primary badge, 120x120, dark background |
| `mark-light-bg.svg` | Badge for light backgrounds |
| `mark-64.svg` | 64px sidebar size |
| `mark-48.svg` | 48px nav size |
| `mark-32.svg` | 32px tab size |
| `favicon.svg` | 16px favicon |
| `lockup-stacked-beside.svg` | Primary lockup (inline/nav) |
| `lockup-stacked-beside-light-bg.svg` | Primary lockup, light background |
| `lockup-stacked-centered.svg` | Centered lockup (splash/login) |
| `wordmark.svg` | Text-only wordmark, dark background |
| `wordmark-light-bg.svg` | Text-only wordmark, light background |

**Reference files:**
- `style-guide.html` — interactive style guide with all brand elements
- `logo-concepts.html` — initial concept explorations
- `logo-concepts-e.html` — Console Badge deep refinement
- `logo-final.html` — locked specs with context mockups

### Color System

Defined as CSS custom properties via `@theme` in globals.css.

**Core palette (surfaces):**

| Token | Hex | Role |
|---|---|---|
| `--color-grid-black` | `#0a0a0f` | Deepest background (body) |
| `--color-grid-dark` | `#0d0d14` | Header, panel backgrounds |
| `--color-grid-panel` | `#12121c` | Content panels, cards |
| `--color-grid-border` | `#1a1a2e` | Default borders (applied globally via `*`) |
| `--color-grid-border-bright` | `#2a2a4a` | Elevated borders, scrollbar hover |

**Neon accents:**

| Token | Hex | Brand Role |
|---|---|---|
| `--color-neon-cyan` | `#00e5ff` | **Primary.** Logo, active states, primary actions |
| `--color-neon-cyan-dim` | `#00b8d4` | Subdued cyan (scrollbar hover) |
| `--color-neon-blue` | `#2979ff` | Secondary. Links, secondary elements |
| `--color-neon-green` | `#00e676` | Status: online, success, completion |
| `--color-neon-orange` | `#ff6d00` | Status: warnings, pending attention |
| `--color-neon-red` | `#ff1744` | Status: errors, critical, destructive actions |
| `--color-neon-yellow` | `#ffea00` | Accent: highlights, callouts |
| `--color-neon-purple` | `#d500f9` | Accent: special/feature elements |

**Text:**

| Token | Hex | Usage |
|---|---|---|
| `--color-text-primary` | `#e0e0e8` | Main content |
| `--color-text-secondary` | `#8888a0` | Labels, metadata |
| `--color-text-muted` | `#555570` | Disabled, placeholder |

**Glow shadows:**

| Token | Usage |
|---|---|
| `--shadow-glow-cyan` | Primary emphasis, active glow (10px + 40px spread) |
| `--shadow-glow-cyan-sm` | Subtle glow for smaller elements (6px spread) |
| `--shadow-glow-orange` | Warning state glow |
| `--shadow-glow-red` | Error/critical state glow |
| `--shadow-glow-green` | Success/online state glow |

### Typography
- **Primary:** JetBrains Mono
- **Fallback:** Fira Code, ui-monospace, monospace
- **All monospace, always.** This reinforces the operator's console feeling.
- Set globally on `body` in globals.css.

### Animations

Defined in `@theme` as CSS custom properties:

| Token | Duration | Effect |
|---|---|---|
| `--animate-pulse-glow` | 2s ease-in-out infinite | Opacity pulse (1 → 0.7 → 1). Used for status indicators. |
| `--animate-scanline` | 4s linear infinite | Vertical translateY sweep. Live-system scan effect. |
| `--animate-grid-fade` | 0.3s ease-out | Fade-up entrance (4px translateY). Panel/content transitions. |

### Signature Visual Elements
- **Grid background pattern** (`.grid-bg` class) — cyan lines at 3% opacity, 40px intervals. The operator's grid — the underlying structure of the system you're running.
- **Scan line** — already defined as `--animate-scanline`. Vertical sweep suggesting a live, monitored system.
- **Glow effects** — neon glow shadows on active/hover states, subtle and purposeful. Use the `--shadow-glow-*` tokens.
- **Custom scrollbars** — 6px width, grid-dark track, grid-border-bright thumb, cyan-dim on hover. Consistent with the console aesthetic.
- **Dark mode only** — no light theme. The operator works in the dark.

---

## Product Naming Map

| Current Name | OperatorOne Branded | Notes |
|---|---|---|
| Portal | **Operator Console** or **Console** | "Console" is what an operator uses |
| Dashboard | **Command View** | What you see when you sit down |
| AI Agent | **Operator AI** or **the Operator** | "Ask the Operator" |
| Setup Wizard | **System Init** | Cyberpunk-native |
| Admin Module | **Op1 Admin** | Clean, functional |
| System Status | **Status Board** | Operators check the status board |
| Client requests | **Incoming** or **The Queue** | What arrives on your desk |
| Documents | **Files** or **Vault** | "Vault" for the cyberpunk lean |
| Settings | **Config** | What operators call settings |
| Subdomains | `console.yourdomain.com` | Or keep `portal.` — both work |

---

## The AI Agent's Identity

The AI agent isn't a generic chatbot — it's **the Operator.**

> "The Operator sees every system, knows your history, and handles the tasks you'd rather not. It triages incoming requests, drafts responses, checks your infrastructure, and flags what needs your attention. You make the calls. It runs the board."

### AI Personality
- **Role:** Highly competent assistant who reports to you
- **Tone:** Professional, direct, occasionally dry
- **Not a peer, not a servant** — a professional operator

### AI Copy Examples
- **First message:** "Operator One online. I have access to your requests, documents, and workflows. What do you need?"
- **Proactive triage:** "3 new requests since yesterday. One looks urgent — a client asking about contract renewal. Want me to draft a response?"
- **System context:** "Your n8n automation for invoice reminders failed at 3am. I've identified the issue — the webhook URL changed. Want me to update it?"

---

## Audience Messaging

### For Solopreneurs (Landing Page Hero)
> You're already running everything. Sales, support, ops, admin — all you.
>
> OperatorOne gives you one place to manage it all, with an AI that actually knows your business. Requests, documents, workflows, communication — unified on a single screen.
>
> No IT department. No SaaS sprawl. Just you and your Operator.

### For MSPs / Consultants
> Deploy a complete operations stack for every client in minutes.
>
> Auth, automation, monitoring, AI assistant — wired together on a single server. One deployment per client. Fully brandable. Under $50/month in infrastructure.
>
> OperatorOne is the template you deploy once and customize per client.

### Elevator Pitch (Both Audiences)
> OperatorOne is an AI-powered operations platform for small businesses. One AI, every system, one monthly cost. It replaces the SaaS sprawl with a self-hosted command center that your team — even a team of one — can actually run.

---

## How It Sounds In Use

Real-world usage patterns — how people would actually talk about it:

- *"Check Operator, I think a new request came in."*
- *"I set up OperatorOne for my three clients last week."*
- *"The Operator flagged a failing automation this morning."*
- *"Pull up the console."*
- *"Did you see what came into the queue?"*
- *"Op1 handles all the client portals."*

---

## Domain Strategy

| Priority | Domain | Purpose |
|---|---|---|
| **Launch** | `operatorone.ai` | Primary domain — check and register |
| **Protect** | `operatorone.dev` | Redirect to `.ai`, developer audience |
| **Future** | `operatorone.com` | Acquire from HugeDomains when budget allows |
| **Shortlink** | `op1.ai` | If available — for CLI docs, quick links |

---

## IP Clearance

### Domain: operatorone.com
- Registered since 2003, held by HugeDomains (domain broker)
- **For sale.** Typically $2,000–$10,000.

### Domain: operatorone.ai
- No WHOIS data found. **Likely available.**

### Prior Use: Operator One (Luxembourg)
- Defunct VoIP/telecom company, closed ~2015-2016
- No active business, no website, no ongoing trademark

### Adjacent Names
- **Operative.One** — ad management platform (different name, different market)
- **Operator One / O1** — EU marketplace operator (different market, goes by "O1")

### Trademark
- No USPTO registration found for "OperatorOne" or "Operator One"
- Recommend filing once name is finalized

---

## Decisions Made

- [x] **Logo concept**: Console Badge (rounded square with O1 monospace)
- [x] **Logo specs**: Hairline border, moderate radius, panel fill, split color (O=white, 1=cyan)
- [x] **Glow behavior**: Hover/active only — never static
- [x] **Lockups**: Stacked-beside for inline, stacked-centered for splash
- [x] **Colors/fonts**: Use existing theme system from globals.css as-is

## Open Questions

- [ ] Final tagline selection
- [x] Production SVG assets (mark, lockups, wordmark, favicon — in `assets/`)
- [ ] Generate favicon .ico and og:image from SVG assets
- [ ] Register `operatorone.ai`
- [ ] Check `op1.ai` availability
- [ ] Decide: "Console" vs "Portal" for the client-facing app name
- [ ] Brand voice guidelines for support/docs (slightly warmer than product UI?)
- [ ] Whether to acquire `operatorone.com` now or later
