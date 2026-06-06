# Design-Spec: Redesign Malatelier Auszeit (Richtung A, Warmes Atelier-Editorial)

- **Projekt:** keramik-auszeit.de, komplettes Redesign der oeffentlichen Website
- **Stand:** 2026-06-06
- **Status:** Design validiert (Mockups freigegeben), bereit fuer Umsetzungsplan
- **Branch:** `feature/redesign`
- **Grundlage:** Vault-Playbook `.superpowers/brainstorm/1916864-1780702805/synth.json` + Mockups im selben `content/`-Ordner (`homepage-v4.html`, `subpages.html`)

---

## 1. Ziel und Rahmen

Die Seite soll so hochwertig wirken wie das Atelier ist: ruhig, warm, handwerklich, selbstbewusst, NICHT teuer/protzig/kalt ("Premium ist das falsche Wort"). Foto-getrieben und editorial, aber weich und organisch (passt zu Ton/Keramik).

- **Umfang:** komplette oeffentliche Seite (Startseite + alle Unterseiten + globale Elemente). Das Admin-/Brenn-Tool und das gesamte Backend bleiben unberuehrt.
- **Hauptziel:** Walk-in "Keramik bemalen". Held-CTA ueberall: **Termin buchen**.
- **Identitaet:** Name "Malatelier Auszeit" + bestehendes Logo (Pinselglas) bleiben fix. Farben, Typografie, Layout, Motion sind neu.
- **Nur Design, keine Funktion:** Buchung, Galerie, Bewertungen, Gutscheine (Stripe), Workshops, Anfragen, Mailversand und S3-Bilder laufen weiter ueber das bestehende Backend. Wir tauschen die Praesentationsschicht.

## 2. Gestaltungsregeln (verbindlich)

- **Keine Gedankenstriche** (— / –) im sichtbaren Text. Zahlenbereiche als "10 bis 14 Tage", "4 bis 6 Teile". Bindestriche in Komposita ("Preis-Leistung", "Farb- und Brennpauschale") sind okay.
- **Keine Deko-Nummerierung** (keine 01/02/03-Marker, keine nummerierten Schritte).
- **Keine Deko-Icons, keine Smileys/Emojis, keine Pfeile** als Schmuck. **Ausnahme:** Bewertungs-Sterne sind erwuenscht, **5 ausgefuellte Sterne (★★★★★) in Terrakotta**, nicht "Fuenf Sterne" ausschreiben.
- **Akzent = handgemalter Pinselstrich in Karamell** (#CFA874), nicht eine technische Haarlinie. **Terrakotta bleibt allein den CTAs/Buttons und den Sternen vorbehalten. Kein Gruen** (Moos/Olive abgelehnt).
- **Weich, aber geerdet:** runde, schwebende Panels und abgerundete Bilder/Karten mit sanften Schatten, aber moderate Rundungen (keine Blob-Optik) und Buttons mit ruhigem Radius. Balance zwischen "zu eckig" und "zu weich".
- **Echte Fotos** aus dem Shooting, einheitlicher warmer Look. Keine Stockfotos.
- **Keine Premium-/Luxus-Buzzwords** im Copy. Du-Ansprache, warm, ehrlich (wie Irena spricht, nicht eine Marketing-Abteilung).

## 3. Personen und Bildrecht

- Michael hat das Zeigen von Gaesten/Personen freigegeben ("das geht in Ordnung"). Personen-Fotos duerfen genutzt werden.
- **Empfehlung fuers Live-Gehen:** fuer jeden klar erkennbaren Gast eine kurze schriftliche Foto-Einwilligung (Recht am eigenen Bild, §22 KUG / DSGVO) einsammeln und ablegen.
- **Irena** = Shooting-Bild 40 (auburn Bob, schwarzes Top, beim Malen, fuer "Gastgeberin" auf sie zugeschnitten) und Profilfoto `public/profil-irena.jpg`. Die Frau im Leoparden-Cardigan (Bild 8 und 68) ist eine **Freundin**, nicht Irena.
- Bilder, bei denen Kinder klar erkennbar im Vordergrund stehen, nur bewusst und mit Einwilligung einsetzen; im Zweifel zuschneiden (wie bei Bild 40 geschehen).

## 4. Design-System

### 4.1 Farb-Tokens (OKLCH mit Hex-Fallback)

| Token | OKLCH | Hex | Rolle | Kontrast |
|---|---|---|---|---|
| `--bg` | `oklch(0.96 0.014 82)` | `#F7F1EA` | Seiten-Hintergrund (warmes Papierweiss) | — |
| `--surface` | `oklch(0.93 0.018 80)` | `#EDE3D8` | Sektions-Panel, Sand | — |
| `--card` | `oklch(1 0 0)` | `#FFFFFF` | Karten-Flaeche | — |
| `--ink` | `oklch(0.30 0.035 55)` | `#3A2D24` | Body-/Headline-Text (Brennofenton, kein Reinschwarz) | ~11:1 auf bg, AAA |
| `--ink-2` | `oklch(0.42 0.030 60)` | `#5D4A3C` | Sekundaer-Text | ~7:1 |
| `--meta` | `oklch(0.56 0.020 70)` | `#94816F` | Meta/Labels/Eyebrows | ~4.6:1 |
| `--terra` | `oklch(0.58 0.13 38)` | `#D96C4A` | Held-CTA + Sterne (NUR Aktion/Rating) | Buttontext weiss ~4.9:1 |
| `--terra-h` | `oklch(0.53 0.13 38)` | `#C75D3D` | CTA Hover | — |
| `--caramel` | `oklch(0.74 0.075 70)` | `#CFA874` | Pinselstrich-Akzent, dekorativ | dekorativ |
| `--hair` | `oklch(0.88 0.014 78)` | `#E4D8CB` | feine Trenner innerhalb von Komponenten | — |
| `--focus` | `oklch(0.55 0.13 38)` | `#D96C4A` | Focus-Ring 2px, offset 2-3px | ≥3:1 |

60-30-10: ~60% Cream/Sand-Neutral, ~30% warmes Ton-Sekundaer, ~10% Terrakotta (nur CTAs/Sterne). Chroma der Neutralen unter 0.04. Funktionsfarben (success/warning/error) gedeckt und sparsam; **kein gruener Deko-Akzent**.

### 4.2 Typografie

- **Display/Headlines:** Fraunces (variable, OFL, selbst-gehostet als woff2), kursiv fuer Betonungen/Akzente.
- **Body/UI:** Source Sans 3 (OFL, bereits vorhanden, selbst-gehostet).
- **Entfernt:** Lora und Dancing Script (werden nicht mehr genutzt; Font-Faces und Dateien raus).
- **Type-Scale (Major Third 1.25, fluid):**
  - H1 `clamp(2.6rem, 2.3rem + 2vw, 4.4rem)`
  - H2 `clamp(2rem, 1.7rem + 1.5vw, 3rem)`
  - H3 `clamp(1.3rem, 1.2rem + 0.6vw, 1.5rem)`
  - Body `clamp(1rem, 0.95rem + 0.3vw, 1.125rem)`
  - Eyebrow `0.72rem`, uppercase, `letter-spacing 0.2em`, Farbe meta
- **Mikrotypo:** Headlines `letter-spacing -0.02em`, `line-height 1.12`, `text-wrap: balance`, max 13-18ch. Body `line-height 1.6`, `text-wrap: pretty`, `hyphens: auto` (`lang="de"`), Zeilenlaenge max 42-65ch. Deutsche Anfuehrungszeichen „ ". Old-Style-Ziffern im Fliesstext, `tnum` nur in Preistabellen.

### 4.3 Abstaende, Grid, Form

- 8px-Basis. Sektions-Padding `clamp(3.5rem, 8vw, 8rem)`, Gutter `clamp(1.25rem, 5vw, 4rem)`, `max-width 1200px`.
- 12-Spalten-Denken mit editorialer **Asymmetrie 5fr/7fr bzw. 7fr/5fr** (Hero, Gastgeberin, Preise).
- **Radien (ausgewogen):** `--r-xl clamp(16px,1.8vw,26px)` (Panels/Band/Final), `--r-lg clamp(12px,1.4vw,18px)`, `--r-md 12px` (Karten/Bilder), `--r-sm 9px`. Buttons `10px`. Pillen (999px) nur fuer Zeit-/Filter-Chips und runde Nav-Buttons.
- **Schatten:** weich, `--shadow-soft 0 22px 50px -40px rgba(58,45,36,.4)`, `--shadow-card 0 12px 28px -22px rgba(58,45,36,.3)`. Keine harten 1px-Sektionsraender; Hairlines nur innerhalb von Komponenten.

### 4.4 Motion

- Easing: `--ease-smooth cubic-bezier(0.22,0.61,0.36,1)`, `--ease-out cubic-bezier(0.25,1,0.5,1)`.
- Dauer: Hover 180ms, Transition 420ms, Scroll-Reveal 640 bis 720ms.
- Reveal: `opacity 0→1` + `translateY(20px→0)` via IntersectionObserver. Bild-Hover `scale(1.04)`. Kein Spring/Bounce, kein Auto-Play, Parallax max ~8%.
- `prefers-reduced-motion`: Dauer 0.01ms, `transform: none`, nur Fades fuer Info bleiben.

### 4.5 Pinselstrich-Akzent

Inline-SVG-Pinselstrich in Karamell, ca. 74×15px, als wiederkehrender Akzent unter Sektions-Ueberschriften und als Topper der Ablauf-Schritte. Eine konsistente Form, sparsam gesetzt.

### 4.6 Fotografie

- Quelle: Profi-Shooting `public/Auszeit Keramik/` (95 PNGs) + dynamische Galerie auf S3.
- **Warm-Grade (Build-Time, via sharp):** Saettigung leicht runter, Kontrast leicht hoch, warme Schatten, cremige Highlights (kein Reinweiss), optional 4 bis 6% Film-Grain. Ein Look fuer alle Bilder.
- Ausgabe: **AVIF + WebP** mit `srcset`/`sizes`, `width`/`height`/`aspect-ratio` gesetzt, abgerundete Ecken (`--r-md`). Hero ≤ ~200KB.

### 4.7 Komponenten

Header/Nav (sticky, blur, Logo + Wortmarke + Termin-buchen-CTA + mobiles Menue), Skip-Link, Button (terra / ghost), Eyebrow-Label, Pinselstrich-Akzent, Sterne-Rating (★★★★★ terra), Angebots-/Anlass-/Workshop-/Bewertungs-Karten, Preis-Karte mit Pauschalen, Galerie-Kachel + Filter-Chips + Lightbox, **Monatskalender-Buchung** (Tage mit Terra-Punkt = frei, ausgewaehlter Tag terra, Zeit-Pillen, Monats-Navigation, Legende) + Slots, Gutschein-Betragswahl + Live-Vorschau, Formulare (runde Felder, terra Focus), FAQ-Akkordeon (`<details>` mit +/×), Atmosphaere-Band (Foto + Zitat), Final-CTA (dunkles Panel), Footer.

## 5. Seiten

### 5.1 Startseite (Referenz: `homepage-v4.html`)

Reihenfolge: Header → **Hero** (5/7, Bild rechts als rundes Panel, Eyebrow, H1 "Dein Ort zum Ankommen und *Kreativsein*", Subline mit Walk-in-Info, Termin-buchen-Button + Text-Link, Trust-Zeile mit ★★★★★) → **Was dich erwartet** (4 Karten: Keramik bemalen, Workshops, Anlaesse, Gutscheine) → **So einfach geht es** (3 Schritte, Pinselstrich) → **Die Gastgeberin** (Irena beim Malen, Pull-Quote) → **Angebot und Preise** (Fotos + Preisliste + Pauschalen, transparent) → **Galerie**-Teaser → **Atmosphaere-Band** (Atelier + Zitat) → **Termin buchen** (Monatskalender) → **Bewertungen** (3 echte Google-Stimmen mit Sternen) → **FAQ** → **Final-CTA** ("Bereit fuer deine Auszeit?") → Footer.

### 5.2 Galerie (Referenz: `subpages.html` → Galerie)

Pagehead, **Filter-Chips** (Alle · Becher · Teller · Tiere · Fuer Kinder · Besonderes), **Masonry-Raster** der fertigen Stuecke (Spalten-Layout, Hover-Caption), **Lightbox** beim Klick. Bilder/Kategorien aus der bestehenden Galerie-API/S3.

### 5.3 Workshops (Referenz: `subpages.html` → Workshops)

Pagehead, **Workshop-Karten** (Datums-Badge, Titel, Kurztext, Meta: Dauer / Plaetze / Preis, "Platz sichern" → Buchung) plus "Euer Wunsch-Workshop" (Anfrage), Abschluss-Hinweis mit Termin-buchen-CTA. Daten aus der bestehenden Workshops-API.

### 5.4 Anlaesse (Referenz: `subpages.html` → Anlaesse)

Pagehead, Stimmungs-Banner, 4 Anlass-Karten (Kindergeburtstag · JGA · Firmen-Event · Privater Anlass) mit Leistungen (Terra-Punkt-Listen), **Anfrageformular** (Anlass, Wunschdatum, Name, Personenzahl, E-Mail, Telefon, Nachricht) → bestehende Inquiries-API + Mailversand.

### 5.5 Gutscheine (Referenz: `subpages.html` → Gutscheine)

Pagehead, **Betragswahl** (25 / 50 / Wunschbetrag), **Live-Gutschein-Vorschau** (Logo, Betrag), "So einfach geht es" in 3 Schritten, Kauf → bestehender Stripe-Checkout. Plus `gutschein-erfolg` und `gutschein/einloesen/[code]` im neuen Look.

### 5.6 FAQ

Eigene Seite mit dem Akkordeon (`<details>/<summary>`, +/×-Indikator), Inhalte aus `content.ts`.

### 5.7 Rechtliches

Impressum, Datenschutz, Barrierefreiheit, Stornierung als saubere, gut lesbare Textseiten (max ~65ch, klare Typo-Hierarchie), gleiche globale Chrome. Inhalte bleiben rechtlich wie bestehend.

### 5.8 404 und global

- **404:** freundlich, on-brand, Links zu Startseite und Termin buchen.
- **Global:** Header mit mobilem Menue, Footer (NAP, Oeffnungszeiten, Links, Instagram, Impressum/Datenschutz), Skip-Link, optional WhatsApp-Float (dezent restyled oder entfernen, siehe offene Punkte).

## 6. Technische Umsetzung (im bestehenden Astro-Projekt)

**Unveraendert lassen (Backend/Admin/Logik):** `src/pages/api/**`, `src/pages/admin/**`, `src/pages/products/[...].ts`, `src/pages/uploads/[...].ts`, `src/middleware.ts`, `src/lib/**`, `src/layouts/BrennLayout.astro`, alle Stripe-/DB-/Mail-/S3-Flows, `data/`-Dateien.

**Neu gestalten / anpassen:**
- **Styles:** `src/styles/tokens.css` (neues Token-System oben), `src/styles/global.css`, `src/styles/fonts.css` (+ Fraunces-woff2 in `public/fonts/`, Lora/Dancing-Script raus).
- **Layout-Chrome:** `src/layouts/MainLayout.astro` (Header/Nav/mobiles Menue/Footer/Skip-Link), ggf. `src/layouts/Layout.astro`.
- **Sektionen** (`src/sections/`): Hero, WasErwartet, Offerings → "Angebot und Preise", Process, Profil → "Die Gastgeberin", Reviews, Contact/Booking, Galerie, Gutschein, Workshops, AnlassAnfragen, FAQ; TrustQuotes in die Trust-Zeile/Bewertungen falten; Intro entfernen/auffalten.
- **Komponenten** (`src/components/`): Button, BookingCalendar → Monatskalender, FAQItem, WorkshopCard, Modal/ProductModal → Lightbox, StepItem, LogoLockup, Badge, Instagram-/WhatsApp-Link.
- **Oeffentliche Seiten** (`src/pages/`): index, galerie, workshops, events (Anlaesse), gutscheine, faq, impressum, datenschutz, barrierefreiheit, stornierung, gutschein-erfolg, 404.
- **Fonts:** Fraunces variable (Subset latin) selbst-hosten, kritische Schnitte `preload`, `font-display: swap`. Kein Google-CDN (DSGVO).
- **Bilder:** Shooting-Fotos kuratieren, Build-Time warm-graden, als AVIF/WebP-Responsives ausspielen (astro:assets / sharp). Dynamische Galerie weiter ueber S3.
- **Inhalt/Copy:** `src/data/content.ts` nach den Regeln aus Abschnitt 2 ueberarbeiten.
- **Interaktivitaet (minimale Astro-Islands / Vanilla-JS):** mobiles Menue, Monatskalender, Galerie-Filter + Lightbox, Gutschein-Betragswahl, Formular-Handling, Scroll-Reveals. Sonst Zero-JS.

## 7. Pflicht-Kriterien (nicht verhandelbar)

- **WCAG 2.1 AA** (BFSG): Kontrast Body ≥ 4.5:1 (ink auf bg ~11:1 AAA), grosse/UI-Elemente ≥ 3:1; sichtbarer `:focus-visible` 2px terra, offset 2-3px, nie `outline:none` ohne Ersatz.
- **Semantik:** genau eine H1 pro Seite, H2/H3 ohne Sprung, `<button>`/`<a>` statt div-onClick, Labels mit `for`/`id`, Skip-Link.
- **Tastatur:** vollstaendig bedienbar; Modale/Lightbox mit Focus-Trap und Escape; alle Bedien-Glyphen mit `aria-label` (z.B. Sterne `role="img"`).
- **`prefers-reduced-motion`** respektieren; kein Auto-Play-Video/-Audio.
- **Touch-Targets ≥ 44×44px**, Input `font-size ≥ 16px` (iOS-Zoom), kein horizontaler Scroll bei 375px.
- **Core Web Vitals mobil:** LCP < 2.0s (Ziel < 1.5s), INP < 200ms, CLS < 0.1, Lighthouse mobil ≥ 90.
- **Fonts selbst-gehostet** (woff2, swap, preload). **DSGVO:** Newsletter/Marketing-Opt-in nicht vorausgewaehlt, Cookie-Banner textlich angepasst und nicht ueber Hero/CTA, Datenschutz-Link aktiv, keine GA (falls Analytics: Plausible/Fathom self-hosted).
- **Ethik-Ampel gruen:** keine Fake-Knappheit, keine Countdown-Timer, keine versteckten Kosten, transparente Preise.
- **SEO:** unique Title (50 bis 60 Z.) + Meta-Description (120 bis 160 Z.) je Seite, sprechende URLs, LocalBusiness-Schema (Adresse/Geo/Oeffnungszeiten), NAP konsistent.
- **Bildidentitaet:** nur echte Atelier-Fotos im einheitlichen Warm-Grade, konkrete Alt-Texte.

## 8. Build-Reihenfolge (Phasen)

1. **Fundament:** Tokens, Fonts (Fraunces), global.css, Pinselstrich-Util, Button/Eyebrow, Foto-Pipeline (warm-grade + responsive Komponente).
2. **Globale Chrome:** MainLayout (Header/Nav/mobiles Menue/Footer/Skip-Link), optional WhatsApp-Float.
3. **Startseite:** alle Sektionen in der Reihenfolge aus 5.1.
4. **Unterseiten:** Galerie (Raster/Filter/Lightbox), Workshops (Karten + Buchung), Anlaesse (Karten + Formular), Gutscheine (Wahl + Vorschau + Stripe), FAQ, Rechtstexte, 404, gutschein-erfolg/einloesen.
5. **QA und Launch:** `/qa`-Audit (A11y/SEO/Security/DSGVO/Performance), Lighthouse/CWV, Cookie/DSGVO, SEO/Schema, Cross-Device ab 375px; dann `/deploy-check` und Deploy.

## 9. Ausserhalb des Scopes

Admin-/Brenn-Oberflaeche, jegliche Backend-/API-/Stripe-/DB-/Mail-Logik, neue Features, neue Fotoproduktion (es wird das vorhandene Shooting + die S3-Galerie genutzt).

## 10. Offene Punkte

- Schriftliche Foto-Einwilligungen fuer erkennbare Gaeste vor Live-Gang einsammeln.
- Fraunces-Subsetting/Schnitte final festlegen (OFL, kostenfrei).
- Genaue Irena-Fotos und finale Bildauswahl pro Sektion bestaetigen.
- Copy-Korrektorat (Regeln aus Abschnitt 2) durchziehen.
- Entscheidung WhatsApp-Float behalten oder entfernen.
- Sterne-Farbe: Terrakotta bestaetigt (Alternative Karamell verworfen).
