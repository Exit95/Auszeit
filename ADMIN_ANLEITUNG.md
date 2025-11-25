# Admin-Panel Anleitung

## 🎯 Übersicht

Das Admin-Panel ermöglicht es dir, verfügbare Termine selbst zu verwalten. Du kannst Termine hinzufügen, ansehen und löschen - ganz flexibel nach deinen Arbeitszeiten.

## 🚀 Erste Schritte

### 1. Node.js Adapter installieren

Da wir jetzt Server-Side Rendering brauchen, installiere den Node.js Adapter:

```bash
npm install @astrojs/node
```

### 2. Admin-Passwort setzen

Erstelle eine `.env` Datei (falls noch nicht vorhanden):

```bash
cp .env.example .env
```

Öffne `.env` und setze ein sicheres Passwort:

```
ADMIN_PASSWORD=dein_sicheres_passwort
```

**Wichtig:** Wähle ein starkes Passwort! Dieses wird für den Admin-Login verwendet.

### 3. Server starten

```bash
npm run dev
```

### 4. Admin-Panel öffnen

Öffne im Browser: `http://localhost:4321/admin`

**Login-Daten:**
- Benutzername: `admin`
- Passwort: Das Passwort aus deiner `.env` Datei

## 📅 Termine verwalten

### Neuen Termin hinzufügen

1. Wähle ein **Datum** (nur zukünftige Daten möglich)
2. Wähle eine **Uhrzeit** (z.B. 14:00)
3. Setze die **maximale Personenanzahl** (Standard: 15)
4. Klicke auf **"Termin hinzufügen"**

Der Termin erscheint sofort in der Liste und ist für Kunden im Kalender sichtbar.

### Termin löschen

1. Finde den Termin in der Liste
2. Klicke auf **"Löschen"**
3. Bestätige die Aktion

**Hinweis:** Wenn bereits Buchungen für diesen Termin existieren, solltest du ihn nicht löschen!

### Termine ansehen

Alle verfügbaren Termine werden in der Liste angezeigt mit:
- **Datum** (z.B. "Freitag, 15. Dezember 2025")
- **Uhrzeit** (z.B. "14:00 Uhr")
- **Verfügbare Plätze** (z.B. "12 / 15 Plätze frei")

## 🔄 Wie funktioniert das System?

### Für dich (Admin):

1. Du trägst Termine ein, wann du Zeit hast
2. Du siehst, wie viele Plätze noch frei sind
3. Du kannst Termine jederzeit löschen

### Für Kunden:

1. Kunden sehen nur die Termine, die du eingetragen hast
2. Sie können nur Termine buchen, die noch freie Plätze haben
3. Nach der Buchung reduziert sich automatisch die Anzahl freier Plätze

### Automatische Verwaltung:

- Vergangene Termine werden automatisch ausgeblendet
- Volle Termine (0 freie Plätze) werden nicht mehr angezeigt
- Buchungen reduzieren automatisch die verfügbaren Plätze

## 💾 Datenspeicherung

Die Daten werden in JSON-Dateien gespeichert:
- `data/time-slots.json` - Alle Termine
- `data/bookings.json` - Alle Buchungen

Diese Dateien werden automatisch erstellt und verwaltet.

**Backup:** Sichere diese Dateien regelmäßig!

## 🔒 Sicherheit

### Passwort ändern

1. Öffne `.env`
2. Ändere `ADMIN_PASSWORD=neues_passwort`
3. Starte den Server neu

### Wichtige Sicherheitshinweise

- **Teile dein Admin-Passwort mit niemandem**
- **Verwende ein starkes Passwort** (mindestens 12 Zeichen)
- **Logge dich immer aus**, wenn du fertig bist
- **Sichere die `.env` Datei** (nie in Git committen!)

## 🌐 Deployment (Live-Schaltung)

### Auf Vercel/Netlify deployen:

1. **Environment-Variable setzen:**
   - Gehe zu deinem Hosting-Dashboard
   - Settings → Environment Variables
   - Füge hinzu: `ADMIN_PASSWORD=dein_passwort`

2. **Deployen:**
   ```bash
   git add .
   git commit -m "Add admin panel for time slot management"
   git push
   ```

3. **Admin-Panel aufrufen:**
   - `https://deine-domain.de/admin`

### Wichtig für Produktion:

- Verwende HTTPS (wird von Vercel/Netlify automatisch bereitgestellt)
- Setze ein sehr starkes Passwort
- Überwache regelmäßig die Buchungen

## 📱 Mobile Nutzung

Das Admin-Panel ist responsive und funktioniert auch auf dem Smartphone:
- Termine unterwegs hinzufügen
- Verfügbarkeit prüfen
- Termine löschen

## ❓ Häufige Fragen

**Q: Kann ich mehrere Termine auf einmal hinzufügen?**
A: Aktuell nur einzeln. Für wiederkehrende Termine musst du jeden einzeln eintragen.

**Q: Was passiert, wenn ich einen Termin lösche, für den es Buchungen gibt?**
A: Die Buchungen bleiben in der Datenbank, aber der Termin ist nicht mehr verfügbar. Besser: Lass den Termin stehen, bis er vorbei ist.

**Q: Kann ich die maximale Personenanzahl nachträglich ändern?**
A: Aktuell nicht über die Oberfläche. Du müsstest die `data/time-slots.json` Datei manuell bearbeiten.

**Q: Wie sehe ich, wer gebucht hat?**
A: Die Buchungsdaten sind in `data/bookings.json`. Eine Buchungsübersicht im Admin-Panel kommt in einer zukünftigen Version.

**Q: Kann ich das Passwort zurücksetzen?**
A: Ja, einfach in der `.env` Datei ändern und Server neu starten.

## 🔮 Geplante Features

- Buchungsübersicht im Admin-Panel
- Mehrere Termine auf einmal hinzufügen
- Termine bearbeiten (Uhrzeit/Kapazität ändern)
- E-Mail-Benachrichtigungen bei neuen Buchungen
- Kalender-Export (iCal)
- Statistiken und Auslastung

## 🆘 Support

Bei Problemen:
1. Prüfe die Browser-Konsole (F12)
2. Prüfe die Server-Logs
3. Stelle sicher, dass die `.env` Datei korrekt ist
4. Prüfe, ob der `data/` Ordner existiert und beschreibbar ist

## 📝 Beispiel-Workflow

**Montag morgen:**
1. Logge dich ins Admin-Panel ein
2. Trage Termine für die kommende Woche ein:
   - Dienstag, 14:00 Uhr, 15 Personen
   - Mittwoch, 16:00 Uhr, 12 Personen
   - Freitag, 14:00 Uhr, 15 Personen
   - Samstag, 10:00 Uhr, 20 Personen
3. Logge dich aus

**Im Laufe der Woche:**
- Kunden buchen online
- Du siehst die Auslastung im Admin-Panel
- Bei Bedarf fügst du weitere Termine hinzu

**Nach den Terminen:**
- Alte Termine werden automatisch ausgeblendet
- Du kannst sie bei Bedarf löschen (optional)

