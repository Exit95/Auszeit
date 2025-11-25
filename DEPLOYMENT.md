# 🚀 Deployment-Anleitung für dedizierte VM

Diese Anleitung beschreibt, wie du die Testseite auf deiner dedizierten VM mit Apache2 und PM2 deployst.

## 📋 Voraussetzungen

Auf der VM müssen folgende Pakete installiert sein:

```bash
# Node.js (Version 18 oder höher)
node --version

# npm
npm --version

# Apache2
apache2 -v

# PM2 (global installieren)
sudo npm install -g pm2
```

---

## 🔧 Schritt 1: Projekt auf die VM klonen

```bash
# Falls noch nicht geschehen
cd /var/www  # oder dein bevorzugter Pfad
git clone <dein-repository-url> testseite
cd testseite
```

---

## 🔐 Schritt 2: Environment-Variablen einrichten

```bash
# .env Datei erstellen (falls nicht vorhanden)
cp .env.example .env

# .env Datei bearbeiten
nano .env
```

**Wichtig:** Trage alle SMTP-Einstellungen und Passwörter ein:
- `ADMIN_PASSWORD`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `BOOKING_EMAIL`
- `FROM_EMAIL`

---

## 📦 Schritt 3: Dependencies installieren

```bash
npm install
```

---

## 🔨 Schritt 4: Production Build erstellen

```bash
npm run build
```

Dies erstellt den `dist/` Ordner mit der produktionsreifen Anwendung.

---

## 🚀 Schritt 5: PM2 einrichten und starten

### Manuell starten:

```bash
# Logs-Ordner erstellen
mkdir -p logs

# Data-Ordner erstellen (falls nicht vorhanden)
mkdir -p data
echo '[]' > data/bookings.json
echo '[]' > data/time-slots.json

# Mit PM2 starten
pm2 start ecosystem.config.js

# PM2 beim Systemstart automatisch starten
pm2 startup
# Führe den Befehl aus, den PM2 dir anzeigt (mit sudo)

# Aktuelle PM2-Konfiguration speichern
pm2 save
```

### Oder mit dem Deploy-Script:

```bash
# Script ausführbar machen
chmod +x deploy.sh

# Deployment durchführen
./deploy.sh
```

---

## 🌐 Schritt 6: Apache2 konfigurieren

### 6.1 Benötigte Apache-Module aktivieren

```bash
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod rewrite
sudo a2enmod headers
sudo a2enmod ssl  # Für HTTPS
sudo systemctl restart apache2
```

### 6.2 Virtual Host erstellen

```bash
# Neue VHost-Datei erstellen
sudo nano /etc/apache2/sites-available/testseite.conf
```

Kopiere den Inhalt aus `apache-vhost.conf.example` und passe an:
- `ServerName` → deine Domain
- `ServerAlias` → www.deine-domain.de
- `ServerAdmin` → deine E-Mail

### 6.3 Virtual Host aktivieren

```bash
# Site aktivieren
sudo a2ensite testseite.conf

# Apache-Konfiguration testen
sudo apache2ctl configtest

# Apache neu laden
sudo systemctl reload apache2
```

---

## 🔒 Schritt 7: SSL mit Let's Encrypt einrichten (Optional aber empfohlen)

```bash
# Certbot installieren (falls nicht vorhanden)
sudo apt update
sudo apt install certbot python3-certbot-apache

# SSL-Zertifikat erstellen
sudo certbot --apache -d deine-domain.de -d www.deine-domain.de

# Certbot richtet automatisch HTTPS ein und erneuert Zertifikate
```

---

## ✅ Schritt 8: Testen

### 8.1 PM2 Status prüfen

```bash
pm2 status
pm2 logs testseite
```

### 8.2 Webseite aufrufen

Öffne im Browser:
- `http://deine-domain.de` (oder IP-Adresse)
- `https://deine-domain.de` (falls SSL eingerichtet)

### 8.3 Admin-Panel testen

- `https://deine-domain.de/admin`
- Login mit deinem `ADMIN_PASSWORD` aus der `.env`

---

## 🔄 Updates deployen

Wenn du Änderungen am Code gemacht hast:

```bash
# Einfach das Deploy-Script ausführen
./deploy.sh
```

Oder manuell:

```bash
git pull
npm install
npm run build
pm2 reload testseite
```

---

## 📊 Nützliche PM2-Befehle

```bash
# Status anzeigen
pm2 status

# Logs anzeigen (live)
pm2 logs testseite

# Logs der letzten 100 Zeilen
pm2 logs testseite --lines 100

# App neu starten
pm2 restart testseite

# App stoppen
pm2 stop testseite

# App aus PM2 entfernen
pm2 delete testseite

# Monitoring-Dashboard
pm2 monit
```

---

## 🐛 Troubleshooting

### Problem: App startet nicht

```bash
# Logs prüfen
pm2 logs testseite --err

# Manuell testen
node dist/server/entry.mjs
```

### Problem: Apache zeigt Fehler

```bash
# Apache-Logs prüfen
sudo tail -f /var/log/apache2/testseite-error.log

# Apache-Konfiguration testen
sudo apache2ctl configtest
```

### Problem: Port 3000 bereits belegt

```bash
# Prüfen, was auf Port 3000 läuft
sudo lsof -i :3000

# Anderen Port in ecosystem.config.js verwenden
# Dann auch in Apache VHost anpassen
```

### Problem: Buchungen werden nicht gespeichert

```bash
# Berechtigungen prüfen
ls -la data/

# Berechtigungen setzen
chmod 755 data/
chmod 644 data/*.json
```

---

## 📁 Wichtige Dateien

- `ecosystem.config.js` - PM2-Konfiguration
- `deploy.sh` - Deployment-Script
- `apache-vhost.conf.example` - Apache VHost Beispiel
- `.env` - Environment-Variablen (NICHT in Git!)
- `data/` - Buchungsdaten (NICHT in Git!)

---

## 🔐 Sicherheit

- [ ] `.env` Datei ist NICHT in Git
- [ ] `data/` Ordner ist NICHT in Git
- [ ] SSL/HTTPS ist aktiviert
- [ ] Firewall erlaubt nur Ports 80 und 443
- [ ] Regelmäßige Backups von `data/` Ordner
- [ ] Starkes Admin-Passwort gesetzt

---

## 💾 Backup-Strategie

```bash
# Backup-Script erstellen
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
tar -czf backup_$DATE.tar.gz data/ .env
```

Richte einen Cronjob für automatische Backups ein:

```bash
# Crontab bearbeiten
crontab -e

# Täglich um 2 Uhr morgens Backup erstellen
0 2 * * * cd /var/www/testseite && tar -czf /backups/testseite_$(date +\%Y\%m\%d).tar.gz data/ .env
```

---

## 🎉 Fertig!

Deine Webseite läuft jetzt auf der dedizierten VM mit:
- ✅ PM2 für Process Management
- ✅ Apache2 als Reverse Proxy
- ✅ SSL/HTTPS (optional)
- ✅ Automatischer Neustart bei Crashes
- ✅ Logging

Bei Fragen oder Problemen, prüfe die Logs:
- PM2: `pm2 logs testseite`
- Apache: `sudo tail -f /var/log/apache2/testseite-error.log`

