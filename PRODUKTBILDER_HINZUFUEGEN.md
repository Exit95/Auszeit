# 📸 Produktbilder hinzufügen

## So fügst du weitere Bilder zu den Produkten hinzu

### 1. Bilder in die richtigen Ordner kopieren

Die Produktbilder werden in folgenden Ordnern gespeichert:

```
public/
  products/
    becher/       ← Becher & Tassen Bilder hier
    teller/       ← Teller Bilder hier
    spardosen/    ← Spardosen Bilder hier
    anhaenger/    ← Anhänger Bilder hier
```

**Beispiel:**
- Kopiere deine Becher-Bilder nach `public/products/becher/`
- Benenne sie z.B.: `becher-1.jpg`, `becher-2.jpg`, `becher-3.jpg`

### 2. Bilder in der Konfiguration eintragen

Öffne die Datei: `src/sections/Offerings.astro`

Suche nach diesem Abschnitt (ca. Zeile 6-25):

```typescript
const productGalleries: Record<string, string[]> = {
  'Becher': [
    '/becher.jpeg',
    // Füge hier weitere Becher-Bilder hinzu, z.B.:
    // '/products/becher/becher-1.jpg',
    // '/products/becher/becher-2.jpg',
  ],
  'Teller': [
    '/teller.jpeg',
    // Füge hier weitere Teller-Bilder hinzu
  ],
  'Spardosen': [
    '/spardose.jpeg',
    // Füge hier weitere Spardosen-Bilder hinzu
  ],
  'Anhänger': [
    '/anhänger.png',
    // Füge hier weitere Anhänger-Bilder hinzu
  ],
};
```

**Beispiel - Becher-Bilder hinzufügen:**

```typescript
'Becher': [
  '/becher.jpeg',
  '/products/becher/becher-1.jpg',
  '/products/becher/becher-2.jpg',
  '/products/becher/becher-3.jpg',
  '/products/becher/becher-4.jpg',
],
```

**Beispiel - Teller-Bilder hinzufügen:**

```typescript
'Teller': [
  '/teller.jpeg',
  '/products/teller/teller-blau.jpg',
  '/products/teller/teller-rot.jpg',
  '/products/teller/teller-gruen.jpg',
],
```

### 3. Speichern und testen

1. Speichere die Datei
2. Die Webseite lädt automatisch neu (wenn der Dev-Server läuft)
3. Klicke auf ein Produkt (z.B. "Becher")
4. Das Pop-up sollte jetzt alle deine Bilder anzeigen

## 🎨 Tipps für gute Produktbilder

- **Format:** JPG oder PNG
- **Größe:** Optimal 800-1200px Breite
- **Dateigröße:** Unter 500KB pro Bild (für schnelle Ladezeiten)
- **Benennung:** Verwende aussagekräftige Namen wie `becher-blau-blumen.jpg`

## 📱 Funktionen des Pop-ups

- **Klick auf Produktkarte** → Öffnet das Pop-up mit allen Bildern
- **Klick auf Bild im Pop-up** → Öffnet das Bild in voller Größe in neuem Tab
- **X-Button oder Klick außerhalb** → Schließt das Pop-up
- **ESC-Taste** → Schließt das Pop-up

## 🔧 Weitere Anpassungen

### Neues Produkt hinzufügen

1. Füge das Produkt in `src/data/content.ts` hinzu:

```typescript
offerings: {
  items: [
    { name: 'Becher', price: '17,00€', image: '/becher.jpeg' },
    { name: 'Teller', price: '12,50€', image: '/teller.jpeg' },
    { name: 'Spardosen', price: '16,50€', image: '/spardose.jpeg' },
    { name: 'Anhänger', price: '8,50€', image: '/anhänger.png' },
    { name: 'Schalen', price: '15,00€', image: '/schalen.jpeg' }, // NEU
  ],
  // ...
}
```

2. Füge die Bildergalerie in `src/sections/Offerings.astro` hinzu:

```typescript
const productGalleries: Record<string, string[]> = {
  // ... andere Produkte
  'Schalen': [
    '/schalen.jpeg',
    '/products/schalen/schale-1.jpg',
    '/products/schalen/schale-2.jpg',
  ],
};
```

3. Erstelle den Ordner: `public/products/schalen/`

## ❓ Probleme?

- **Bilder werden nicht angezeigt?** 
  → Prüfe, ob der Pfad korrekt ist (beginnt mit `/`)
  
- **Pop-up öffnet sich nicht?**
  → Öffne die Browser-Konsole (F12) und prüfe auf Fehler
  
- **Bilder sind zu groß?**
  → Komprimiere sie mit einem Tool wie TinyPNG oder Squoosh

