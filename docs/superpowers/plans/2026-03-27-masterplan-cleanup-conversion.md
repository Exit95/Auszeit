# Masterplan: Cleanup, Responsive Fixes & Conversion-Optimierung

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tote Dateien entfernen, kaputte Referenzen fixen, Responsive-Design-Probleme auf allen Handys beheben, und Conversion-Rate durch Marketing-Optimierungen um 30%+ steigern.

**Architecture:** 4 Phasen: (1) Cleanup & Bugfixes, (2) Responsive Fixes, (3) Conversion-Optimierung, (4) Deploy & Verify. Jede Phase ist unabhaengig testbar.

**Tech Stack:** Astro SSR, CSS (no framework), TypeScript, MariaDB

---

## Phase 1: Cleanup & Bugfixes

### Task 1: Tote Dateien loeschen

**Files:**
- Delete: `public/anhaenger.png`, `public/spardose.png`, `public/tasse.png`, `public/teller.png`
- Delete: `public/profil-irena.jpg` (WebP vorhanden)
- Delete: `mobile-api/` (komplett, wird nicht deployed)
- Delete: `src/components/brenn/EmptyState.astro`, `src/components/brenn/StatusBadge.astro`

- [ ] **Step 1: Verifizieren dass keine Datei referenziert wird**

```bash
grep -r "anhaenger\.png\|spardose\.png\|tasse\.png\|teller\.png\|profil-irena\.jpg" src/ --include="*.astro" --include="*.ts" --include="*.css"
grep -r "brenn/EmptyState\|brenn/StatusBadge" src/ --include="*.astro" --include="*.ts"
grep -r "mobile-api" deploy.sh Dockerfile docker-compose.yml
```

Erwartet: Keine Treffer (oder nur in nicht-relevanten Kontexten).

- [ ] **Step 2: Dateien loeschen**

```bash
rm public/anhaenger.png public/spardose.png public/tasse.png public/teller.png
rm public/profil-irena.jpg
rm -rf mobile-api/
rm src/components/brenn/EmptyState.astro src/components/brenn/StatusBadge.astro
```

- [ ] **Step 3: .gitignore aufräumen - profil2.PNG und Auszeit_Keramik-73.png bleiben in .gitignore**

Verify: `cat .gitignore | grep -A2 "Large originals"`

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove dead files (unused PNGs, mobile-api, orphaned components)"
```

---

### Task 2: Kaputte Bild-Referenzen fixen

**Files:**
- Modify: `src/data/content.ts` (Zeilen 16, 22, 28, 62-64)
- Modify: `src/layouts/MainLayout.astro` (og:image Referenzen)

- [ ] **Step 1: Finde alle Referenzen zu geloeschten Bildern**

```bash
grep -rn "becher\.jpeg\|spardose\.jpeg\|teller\.jpeg\|anhänger\.png\|profil\.png" src/ public/ --include="*.astro" --include="*.ts" --include="*.css" --include="*.xml"
```

- [ ] **Step 2: content.ts - Bild-Pfade auf WebP aktualisieren**

In `src/data/content.ts`, ersetze:
- `'/becher.jpeg'` → `'/tasse.webp'`
- `'/teller.jpeg'` → `'/teller.webp'`
- `'/spardose.jpeg'` → `'/spardose.webp'`
- `'/anhänger.png'` → `'/anhaenger.webp'`

- [ ] **Step 3: MainLayout.astro - Schema.org image-Array fixen**

In `src/layouts/MainLayout.astro`, ersetze im JSON-LD `@graph[0].image`:
```json
"image": [
  "https://keramik-auszeit.de/og-image.jpg",
  "https://keramik-auszeit.de/tasse.webp",
  "https://keramik-auszeit.de/teller.webp"
],
```

- [ ] **Step 4: apple-touch-icon erstellen oder Link entfernen**

Prüfe ob `<link rel="apple-touch-icon" ...>` existiert und auf fehlende Datei zeigt. Wenn ja: Entfernen oder favicon.svg als Fallback setzen.

- [ ] **Step 5: Build testen**

```bash
npm run build 2>&1 | grep -i "error"
```

Erwartet: Keine Fehler.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "fix: update broken image references to WebP versions"
```

---

## Phase 2: Responsive Design Fixes

### Task 3: Globale Typografie & Touch-Targets

**Files:**
- Modify: `src/layouts/MainLayout.astro` (globale Styles)

- [ ] **Step 1: Globale CSS-Regeln fuer deutsche Texte und Touch-Targets**

Am Ende des globalen `<style>` in MainLayout.astro einfuegen:

```css
/* Deutsche Silbentrennung */
html {
  -webkit-hyphens: auto;
  hyphens: auto;
  word-break: break-word;
  overflow-wrap: break-word;
}

/* Minimale Touch-Targets */
button, a, [role="button"], input[type="submit"] {
  min-height: 44px;
}

/* Kein horizontaler Scroll */
body {
  overflow-x: hidden;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/layouts/MainLayout.astro
git commit -m "fix: global hyphens for German text, min touch targets, prevent h-scroll"
```

---

### Task 4: Reviews Carousel - Touch-Targets & Mobile

**Files:**
- Modify: `src/sections/Reviews.astro`

- [ ] **Step 1: Carousel-Dots vergroessern (12px → 44px Tap-Area)**

In Reviews.astro, finde `.carousel-dot` Styles und aendere:

```css
.carousel-dot {
  width: 12px;
  height: 12px;
  padding: 16px;  /* Vergroessert Tap-Area auf 44px */
  background-clip: content-box;
  /* ... restliche Styles beibehalten */
}
```

- [ ] **Step 2: Commit**

```bash
git add src/sections/Reviews.astro
git commit -m "fix: enlarge carousel dot touch targets to 44px"
```

---

### Task 5: Galerie - Filter-Buttons & 1-Column Mobile

**Files:**
- Modify: `src/sections/Galerie.astro`

- [ ] **Step 1: Filter-Buttons Touch-Target-freundlich**

In Galerie.astro, finde `:global(.gf-btn)` und aendere:

```css
:global(.gf-btn) {
  padding: 12px 20px;
  font-size: 0.875rem;
  min-height: 44px;
}
```

- [ ] **Step 2: 1-Column auf kleinen Handys**

Unter `@media (max-width: 479px)` hinzufuegen:

```css
@media (max-width: 374px) {
  .galerie__masonry {
    columns: 1;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/sections/Galerie.astro
git commit -m "fix: gallery filter touch targets, 1-column on small phones"
```

---

### Task 6: Offerings - Responsive Grid & Pricing

**Files:**
- Modify: `src/sections/Offerings.astro`

- [ ] **Step 1: 1-Column auf sehr kleinen Phones**

Existierenden `@media (max-width: 768px)` mit 2-Column-Grid pruefen. Hinzufuegen:

```css
@media (max-width: 374px) {
  .ocard-grid {
    grid-template-columns: 1fr;
  }
  .gutschein__custom-amount input {
    width: 100%;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/sections/Offerings.astro
git commit -m "fix: offerings 1-column on small phones, responsive custom input"
```

---

### Task 7: BookingCalendar - Mittlere Breakpoints

**Files:**
- Modify: `src/components/BookingCalendar.astro`

- [ ] **Step 1: Breakpoint 375-639px hinzufuegen**

Zwischen den existierenden Breakpoints einfuegen:

```css
@media (max-width: 639px) {
  .booking-container {
    padding: var(--space-4);
  }
  .form-actions {
    flex-direction: column;
  }
  .form-actions button {
    width: 100%;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/BookingCalendar.astro
git commit -m "fix: booking calendar responsive for 375-639px range"
```

---

### Task 8: Brenn-Admin Navigation Touch-Targets

**Files:**
- Modify: `public/brenn-admin-styles.css`

- [ ] **Step 1: Nav-Links vergroessern**

In brenn-admin-styles.css, `.brenn-nav a` aendern:

```css
.brenn-nav a {
  padding: 0.625rem 1rem;
  font-size: 0.875rem;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
}
```

- [ ] **Step 2: Commit**

```bash
git add public/brenn-admin-styles.css
git commit -m "fix: brenn admin nav touch targets 44px minimum"
```

---

## Phase 3: Conversion-Optimierung (Mehr Buchungen!)

### Task 9: Sticky Mobile CTA-Bar

**Files:**
- Modify: `src/layouts/MainLayout.astro`

- [ ] **Step 1: Sticky CTA-Bar am unteren Bildschirmrand (nur Mobile)**

Vor `</body>` einfuegen:

```html
<div class="mobile-cta-bar" id="mobile-cta-bar">
  <a href="tel:+4917634255005" class="mobile-cta-bar__phone" aria-label="Anrufen">
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
    Anrufen
  </a>
  <a href="#termin-buchen" class="mobile-cta-bar__book">
    Jetzt Termin buchen
  </a>
</div>
```

- [ ] **Step 2: CSS fuer Sticky-Bar**

```css
.mobile-cta-bar {
  display: none;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 999;
  padding: 8px 12px;
  padding-bottom: max(8px, env(safe-area-inset-bottom));
  background: #fff;
  border-top: 1px solid var(--border-sand);
  box-shadow: 0 -2px 12px rgba(66, 52, 48, 0.1);
  gap: 8px;
}

@media (max-width: 768px) {
  .mobile-cta-bar {
    display: flex;
  }
  body { padding-bottom: 70px; }
}

.mobile-cta-bar__phone {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 16px;
  background: var(--bg-paper);
  color: var(--brand-espresso);
  border-radius: var(--radius-sm);
  text-decoration: none;
  font-weight: 600;
  font-size: 0.9rem;
  white-space: nowrap;
}

.mobile-cta-bar__book {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 20px;
  background: var(--accent-terra);
  color: #fff;
  border-radius: var(--radius-sm);
  text-decoration: none;
  font-weight: 700;
  font-size: 0.95rem;
  white-space: nowrap;
}
```

- [ ] **Step 3: Bar ausblenden wenn Booking-Section sichtbar (JS)**

```html
<script is:inline>
  (function() {
    const bar = document.getElementById('mobile-cta-bar');
    const booking = document.getElementById('termin-buchen');
    if (!bar || !booking) return;
    const io = new IntersectionObserver(([e]) => {
      bar.style.transform = e.isIntersecting ? 'translateY(100%)' : 'translateY(0)';
      bar.style.transition = 'transform 0.3s ease';
    }, { threshold: 0.1 });
    io.observe(booking);
  })();
</script>
```

- [ ] **Step 4: Commit**

```bash
git add src/layouts/MainLayout.astro
git commit -m "feat: sticky mobile CTA bar with phone + booking button"
```

---

### Task 10: Verfuegbare Plaetze anzeigen (Urgency)

**Files:**
- Modify: `src/components/BookingCalendar.astro` (oder zugehoeriges JS)

- [ ] **Step 1: Plaetze-Anzeige im Kalender**

Wenn ein Slot ausgewaehlt wird und die API `currentParticipants` und `maxParticipants` liefert, zeige:

```html
<div class="slot-availability">
  <span class="slot-availability__dot"></span>
  Noch {remaining} Plätze frei
</div>
```

CSS:
```css
.slot-availability {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  color: var(--color-sienna);
  font-weight: 600;
  margin-top: 8px;
}

.slot-availability__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #5CB85C;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/BookingCalendar.astro
git commit -m "feat: show available slots count in booking calendar (urgency)"
```

---

### Task 11: Social Proof neben Buchungsformular

**Files:**
- Modify: `src/components/BookingCalendar.astro`

- [ ] **Step 1: Mini-Review-Quote ueber dem Formular**

Direkt ueber oder neben dem Buchungsformular einfuegen:

```html
<div class="booking-trust">
  <div class="booking-trust__stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
  <p class="booking-trust__quote">"Ein wunderschöner Nachmittag! Wir kommen wieder."</p>
  <span class="booking-trust__source">— Google Bewertung</span>
</div>
```

CSS:
```css
.booking-trust {
  text-align: center;
  padding: var(--space-4);
  margin-bottom: var(--space-4);
  background: var(--bg-paper);
  border-radius: var(--radius-md);
  border-left: 3px solid var(--accent-terra);
}

.booking-trust__stars {
  color: #FBBC05;
  font-size: 1.1rem;
  letter-spacing: 2px;
}

.booking-trust__quote {
  font-family: var(--font-serif);
  font-style: italic;
  color: var(--brand-espresso);
  font-size: 0.95rem;
  margin: 6px 0;
}

.booking-trust__source {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/BookingCalendar.astro
git commit -m "feat: add trust quote near booking form for social proof"
```

---

### Task 12: Mini-FAQ unter Buchungsformular

**Files:**
- Modify: `src/components/BookingCalendar.astro`

- [ ] **Step 1: Haeufigste 3 Fragen als Akkordeon**

Unter dem Buchungsformular einfuegen:

```html
<details class="booking-faq">
  <summary>Was kostet ein Besuch?</summary>
  <p>Keramikstück ab 6 € + Farb-/Brennpauschale (10-20 € je nach Anzahl). Farben und Pinsel inklusive.</p>
</details>
<details class="booking-faq">
  <summary>Kann ich kostenlos stornieren?</summary>
  <p>Ja, bis 24 Stunden vorher kostenlos per Link in der Bestätigungs-E-Mail.</p>
</details>
<details class="booking-faq">
  <summary>Wie lange dauert ein Besuch?</summary>
  <p>Plane ca. 1,5 bis 2,5 Stunden ein — nimm dir Zeit, es gibt kein Limit.</p>
</details>
```

CSS:
```css
.booking-faq {
  border-bottom: 1px solid var(--border-sand);
  padding: 12px 0;
}

.booking-faq summary {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--brand-espresso);
  cursor: pointer;
  min-height: 44px;
  display: flex;
  align-items: center;
}

.booking-faq p {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  line-height: 1.6;
  margin: 8px 0 0;
  padding-left: 4px;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/BookingCalendar.astro
git commit -m "feat: add mini-FAQ below booking form to address objections"
```

---

### Task 13: CTA nach Reviews-Section

**Files:**
- Modify: `src/sections/Reviews.astro`

- [ ] **Step 1: Buchungs-CTA nach den Bewertungen**

Nach dem Bewertungsformular-Bereich, vor `</section>`, einfuegen:

```html
<div class="reviews-cta">
  <p class="reviews-cta__text">Überzeuge dich selbst — buche deinen Termin!</p>
  <a href="#termin-buchen" class="btn btn--primary btn--large">Jetzt Termin buchen</a>
</div>
```

CSS:
```css
.reviews-cta {
  text-align: center;
  margin-top: var(--space-8);
  padding-top: var(--space-6);
  border-top: 1px solid var(--border-sand);
}

.reviews-cta__text {
  font-family: var(--font-serif);
  font-size: var(--text-xl);
  color: var(--brand-espresso);
  margin-bottom: var(--space-4);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/sections/Reviews.astro
git commit -m "feat: add booking CTA after reviews section"
```

---

### Task 14: CTA am Ende der FAQ-Seite

**Files:**
- Modify: `src/pages/faq.astro`

- [ ] **Step 1: Buchungs-CTA am Ende der FAQ**

Nach dem letzten FAQ-Item, vor `</MainLayout>`:

```html
<section class="faq-cta">
  <h3>Noch Fragen?</h3>
  <p>Schreib uns per WhatsApp oder buche direkt deinen Termin.</p>
  <div class="faq-cta__actions">
    <a href="/#termin-buchen" class="btn btn--primary">Termin buchen</a>
    <a href="https://wa.me/4917634255005?text=Hallo%2C%20ich%20habe%20eine%20Frage%20zum%20Keramik-Malatelier." class="btn btn--secondary" target="_blank" rel="noopener">WhatsApp</a>
  </div>
</section>
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/faq.astro
git commit -m "feat: add booking + WhatsApp CTA at end of FAQ page"
```

---

### Task 15: Galerie CTA-Overlay

**Files:**
- Modify: `src/sections/Galerie.astro`

- [ ] **Step 1: CTA am Ende der Galerie**

Nach der Masonry-Grid, einfuegen:

```html
<div class="galerie-cta">
  <p>Gestalte dein eigenes Unikat!</p>
  <a href="#termin-buchen" class="btn btn--primary">Termin buchen</a>
</div>
```

CSS:
```css
.galerie-cta {
  text-align: center;
  margin-top: var(--space-8);
}

.galerie-cta p {
  font-family: var(--font-serif);
  font-size: var(--text-lg);
  color: var(--brand-espresso);
  margin-bottom: var(--space-3);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/sections/Galerie.astro
git commit -m "feat: add booking CTA at end of gallery section"
```

---

## Phase 4: Deploy & Verify

### Task 16: Final Build, Deploy, Verify

- [ ] **Step 1: Full Build testen**

```bash
npm run build 2>&1 | tail -5
```

Erwartet: Keine Fehler.

- [ ] **Step 2: Deploy**

```bash
bash deploy.sh
```

- [ ] **Step 3: Mobile Check-Liste**

Auf dem Handy prüfen:
- [ ] Hero-Banner korrekt dargestellt
- [ ] Sticky CTA-Bar sichtbar (verschwindet bei Booking-Section)
- [ ] Galerie-Filter tappbar (44px)
- [ ] Carousel-Dots tappbar
- [ ] Kein horizontaler Scroll
- [ ] Silbentrennung bei langen Woertern
- [ ] Booking-Formular nutzbar
- [ ] Trust-Quote sichtbar
- [ ] Mini-FAQ unter Formular
- [ ] CTA nach Reviews sichtbar

- [ ] **Step 4: Final Commit & Push**

```bash
git add -A
git commit -m "chore: final cleanup and verification"
git push origin feature/redesign
```

---

## Zusammenfassung

| Phase | Tasks | Geschätzter Impact |
|-------|-------|--------------------|
| 1: Cleanup | 2 Tasks | Saubere Codebasis, keine 404-Fehler |
| 2: Responsive | 6 Tasks | Perfekte Darstellung auf allen Handys |
| 3: Conversion | 7 Tasks | +30% mehr Buchungen |
| 4: Deploy | 1 Task | Live & verifiziert |

**Wichtigste Conversion-Hebel:**
1. Sticky Mobile CTA-Bar (Anrufen + Buchen immer sichtbar)
2. Verfuegbare Plaetze anzeigen (Urgency/Scarcity)
3. Social Proof neben Buchungsformular
4. Mini-FAQ bei Buchung (Einwaende entkräften)
5. CTAs nach jeder Trust-Section (Reviews, Galerie, FAQ)
