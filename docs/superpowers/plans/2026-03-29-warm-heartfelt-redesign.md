# Warmes, Herzliches Website-Redesign — keramik-auszeit.de

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die gesamte Website soll sich gemütlich, herzhaft und wohltuend anfühlen — Besucher sollen beim Scrollen ein Gefühl von Geborgenheit und Wärme empfinden.

**Architecture:** Reine Content- und Design-Überarbeitung. Texte werden emotional wärmer umgeschrieben (Oxytocin-Trigger, empathische Hooks, weiche Sprache). CSS bekommt weichere Formen, wärmere Übergänge und großzügigeren Weißraum. Keine strukturellen Änderungen an der Architektur.

**Psychologie-Basis (Danapfel Vault):**
- Oxytocin-Trigger: empathische Hooks, warme Farben, weiche Formen, persönliche Geschichten
- Processing Fluency: Symmetrie, warme Farben, vertraute Layouts → "schön" empfunden
- Phonetischer Symbolismus: Nasale (m, n) + stimmhafte Konsonanten (b, d, g) = warm, mütterlich, beruhigend
- Peak-End Rule: Hero (Peak) + letzter Eindruck (End) bestimmen Gesamtbewertung
- 60-30-10 Farbregel: 60% beruhigend, 30% Struktur, 10% Akzent

---

## File Map

| Datei | Änderung | Verantwortung |
|---|---|---|
| `src/data/content.ts` | Alle Texte emotional umschreiben | Zentrale Content-Quelle |
| `src/sections/Hero.astro` | Subline warm + einladend | Erster Eindruck (Peak) |
| `src/sections/WasErwartet.astro` | Subtitle hinzufügen | Orientierung geben |
| `src/sections/Process.astro` | Texte wärmer | Prozess verständlich machen |
| `src/sections/Profil.astro` | Bio persönlicher, verletzlicher | Oxytocin-Kern (Irenas Geschichte) |
| `src/sections/Offerings.astro` | Subtitles herzlicher | Produkte emotional aufladen |
| `src/sections/Gutschein.astro` | Text emotionaler | Schenk-Gefühl auslösen |
| `src/sections/AnlassAnfragen.astro` | Du-Ansprache, wärmer | Einladung statt Formular-Kälte |
| `src/sections/Contact.astro` | Abschluss-Gefühl warmherzig | End-Moment (Peak-End Rule) |
| `src/sections/Reviews.astro` | Titles wärmer | Social Proof emotional rahmen |
| `src/sections/FAQ.astro` | Section-Titel einladend | Fragen als Fürsorge |
| `src/styles/tokens.css` | Weichere Radii, wärmere Schatten | Globale Wärme-Basis |
| `src/pages/faq.astro` | FAQ-Seite Intro-Text warm | Eigenständige Seite |

---

### Task 1: Content.ts — Alle Texte emotional umschreiben

**Files:**
- Modify: `src/data/content.ts`

Kern der Überarbeitung. Jeder Text wird anhand dieser Prinzipien umgeschrieben:
- "Du kennst das Gefühl..." Hooks (Oxytocin)
- Nasale Wörter: gemeinsam, ankommen, genießen, Moment, Wärme
- Konkrete Sinnesbilder statt abstrakte Beschreibungen
- "Stell dir vor" Mentale Simulationen
- Keine Superlative, sondern ehrliche Wärme

- [ ] **Step 1: Hero-Texte umschreiben**

```typescript
hero: {
  title: 'Malatelier Auszeit',
  subtitle: 'Dein Malatelier in Gronau',
  claim: 'Dein Ort zum Ankommen und Kreativsein',
  subline: 'Keramik bemalen, durchatmen, glücklich nach Hause gehen',
  ctaPrimary: 'Termin buchen',
  ctaSecondary: 'Entdecke unsere Keramik',
},
```

Begründung: "Ankommen" = Nasal (n), Geborgenheit. "Durchatmen" = körperliche Entspannung. "Glücklich nach Hause gehen" = konkrete Emotion statt abstrakt "Freude mitnehmen".

- [ ] **Step 2: WasErwartet-Texte umschreiben**

```typescript
wasErwartet: {
  title: 'Was dich bei uns erwartet',
  items: [
    {
      title: 'Keramik bemalen',
      text: 'Such dir in Ruhe einen Rohling aus, lass dich von den Farben inspirieren und gestalte etwas, das nur dir gehört.',
      image: '/tasse.webp',
      link: '#keramik-preise',
    },
    {
      title: 'Workshops',
      text: 'Gemeinsam Neues ausprobieren, voneinander lernen und dabei eine richtig gute Zeit haben.',
      image: '/teller.webp',
      link: '/workshops',
    },
    {
      title: 'Besondere Anlässe',
      text: 'Kindergeburtstag, JGA oder Firmen-Event — zusammen kreativ sein verbindet. Wir kümmern uns um alles.',
      image: '/spardose.webp',
      link: '/events',
    },
    {
      title: 'Gutscheine',
      text: 'Verschenke eine Auszeit, die wirklich von Herzen kommt.',
      image: '/anhaenger.webp',
      link: '/gutscheine',
    },
  ],
},
```

Begründung: "in Ruhe" = Entschleunigung. "nur dir gehört" = Besitz-Stolz. "Gemeinsam" = Nasal, Wir-Gefühl. "von Herzen" = Oxytocin.

- [ ] **Step 3: Process-Texte umschreiben**

```typescript
process: {
  title: 'So einfach geht es',
  steps: [
    {
      icon: 'calendar',
      title: 'Termin aussuchen',
      text: 'Schau dir die freien Termine an und such dir einen Zeitpunkt aus, der für dich passt.',
    },
    {
      icon: 'brush',
      title: 'Ankommen & loslegen',
      text: 'Setz dich gemütlich hin, wähle dein Stück und lass deiner Kreativität freien Lauf. Ich helfe dir gern, wenn du magst.',
    },
    {
      icon: 'gift',
      title: 'Abholen & freuen',
      text: 'Nach 10 bis 14 Tagen ist dein Werk fertig glasiert. Hol es ab und freu dich jedes Mal, wenn du es benutzt.',
    },
  ],
},
```

Begründung: "gemütlich hin" = Sinnesbild. "Ich helfe dir gern" = persönlich, nicht "Anleitung gibt es". "freu dich jedes Mal" = Zukunftsvision, Dopamin.

- [ ] **Step 4: Events-Texte umschreiben**

```typescript
events: {
  title: 'Besondere Anlässe',
  subtitle: 'Gemeinsam kreativ sein verbindet. Wir richten alles für euch her.',
  types: [
    {
      id: 'kindergeburtstag',
      title: 'Kindergeburtstag',
      text: 'Die Kinder bemalen ihre eigenen Keramikstücke und nehmen am Ende stolz etwas Selbstgemachtes mit nach Hause.',
      features: ['Ab 6 Jahren', 'Bis zu 10 Kinder', 'Ca. 2 Stunden', 'Alle Materialien inklusive'],
    },
    {
      id: 'jga',
      title: 'JGA',
      text: 'Zusammen lachen, quatschen und nebenbei ein Andenken schaffen, das euch noch lange an diesen Tag erinnert.',
      features: ['Flexible Gruppengröße', 'Getränke möglich', 'Ca. 2 bis 3 Stunden', 'Gemütliche Atmosphäre'],
    },
    {
      id: 'firmen_event',
      title: 'Firmen-Event',
      text: 'Mal raus aus dem Büro, gemeinsam etwas mit den Händen machen und sich dabei ganz entspannt besser kennenlernen.',
      features: ['Individuelle Planung', 'Flexible Termine', 'Rechnungsstellung möglich', 'Ab 8 Personen'],
    },
    {
      id: 'privater_anlass',
      title: 'Privater Anlass',
      text: 'Freundinnen-Abend, Stammtisch oder einfach zusammen eine gute Zeit haben. Ich mache es euch gemütlich.',
      features: ['Flexible Gruppengröße', 'Individuelle Absprache', 'Gemütliche Atmosphäre'],
    },
  ],
},
```

Begründung: Weg von distanziert-formaler Sprache. "stolz" = Serotonin. "quatschen" = echt, nahbar. "mit den Händen machen" = taktil, sensorisch. "Ich mache es euch gemütlich" = persönlich.

- [ ] **Step 5: FAQ-Texte wärmer formulieren**

```typescript
faq: {
  title: 'Oft gefragt — gern beantwortet',
  items: [
    {
      question: 'Wie läuft ein Besuch bei euch ab?',
      answer: 'Du kommst zu deinem Termin, suchst dir in Ruhe ein Keramikstück aus und bemalst es, wie es dir gefällt. Alle Farben, Pinsel und Werkzeuge stehen bereit. Danach übernehmen wir das Glasieren und Brennen. Nach 10 bis 14 Tagen kannst du dein fertiges Stück abholen.',
    },
    {
      question: 'Was kostet ein Besuch?',
      answer: 'Der Preis setzt sich zusammen aus dem Keramikstück (ab 6 €) und einer Farb- und Brennpauschale: bis 3 Teile 10 €, 4 bis 6 Teile 15 €, 7 bis 9 Teile 20 €. Farben, Pinsel und Brennen sind dabei immer inklusive.',
    },
    {
      question: 'Muss ich vorher einen Termin buchen?',
      answer: 'Ja, damit wir genug Platz und alles Nötige für dich vorbereiten können. Einen Termin buchst du ganz einfach hier auf der Website.',
    },
    {
      question: 'Kann ich meinen Termin stornieren?',
      answer: 'Klar, bis 24 Stunden vorher ist das kostenfrei möglich. Den Storno-Link findest du in deiner Bestätigungs-E-Mail.',
    },
    {
      question: 'Was muss ich mitbringen?',
      answer: 'Gar nichts! Alles ist da. Komm einfach vorbei und lass dich überraschen, was entsteht.',
    },
    {
      question: 'Ist das Atelier auch für Kinder geeignet?',
      answer: 'Auf jeden Fall! Kinder ab 6 Jahren sind herzlich willkommen. Kleinere Kinder bitte mit einer Begleitperson. Für Kindergeburtstage haben wir übrigens besondere Pakete — frag einfach nach!',
    },
    {
      question: 'Können wir als Gruppe kommen?',
      answer: 'Aber gern! Ob JGA, Stammtisch oder Firmenevent — schreib uns einfach über das Anfrageformular, und wir bereiten alles für euch vor.',
    },
    {
      question: 'Wie lange dauert ein Besuch?',
      answer: 'Plane am besten etwa 2 Stunden ein. Wer besonders detailliert arbeiten möchte, darf auch gern länger bleiben.',
    },
    {
      question: 'Kann ich einen Gutschein verschenken?',
      answer: 'Na klar! Gutscheine gibt es ab 25 €, 50 € oder als Wunschbetrag. Nach dem Kauf bekommst du den Code per E-Mail — perfekt zum Ausdrucken oder Weiterschicken.',
    },
  ],
},
```

Begründung: "gern beantwortet" = Fürsorge statt sachlicher Titel. "Klar" / "Na klar!" / "Auf jeden Fall!" = echte, warme Gesprächssprache. Durchgängig Du-Ansprache, kurze Sätze, freundlicher Ton.

- [ ] **Step 6: Contact-Text wärmer**

```typescript
contact: {
  title: 'Komm vorbei',
  // rest bleibt gleich
},
```

- [ ] **Step 7: Commit**

```
git add src/data/content.ts
git commit -m "content: rewrite all texts for warm, heartfelt tone"
```

---

### Task 2: Profil-Section — Irenas Geschichte persönlicher machen (Oxytocin-Kern)

**Files:**
- Modify: `src/sections/Profil.astro` (Zeile 24-36, HTML)

Laut Vault: Gründer-Geschichten mit persönlicher Verletzlichkeit sind der stärkste Oxytocin-Trigger. Irenas Bio soll weniger "Geschäfts-Intro" und mehr "echte Person, die ihre Leidenschaft teilt" sein.

- [ ] **Step 1: Bio-Text umschreiben**

```html
<span class="profil__eyebrow">Deine Gastgeberin</span>
<h2 class="profil__name">Irena Woschkowiak</h2>
<div class="profil__divider" aria-hidden="true"></div>
<p class="profil__bio">
  Schön, dass du hier bist! Mein Atelier ist mein Herzstück — ein Ort,
  an dem du einfach du selbst sein kannst. Hier geht es nicht um Perfektion,
  sondern darum, dir eine Auszeit zu gönnen und etwas Besonderes zu schaffen.
</p>
<p class="profil__bio">
  Ob du allein kommst, mit Freunden oder der ganzen Familie:
  Ich bin da, zeige dir alles und freu mich über jedes Stück, das bei mir entsteht.
</p>
<p class="profil__closing">Komm vorbei — ich mach dir einen Tee.</p>
<span class="profil__signature">Irena</span>
<a href="#termin-buchen" class="profil__cta">Termin buchen</a>
```

Begründung: "Herzstück" = emotional + Nasal (n). "einfach du selbst sein" = Geborgenheit. "nicht um Perfektion" = Verletzlichkeit, Druckentlastung. "ich mach dir einen Tee" = ultimativer Wärme-Satz — Gastfreundschaft, Gemütlichkeit, Fürsorge in einem Bild.

- [ ] **Step 2: Commit**

```
git add src/sections/Profil.astro
git commit -m "content: make Irena's profile warmer and more personal"
```

---

### Task 3: AnlassAnfragen-Section — Einladung statt Formular

**Files:**
- Modify: `src/sections/AnlassAnfragen.astro` (Zeile 7-10, HTML)

Die aktuelle Sprache ("Planen Sie...") ist förmlich und kalt. Muss zur Du-Ansprache und zum warmen Ton passen.

- [ ] **Step 1: Intro-Text umschreiben**

```html
<h2 class="special-events-title">Besondere Anlässe</h2>
<p class="special-events-subtitle">
  Du planst was Besonderes? Ob Kindergeburtstag, JGA oder Firmen-Event —
  schreib mir einfach, und ich kümmere mich um den Rest.
</p>
```

- [ ] **Step 2: Commit**

```
git add src/sections/AnlassAnfragen.astro
git commit -m "content: warm up special events section with du-ansprache"
```

---

### Task 4: Gutschein-Section — Schenk-Gefühl auslösen

**Files:**
- Modify: `src/sections/Gutschein.astro` (Zeile 8-10, HTML)

- [ ] **Step 1: Beschreibungstext umschreiben**

```html
<h2 class="gutschein__title">Freude verschenken</h2>
<p class="gutschein__text">
  Ein Gutschein, der sich wirklich persönlich anfühlt. Perfekt für alle,
  die gern etwas mit den Händen machen — oder es mal ausprobieren möchten.
</p>
```

Begründung: "Freude verschenken" statt "Gutschein verschenken" — Emotion statt Objekt. "mit den Händen machen" = taktil, sensorisch.

- [ ] **Step 2: Commit**

```
git add src/sections/Gutschein.astro
git commit -m "content: make voucher section more heartfelt"
```

---

### Task 5: Reviews-Section — Titel emotional rahmen

**Files:**
- Modify: `src/sections/Reviews.astro` (Zeile 34-35, HTML)

- [ ] **Step 1: Titel und Subtitle umschreiben**

```html
<h2 class="reviews__title">Das sagen unsere Gäste</h2>
<p class="reviews__subtitle">Jede Bewertung freut uns von Herzen</p>
```

- [ ] **Step 2: Commit**

```
git add src/sections/Reviews.astro
git commit -m "content: warm up reviews section titles"
```

---

### Task 6: CSS-Feinschliff — Weichere Formen, wärmere Atmosphäre

**Files:**
- Modify: `src/styles/tokens.css` (Zeile 62-66, 69-73)

Laut Vault: Abgerundete Ecken wirken freundlicher (Button-Psychologie), wärmere Schatten mit Espresso-Tönen statt neutralem Grau.

- [ ] **Step 1: Radii sanft vergrößern**

```css
/* Border radius - Weichere, einladendere Ecken */
--radius: 20px;
--radius-sm: 12px;
--radius-base: 16px;
--radius-lg: 28px;
--radius-full: 999px;
```

Vorher: 18/10/14/24. Nachher: 20/12/16/28. Subtil weicher, nicht übertrieben.

- [ ] **Step 2: Schatten noch wärmer**

```css
/* Shadows - Wärmer, weicher, einladender */
--shadow-sm: 0 1px 3px 0 rgba(66, 52, 48, 0.05);
--shadow: 0 4px 14px -2px rgba(66, 52, 48, 0.08);
--shadow-md: 0 6px 20px -3px rgba(66, 52, 48, 0.08);
--shadow-lg: 0 12px 28px -4px rgba(66, 52, 48, 0.10);
--shadow-soft: 0 12px 36px rgba(66, 52, 48, 0.10);
--shadow-card: 0 8px 28px rgba(66, 52, 48, 0.08);
```

Subtil größerer Spread, etwas niedrigere Opacity → weicher, "schwebender" Look.

- [ ] **Step 3: Commit**

```
git add src/styles/tokens.css
git commit -m "style: softer radii and warmer shadows for cozy feel"
```

---

### Task 7: Hero-Section — Stärkerer erster Eindruck

**Files:**
- Modify: `src/sections/Hero.astro` (Zeile 13-15, HTML — Subline nur via content.ts)

Der Hero ist der "Peak" laut Peak-End Rule. Die Texte sind bereits in Task 1 geändert. Hier optimieren wir nur den Overlay-Gradient — aktuell zu dunkel/kalt, soll wärmer wirken.

- [ ] **Step 1: Hero-Overlay wärmer**

In `src/sections/Hero.astro`, den Overlay-Gradient wärmer:

```css
.hero__overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to bottom,
    rgba(66, 52, 48, 0.02) 0%,
    rgba(66, 52, 48, 0.08) 50%,
    rgba(66, 52, 48, 0.50) 100%
  );
  z-index: 1;
}
```

Weniger dunkle Abdeckung → Bild wirkt heller, einladender, wärmer.

- [ ] **Step 2: Commit**

```
git add src/sections/Hero.astro
git commit -m "style: lighter hero overlay for warmer first impression"
```

---

### Task 8: FAQ-Seite Intro warm

**Files:**
- Modify: `src/pages/faq.astro` (Zeile 15, inline section)

- [ ] **Step 1: FAQ-Intro wärmer**

Das `<section>` am Anfang der FAQ-Seite bekommt einen warmen Einleitungstext:

```html
<section style="text-align:center; padding: 2rem var(--gutter); max-width: var(--max-width); margin: 0 auto;">
  <p style="color: var(--color-text-secondary); font-size: 1rem; max-width: 540px; margin: 0 auto; line-height: 1.7;">
    Du hast Fragen? Hier findest du die Antworten. Falls etwas fehlt, meld dich einfach bei mir — ich helfe dir gern.
  </p>
</section>
```

- [ ] **Step 2: Commit**

```
git add src/pages/faq.astro
git commit -m "content: add warm intro text to FAQ page"
```

---

### Task 9: Build, Test & Deploy

- [ ] **Step 1: Build testen**

```bash
npm run build
```

Expected: Build erfolgreich, keine Fehler.

- [ ] **Step 2: Visueller Check**

Stichproben auf den geänderten Sections — Texte lesen, Design checken.

- [ ] **Step 3: Deploy**

```bash
bash deploy.sh
```

- [ ] **Step 4: Final commit tag**

```
git add -A
git commit -m "feat: warm heartfelt redesign — all texts and styles"
```
