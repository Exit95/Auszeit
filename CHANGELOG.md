# Changelog - Buchungssystem Updates

## ✅ Behobene Probleme

### 1. Plätze werden jetzt korrekt abgezogen
**Problem:** Bei Buchungen wurden die verfügbaren Plätze nicht reduziert.

**Lösung:**
- Buchungen werden jetzt in `data/bookings.json` gespeichert
- Verfügbare Plätze werden automatisch aktualisiert
- Slots mit 0 verfügbaren Plätzen werden nicht mehr angezeigt

**Wie es funktioniert:**
1. Kunde bucht 3 Plätze
2. System prüft Verfügbarkeit
3. Buchung wird gespeichert
4. Verfügbare Plätze: 15 → 12
5. Nächster Kunde sieht nur noch 12 freie Plätze

---

## 📧 E-Mail-Benachrichtigungen mit Nodemailer

### Neue Features:

1. **Automatische E-Mail bei jeder Buchung**
   - Wird an die konfigurierte E-Mail-Adresse gesendet
   - Enthält alle Buchungsdetails

2. **Kalender-Eintrag (.ics Datei)**
   - Automatisch als Anhang in der E-Mail
   - Kann direkt in Google Calendar, Outlook, Apple Calendar importiert werden
   - Enthält: Datum, Uhrzeit, Dauer (2h), Kundendetails, Standort

3. **Flexible SMTP-Konfiguration**
   - Funktioniert mit Gmail, Outlook, Yahoo, 1&1, Strato, etc.
   - Einfache Konfiguration über .env Datei

### Einrichtung:

Siehe `SMTP_EINRICHTUNG.md` für detaillierte Anleitung.

**Kurzversion:**
1. Gmail App-Passwort erstellen
2. .env Datei konfigurieren:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=deine-email@gmail.com
   SMTP_PASS=dein-app-passwort
   BOOKING_EMAIL=deine-email@gmail.com
   FROM_EMAIL=deine-email@gmail.com
   ```
3. Server neu starten
4. Testbuchung durchführen

---

## 🔄 Technische Änderungen

### Neue Dateien:
- `src/lib/storage.ts` - Datenbank-Funktionen für Slots und Buchungen
- `data/time-slots.json` - Speichert verfügbare Termine
- `data/bookings.json` - Speichert alle Buchungen
- `SMTP_EINRICHTUNG.md` - Anleitung für E-Mail-Setup
- `.env.example` - Beispiel-Konfiguration

### Geänderte Dateien:
- `src/pages/api/booking.ts` - Komplett überarbeitet:
  - Speichert Buchungen in Datenbank
  - Prüft Verfügbarkeit
  - Zieht Plätze ab
  - Sendet E-Mails mit Nodemailer
  - Erstellt Kalender-Einträge

- `src/components/BookingCalendar.astro` - Lädt Termine vom Server
- `public/booking-calendar.js` - Zeigt nur Admin-erstellte Termine
- `.gitignore` - Ignoriert data/ Ordner

### Neue Dependencies:
- `nodemailer` - E-Mail-Versand
- `@types/nodemailer` - TypeScript-Typen

---

## 📊 Datenfluss

### Buchungsprozess:

```
1. Kunde wählt Termin im Kalender
   ↓
2. Kunde füllt Formular aus
   ↓
3. Frontend sendet Daten an /api/booking
   ↓
4. API prüft Verfügbarkeit
   ↓
5. Buchung wird in data/bookings.json gespeichert
   ↓
6. Verfügbare Plätze werden reduziert
   ↓
7. E-Mail wird mit Nodemailer versendet
   ↓
8. Kalender-Eintrag wird als Anhang mitgeschickt
   ↓
9. Kunde erhält Bestätigung
```

### Admin-Prozess:

```
1. Admin loggt sich ein (/admin)
   ↓
2. Admin erstellt Termin
   ↓
3. Termin wird in data/time-slots.json gespeichert
   ↓
4. Termin erscheint sofort im Kalender
   ↓
5. Kunden können buchen
```

---

## 🔒 Sicherheit

### Geschützte Daten:
- `.env` - Nie in Git committen (in .gitignore)
- `data/` - Enthält Buchungen, nicht in Git (in .gitignore)
- Admin-Passwort - Nur in .env speichern

### Best Practices:
- App-Passwörter statt echte Passwörter verwenden
- HTTPS in Produktion (automatisch bei Vercel/Netlify)
- Regelmäßige Backups von `data/` Ordner

---

## 🧪 Testing

### Testbuchung durchführen:

1. **Admin-Panel öffnen:** http://localhost:4322/admin
   - Login: admin / admin123
   - Termin hinzufügen (z.B. morgen, 14:00, 15 Plätze)

2. **Hauptseite öffnen:** http://localhost:4322
   - Zum Kalender scrollen
   - Tag mit Termin anklicken
   - Uhrzeit auswählen
   - Formular ausfüllen
   - Buchen

3. **Prüfen:**
   - E-Mail sollte ankommen
   - Kalender-Anhang sollte dabei sein
   - Im Admin-Panel: Verfügbare Plätze sollten reduziert sein
   - Bei erneuter Buchung: Weniger Plätze verfügbar

---

## 📝 Nächste Schritte

### Empfohlene Reihenfolge:

1. ✅ SMTP einrichten (siehe SMTP_EINRICHTUNG.md)
2. ✅ Testbuchung durchführen
3. ✅ E-Mail-Empfang prüfen
4. ✅ Kalender-Import testen
5. 🔄 Live-Deployment vorbereiten
6. 🔄 Backup-Strategie für data/ Ordner einrichten

### Zukünftige Features (optional):

- Buchungsübersicht im Admin-Panel
- Kunden-Bestätigungs-E-Mails
- Erinnerungs-E-Mails (1 Tag vorher)
- Stornierungsfunktion
- Warteliste bei ausgebuchten Terminen
- Statistiken und Reports

---

## 🆘 Troubleshooting

### Problem: E-Mails kommen nicht an
→ Siehe SMTP_EINRICHTUNG.md, Abschnitt "Problemlösung"

### Problem: Plätze werden nicht abgezogen
→ Prüfe ob `data/` Ordner existiert und beschreibbar ist

### Problem: Termine werden nicht angezeigt
→ Prüfe Browser-Konsole (F12) auf Fehler beim API-Aufruf

### Problem: Admin-Login funktioniert nicht
→ Prüfe ADMIN_PASSWORD in .env Datei

---

## 📞 Support-Dateien

- `ADMIN_ANLEITUNG.md` - Admin-Panel Bedienung
- `SMTP_EINRICHTUNG.md` - E-Mail-Setup
- `BUCHUNGSSYSTEM_ANLEITUNG.md` - Allgemeine Übersicht
- `EMAIL_SETUP.md` - Alternative E-Mail-Services

