# SMTP-Einrichtung für E-Mail-Benachrichtigungen

## 📧 Übersicht

Das System sendet bei jeder Buchung automatisch eine E-Mail mit:
- Buchungsdetails (Name, E-Mail, Telefon, Anzahl Personen, Notizen)
- Kalender-Eintrag (.ics Datei) zum direkten Import in deinen Kalender

## 🚀 Einrichtung mit Gmail (Empfohlen)

### Schritt 1: Gmail App-Passwort erstellen

1. **Google-Konto aufrufen:**
   - Gehe zu https://myaccount.google.com
   - Melde dich mit deinem Gmail-Konto an

2. **2-Faktor-Authentifizierung aktivieren** (falls noch nicht aktiv):
   - Sicherheit → 2-Faktor-Authentifizierung
   - Folge den Anweisungen

3. **App-Passwort erstellen:**
   - Gehe zu https://myaccount.google.com/apppasswords
   - Wähle "App auswählen" → "Sonstige (Benutzerdefinierter Name)"
   - Gib ein: "Auszeit Keramik Buchungen"
   - Klicke "Generieren"
   - **Kopiere das 16-stellige Passwort** (z.B. "abcd efgh ijkl mnop")

### Schritt 2: .env Datei konfigurieren

Öffne die `.env` Datei und trage ein:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=deine-email@gmail.com
SMTP_PASS=abcdefghijklmnop
BOOKING_EMAIL=deine-email@gmail.com
FROM_EMAIL=deine-email@gmail.com
```

**Wichtig:**
- `SMTP_USER` = Deine Gmail-Adresse
- `SMTP_PASS` = Das App-Passwort (ohne Leerzeichen!)
- `BOOKING_EMAIL` = Wohin die Benachrichtigungen gesendet werden
- `FROM_EMAIL` = Sollte mit SMTP_USER übereinstimmen

### Schritt 3: Testen

1. Starte den Server neu:
   ```bash
   npm run dev
   ```

2. Mache eine Testbuchung auf der Webseite

3. Prüfe dein Gmail-Postfach - du solltest eine E-Mail erhalten mit:
   - Buchungsdetails
   - Kalender-Anhang (termin.ics)

---

## 📮 Alternative: Andere E-Mail-Provider

### Outlook/Hotmail

```
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=deine-email@outlook.com
SMTP_PASS=dein-passwort
```

### Yahoo Mail

```
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_USER=deine-email@yahoo.com
SMTP_PASS=dein-app-passwort
```

**Hinweis:** Yahoo benötigt auch ein App-Passwort!

### 1&1 / IONOS

```
SMTP_HOST=smtp.ionos.de
SMTP_PORT=587
SMTP_USER=deine-email@ionos.de
SMTP_PASS=dein-passwort
```

### Strato

```
SMTP_HOST=smtp.strato.de
SMTP_PORT=465
SMTP_USER=deine-email@strato.de
SMTP_PASS=dein-passwort
```

**Wichtig:** Bei Port 465 muss in der `booking.ts` `secure: true` gesetzt werden!

### Eigener Domain-Provider

Frage deinen Provider nach den SMTP-Einstellungen:
- SMTP-Server (Host)
- Port (meist 587 oder 465)
- Benutzername (meist deine E-Mail-Adresse)
- Passwort

---

## 📅 Kalender-Integration

### Was passiert beim E-Mail-Empfang?

Die E-Mail enthält einen Kalender-Anhang (`.ics` Datei) mit:
- **Titel:** "Keramik-Termin: [Kundenname]"
- **Datum & Uhrzeit:** Gebuchter Termin
- **Dauer:** 2 Stunden
- **Beschreibung:** Alle Buchungsdetails
- **Ort:** Auszeit Keramik Malatelier

### Kalender-Eintrag importieren:

**Gmail:**
- Öffne die E-Mail
- Klicke auf den Kalender-Anhang
- Wähle "Zu Google Kalender hinzufügen"

**Outlook:**
- Öffne die E-Mail
- Klicke auf den Anhang "termin.ics"
- Wähle "Öffnen" → Termin wird automatisch importiert

**Apple Mail (iPhone/Mac):**
- Öffne die E-Mail
- Tippe auf den Kalender-Anhang
- Wähle "Zum Kalender hinzufügen"

**Thunderbird:**
- Öffne die E-Mail
- Rechtsklick auf Anhang → "Speichern unter"
- Öffne die .ics Datei → Wird in deinen Kalender importiert

---

## 🔧 Problemlösung

### E-Mails kommen nicht an

1. **Prüfe die .env Datei:**
   - Sind alle Werte korrekt?
   - Keine Leerzeichen im App-Passwort?
   - SMTP_USER und FROM_EMAIL identisch?

2. **Prüfe die Server-Logs:**
   - Siehst du "E-Mail erfolgreich gesendet"?
   - Gibt es Fehlermeldungen?

3. **Prüfe den Spam-Ordner:**
   - Erste E-Mails landen oft im Spam

4. **Gmail-spezifisch:**
   - Ist 2-Faktor-Authentifizierung aktiv?
   - Ist das App-Passwort korrekt?
   - Prüfe: https://myaccount.google.com/security

### "Invalid login" Fehler

- **Gmail:** App-Passwort falsch oder 2FA nicht aktiv
- **Andere:** Benutzername/Passwort falsch

### "Connection timeout"

- Firewall blockiert Port 587
- SMTP_HOST falsch
- Internet-Verbindung prüfen

### Kalender-Anhang wird nicht erkannt

- Manche E-Mail-Clients zeigen .ics Dateien als normalen Anhang
- Einfach herunterladen und öffnen

---

## 🔒 Sicherheit

### Wichtig:

1. **Niemals die .env Datei committen!**
   - Ist bereits in `.gitignore`
   - Enthält sensible Zugangsdaten

2. **App-Passwörter verwenden:**
   - Nie dein echtes E-Mail-Passwort verwenden
   - App-Passwörter können jederzeit widerrufen werden

3. **Deployment:**
   - Auf Vercel/Netlify: Environment Variables im Dashboard setzen
   - Nie Passwörter im Code speichern

---

## ✅ Checkliste

- [ ] Gmail App-Passwort erstellt
- [ ] .env Datei konfiguriert
- [ ] Server neu gestartet
- [ ] Testbuchung durchgeführt
- [ ] E-Mail erhalten
- [ ] Kalender-Eintrag funktioniert
- [ ] .env nicht in Git committed

---

## 📞 Support

Bei Problemen:
1. Prüfe die Server-Logs (Terminal)
2. Prüfe die Browser-Konsole (F12)
3. Teste mit einem anderen E-Mail-Provider
4. Prüfe die SMTP-Einstellungen deines Providers

