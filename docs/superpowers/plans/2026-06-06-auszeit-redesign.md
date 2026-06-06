# Auszeit Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die oeffentliche Website von keramik-auszeit.de auf das freigegebene Design "Richtung A, Warmes Atelier-Editorial" umbauen, ohne Backend, Admin oder Brenn-Tool anzufassen.

**Architecture:** Reine Praesentationsschicht. Astro-SSR-Seiten und -Sektionen bekommen ein neues Token-/Komponenten-System (CSS Custom Properties, Fraunces + Source Sans, Pinselstrich-Akzent, weiche-aber-geerdete Panels). Datenquellen (Buchung, Galerie, Reviews, Gutscheine, Workshops, Anfragen) bleiben die bestehenden API-Routen. Interaktivitaet als minimale Vanilla-JS-Islands.

**Tech Stack:** Astro 5 (SSR, Node-Adapter), CSS Custom Properties, `astro:assets`/sharp fuer Bilder, selbst-gehostete Fraunces-woff2.

**Design-Quelle (verbindlich, exakte Markup/CSS-Vorlage):**
- `docs/superpowers/design-reference/homepage.html` (Startseite, alle Sektionen)
- `docs/superpowers/design-reference/subpages.html` (Galerie, Workshops, Anlaesse, Gutscheine)
- `docs/superpowers/specs/2026-06-06-auszeit-redesign-design.md` (Konzept, Tokens, Regeln, Pflicht-Kriterien)

**Verifikation statt Unit-Tests:** Dieses Projekt hat kein Test-Framework und der Umbau ist visuell. Jede Task wird verifiziert durch (a) `npm run build` ohne Fehler, (b) Sichtpruefung in `npm run dev` gegen die Design-Referenz, (c) Commit. A11y/Performance/SEO werden am Ende in Phase 5 mit `/qa` und Lighthouse geprueft.

**Gestaltungsregeln (in JEDER Task einhalten):** keine Gedankenstriche (—/–) im Text (Bereiche als "X bis Y"); keine Deko-Nummerierung; keine Deko-Icons/Smileys/Pfeile, AUSSER Bewertungs-Sterne ★★★★★ in Terrakotta; Pinselstrich-Akzent in Karamell, Terrakotta nur fuer CTAs/Sterne, kein Gruen; Du-Ansprache, keine Premium-Buzzwords; nur echte Fotos.

**Nicht anfassen:** `src/pages/api/**`, `src/pages/admin/**`, `src/pages/products/[...].ts`, `src/pages/uploads/[...].ts`, `src/middleware.ts`, `src/lib/**`, `src/layouts/BrennLayout.astro`, `data/`.

---

## File Structure

**Neu erstellen:**
- `public/fonts/Fraunces-*.woff2` (selbst-gehostete Schnitte)
- `src/components/Brush.astro` (Pinselstrich-Akzent)
- `src/components/Stars.astro` (Bewertungs-Sterne)
- `src/components/Photo.astro` (responsives, warm-gegradetes Bild via astro:assets)
- `src/components/MobileMenu.astro` (mobiles Navigationsmenue)
- `src/sections/Gastgeberin.astro` (ersetzt Profil)
- `src/sections/AngebotPreise.astro` (ersetzt Offerings)
- `src/sections/Band.astro` (Atmosphaere-Band)
- `src/sections/FinalCTA.astro`

**Ueberschreiben/anpassen:**
- `src/styles/tokens.css`, `src/styles/global.css`, `src/styles/fonts.css`
- `src/layouts/MainLayout.astro`
- `src/components/Button.astro`, `BookingCalendar.astro`, `FAQItem.astro`, `WorkshopCard.astro`
- `src/sections/Hero.astro`, `WasErwartet.astro`, `Process.astro`, `Reviews.astro`, `Galerie.astro`, `Gutschein.astro`, `Workshops.astro`, `AnlassAnfragen.astro`, `FAQ.astro`, `Contact.astro`
- `src/pages/index.astro`, `galerie.astro`, `workshops.astro`, `events.astro`, `gutscheine.astro`, `faq.astro`, `impressum.astro`, `datenschutz.astro`, `barrierefreiheit.astro`, `stornierung.astro`, `gutschein-erfolg.astro`, `404.astro`
- `src/data/content.ts`

**Entfernen:** Lora- und Dancing-Script-Font-Faces + zugehoerige `public/fonts/*`-Dateien, `src/sections/Intro.astro` und `TrustQuotes.astro` (auffalten), Verweise darauf.

---

## Phase 1: Fundament

### Task 1: Fraunces self-hosten und Fonts umstellen

**Files:**
- Create: `public/fonts/Fraunces-Variable.woff2` (oder statische Schnitte 400/500/600 + Italic)
- Modify: `src/styles/fonts.css`

- [ ] **Step 1: Fraunces-woff2 beschaffen und ablegen**

Fraunces ist OFL (kostenfrei). Lade die Variable-woff2 (Subset latin) von Google Fonts / Fontsource und lege sie als `public/fonts/Fraunces-Variable.woff2` ab (Italic separat falls nicht in einer Datei: `Fraunces-Italic-Variable.woff2`). Source Sans 3 bleibt wie vorhanden.

- [ ] **Step 2: `src/styles/fonts.css` ersetzen**

Entferne alle Lora- und Dancing-Script-`@font-face`-Bloecke. Behalte Source Sans 3. Ergaenze Fraunces:

```css
/* Fraunces, Display */
@font-face {
  font-family: 'Fraunces';
  src: url('/fonts/Fraunces-Variable.woff2') format('woff2');
  font-weight: 400 600;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'Fraunces';
  src: url('/fonts/Fraunces-Italic-Variable.woff2') format('woff2');
  font-weight: 400 600;
  font-style: italic;
  font-display: swap;
}
/* Source Sans 3 bleibt unveraendert darunter */
```

- [ ] **Step 3: alte Font-Dateien entfernen**

Loesche `public/fonts/Lora-*.woff2` und `public/fonts/DancingScript-*.woff2`.

- [ ] **Step 4: Build verifizieren**

Run: `npm run build`
Expected: Build ohne Fehler, keine Verweise mehr auf Lora/Dancing Script.

- [ ] **Step 5: Commit**

```bash
git add public/fonts src/styles/fonts.css
git commit -m "feat(redesign): Fraunces self-hosten, Lora/Dancing Script entfernen"
```

### Task 2: tokens.css neu

**Files:**
- Modify: `src/styles/tokens.css`

- [ ] **Step 1: `src/styles/tokens.css` komplett ersetzen**

```css
:root {
  /* Farbe */
  --bg:#F7F1EA; --surface:#EDE3D8; --card:#FFFFFF;
  --ink:#3A2D24; --ink-2:#5D4A3C; --meta:#94816F;
  --terra:#D96C4A; --terra-h:#C75D3D; --caramel:#CFA874; --hair:#E4D8CB;
  --focus:#D96C4A;
  /* semantische Aliase fuer bestehenden Code */
  --color-background:var(--bg); --color-text-primary:var(--ink);
  --color-text-secondary:var(--ink-2); --color-accent:var(--terra);
  /* Typografie */
  --font-serif:'Fraunces',Georgia,serif;
  --font-sans:'Source Sans 3',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
  --text-h1:clamp(2.6rem, 2.3rem + 2vw, 4.4rem);
  --text-h2:clamp(2rem, 1.7rem + 1.5vw, 3rem);
  --text-h3:clamp(1.3rem, 1.2rem + 0.6vw, 1.5rem);
  --text-body:clamp(1rem, 0.95rem + 0.3vw, 1.125rem);
  /* Layout */
  --maxw:1200px; --gutter:clamp(1.25rem, 5vw, 4rem); --section:clamp(3.5rem, 8vw, 8rem);
  --touch-min:44px;
  /* Radien */
  --r-xl:clamp(16px, 1.8vw, 26px); --r-lg:clamp(12px, 1.4vw, 18px); --r-md:12px; --r-sm:9px;
  /* Schatten */
  --shadow-soft:0 22px 50px -40px rgba(58,45,36,.4);
  --shadow-card:0 12px 28px -22px rgba(58,45,36,.3);
  /* Motion */
  --ease-smooth:cubic-bezier(0.22,0.61,0.36,1);
  --ease-out:cubic-bezier(0.25,1,0.5,1);
  --dur-fast:180ms; --dur-mid:420ms; --dur-reveal:680ms;
  /* Pinselstrich (Karamell) */
  --brush:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 160 18' preserveAspectRatio='none'%3E%3Cpath fill='%23CFA874' d='M2 10 C 24 3 52 14 82 8 C 112 2 138 13 158 7 L 157 10 C 136 16 110 8 81 12 C 50 16 24 6 3 13 Z'/%3E%3C/svg%3E");
}
```

- [ ] **Step 2: Build + Commit**

Run: `npm run build` (Expected: ok).
```bash
git add src/styles/tokens.css
git commit -m "feat(redesign): neues OKLCH/warm Token-System"
```

### Task 3: global.css Basis

**Files:**
- Modify: `src/styles/global.css`

- [ ] **Step 1: `src/styles/global.css` setzen**

Behalte `@import './tokens.css'; @import './fonts.css';` oben. Ersetze den Rest durch die Basis aus der Design-Referenz (`homepage.html` `<style>`): Reset, `body` (Hintergrund inkl. zarter `radial-gradient`-Verlaeufe, `--font-sans`, `line-height:1.6`), `.warm`-Bildfilter, `.wrap`, `.eyebrow`, `h1/h2/h3` mit `--font-serif`/`letter-spacing:-.02em`, `.btn` (radius 10px, terra) + `.btn`-Hover, `.link-ul`, `.stars` (terra), `.brush`-Utility, sowie:

```css
:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }
.skip-link { position:absolute; left:-9999px; }
.skip-link:focus { left:1rem; top:1rem; z-index:100; background:var(--card); padding:.6rem 1rem; border-radius:8px; }
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration:.01ms !important; transition-duration:.01ms !important; scroll-behavior:auto !important; }
}
```

Quelle 1:1: `docs/superpowers/design-reference/homepage.html`, Selektoren `body`, `.warm`, `.wrap`, `.eyebrow`, `h1,h2,h3`, `.btn`, `.btn-terra`, `.link-ul`, `.stars`, `.brush`.

- [ ] **Step 2: Build + Sichtpruefung + Commit**

Run: `npm run build` (Expected: ok). `npm run dev`, Startseite laedt mit neuen Schriften/Farben (Sektionen folgen).
```bash
git add src/styles/global.css
git commit -m "feat(redesign): globale Basis-Styles (Typo, Buttons, Focus, reduced-motion)"
```

### Task 4: Basis-Komponenten (Button, Brush, Stars, Photo)

**Files:**
- Modify: `src/components/Button.astro`
- Create: `src/components/Brush.astro`, `src/components/Stars.astro`, `src/components/Photo.astro`

- [ ] **Step 1: `Button.astro`**

Props: `href`, `variant` ('terra' | 'ghost'), `size?`. Rendert `<a>` oder `<button>` mit Klassen `btn`/`btn ghost`. Klassen-CSS lebt in global.css (Task 3) plus eine `.btn.ghost`-Regel (transparent, 1.5px hair Rand, terra bei Hover) wie in `subpages.html` (`.ws__b .btn.ghost`).

- [ ] **Step 2: `Brush.astro`**

Rendert `<span class="brush" aria-hidden="true"></span>`. Optional `center`-Prop fuegt `center`-Kontext.

- [ ] **Step 3: `Stars.astro`**

```astro
---
const { label = 'Fuenf von fuenf Sternen' } = Astro.props;
---
<span class="stars" role="img" aria-label={label}>★★★★★</span>
```

- [ ] **Step 4: `Photo.astro`**

Wrapper um `astro:assets` `<Image>` (oder `<picture>` mit AVIF+WebP), setzt `class="warm"`, `loading`/`fetchpriority`-Props, `width`/`height`, `sizes`. Warm-Grade wird per sharp beim Import erzeugt oder die Bilder werden vorab gegradet abgelegt (siehe Task 18-Hinweis). Fuer feste Bilder aus `public/` ein `<picture>` mit AVIF/WebP.

- [ ] **Step 5: Build + Commit**

Run: `npm run build` (Expected: ok).
```bash
git add src/components/Button.astro src/components/Brush.astro src/components/Stars.astro src/components/Photo.astro
git commit -m "feat(redesign): Basis-Komponenten Button, Brush, Stars, Photo"
```

---

## Phase 2: Globale Chrome

### Task 5: MainLayout (Head, Header/Nav, mobiles Menue, Footer)

**Files:**
- Modify: `src/layouts/MainLayout.astro`
- Create: `src/components/MobileMenu.astro`

- [ ] **Step 1: `<head>` aktualisieren**

`preload` fuer `Fraunces-Variable.woff2` und `SourceSans3-Regular.woff2` (crossorigin), `preload` Hero-Bild, Favicons behalten. SEO: `title`/`description` aus Props, plus LocalBusiness-JSON-LD (Name, Adresse Feldstiege 6a 48599 Gronau, Geo, Oeffnungszeiten Di bis So 10 bis 18 Uhr, Telefon, URL). Keine Google-CDN-Fonts.

- [ ] **Step 2: Header/Nav portieren**

Aus `homepage.html` den `<header>`/`.nav` uebernehmen: Logo (`/logo-header-3x.png`) + Wortmarke "Auszeit"/"Malatelier · Gronau", Nav-Links (Keramik bemalen, Workshops, Anlaesse, Galerie, Gutscheine), Termin-buchen-Button. Sticky + blur + weicher Bottom-Schatten.

- [ ] **Step 3: `MobileMenu.astro`**

Burger-Button (`aria-expanded`, `aria-controls`, `aria-label`), Off-Canvas-Menue mit denselben Links + Termin buchen, Schliessen-Button, Escape schliesst, Focus-Trap, `aria-hidden` toggeln. Vanilla-JS inline. Touch-Targets ≥ 44px.

- [ ] **Step 4: Footer portieren**

Aus `homepage.html` den `<footer>`: Marke + Satz, "Komm vorbei" (NAP), Oeffnungszeiten, "Mehr" (Galerie/Workshops/Gutscheine/Instagram), Footer-Bar mit Impressum/Datenschutz. Skip-Link als erstes Body-Element.

- [ ] **Step 5: WhatsApp-Float**

`WhatsAppFloat.astro` behalten, aber dezent an die Palette anpassen oder entfernen (offener Punkt der Spec, Default: behalten, gedeckter Stil).

- [ ] **Step 6: Build + Sichtpruefung + Commit**

Run: `npm run build` (Expected: ok). Header/Footer/mobiles Menue auf allen Breiten testen (375px, 768px, 1200px), Tastaturbedienung des Menues.
```bash
git add src/layouts/MainLayout.astro src/components/MobileMenu.astro
git commit -m "feat(redesign): MainLayout Header/Nav/mobiles Menue/Footer + LocalBusiness-Schema"
```

---

## Phase 3: Startseite (Port aus homepage.html)

> Pro Sektion: Markup + sektionsspezifisches CSS aus `homepage.html` in die Astro-Sektion uebernehmen (gemeinsame Klassen sind schon global). Texte aus `src/data/content.ts`. Build + Sichtpruefung + Commit.

### Task 6: Hero

**Files:** Modify `src/sections/Hero.astro`

- [ ] **Step 1:** `.hero` (5/7-Grid), Eyebrow, H1 "Dein Ort zum Ankommen und *Kreativsein*" (em = terra-kursiv), Subline, Termin-buchen-Button + Text-Link "Unsere Keramik ansehen", Trust-Zeile mit `<Stars />` + "bei Google, von echten Gaesten aus dem Muensterland". Bild rechts als rundes Panel (`.hero__img`, `--r-lg`, Schatten) mit `<Photo>` (Hero-Foto, `fetchpriority="high"`), `.hero__cap`. CSS-Block `.hero*` aus der Referenz.
- [ ] **Step 2:** `npm run build` (ok), Sichtpruefung gegen Referenz.
- [ ] **Step 3:** `git commit -m "feat(redesign): Hero"`

### Task 7: WasErwartet

**Files:** Modify `src/sections/WasErwartet.astro`

- [ ] **Step 1:** `.offer-grid` mit 4 `.ocard` (Keramik bemalen, Workshops, Anlaesse, Gutscheine), je `<Photo>` + Titel + Text + `.more`-Preis. `<Brush />` unter der Ueberschrift. Bilder: Kind beim Malen, Workshop, Gruppe, Auszeit-Tasse. Texte aus `content.wasErwartet`.
- [ ] **Step 2:** Build + Sichtpruefung. **Step 3:** `git commit -m "feat(redesign): Was dich erwartet"`

### Task 8: Process (So einfach)

**Files:** Modify `src/sections/Process.astro`

- [ ] **Step 1:** `.blk.soft`-Panel, `.steps` mit 3 `.step` (Pinselstrich-Topper via `.step::before`), Texte aus `content.process` (ohne Nummerierung). 
- [ ] **Step 2:** Build + Sichtpruefung. **Step 3:** `git commit -m "feat(redesign): So einfach geht es"`

### Task 9: Gastgeberin (ersetzt Profil)

**Files:** Create `src/sections/Gastgeberin.astro`; remove `src/sections/Profil.astro`

- [ ] **Step 1:** `.about` (5/7), Bild links als rundes Panel (Irena beim Malen, auf sie zugeschnitten), rechts Eyebrow "Die Gastgeberin", H2 "Bei Irena ist jeder willkommen", Absatz, `.pullquote` (Carina-Zitat). CSS `.about*`/`.pullquote` aus Referenz.
- [ ] **Step 2:** Build + Sichtpruefung. **Step 3:** `git commit -m "feat(redesign): Sektion Die Gastgeberin"`

### Task 10: AngebotPreise (ersetzt Offerings)

**Files:** Create `src/sections/AngebotPreise.astro`; remove `src/sections/Offerings.astro`

- [ ] **Step 1:** `.price-split` (7/5): links `.price-photos` (3 fertige Stuecke), rechts `.price-card` (Rohling-Preisliste + `.pauschale` + Hinweis). Werte aus `content.offerings` (Bereiche als "4 bis 6 Teile"). `tnum` fuer Preise.
- [ ] **Step 2:** Build + Sichtpruefung. **Step 3:** `git commit -m "feat(redesign): Angebot und Preise"`

### Task 11: Galerie-Teaser

**Files:** Modify `src/sections/Galerie.astro` (Teaser-Variante fuer Startseite)

- [ ] **Step 1:** `.blk.soft` mit `.gallery-row` (5 Bilder, erstes hoch ueber 2 Zeilen) + Link "Zur ganzen Galerie" → `/galerie`. Bilder aus dem Bestand/S3.
- [ ] **Step 2:** Build + Sichtpruefung. **Step 3:** `git commit -m "feat(redesign): Galerie-Teaser"`

### Task 12: Band (Atmosphaere)

**Files:** Create `src/sections/Band.astro`

- [ ] **Step 1:** `.band` (rundes Foto-Panel, `--r-xl`, Scrim, Serif-Kursiv-Zitat "Ein Nachmittag nur fuer dich, mitten im Muensterland."). Atelier-Weitwinkel-Foto.
- [ ] **Step 2:** Build + Sichtpruefung. **Step 3:** `git commit -m "feat(redesign): Atmosphaere-Band"`

### Task 13: BookingCalendar (Monatskalender)

**Files:** Modify `src/components/BookingCalendar.astro`

- [ ] **Step 1: Markup/CSS portieren**

Aus `homepage.html` den `.book-card`/`.cal`-Block: zweispaltig (Kalender links, ausgewaehlter Tag + Zeit-Pillen + Buchen-Button rechts), Wochentage, Tageszellen (`.day`, `.day.is-muted`, `.day.is-sel`, Terra-Punkt = frei), Monats-Navigation, Legende. CSS `.cal*`, `.day*`, `.timepill*` uebernehmen.

- [ ] **Step 2: An bestehende Daten anbinden**

Verfuegbarkeiten aus `/api/slots` laden (Monatsmatrix bauen: Mo-Start, Ruhetag Montag, vergangene Tage `is-muted`, Tage mit freien Slots bekommen `.dot`). Klick auf Tag laedt dessen Zeiten in die rechte Spalte; Klick auf Zeit-Pille + "Weiter zur Buchung" startet den bestehenden Buchungsflow (`/api/booking` bzw. Stripe-Checkout je nach bisheriger Logik). Bestehende Buchungslogik NICHT aendern, nur die UI.

- [ ] **Step 3:** Build + Sichtpruefung (Tag/Zeit waehlbar, Tastatur bedienbar, Touch ≥ 44px). **Step 4:** `git commit -m "feat(redesign): Monatskalender-Buchung an /api/slots"`

### Task 14: Reviews

**Files:** Modify `src/sections/Reviews.astro`

- [ ] **Step 1:** `.rev-grid` mit `.rev`-Karten: `<Stars />` + Serif-Kursiv-Zitat + `cite`. Daten aus `/api/reviews` (approved). Emojis aus Original-Reviews entfernen/escapen. TrustQuotes auffalten.
- [ ] **Step 2:** Build + Sichtpruefung. **Step 3:** `git commit -m "feat(redesign): Bewertungen mit Sternen"`

### Task 15: FAQ-Akkordeon

**Files:** Modify `src/sections/FAQ.astro`, `src/components/FAQItem.astro`

- [ ] **Step 1:** `<details>/<summary>` mit `+`/`×`-Indikator (`summary::after`, rotiert bei `[open]`). Inhalte aus `content.faq`. Eigenstaendige FAQ-Seite nutzt dieselbe Sektion.
- [ ] **Step 2:** Build + Tastatur/Screenreader-Check. **Step 3:** `git commit -m "feat(redesign): FAQ-Akkordeon"`

### Task 16: FinalCTA

**Files:** Create `src/sections/FinalCTA.astro`

- [ ] **Step 1:** `.final` (dunkles, rundes Panel) "Bereit fuer deine Auszeit?" + Termin-buchen-Button + Text-Link "Lieber einen Gutschein verschenken".
- [ ] **Step 2:** Build + Sichtpruefung. **Step 3:** `git commit -m "feat(redesign): Final-CTA"`

### Task 17: index.astro zusammensetzen

**Files:** Modify `src/pages/index.astro`

- [ ] **Step 1:** Sektionsreihenfolge: Hero, WasErwartet, Process, Gastgeberin, AngebotPreise, Galerie(Teaser), Band, BookingCalendar, Reviews, FAQ, FinalCTA. Intro/Profil/Offerings/TrustQuotes-Imports entfernen. SEO-Title/Description beibehalten/anpassen.
- [ ] **Step 2:** `npm run build` + komplette Startseite gegen `homepage.html` pruefen (Desktop + 375px). **Step 3:** `git commit -m "feat(redesign): Startseite zusammengesetzt"`

---

## Phase 4: Unterseiten (Port aus subpages.html)

### Task 18: Galerie-Seite

**Files:** Modify `src/pages/galerie.astro`, `src/sections/Galerie.astro`

- [ ] **Step 1:** Pagehead + Filter-Chips (Alle/Becher/Teller/Tiere/Fuer Kinder/Besonderes) + Masonry-`.gal` (`.gtile` mit Hover-Caption) + Lightbox. CSS/Markup aus `subpages.html` (Galerie). 
- [ ] **Step 2:** Daten aus bestehender Galerie-API/S3 (`/api/gallery`, `/api/gallery/categories`); Filter per `data-cat`, Lightbox als Vanilla-JS-Island mit Focus-Trap + Escape. Warm-Grade fuer S3-Bilder per CSS `.warm` (Build-Time-Grade nur fuer statische Assets).
- [ ] **Step 3:** Build + Sichtpruefung (Filter, Lightbox, Tastatur). **Step 4:** `git commit -m "feat(redesign): Galerie-Seite (Filter + Lightbox)"`

### Task 19: Workshops-Seite

**Files:** Modify `src/pages/workshops.astro`, `src/sections/Workshops.astro`, `src/components/WorkshopCard.astro`

- [ ] **Step 1:** Pagehead + `.ws-grid` mit `.ws`-Karten (Datums-Badge, Titel, Text, Meta Dauer/Plaetze/Preis, "Platz sichern") + Wunsch-Workshop-Karte (ghost-Button "Anfragen") + `.ws-note` mit Termin-buchen-CTA. CSS/Markup aus `subpages.html` (Workshops).
- [ ] **Step 2:** Daten aus `/api/workshops`; "Platz sichern" startet bestehende Workshop-Buchung (`/api/workshops/book`). Keine Backend-Aenderung.
- [ ] **Step 3:** Build + Sichtpruefung. **Step 4:** `git commit -m "feat(redesign): Workshops-Seite"`

### Task 20: Anlaesse-Seite (events.astro)

**Files:** Modify `src/pages/events.astro`, `src/sections/AnlassAnfragen.astro`

- [ ] **Step 1:** Pagehead + `.anl-banner` (Gruppen-Foto + Zitat) + `.anl-grid` mit 4 Karten (Kindergeburtstag/JGA/Firmen/Privat, Terra-Punkt-Listen) + `.form` Anfrageformular. CSS/Markup aus `subpages.html` (Anlaesse). Texte aus `content.events`.
- [ ] **Step 2:** Formular an bestehende `/api/inquiries` anbinden (Felder Anlass, Wunschdatum, Name, Personenzahl, E-Mail, Telefon, Nachricht), Labels mit `for`/`id`, `:focus`-Ring, Input `font-size ≥ 16px`, Erfolgs-/Fehlerfeedback. Kein Backend-Umbau.
- [ ] **Step 3:** Build + Formular-Test + A11y-Check. **Step 4:** `git commit -m "feat(redesign): Anlaesse-Seite + Anfrageformular"`

### Task 21: Gutscheine-Seite

**Files:** Modify `src/pages/gutscheine.astro`, `src/sections/Gutschein.astro`, `src/pages/gutschein-erfolg.astro`, `src/pages/gutschein/einloesen/[code].astro`

- [ ] **Step 1:** Pagehead + `.gut-grid`: links Betragswahl (25/50/Wunsch, `.amount.is-on`) + Buchen-Button + 3-Schritte-Liste, rechts Live-`.voucher`-Vorschau (Logo, Betrag aktualisiert sich). CSS/Markup aus `subpages.html` (Gutscheine).
- [ ] **Step 2:** "Gutschein kaufen" → bestehender Stripe-Checkout (`/api/create-checkout-session`), Wunschbetrag-Eingabe; `gutschein-erfolg` und `einloesen/[code]` im neuen Look. Zahlungslogik unveraendert.
- [ ] **Step 3:** Build + Sichtpruefung + Test-Checkout (Stripe-Testmodus). **Step 4:** `git commit -m "feat(redesign): Gutscheine-Seite + Erfolg/Einloesen"`

### Task 22: FAQ-Seite

**Files:** Modify `src/pages/faq.astro`

- [ ] **Step 1:** Pagehead + FAQ-Sektion (Task 15) als eigene Seite, eindeutige H1, SEO-Meta.
- [ ] **Step 2:** Build + Commit `feat(redesign): FAQ-Seite`

### Task 23: Rechtstexte

**Files:** Modify `src/pages/impressum.astro`, `datenschutz.astro`, `barrierefreiheit.astro`, `stornierung.astro`

- [ ] **Step 1:** Lesbare Textseiten: `.wrap`, `max-width ~65ch`, klare H1/H2-Hierarchie, gleiche Chrome. Rechtsinhalte unveraendert uebernehmen. Barrierefreiheits-Erklaerung auf den neuen Stand bringen.
- [ ] **Step 2:** Build + Commit `feat(redesign): Rechtstexte im neuen Layout`

### Task 24: 404

**Files:** Modify `src/pages/404.astro`

- [ ] **Step 1:** Freundliche 404 (H1, kurzer Text, Links zu Startseite und Termin buchen), gleiche Chrome.
- [ ] **Step 2:** Build + Commit `feat(redesign): 404-Seite`

---

## Phase 5: Inhalt, QA, Launch

### Task 25: content.ts Korrektorat

**Files:** Modify `src/data/content.ts`

- [ ] **Step 1:** Gesamten sichtbaren Text gegen die Regeln pruefen: Gedankenstriche raus ("X bis Y"), keine Deko-Nummern, keine Emojis/Icons, keine Premium-Buzzwords, Du-Ansprache. SEO-Titles (50 bis 60 Z.) und Descriptions (120 bis 160 Z.) je Seite pruefen.
- [ ] **Step 2:** `grep -rnE "—|–" src/` → 0 Treffer im sichtbaren Text. Build + Commit `chore(redesign): Copy-Korrektorat nach Gestaltungsregeln`

### Task 26: QA-Audit

- [ ] **Step 1:** `/qa` ausfuehren (SEO, A11y, Security, DSGVO, Performance). Befunde abarbeiten: Kontraste, `:focus-visible` ueberall, eine H1 pro Seite, Heading-Reihenfolge, alle Bilder mit Alt, Modale/Lightbox Focus-Trap + Escape, `prefers-reduced-motion`, Touch ≥ 44px, kein H-Scroll bei 375px, Cookie/DSGVO, LocalBusiness-Schema, NAP konsistent.
- [ ] **Step 2:** Lighthouse mobil ≥ 90 fuer LCP/INP/CLS; Hero-Bild ≤ ~200KB, AVIF/WebP greifen. Fixes committen.

### Task 27: Build-Check und Deploy

- [ ] **Step 1:** `/deploy-check` (Build, tote Links, Secrets, Dockerfile, Git-Status).
- [ ] **Step 2:** Auf `feature/redesign` finalen Build verifizieren, dann gemaess Projekt-Workflow deployen (`./deploy.sh`), Rollback-Plan bereit (`kubectl rollout undo`).

---

## Selbstpruefung (Spec-Abdeckung)

- Design-System (Tokens/Typo/Spacing/Radien/Motion/Pinselstrich/Foto) → Tasks 1 bis 4.
- Globale Chrome (Header/mobiles Menue/Footer/Schema) → Task 5.
- Startseite, alle Sektionen in Reihenfolge → Tasks 6 bis 17.
- Galerie/Workshops/Anlaesse/Gutscheine/FAQ/Rechtliches/404 → Tasks 18 bis 24.
- Regeln (Dashes/Nummern/Icons/Sterne/Pinselstrich/kein Gruen) → in jeder Task + Task 25.
- Pflicht-Kriterien (WCAG AA, CWV, DSGVO, SEO, selbst-gehostete Fonts) → Tasks 1, 5, 26, 27.
- Backend/Admin/Brenn unberuehrt → in jeder Task explizit.
- Bildrecht/Einwilligung → Spec Abschnitt 3, im QA (Task 26) verifizieren.
