# Keramik Auszeit — Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete visual and structural redesign of keramik-auszeit.de — new typography, refined color palette, 8-section startpage + 5 new subpages, rebuilt gallery, improved performance and SEO.

**Architecture:** Astro SSR stays. Frontend-only redesign: new fonts (self-hosted Lora + Source Sans 3), extended design tokens (Sienna + Leinen), restructured pages (13 sections → 8 on start + 5 subpages). All 25 API endpoints, Stripe, S3, MariaDB, Admin untouched.

**Tech Stack:** Astro 5.2.5 SSR, TypeScript, Vanilla CSS with design tokens, Vanilla JS for interactivity.

**Spec:** `docs/superpowers/specs/2026-03-20-redesign-design.md`

---

## File Structure

### Files to Create
| File | Responsibility |
|------|---------------|
| `public/fonts/Lora-SemiBold.woff2` | Self-hosted headline font 600 |
| `public/fonts/Lora-Bold.woff2` | Self-hosted headline font 700 |
| `public/fonts/Lora-Italic.woff2` | Self-hosted headline font 400i |
| `public/fonts/SourceSans3-Light.woff2` | Self-hosted body font 300 |
| `public/fonts/SourceSans3-Regular.woff2` | Self-hosted body font 400 |
| `public/fonts/SourceSans3-Medium.woff2` | Self-hosted body font 500 |
| `public/fonts/SourceSans3-SemiBold.woff2` | Self-hosted body font 600 |
| `public/fonts/DancingScript-Medium.woff2` | Self-hosted signature font 500 |
| `src/styles/fonts.css` | @font-face declarations |
| `src/pages/galerie.astro` | Standalone gallery page |
| `src/pages/workshops.astro` | Standalone workshops page |
| `src/pages/gutscheine.astro` | Standalone voucher page |
| `src/pages/events.astro` | Special occasions + inquiry form |
| `src/pages/faq.astro` | Standalone FAQ page |
| `src/pages/404.astro` | Custom 404 page |
| `src/sections/WasErwartet.astro` | 4-card teaser grid (new section) |
| `src/components/WhatsAppFloat.astro` | Floating WhatsApp button |
| `src/components/GalleryLightbox.astro` | New fullscreen lightbox component |
| `src/scripts/gallery.js` | Gallery filter, masonry, lightbox logic |
| `src/scripts/whatsapp-float.js` | IntersectionObserver hide/show logic |

### Files to Modify
| File | Changes |
|------|---------|
| `src/styles/tokens.css` | Add sienna, linen, paper tokens; update font tokens |
| `src/styles/global.css` | Remove Google Fonts import, import fonts.css, update heading styles |
| `src/middleware.ts` | Remove Google Fonts from CSP |
| `src/data/content.ts` | Update hero text, add wasErwartet, events, rename Anhänger, update footer |
| `src/pages/index.astro` | Reduce to 8 sections, add WasErwartet import |
| `src/layouts/MainLayout.astro` | Update nav links to page URLs, update footer, update meta/structured data |
| `src/sections/Hero.astro` | New headline/subline, new CTA structure, linen texture transition |
| `src/sections/Offerings.astro` | Visual refresh with new typography and colors |
| `src/sections/Process.astro` | Visual refresh |
| `src/sections/Reviews.astro` | Add inline review form (expandable), visual refresh |
| `src/sections/Contact.astro` | Add Instagram link, visual refresh |
| `src/sections/Profil.astro` | Rename to "Über Irena", Dancing Script signature, visual refresh |
| `src/components/BookingCalendar.astro` | Visual refresh (typography, colors, spacing) |
| `src/components/Button.astro` | Update to new font and color tokens |
| `src/components/FAQItem.astro` | Visual refresh |
| `src/components/WorkshopCard.astro` | Visual refresh for standalone page |
| `src/components/WorkshopModal.astro` | Visual refresh |
| `src/components/ProductModal.astro` | Visual refresh |
| `public/sitemap.xml` | Add new page URLs |
| `public/robots.txt` | Allow new page routes |

### Imports to Remove from index.astro (sections move to subpages)
- Import of `Galerie.astro` (stays as file, used on /galerie)
- Import of `Workshops.astro` (stays as file, used on /workshops)
- Import of `Gutschein.astro` (stays as file, used on /gutscheine)
- Import of `AnlassAnfragen.astro` (stays as file, used on /events)
- Import of `FAQ.astro` (stays as file, used on /faq)
- Import of `TrustQuotes.astro` (content merged into Reviews — file stays, no longer imported anywhere)

### Imports to Add to index.astro
- `WasErwartet.astro` (new section)
- `Profil.astro` (exists but was not previously imported on index)

### Dead Code (do NOT delete yet — verify no references first)
- `src/sections/Intro.astro` — not imported on current index.astro, not used elsewhere
- `src/sections/TrustQuotes.astro` — content merged into Reviews, file preserved

---

## Task 1: Git Setup & Backup

**Files:**
- Repository root

- [ ] **Step 1: Commit all uncommitted changes on main first**
```bash
git status
# Stage and commit all modified/untracked files (including CLAUDE.md, SERVER.md, deploy.sh, k8s/)
git add .gitignore public/booking-calendar.js src/layouts/MainLayout.astro src/middleware.ts src/pages/api/gallery-metadata.ts src/pages/api/gallery.ts src/pages/uploads/\[...path\].ts src/sections/Galerie.astro CLAUDE.md SERVER.md deploy.sh k8s/
git commit -m "chore: commit current state before redesign"
```

- [ ] **Step 2: Create backup tag on clean main**
```bash
git tag backup/pre-redesign
```

- [ ] **Step 3: Create feature branch**
```bash
git checkout -b feature/redesign
```

---

## Task 2: Self-Host Fonts

**Files:**
- Create: `public/fonts/` (8 woff2 files)
- Create: `src/styles/fonts.css`
- Modify: `src/styles/global.css:3` (remove Google Fonts import)
- Modify: `src/middleware.ts:18` (remove Google Fonts from CSP)
- Modify: `src/layouts/MainLayout.astro:54-59` (remove preconnect links)

- [ ] **Step 1: Download and subset fonts**

Download woff2 files from Google Fonts API or use `google-webfonts-helper`:
- Lora: 400italic, 600, 700
- Source Sans 3: 300, 400, 500, 600
- Dancing Script: 500

Place all files in `public/fonts/`.

- [ ] **Step 2: Create `src/styles/fonts.css`**

```css
/* Lora — Headlines */
@font-face {
  font-family: 'Lora';
  src: url('/fonts/Lora-SemiBold.woff2') format('woff2');
  font-weight: 600;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'Lora';
  src: url('/fonts/Lora-Bold.woff2') format('woff2');
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'Lora';
  src: url('/fonts/Lora-Italic.woff2') format('woff2');
  font-weight: 400;
  font-style: italic;
  font-display: swap;
}

/* Source Sans 3 — Body */
@font-face {
  font-family: 'Source Sans 3';
  src: url('/fonts/SourceSans3-Light.woff2') format('woff2');
  font-weight: 300;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'Source Sans 3';
  src: url('/fonts/SourceSans3-Regular.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'Source Sans 3';
  src: url('/fonts/SourceSans3-Medium.woff2') format('woff2');
  font-weight: 500;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'Source Sans 3';
  src: url('/fonts/SourceSans3-SemiBold.woff2') format('woff2');
  font-weight: 600;
  font-style: normal;
  font-display: swap;
}

/* Dancing Script — Signature only */
@font-face {
  font-family: 'Dancing Script';
  src: url('/fonts/DancingScript-Medium.woff2') format('woff2');
  font-weight: 500;
  font-style: normal;
  font-display: swap;
}
```

- [ ] **Step 3: Update `global.css`**

Remove line 3 (Google Fonts import). Add at top:
```css
@import './fonts.css';
```

- [ ] **Step 4: Update `middleware.ts`**

In the CSP string:
- Remove `https://fonts.googleapis.com` from `style-src`
- Remove `https://fonts.gstatic.com` from `font-src`

- [ ] **Step 5: Update `MainLayout.astro`**

Remove preconnect links for Google Fonts (lines ~54-59):
```html
<!-- REMOVE these: -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
```

Add preload for critical fonts:
```html
<link rel="preload" href="/fonts/Lora-SemiBold.woff2" as="font" type="font/woff2" crossorigin />
<link rel="preload" href="/fonts/SourceSans3-Regular.woff2" as="font" type="font/woff2" crossorigin />
```

- [ ] **Step 6: Build and verify**
```bash
npm run build
```
Expected: Build succeeds, no font-related errors.

- [ ] **Step 7: Commit**
```bash
git add public/fonts/ src/styles/fonts.css src/styles/global.css src/middleware.ts src/layouts/MainLayout.astro
git commit -m "perf: self-host fonts (Lora, Source Sans 3, Dancing Script)"
```

---

## Task 3: Update Design Tokens

**Files:**
- Modify: `src/styles/tokens.css` (full file)

- [ ] **Step 1: Add new color tokens after line 7**

```css
--color-sienna: #A0522D;
--bg-linen: #EDE4DA;
--bg-paper: #FAF7F2;
```

- [ ] **Step 2: Update font tokens (lines 33-35)**

Replace:
```css
--font-script: 'Dancing Script', cursive;
--font-serif: 'Cinzel', serif;
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```
With:
```css
--font-script: 'Dancing Script', cursive;
--font-serif: 'Lora', Georgia, serif;
--font-sans: 'Source Sans 3', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

- [ ] **Step 3: Add legacy aliases for new tokens**

After existing legacy section:
```css
/* New token aliases */
--color-soft-cream: var(--bg-paper);
```

- [ ] **Step 4: Add typography scale tokens**

After existing font-size tokens:
```css
--text-xs: 0.75rem;
--text-sm: 0.875rem;
--text-base: 1rem;
--text-lg: 1.125rem;
--text-xl: 1.25rem;
--text-2xl: 1.5rem;
--text-3xl: clamp(1.75rem, 2vw + 1rem, 2.25rem);
--text-4xl: clamp(2rem, 3vw + 1rem, 3rem);
--text-hero: clamp(2.5rem, 4vw + 1rem, 4rem);
```

- [ ] **Step 5: Build and verify**
```bash
npm run build
```

- [ ] **Step 6: Commit**
```bash
git add src/styles/tokens.css
git commit -m "style: add sienna, linen, paper tokens; update font families to Lora + Source Sans 3"
```

---

## Task 4: Update Content Data

**Files:**
- Modify: `src/data/content.ts`

- [ ] **Step 1: Update hero object**

```typescript
hero: {
  title: 'Keramik Auszeit',
  subtitle: 'Dein Malatelier in Gronau',
  claim: 'Deine kreative Auszeit in Gronau',
  subline: 'Keramik bemalen, abschalten, Freude mitnehmen',
  ctaPrimary: 'Termin buchen',
  ctaSecondary: 'Entdecke unsere Keramik',
},
```

- [ ] **Step 2: Replace intro with wasErwartet**

```typescript
wasErwartet: {
  title: 'Was dich erwartet',
  items: [
    {
      title: 'Keramik bemalen',
      text: 'Wähle deinen Rohling, nimm dir Zeit und gestalte dein ganz eigenes Stück.',
      image: '/becher.jpeg',
      link: '#keramik-preise',
    },
    {
      title: 'Workshops',
      text: 'Lerne neue Techniken in unseren kreativen Workshops.',
      image: '/teller.jpeg',
      link: '/workshops',
    },
    {
      title: 'Besondere Anlässe',
      text: 'Kindergeburtstag, JGA oder Firmen-Event — wir machen es unvergesslich.',
      image: '/spardose.jpeg',
      link: '/events',
    },
    {
      title: 'Gutscheine',
      text: 'Das perfekte Geschenk für kreative Köpfe.',
      image: '/anhänger.png',
      link: '/gutscheine',
    },
  ],
},
```

- [ ] **Step 3: Rename Weihnachtsanhänger → Anhänger in offerings**

In the offerings items array, change the name of the last item from "Weihnachtsanhänger" to "Anhänger".

- [ ] **Step 4: Add events content**

```typescript
events: {
  title: 'Besondere Anlässe',
  subtitle: 'Feiert gemeinsam kreativ — wir kümmern uns um den Rest.',
  types: [
    {
      id: 'kindergeburtstag',
      title: 'Kindergeburtstag',
      text: 'Kreativ feiern mit Freunden. Jedes Kind bemalt sein eigenes Keramik-Stück und nimmt ein selbstgemachtes Geschenk mit nach Hause.',
      features: ['Ab 6 Jahren', 'Bis zu 10 Kinder', 'Ca. 2 Stunden', 'Alle Materialien inklusive'],
    },
    {
      id: 'jga',
      title: 'JGA',
      text: 'Euer Junggesellenabschied wird kreativ. Gemeinsam bemalen, lachen und ein Andenken schaffen, das bleibt.',
      features: ['Flexible Gruppengröße', 'Getränke möglich', 'Ca. 2-3 Stunden', 'Exklusive Atmosphäre'],
    },
    {
      id: 'firmen_event',
      title: 'Firmen-Event',
      text: 'Teambuilding mal anders. Kreatives Arbeiten bringt Teams zusammen — entspannt und ohne Leistungsdruck.',
      features: ['Individuelle Planung', 'Flexible Termine', 'Rechnungsstellung möglich', 'Ab 8 Personen'],
    },
    {
      id: 'privater_anlass',
      title: 'Privater Anlass',
      text: 'Stammtisch, Freundinnen-Abend oder einfach ein besonderer Nachmittag — wir richten es für euch her.',
      features: ['Flexible Gruppengröße', 'Individuelle Absprache', 'Gemütliche Atmosphäre'],
    },
  ],
},
```

- [ ] **Step 5: Add page meta data**

```typescript
pageMeta: {
  galerie: { title: 'Galerie — Keramik Auszeit', description: 'Lass dich inspirieren: Entdecke Keramik-Unikate aus unserem Malatelier in Gronau.' },
  workshops: { title: 'Workshops — Keramik Auszeit', description: 'Kreative Workshops in Gronau: Lerne neue Techniken und gestalte besondere Keramik-Stücke.' },
  gutscheine: { title: 'Gutscheine — Keramik Auszeit', description: 'Verschenke kreative Auszeit: Gutscheine für Keramik bemalen in Gronau.' },
  events: { title: 'Besondere Anlässe — Keramik Auszeit', description: 'Kindergeburtstag, JGA, Firmen-Event: Feiert kreativ in unserem Keramik-Malatelier in Gronau.' },
  faq: { title: 'Häufige Fragen — Keramik Auszeit', description: 'Alles was du wissen musst: Preise, Ablauf, Buchung und mehr zu Keramik Auszeit in Gronau.' },
},
```

- [ ] **Step 6: Update footer copyright**

Keep existing property names (`text`, `href`) to avoid breaking the MainLayout footer template:
```typescript
footer: {
  links: [
    { text: 'Impressum', href: '#impressum' },
    { text: 'Datenschutz', href: '#datenschutz' },
  ],
  copyright: '© 2026 Keramik Auszeit — Irena Woschkowiak',
},
```

- [ ] **Step 7: Build and verify**
```bash
npm run build
```

- [ ] **Step 8: Commit**
```bash
git add src/data/content.ts
git commit -m "feat: update content for redesign — new hero, wasErwartet, events, page meta"
```

---

## Task 5: Update Navigation & Layout

**Files:**
- Modify: `src/layouts/MainLayout.astro` (nav lines 275-370, footer lines 412-489, styles 493-933)

- [ ] **Step 1: Update desktop nav links (lines ~281-289)**

Replace anchor links with page URLs:
```html
<ul class="site-nav__links">
  <li><a class="site-nav__link" href="/#keramik-preise">Keramik bemalen</a></li>
  <li><a class="site-nav__link" href="/workshops">Workshops</a></li>
  <li><a class="site-nav__link" href="/events">Besondere Anlässe</a></li>
  <li><a class="site-nav__link" href="/galerie">Galerie</a></li>
  <li><a class="site-nav__link" href="/gutscheine">Gutscheine</a></li>
  <li><a class="site-nav__link site-nav__link--cta" href="/#termin-buchen">Termin buchen</a></li>
</ul>
```

- [ ] **Step 2: Update mobile canvas menu links (lines ~326-362)**

Same URL changes as desktop nav. Remove numbered links, simplify.

- [ ] **Step 3: Update brand text**

Change "Atelier Auszeit" to "Keramik Auszeit" in:
- `.site-nav__brand` (line ~277)
- `.canvas-menu__brand` (line ~320)

- [ ] **Step 4: Update footer (lines ~412-489)**

Restructure to 3-column layout: Kontakt | Navigation | Rechtliches. Add Instagram + WhatsApp links. Update copyright.

- [ ] **Step 5: Update nav CSS to use new font tokens**

In the `<style>` section, replace all `var(--font-serif)` references in nav with `var(--font-serif)` (now maps to Lora instead of Cinzel). Update any hardcoded font references.

- [ ] **Step 6: Build and verify**
```bash
npm run build
```

- [ ] **Step 7: Commit**
```bash
git add src/layouts/MainLayout.astro
git commit -m "feat: update navigation to page URLs, rebrand to Keramik Auszeit"
```

---

## Task 6: Restructure Startpage

**Files:**
- Modify: `src/pages/index.astro`
- Create: `src/sections/WasErwartet.astro`

- [ ] **Step 1: Create `WasErwartet.astro`**

New section component: 4-card grid with image, title, text, link. Uses content.wasErwartet data. 2x2 grid on desktop, 1 column on mobile. Each card links to its destination (anchor or page URL).

- [ ] **Step 2: Update `index.astro` imports and render order**

Remove imports: Galerie, Workshops, Gutschein, AnlassAnfragen, FAQ, TrustQuotes.
Add imports: WasErwartet, Profil (not currently imported on index.astro — adding it now).

Note: `Intro.astro` is not imported on current index.astro (dead code). Do NOT delete the file yet — it may be referenced elsewhere. `TrustQuotes.astro` will also remain as a file but is no longer imported (content merged into Reviews in Task 11).

New render order:
```astro
<MainLayout title={title} description={description}>
  <Hero />
  <WasErwartet />
  <Offerings />
  <Process />
  <BookingCalendar />
  <Reviews />
  <Profil />
  <Contact />
</MainLayout>
```

- [ ] **Step 3: Build and verify**
```bash
npm run build
```

- [ ] **Step 4: Commit**
```bash
git add src/pages/index.astro src/sections/WasErwartet.astro
git commit -m "feat: restructure startpage — 8 sections, add WasErwartet teaser grid"
```

---

## Task 7: Create Subpages

**Files:**
- Create: `src/pages/galerie.astro`
- Create: `src/pages/workshops.astro`
- Create: `src/pages/gutscheine.astro`
- Create: `src/pages/events.astro`
- Create: `src/pages/faq.astro`
- Create: `src/pages/404.astro`

These tasks can run in **parallel** as they are independent.

- [ ] **Step 1: Create `/galerie` page**

Wraps existing `Galerie.astro` section in MainLayout with page-specific meta. Uses `content.pageMeta.galerie` for title/description.

- [ ] **Step 2: Create `/workshops` page**

Wraps existing `Workshops.astro` section in MainLayout. Uses `content.pageMeta.workshops`.

- [ ] **Step 3: Create `/gutscheine` page**

Wraps existing `Gutschein.astro` section in MainLayout. Uses `content.pageMeta.gutscheine`.

- [ ] **Step 4: Create `/events` page**

New page with:
- Hero section (small, with title + subtitle from content.events)
- Per-event-type sections (from content.events.types)
- Inquiry form at bottom (reuse logic from AnlassAnfragen.astro, extracted)

- [ ] **Step 5: Create `/faq` page**

Wraps existing `FAQ.astro` section in MainLayout. Add grouped headings. Uses `content.pageMeta.faq`. CTA at bottom: "Noch Fragen? Schreib uns!"

- [ ] **Step 6: Create `/404` page**

```astro
---
import MainLayout from '../layouts/MainLayout.astro';
---
<MainLayout title="Seite nicht gefunden — Keramik Auszeit" description="Diese Seite wurde nicht gefunden. Finde hier was du suchst bei Keramik Auszeit in Gronau.">
  <section class="not-found">
    <h1>Diese Seite haben wir leider nicht gefunden</h1>
    <p>Vielleicht findest du hier, was du suchst:</p>
    <nav class="not-found__links">
      <a href="/">Startseite</a>
      <a href="/galerie">Galerie</a>
      <a href="/#termin-buchen">Termin buchen</a>
      <a href="/#kontakt">Kontakt</a>
    </nav>
  </section>
</MainLayout>
```

- [ ] **Step 7: Build and verify all routes**
```bash
npm run build
```

- [ ] **Step 8: Commit**
```bash
git add src/pages/galerie.astro src/pages/workshops.astro src/pages/gutscheine.astro src/pages/events.astro src/pages/faq.astro src/pages/404.astro
git commit -m "feat: add subpages — galerie, workshops, gutscheine, events, faq, 404"
```

---

## Task 8: Redesign Hero Section

**Files:**
- Modify: `src/sections/Hero.astro` (252 lines)

- [ ] **Step 1: Update Hero markup**

- New headline from content.hero.claim
- New subline from content.hero.subline
- Primary CTA: "Termin buchen" → `#termin-buchen`
- Secondary CTA: "Entdecke unsere Keramik" → `#keramik-preise`
- Remove tertiary CTAs (WhatsApp/Instagram moved to float + footer)
- Add linen texture transition at bottom edge

- [ ] **Step 2: Update Hero CSS**

- Typography: Lora for headline (--text-hero), Source Sans 3 for subline
- Hero height: 70-80vh with min-height
- Linen gradient at bottom: `linear-gradient(to bottom, transparent 85%, var(--bg-linen))`
- Button styles: primary Terrakotta, secondary outline

- [ ] **Step 3: Build and verify**
```bash
npm run build
```

- [ ] **Step 4: Commit**
```bash
git add src/sections/Hero.astro
git commit -m "style: redesign hero — new typography, CTAs, linen texture transition"
```

---

## Task 9: Redesign Offerings Section

**Files:**
- Modify: `src/sections/Offerings.astro` (588 lines)
- Modify: `src/components/ProductModal.astro` (208 lines)

- [ ] **Step 1: Update Offerings section**

- New section id: `keramik-preise`
- Typography refresh: Lora headlines, Source Sans 3 body
- Color refresh: Sienna for price text, Leinen background
- Product cards: refined spacing, hover states
- Brennpauschale section: cleaner layout with table or cards

- [ ] **Step 2: Update ProductModal**

- Typography and color updates to match new tokens
- Sienna accents for prices
- Source Sans 3 body text

- [ ] **Step 3: Build and verify**

- [ ] **Step 4: Commit**
```bash
git add src/sections/Offerings.astro src/components/ProductModal.astro
git commit -m "style: redesign offerings — new typography, sienna price accents, linen background"
```

---

## Task 10: Redesign Process, Profil & Contact

**Files:**
- Modify: `src/sections/Process.astro` (55 lines)
- Modify: `src/sections/Profil.astro` (124 lines)
- Modify: `src/sections/Contact.astro` (217 lines)

These can run in **parallel**.

- [ ] **Step 1: Update Process section**
- Typography refresh
- Icon styling with Sienna accents
- Clean spacing

- [ ] **Step 2: Update Profil → "Über Irena"**
- New section title: "Über Irena"
- Dancing Script 500 for signature "Irena"
- Personal closing: "Ich freue mich auf dich."
- Typography and color refresh

- [ ] **Step 3: Update Contact section**
- Add Instagram link
- Add WhatsApp link (prominent)
- Typography and color refresh
- Map styling improvements

- [ ] **Step 4: Build and verify**

- [ ] **Step 5: Commit**
```bash
git add src/sections/Process.astro src/sections/Profil.astro src/sections/Contact.astro
git commit -m "style: redesign process, profil, contact — new typography, sienna accents"
```

---

## Task 11: Redesign Reviews + Inline Review Form

**Files:**
- Modify: `src/sections/Reviews.astro` (872 lines)

- [ ] **Step 1: Merge TrustQuotes into Reviews**

Combine the best testimonials from TrustQuotes into the Reviews section. Keep carousel functionality. Remove TrustQuotes as separate dependency.

- [ ] **Step 2: Add expandable review form**

Add "Bewertung schreiben" button that expands an inline form:
- Name (required)
- Stars 1-5 (clickable)
- Text (max 400 chars with counter)
- Submit button
- Uses existing `/api/reviews` POST endpoint

- [ ] **Step 3: Typography and color refresh**

- Lora for section title
- Source Sans 3 for testimonial text
- Sienna for star ratings
- Caramel for decorative accents

- [ ] **Step 4: Build and verify**

- [ ] **Step 5: Commit**
```bash
git add src/sections/Reviews.astro
git commit -m "feat: redesign reviews — merge trust quotes, add inline review form"
```

---

## Task 12: Rebuild Gallery Page

**Files:**
- Modify: `src/sections/Galerie.astro` (743 lines) — refactor for standalone page use
- Create: `src/scripts/gallery.js` — extracted gallery logic
- Create: `src/components/GalleryLightbox.astro` — new lightbox component

- [ ] **Step 1: Refactor Galerie.astro for standalone page**

- Remove hardcoded section wrapper (now used inside `/galerie` page layout)
- Keep CSS columns masonry approach
- Update typography and colors to new tokens
- Update filter tabs styling (Sienna active state)

- [ ] **Step 2: Create new GalleryLightbox component**

- Fullscreen overlay (z-index: 1100)
- Prev/Next navigation with keyboard support (arrow keys, Escape)
- Swipe gestures on touch devices
- Image counter ("3 / 24")
- Preload next image
- Smooth fade transitions
- ARIA: role="dialog", aria-modal="true", aria-label

- [ ] **Step 3: Extract gallery JS to `src/scripts/gallery.js`**

- Category filter logic
- Masonry layout init
- Lightbox open/close/navigate
- Lazy loading with IntersectionObserver + fade-in
- Pagination ("Mehr anzeigen", 12 initial, +12 per click)

- [ ] **Step 4: Add LQIP blur-up placeholders**

- Low-quality placeholder background (CSS gradient or tiny inline SVG)
- Fade to full image on load
- `loading="lazy"` on all gallery images

- [ ] **Step 5: Build and verify**
```bash
npm run build
```

- [ ] **Step 6: Commit**
```bash
git add src/sections/Galerie.astro src/components/GalleryLightbox.astro src/scripts/gallery.js
git commit -m "feat: rebuild gallery — new lightbox, LQIP placeholders, extracted JS"
```

---

## Task 13: Create WhatsApp Floating Button

**Files:**
- Create: `src/components/WhatsAppFloat.astro`
- Create: `src/scripts/whatsapp-float.js`
- Modify: `src/layouts/MainLayout.astro` (add component before `</body>`)

- [ ] **Step 1: Create WhatsAppFloat component**

```astro
---
import { content } from '../data/content';
const whatsappUrl = `https://wa.me/${content.contact.whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(content.contact.whatsappMessage)}`;
---
<a
  href={whatsappUrl}
  class="whatsapp-float"
  aria-label="Nachricht per WhatsApp senden"
  target="_blank"
  rel="noopener noreferrer"
>
  <svg><!-- WhatsApp icon SVG --></svg>
</a>
<style>
  .whatsapp-float {
    position: fixed;
    bottom: 24px;
    right: 24px;
    width: 56px;
    height: 56px;
    background: var(--accent-terra);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: var(--shadow-lg);
    z-index: 900;
    transition: transform 200ms ease, opacity 200ms ease;
  }
  .whatsapp-float:hover { transform: scale(1.1); }
  .whatsapp-float.is-hidden { opacity: 0; pointer-events: none; }
  @media (max-width: 480px) {
    .whatsapp-float { bottom: 16px; right: 16px; width: 48px; height: 48px; }
  }
</style>
```

- [ ] **Step 2: Create `whatsapp-float.js`**

IntersectionObserver that hides the button when footer/contact section is visible.

- [ ] **Step 3: Add to MainLayout**

Import and render WhatsAppFloat before closing `</body>`.

- [ ] **Step 4: Build and verify**

- [ ] **Step 5: Commit**
```bash
git add src/components/WhatsAppFloat.astro src/scripts/whatsapp-float.js src/layouts/MainLayout.astro
git commit -m "feat: add floating WhatsApp button with auto-hide on contact section"
```

---

## Task 14: Refresh Remaining Components

**Files:**
- Modify: `src/components/Button.astro` (119 lines)
- Modify: `src/components/BookingCalendar.astro` (787 lines)
- Modify: `src/components/FAQItem.astro` (131 lines)
- Modify: `src/components/WorkshopCard.astro` (218 lines)
- Modify: `src/components/WorkshopModal.astro` (403 lines)
- Modify: `src/components/Badge.astro` (43 lines)
- Modify: `src/components/StepItem.astro` (59 lines)
- Modify: `src/components/LogoLockup.astro` (95 lines)

These can run in **parallel** (independent components).

- [ ] **Step 1: Update Button.astro**
- New font: Source Sans 3 600
- Primary: Terrakotta background, white text
- Secondary: outline with Sienna border
- Hover states refined

- [ ] **Step 2: Update BookingCalendar.astro**
- Typography refresh only (fonts, colors)
- Keep all booking logic untouched
- Update any Cinzel/Inter references to Lora/Source Sans 3

- [ ] **Step 3: Update FAQItem.astro**
- Typography refresh for standalone /faq page
- Sienna for expand/collapse icon

- [ ] **Step 4: Update WorkshopCard + WorkshopModal**
- Typography and color refresh for /workshops page
- Sienna price labels

- [ ] **Step 5: Update Badge, StepItem, LogoLockup**
- Typography refresh
- LogoLockup: "Keramik Auszeit" text update

- [ ] **Step 6: Build and verify**
```bash
npm run build
```

- [ ] **Step 7: Commit**
```bash
git add src/components/
git commit -m "style: refresh all components — new typography, sienna accents, updated branding"
```

---

## Task 15: Update SEO & Structured Data

**Files:**
- Modify: `src/layouts/MainLayout.astro` (structured data lines 113-270)
- Modify: `public/sitemap.xml`
- Modify: `public/robots.txt`

- [ ] **Step 1: Update structured data**

- Update business name to "Keramik Auszeit"
- Verify all contact info is current
- Add FAQ structured data (FAQPage schema) in faq.astro
- Add Event structured data (Event schema) in workshops.astro for listed workshops

- [ ] **Step 2: Extend sitemap.xml**

Add new URLs:
```xml
<url><loc>https://keramik-auszeit.de/galerie</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>
<url><loc>https://keramik-auszeit.de/workshops</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>
<url><loc>https://keramik-auszeit.de/gutscheine</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>
<url><loc>https://keramik-auszeit.de/events</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>
<url><loc>https://keramik-auszeit.de/faq</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>
```

- [ ] **Step 3: Update robots.txt**

Ensure new pages are not blocked. Current rules only block /admin and /api/ — new pages should be allowed by default. Verify.

- [ ] **Step 4: Commit**
```bash
git add src/layouts/MainLayout.astro public/sitemap.xml public/robots.txt
git commit -m "seo: update structured data, extend sitemap with new pages"
```

---

## Task 16: Global CSS & Heading Refresh

**Files:**
- Modify: `src/styles/global.css` (heading scale lines 35-116)

- [ ] **Step 1: Update heading styles**

All headings now use Lora (via --font-serif token, already updated). Verify the responsive scale still works with the new font metrics. Lora is slightly wider than Cinzel — may need minor size adjustments.

- [ ] **Step 2: Update body font reference**

Ensure `body { font-family: var(--font-sans); }` now resolves to Source Sans 3.

- [ ] **Step 3: Add section alternating background utility**

```css
.section--linen {
  background-color: var(--bg-linen);
}
.section--paper {
  background-color: var(--bg-paper);
}
```

- [ ] **Step 4: Build and verify visual consistency**
```bash
npm run build && npm run preview
```

- [ ] **Step 5: Commit**
```bash
git add src/styles/global.css
git commit -m "style: update global CSS — heading scale for Lora, section background utilities"
```

---

## Task 17: Final QA & Polish

**Files:** All modified files

- [ ] **Step 1: Full build test**
```bash
npm run build
```
Expected: 0 errors, 0 warnings.

- [ ] **Step 2: Visual review of all pages**

Start dev server and check every page:
```bash
npm run dev
```
- `/` — 8 sections, correct order, no broken layouts
- `/galerie` — masonry loads, filter works, lightbox opens
- `/workshops` — cards display, modal opens
- `/gutscheine` — Stripe buttons work
- `/events` — all event types show, inquiry form submits
- `/faq` — accordion works
- `/404` — custom page shows

- [ ] **Step 3: Mobile check**

All pages at 375px and 480px viewport:
- Navigation opens/closes
- No horizontal scroll
- Touch targets ≥ 44px
- WhatsApp float visible and functional

- [ ] **Step 4: Verify no broken functionality**

- Booking calendar still works
- Stripe checkout still initializes
- Review form submits
- Inquiry form submits
- Admin panel still accessible at /admin
- Impressum/Datenschutz modals open

- [ ] **Step 5: Lighthouse audit**
```bash
# Run in Chrome DevTools on each page
# Target: Performance >90, Accessibility >95
```

- [ ] **Step 6: Final commit**
```bash
git add -A
git commit -m "feat: complete redesign — new typography, color palette, page structure, gallery rebuild"
```

---

## Task Summary & Parallelization

| Task | Depends On | Can Parallelize With |
|------|-----------|---------------------|
| 1. Git Setup | — | — |
| 2. Self-Host Fonts | 1 | 3, 4 |
| 3. Update Tokens | 1 | 2, 4 |
| 4. Update Content | 1 | 2, 3 |
| 5. Update Nav & Layout | 2, 3, 4 | — |
| 16. Global CSS Refresh | 2, 3 | 5 (after 2+3 done) |
| 6. Restructure Startpage | 4, 5, 16 | 7 |
| 7. Create Subpages | 4, 5, 16 | 6 |
| 8. Redesign Hero | 5, 16 | 9, 10, 11 |
| 9. Redesign Offerings | 16 | 8, 10, 11 |
| 10. Redesign Process/Profil/Contact | 16 | 8, 9, 11 |
| 11. Redesign Reviews | 16 | 8, 9, 10 |
| 12. Rebuild Gallery | 7, 16 | 13, 14 |
| 13. WhatsApp Float | 5 | 12, 14 |
| 14. Refresh Components | 16 | 12, 13 |
| 15. Update SEO | 5, 7 | 14 |
| 17. Final QA | ALL | — |

**Execution waves:**
- **Wave 1:** Tasks 2, 3, 4 (parallel — fonts, tokens, content)
- **Wave 2:** Tasks 5, 16 (parallel — nav/layout + global CSS, both need 2+3)
- **Wave 3:** Tasks 6, 7, 8, 9, 10, 11, 12, 13, 14, 15 (max parallelism — section redesigns + subpages + components)
- **Wave 4:** Task 17 (final QA, sequential)
