# Keramik Auszeit — Vollständiges Redesign

## 1. Projektziel

Keramik Auszeit (keramik-auszeit.de) wird von Grund auf redesigned. Das Ziel ist eine Website, die gleichwertig stark in Markenaufbau und Conversion funktioniert. Die Website soll sich anfühlen wie ein Besuch in der Werkstatt — warm, handgemacht, haptisch.

**Primäre Conversion-Ziele:**
1. Termin buchen (Keramik bemalen)
2. Workshop buchen
3. Anfrage für besondere Anlässe (JGA, Kindergeburtstag, Firmen-Event)
4. Gutschein kaufen

**Sekundäre Ziele:**
- Vertrauen aufbauen
- Galerie als Inspiration
- Bewertungen sammeln

## 2. Zielgruppen

Alle drei Zielgruppen gleichwertig bedient, mit klarer Führung je nach Bedürfnis:

1. **Familien mit Kindern** — Kindergeburtstage, Familienausflüge, kreative Nachmittage
2. **Erwachsene (Paare, Freundinnen, Solo)** — Auszeit vom Alltag, kreatives Erlebnis, Entschleunigung
3. **Gruppen & Events** — JGA, Firmen-Events, Stammtische, besondere Anlässe

## 3. Markenstimme

- Persönlich & herzlich — wie Irena selbst spricht
- Du-Ansprache
- Nahbar, einladend
- Lokal verwurzelt (Gronau, Münsterland)
- Keine Werbefloskeln, keine Buzzwords

## 4. Design Direction: "Atelier & Natur"

### Leitidee
Werkstatt-Wärme trifft Klarheit. Emotionale Tiefe durch Material-Anmutung (Leinen, Ton), visuelle Klarheit durch strukturiertes Layout. Die neuen Fotos werden zum Star.

### Farbpalette: Sienna + Leinen

Bestehende warme Palette vertiefen, Sienna als dunklerer Terrakotta-Partner, Leinen-Textur für Hintergrundakzente.

| Token | Farbe | Hex | Rolle |
|-------|-------|-----|-------|
| `--brand-espresso` | Deep Espresso | `#423430` | Primärfarbe, Headlines, Nav |
| `--color-sienna` | Sienna | `#A0522D` | Sekundär-Akzent, Subheadlines, Links |
| `--accent-terra` | Terrakotta | `#D96C4A` | Primär-CTA, Hover, Fokus |
| `--accent-caramel` | Caramel | `#CFA874` | Sekundär-Akzent, Badges, Tags |
| `--bg-linen` | Leinen | `#EDE4DA` | Sektions-Hintergrund (alternierend) |
| `--bg-cream` | Creme | `#F2EBE5` | Basis-Hintergrund |
| `--bg-paper` | Paper White | `#FAF7F2` | Karten, Modals, helle Flächen |
| `--color-clay-brown` | Clay Brown | `#5D4E43` | Body-Text sekundär |
| `--color-charcoal` | Charcoal | `#2D2D2D` | Body-Text primär |

Funktionsfarben bleiben: Success `#4A7C59`, Warning `#D9A05B`, Error `#B94A48`, Info `#6B7C93`.

### Typografie: Lora + Source Sans 3

| Rolle | Font | Gewichte | Verwendung |
|-------|------|----------|------------|
| Headlines | Lora | 600, 700 | h1–h3, Sektions-Titel |
| Subheadlines | Lora Italic | 400 | Untertitel, Zitate |
| Body | Source Sans 3 | 300, 400, 500, 600 | Fließtext, UI, Formulare, Buttons |
| Signatur | Dancing Script | 500 | Nur "Irena" — persönliche Note |

- Cinzel wird entfernt (war überflüssig, zu formal)
- Inter wird durch Source Sans 3 ersetzt (wärmer, humanistischer)
- Dancing Script nur noch als Signatur-Element, nie als Headline

### Typografie-Scale

```
--text-xs: 0.75rem (12px)
--text-sm: 0.875rem (14px)
--text-base: 1rem (16px)
--text-lg: 1.125rem (18px)
--text-xl: 1.25rem (20px)
--text-2xl: 1.5rem (24px)
--text-3xl: clamp(1.75rem, 2vw + 1rem, 2.25rem)
--text-4xl: clamp(2rem, 3vw + 1rem, 3rem)
--text-hero: clamp(2.5rem, 4vw + 1rem, 4rem)
```

### Layout-Prinzipien

- Klar strukturiert, aber mit bewussten Asymmetrien
- Bilder dürfen größer sein als Text
- Sektionen haben unterschiedliche Rhythmen — mal eng, mal weit
- Leinen-Textur nur an strategischen Stellen (Hero-Übergang, Sektions-Wechsel)
- Kein Textur-Overkill — maximal 2-3 Stellen pro Seite
- Max-Width: 1200px (statt 1080px — mehr Raum für Bilder)
- 8px Spacing-Grid bleibt

### Motion-Prinzipien

- Fade-in + subtle translateY beim Scrollen (wie bisher, verfeinert)
- Sanfte Hover-Transitions (200ms ease)
- Galerie: smooth Vollbild-Übergang
- Respects `prefers-reduced-motion`
- Keine überladenen Animationen — Bewegung unterstützt, dominiert nie

## 5. Seitenstruktur

### Navigation (sticky, alle Seiten)

```
[Logo]  Keramik bemalen  Workshops  Besondere Anlässe  Galerie  Gutscheine  [Termin buchen (CTA)]
```

Mobile: Hamburger-Menü mit Overlay. WhatsApp-Floating-Button auf allen Seiten.

### Startseite `/` — 8 Sektionen

**Sektionen die von der Startseite auf eigene Unterseiten wandern:**
- `Galerie.astro` → `/galerie` (eigene Seite)
- `Workshops.astro` → `/workshops` (eigene Seite)
- `Gutschein.astro` → `/gutscheine` (eigene Seite)
- `AnlassAnfragen.astro` → `/events` (eigene Seite)
- `FAQ.astro` → `/faq` (eigene Seite)

**Sektionen die entfernt/zusammengeführt werden:**
- `Intro.astro` → wird Teil von Sektion 2 "Was dich erwartet"
- `TrustQuotes.astro` → wird Teil von Sektion 6 "Stimmen unserer Gäste" (zusammen mit Reviews)

**Bestehende Anker-Links (`#gutschein-section`, `#calendar-section` etc.) werden durch Seiten-URLs ersetzt. Die Navigation verlinkt auf Unterseiten statt auf Anker.**

#### 1. Hero
- Großes Werkstatt-Foto (Vollbreite, 70-80vh)
- Headline: "Deine kreative Auszeit in Gronau"
- Subline: "Keramik bemalen, abschalten, Freude mitnehmen"
- Primär-CTA: "Termin buchen" → scrollt zu Kalender
- Sekundär-CTA: "Entdecke unsere Keramik" → scrollt zu Angebote
- Dezente Leinen-Textur am unteren Übergang

#### 2. Was dich erwartet
- 4 Karten in 2x2 Grid (mobile: 1 Spalte):
  - Keramik bemalen → scrollt zu Preise/Buchung
  - Workshops → /workshops
  - Besondere Anlässe → /events
  - Gutscheine → /gutscheine
- Jede Karte: Bild + kurzer Text + CTA-Link
- Ziel: Orientierung für alle Zielgruppen in 5 Sekunden

#### 3. Keramik-Auswahl & Preise
- Produktkarten: Tassen (ab 14,50€), Teller (ab 12,50€), Spardosen & Krüge (ab 8,00€), Anhänger (ab 6,00€)
- Klickbar für Details (Modal oder Expand)
- Farb- & Brennpauschale klar kommuniziert (10€/15€/20€ je nach Menge)
- Abholzeit: 10-14 Tage
- Hintergrund: Leinen-Textur (wechsel vom Creme)

#### 4. So funktioniert's
- 3 Schritte: Termin wählen → Keramik bemalen → Abholen
- Icons/Illustrationen, kurzer Text pro Schritt
- Vertrauensbildend, reduziert Hemmschwelle

#### 5. Termin buchen
- Buchungskalender (bestehende Funktionalität)
- Prominenteste Sektion nach dem Hero
- Klare Überschrift: "Wähle deinen Wunschtermin"

#### 6. Stimmen unserer Gäste
- 2-3 Testimonials als Karten (Karussell oder statisch)
- Sterne-Rating
- CTA: "Bewertung schreiben" → öffnet Formular (aufklappbar/Modal)
- Bewertungs-Formular: Name, Sterne (1-5), Text (max 400 Zeichen)

#### 7. Über Irena
- Foto von Irena (neues Foto geplant)
- Kurzer, persönlicher Text
- Signatur "Irena" in Dancing Script
- "Ich freue mich auf dich" — persönliche Note

#### 8. Kontakt & Anfahrt
- Adresse: Feldstiege 6a, 48599 Gronau (Westfalen)
- Telefon: +49 176 34255005
- E-Mail: keramik-auszeit@web.de
- WhatsApp-Link
- Öffnungszeiten (Mo-Fr 10-18, Sa 10-16)
- Google Maps Embed
- Instagram-Link

### Unterseite `/galerie` — Story-Galerie

**Konzept:** Nicht nur ein Bildergrid, sondern eine kuratierte Erfahrung.

- **Story-Modus:** Bilder gruppiert nach Erlebnis (Kindergeburtstag, Töpferkurs, Einzelstücke, Werkstatt-Atmosphäre)
- **Filter:** Kategorie-Tabs oben (Alle, Tassen, Teller, Spardosen, Anhänger, Atmosphäre)
- **Masonry-Layout:** responsiv, 3 Spalten Desktop, 2 Tablet, 1 Mobile
- **Lightbox:** Vollbild mit Wisch-Gesten (Touch), Prev/Next, Bild-Counter
- **Lazy Loading:** Elegant mit Fade-In (nicht abrupter Pop-in)
- **"Mehr laden" Button:** Pagination statt endlosem Scroll
- **SEO:** Eigene URL, alt-Texte, Bild-Sitemap
- **Instagram-CTA:** "Mehr auf Instagram" am Ende

**Technisch:**
- WebP/AVIF mit JPEG-Fallback
- Responsive srcset für verschiedene Bildgrößen
- Blur-Placeholder während Laden (LQIP)
- Prefetch nächstes Bild in Lightbox

### Unterseite `/workshops`

- Workshop-Karten mit: Bild, Titel, Datum, Uhrzeit, Preis, verfügbare Plätze
- Klick → Detail-Ansicht mit Beschreibung + Buchungsformular
- Leerer Zustand: "Aktuell keine Workshops geplant — schau bald wieder vorbei!"
- SEO: "Töpferkurs Gronau", "Keramik Workshop Münsterland"

### Unterseite `/gutscheine`

- 3 Gutschein-Optionen: 25€, 50€, Wunschbetrag (5-500€)
- Schöne Darstellung mit Vorschau des Gutschein-Designs
- Stripe-Checkout-Integration (bestehend)
- Erklärung: Wie funktioniert der Gutschein, wie lange gültig
- Geschenk-Framing: "Das perfekte Geschenk für kreative Köpfe"

### Unterseite `/events` — Besondere Anlässe

- Eigene Sektion pro Anlasstyp:
  - **Kindergeburtstag** — Foto, was enthalten ist, Altersempfehlung, Dauer, Preis
  - **JGA** — Foto, Beschreibung, was möglich ist
  - **Firmen-Event** — Foto, Teambuilding-Framing
  - **Stammtisch / Privater Anlass** — Foto, flexible Optionen
- Jede Sektion mit eigenem "Jetzt anfragen"-CTA
- Anfrage-Formular am Ende (oder in Modal):
  - Name, E-Mail, Telefon (Pflicht)
  - Anlasstyp (Buttons): kindergeburtstag, jga, stammtisch, firmen_event, privater_anlass, sonstiges
  - Wunschdatum (optional)
  - Teilnehmeranzahl (1-50)
  - Nachricht (optional)
- **API-Kompatibilität:** Formular nutzt bestehende `/api/inquiries` POST-Route. Felder sind 1:1 kompatibel (verifiziert: name, email, phone, eventType, preferredDate, participants, message). Kein Backend-Umbau nötig.

### Unterseite `/faq`

- Accordion-Stil (bestehend, verbessert)
- 9 bestehende Fragen übernehmen
- Gruppiert: Allgemein, Preise, Buchung, Stornierung, Mitbringen
- SEO-optimiert für Long-Tail-Suchen
- CTA am Ende: "Noch Fragen? Schreib uns!" → WhatsApp/E-Mail

### Sonstige Seiten

- `/gutschein-erfolg` — Erfolgsseite nach Gutscheinkauf (bestehend, visuell aufwerten)
- `/gutschein/einloesen/[code]` — Gutschein einlösen (bestehend, visuell aufwerten)
- `/stornierung` — Stornierungsbestätigung (bestehend, visuell aufwerten)
- `/admin` — Admin-Panel (keine visuellen Änderungen, funktioniert)
- `/404` — NEU: Custom 404-Seite
  - Headline: "Diese Seite haben wir leider nicht gefunden"
  - Subline: "Vielleicht findest du hier, was du suchst:"
  - Links: Startseite, Galerie, Termin buchen, Kontakt
  - Visuell: Markenkonform, Leinen-Hintergrund, zentriert, Lora-Headline

### Footer (alle Seiten)

```
[Logo]
Keramik Auszeit — Dein Malatelier in Gronau

[Kontakt]                [Navigation]           [Rechtliches]
Feldstiege 6a            Keramik bemalen        Impressum
48599 Gronau             Workshops              Datenschutz
+49 176 34255005         Besondere Anlässe
keramik-auszeit@web.de   Galerie
                         Gutscheine
[Social]                 FAQ
Instagram  WhatsApp

© 2026 Keramik Auszeit — Irena Woschkowiak
```

Impressum und Datenschutz bleiben als Modals (bestehende Logik funktioniert, juristisch ausreichend).

## 6. Tech-Stack-Entscheidung

### Empfehlung: Astro bleibt — mit gezielten Verbesserungen

**Begründung gegen einen Stack-Wechsel:**
- Astro SSR ist ideal für diese Art Website (content-heavy, wenig Client-Interaktivität)
- 25 API-Endpunkte, Stripe-Integration, S3, MariaDB — alles funktioniert stabil
- Kein Framework liefert hier objektiv bessere Ergebnisse
- Migration wäre Risiko ohne Mehrwert
- Deployment-Pipeline funktioniert (Docker, K8s)

**Gezielte Verbesserungen am Stack:**

| Änderung | Begründung |
|----------|-----------|
| Google Fonts → Self-hosted Fonts | Performance: eliminiert Render-Blocking, spart DNS-Lookup |
| Vanilla CSS → CSS mit verbesserter Token-Architektur | Bestehende Tokens sind gut, brauchen nur Erweiterung (Sienna, Leinen, neue Typo-Scale) |
| Bilder: JPEG → WebP/AVIF mit Fallback | Performance: 30-50% kleinere Dateien |
| Profilbild 524KB → optimiert <100KB | Performance: aktuell größter Single-Asset-Bottleneck |
| Sitemap erweitern | SEO: neue Unterseiten indexierbar |
| Astro `<Image>` Komponente nutzen | Performance: automatische Optimierung, responsive srcset |
| robots.txt aktualisieren | SEO: neue Routen aufnehmen |

**Kein Tailwind, kein SCSS:**
- Das bestehende CSS-Token-System ist sauber und ausreichend
- Tailwind würde die Lesbarkeit der Astro-Komponenten verschlechtern
- SCSS bringt bei diesem Projektumfang keinen Mehrwert

### Font Self-Hosting — Details

**Dateien:** `public/fonts/` mit woff2-Format (reicht für alle modernen Browser)
**Fonts zum Herunterladen + Subsetten:**
- Lora-SemiBold.woff2 (600)
- Lora-Bold.woff2 (700)
- Lora-Italic.woff2 (400 italic)
- SourceSans3-Light.woff2 (300)
- SourceSans3-Regular.woff2 (400)
- SourceSans3-Medium.woff2 (500)
- SourceSans3-SemiBold.woff2 (600)
- DancingScript-Medium.woff2 (500)

**@font-face Deklarationen:** In `src/styles/fonts.css`, importiert in `global.css`
**CSP-Update:** `middleware.ts` — `fonts.googleapis.com` und `fonts.gstatic.com` aus `style-src` und `font-src` entfernen, da nicht mehr benötigt.
**Google Fonts Import entfernen:** Aus `global.css` (aktuell Zeile 3) und `MainLayout.astro` (preconnect links).

### Token-Migration — Mapping

**Neue Tokens hinzufügen:**
| Token | Wert | Zweck |
|-------|------|-------|
| `--color-sienna` | `#A0522D` | Neuer Sekundär-Akzent |
| `--bg-linen` | `#EDE4DA` | Alternierender Sektions-Hintergrund |
| `--bg-paper` | `#FAF7F2` | Karten, Modals (ersetzt `--color-soft-cream`) |

**Font-Tokens aktualisieren:**
| Alt | Neu |
|-----|-----|
| `--font-serif: 'Cinzel'` | `--font-serif: 'Lora'` |
| `--font-sans: 'Inter'` | `--font-sans: 'Source Sans 3'` |
| `--font-script: 'Dancing Script'` | Bleibt, Gewicht von 700 auf 500 |

**Legacy-Tokens beibehalten als Aliase** (für Übergangszeit, werden bei Migration jeder Komponente entfernt):
- `--color-warm-beige` → alias für `--bg-sand`
- `--color-off-white` → alias für `--bg-cream`
- `--color-soft-cream` → alias für `--bg-paper`
- `--color-terracotta` → alias für `--accent-terra`

**`--max-width` bleibt global bei 1080px.** Nur die Galerie-Seite und der Hero nutzen `max-width: 1200px` per Override. Das vermeidet einen kaskadenweiten Layoutbruch.

### Responsive Breakpoints — Migration

Bestehende Breakpoints (480px, 768px, 1024px) werden beibehalten. Der Spec-Wert 640px war ein Fehler. Korrektur:

```
Mobile:     < 480px   (1 Spalte, kompakte Navigation)
Tablet:     480-1024px (2 Spalten, angepasstes Grid)
Desktop:    > 1024px   (volle Breite, alle Features)
```

Bestehende Gutter-Anpassungen in tokens.css (480px, 768px, 1024px) bleiben unverändert.

### WhatsApp-Floating-Button — Details

- Position: `fixed`, `bottom: 24px`, `right: 24px`
- Z-Index: 900 (unter Modals/Lightbox die bei 1000+ liegen)
- Größe: 56px rund, Terrakotta-Hintergrund, weißes WhatsApp-Icon
- Versteckt sich, wenn Footer-Kontakt-Sektion im Viewport ist (IntersectionObserver)
- Auf Mobile: `bottom: 16px`, `right: 16px`
- Link: `https://wa.me/4917634255005?text=...` (bestehende Logik)

## 7. Galerie — Technisches Konzept

Die Galerie ist der größte Einzelumbau. Neues Konzept:

### Architektur
- Eigene Astro-Seite `/galerie`
- Client-seitiges JS für Filter, Lightbox, Lazy Loading (wie bisher, aber sauberer)
- API bleibt: `/api/gallery`, `/api/gallery-metadata`

### Features
1. **Kategorie-Filter** — Tabs: Alle | Tassen | Teller | Spardosen | Anhänger | Atmosphäre
2. **Masonry-Layout** — CSS `columns` Property (bewährter Ansatz aus bestehendem Code, einfacher als CSS Grid + JS row-span)
3. **LQIP (Low Quality Image Placeholders)** — Blur-up Effekt beim Laden
4. **Lightbox** — Vollbild, Swipe auf Mobile, Keyboard-Navigation, Preload nächstes Bild
5. **Pagination** — "Mehr anzeigen" Button, 12 Bilder initial, +12 pro Klick
6. **Responsive Images** — srcset mit 400w, 800w, 1200w Varianten

### Bildoptimierung
- Astro `<Image>` / `<Picture>` Komponente für statische Bilder (nutzt sharp intern, bereits als Astro-Dependency vorhanden)
- S3-Bilder: Werden via bestehender Proxy-Routes (`/uploads/`, `/products/`) ausgeliefert — keine zusätzliche sharp-Dependency nötig. Optimierung der S3-Bilder passiert beim Upload (Admin-Panel) oder manuell vor dem Hochladen.
- Statische Bilder (Hero, Profil, Produkte): Manuell als WebP konvertieren und in `public/` ablegen
- Max Lightbox-Auflösung: 1920px Breite

## 8. Foto-Briefing für neue Bilder

Da neue Fotos geplant sind, hier die Richtung die das Redesign braucht:

### Must-Have Motive
1. **Werkstatt-Übersicht** — warmes Licht, Regale mit Keramik, Arbeitstische (Hero-Bild)
2. **Hände bei der Arbeit** — Nahaufnahme beim Bemalen, Farbe auf Pinsel, Konzentration
3. **Irena-Portrait** — in der Werkstatt, authentisch, lächelnd, bei der Arbeit
4. **Fertige Stücke** — professionell ausgeleuchtet, einzeln und als Gruppe
5. **Kindergeburtstag** — Kinder beim Bemalen, Freude, bunte Ergebnisse
6. **Erwachsene/Freundinnen** — entspannte Atmosphäre, Wein+Keramik, Lachen
7. **Gruppenanlass** — JGA oder Firmen-Event, gemeinsames Erlebnis
8. **Detail-Shots** — Glasuren, Pinsel, Farbpalette, Rohlinge, Ofen

### Bildstil
- Warmes, natürliches Licht (kein Blitz)
- Geringe Tiefenschärfe für Detailaufnahmen
- Querformat für Hero und Sektions-Bilder, Hochformat für Galerie-Mix
- Authentisch, nicht gestellt — echte Momente

## 9. Responsive Breakpoints

```
Mobile:     < 480px   (1 Spalte, kompakte Navigation)
Tablet:     480-1024px (2 Spalten, angepasstes Grid)
Desktop:    > 1024px   (volle Breite, alle Features)
```

Bestehende Breakpoints aus tokens.css (480px, 768px, 1024px) werden beibehalten.
Mobile-First-Ansatz: CSS beginnt mit Mobile, erweitert via `min-width` Media Queries.

## 10. SEO-Verbesserungen

- Eigene URLs für /galerie, /workshops, /gutscheine, /events, /faq → mehr indexierbare Seiten
- Sitemap.xml erweitern mit allen neuen Routen
- Jede Seite: eigener Title, Description, OG-Tags
- Structured Data erweitern: FAQ-Schema auf /faq, Event-Schema auf /workshops
- Bild-Alt-Texte auf allen Galeriebildern
- Interne Verlinkung zwischen Seiten stärken
- Self-hosted Fonts → bessere Core Web Vitals (kein Render-Blocking)

## 11. Accessibility

- Semantische HTML-Struktur beibehalten und verbessern
- Alle interaktiven Elemente keyboard-navigierbar
- Fokus-Styles deutlich sichtbar (bestehend, beibehalten)
- ARIA-Labels für Lightbox, Modals, Formulare
- Alt-Texte auf allen Bildern
- Farbkontraste WCAG AA mindestens
- Skip-to-content Link (neu)
- `prefers-reduced-motion` respektieren (bestehend)

## 12. Performance-Ziele

| Metrik | Ziel |
|--------|------|
| LCP | < 2.5s |
| CLS | < 0.1 |
| INP | < 200ms |
| Lighthouse Performance | > 90 |
| Lighthouse Accessibility | > 95 |
| Bildformat | WebP/AVIF |
| Fonts | Self-hosted, font-display: swap |

## 13. Content-Migration (content.ts)

Die bestehende `src/data/content.ts` wird überarbeitet, nicht ersetzt. Datenstruktur bleibt, Werte werden aktualisiert:

**Zu ändernde Inhalte:**
- Hero-Headline: "Atelier Auszeit" → "Deine kreative Auszeit in Gronau"
- Hero-Subline: aktualisieren
- Neuer Abschnitt: `wasErwartet` (4 Teaser-Karten)
- Footer-Copyright: "© 2025 Atelier Auszeit" → "© 2026 Keramik Auszeit — Irena Woschkowiak"
- Produktname: "Weihnachtsanhänger" → "Anhänger" (generisch, nicht saisonal)
- Bestehende FAQ-Texte, Preise, Kontaktdaten: übernehmen, ggf. auffrischen

**Neue Keys hinzufügen:**
- `wasErwartet`: Array mit 4 Teaser-Objekten (title, text, image, link)
- `events`: Texte für /events-Seite (pro Anlasstyp: title, description, features)
- Meta-Daten pro Unterseite (title, description für SEO)

**Bestehende Keys beibehalten:**
- `hero`, `process`, `offerings`, `faq`, `contact`, `footer` — Struktur bleibt, Werte aktualisieren

## 14. Migration & Sicherheit

### Was NICHT brechen darf:
- Alle 25 API-Endpunkte funktionieren identisch
- Stripe-Integration (Gutschein-Kauf + Webhook)
- Buchungskalender-Logik
- Admin-Panel komplett
- E-Mail-Versand (Bestätigungen, Stornierungen)
- S3-Bildproxy (/uploads/, /products/)
- Gutschein-Einlösung
- Stornierung per Token-Link
- Datenschutz/Impressum-Modals
- Structured Data / SEO-Grundlagen

### Git-Workflow:
- Eigener Branch: `feature/redesign`
- Backup-Tag vor Start: `backup/pre-redesign`
- Logische Commits pro Teilschritt
- Kein force-push auf main

## 15. Entscheidungen

| Entscheidung | Gewählt | Begründung |
|-------------|---------|------------|
| Design Direction | Atelier & Natur (C) | Emotional + klar, kein Kompromiss |
| Farbpalette | Sienna + Leinen | Passt zum Logo, verstärkt Handgemachtes |
| Typografie | Lora + Source Sans 3 | Warm, weiche Kurven, werkstatt-nah |
| Seitenstruktur | Hybrid (8 Sektionen Start + 5 Unterseiten) | Weniger kognitive Last, bessere SEO |
| Tech-Stack | Astro bleibt | Funktioniert, kein Grund für Migration |
| Galerie | Story-Galerie mit Lightbox | Visuell + technisch komplett neu |
| Bewertungen | Aufklappbares Formular auf Startseite | Niedrige Hemmschwelle, keine extra Navigation |
| Grün-Akzent | Verworfen | Passt nicht zum Logo/Farbfamilie |
