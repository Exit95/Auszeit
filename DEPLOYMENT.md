# Deployment Guide – Atelier Auszeit (keramik-auszeit.de)

## Übersicht

Die Website läuft als **Docker Container** in einem **Docker Swarm** auf einem Hetzner-Server.
Ein **Traefik Reverse Proxy** übernimmt HTTPS (Let's Encrypt) und leitet Traffic an den Container weiter.

### Architektur

```
Entwickler-PC (lokaler Code)
    │
    ├── npm run build          → Astro SSR Build (dist/)
    ├── docker build           → Docker Image erstellen
    ├── docker push            → Image in private Registry pushen
    │
    └── ssh → Server
              └── docker service update  → Neues Image deployen
```

### Infrastruktur

| Komponente         | Details                                                        |
|--------------------|----------------------------------------------------------------|
| **Server**         | Hetzner Cloud (Docker Swarm Manager)                           |
| **Server-IP**      | `2a01:4f8:202:1129:2447:2447:1:901`                           |
| **Registry-IP**    | `[2a01:4f8:202:1129:2447:2447:1:900]:5000` (private Registry) |
| **Domain**         | `keramik-auszeit.de` / `www.keramik-auszeit.de`                |
| **Reverse Proxy**  | Traefik (HTTPS via Let's Encrypt)                              |
| **App-Port**       | 3000 (intern im Container)                                     |
| **Daten-Storage**  | Hetzner Object Storage (S3-kompatibel, `nbg1`)                 |
| **Framework**      | Astro SSR mit `@astrojs/node` Adapter                          |

---

## Schnell-Deployment (nach Code-Änderungen)

### 1. Lokal bauen

```bash
npm run build
```

### 2. Docker Image bauen

> ⚠️ **IMMER `--no-cache` verwenden!** Sonst werden Änderungen an Security-Headern, Middleware etc. nicht übernommen.

```bash
docker build --no-cache -t "[2a01:4f8:202:1129:2447:2447:1:900]:5000/keramik-auszeit-de:latest" .
```

### 3. Image in die private Registry pushen

```bash
docker push "[2a01:4f8:202:1129:2447:2447:1:900]:5000/keramik-auszeit-de:latest"
```

### 4. Auf dem Server deployen

```bash
ssh root@2a01:4f8:202:1129:2447:2447:1:901 \
  "docker service update --force --image [2a01:4f8:202:1129:2447:2447:1:900]:5000/keramik-auszeit-de:latest keramik-auszeit-de_web"
```

### Alles in einem Befehl (Copy & Paste)

```bash
npm run build && \
docker build --no-cache -t "[2a01:4f8:202:1129:2447:2447:1:900]:5000/keramik-auszeit-de:latest" . && \
docker push "[2a01:4f8:202:1129:2447:2447:1:900]:5000/keramik-auszeit-de:latest" && \
ssh root@2a01:4f8:202:1129:2447:2447:1:901 \
  "docker service update --force --image [2a01:4f8:202:1129:2447:2447:1:900]:5000/keramik-auszeit-de:latest keramik-auszeit-de_web"
```

---

## Nützliche Befehle

### Logs auf dem Server anschauen

```bash
# Letzte 100 Zeilen
ssh root@2a01:4f8:202:1129:2447:2447:1:901 "docker service logs keramik-auszeit-de_web --tail 100"

# Live-Logs (Strg+C zum Beenden)
ssh root@2a01:4f8:202:1129:2447:2447:1:901 "docker service logs keramik-auszeit-de_web --follow"

# Nach Fehlern filtern
ssh root@2a01:4f8:202:1129:2447:2447:1:901 "docker service logs keramik-auszeit-de_web --tail 200 2>&1 | grep -i error"
```

### Service-Status prüfen

```bash
ssh root@2a01:4f8:202:1129:2447:2447:1:901 "docker service ps keramik-auszeit-de_web"
```

### Service komplett neu starten

```bash
ssh root@2a01:4f8:202:1129:2447:2447:1:901 "docker service update --force keramik-auszeit-de_web"
```

---

## Erstmalige Server-Einrichtung (so wurde es aufgesetzt)

### 1. Docker Swarm initialisiert

```bash
docker swarm init
```

### 2. Traefik-Netzwerk erstellt

```bash
docker network create --driver overlay public-ingress
```

### 3. Private Docker Registry (läuft auf separater IP)

Die Registry läuft auf `[2a01:4f8:202:1129:2447:2447:1:900]:5000` und akzeptiert Images ohne TLS (insecure registry im Docker-Daemon konfiguriert).

### 4. Stack deployed mit Docker Swarm

```bash
docker stack deploy -c keramik-auszeit-de.yml keramik-auszeit-de
```

Die Datei `keramik-auszeit-de.yml` enthält:
- Das Docker Image aus der privaten Registry
- Alle Umgebungsvariablen (SMTP, S3, Stripe, Admin-Passwörter, TOTP)
- Traefik-Labels für automatisches HTTPS-Routing
- Netzwerk-Anbindung an `public-ingress`

### 5. Traefik (Reverse Proxy)

Traefik läuft als separater Service im Swarm und:
- Erkennt automatisch neue Services über Docker-Labels
- Erstellt Let's Encrypt Zertifikate für `keramik-auszeit.de`
- Leitet HTTPS-Traffic an Port 3000 des Containers weiter

---

## Wichtige Dateien

| Datei                      | Beschreibung                                              |
|----------------------------|-----------------------------------------------------------|
| `Dockerfile`               | Multi-Stage Build: Node 20 Alpine, baut und startet App   |
| `keramik-auszeit-de.yml`   | Docker Swarm Stack-Definition mit allen Env-Variablen     |
| `docker-compose.yml`       | Template/Referenz (nicht für Produktion verwendet)         |
| `astro.config.mjs`         | Astro-Konfiguration (SSR, Node-Adapter)                   |
| `.env.example`             | Vorlage für lokale Entwicklung                            |
| `src/middleware.ts`        | Security-Headers (CSP, Permissions-Policy)                |
| `src/lib/env.ts`           | Liest Umgebungsvariablen (Docker + Astro kompatibel)      |

---

## Umgebungsvariablen

Werden in `keramik-auszeit-de.yml` gesetzt und über Docker an den Container übergeben:

| Variable                        | Beschreibung                                    |
|---------------------------------|-------------------------------------------------|
| `ADMIN_PASSWORD`                | Passwort für Admin-Login                        |
| `SUPERUSER_PASSWORD`            | Passwort für Superuser-Login                    |
| `TOTP_SECRET`                   | Secret für 2FA (TOTP)                           |
| `SMTP_HOST` / `SMTP_PORT`      | SMTP-Server für E-Mail-Versand                  |
| `SMTP_USER` / `SMTP_PASS`      | SMTP-Zugangsdaten                               |
| `BOOKING_EMAIL` / `FROM_EMAIL`  | Empfänger- und Absender-E-Mail                  |
| `S3_ENDPOINT` / `S3_BUCKET`    | Hetzner Object Storage Endpoint und Bucket      |
| `S3_ACCESS_KEY_ID`             | S3 Access Key                                   |
| `S3_SECRET_ACCESS_KEY`         | S3 Secret Key                                   |
| `S3_REGION` / `S3_PREFIX`      | S3 Region und Pfad-Prefix                       |
| `STRIPE_SECRET_KEY`            | Stripe API Key (Live)                           |
| `STRIPE_PUBLISHABLE_KEY`       | Stripe Public Key (Live)                        |

---

## Lokale Entwicklung

```bash
# Dependencies installieren
npm install

# Entwicklungsserver starten (http://localhost:4321)
npm run dev

# .env Datei anlegen (Vorlage: .env.example)
cp .env.example .env
```

---

## iPhone / Mobile Deployment (SSH)

Die App kann direkt vom iPhone aus deployed werden – per SSH-App (Termius oder Blink Shell).

### Einmalige Einrichtung

1. **Deploy-Script auf den Server kopieren:**
   ```bash
   scp deploy-k3s.sh root@[2a01:4f8:202:1129:2447:2447:1:901]:/opt/auszeit/deploy-k3s.sh
   ```

2. **Repo auf dem Server klonen** (falls noch nicht vorhanden):
   ```bash
   ssh root@2a01:4f8:202:1129:2447:2447:1:901
   git clone https://github.com/Exit95/Auszeit.git /opt/auszeit
   cp deploy-k3s.sh /opt/auszeit/
   chmod +x /opt/auszeit/deploy-k3s.sh
   ```

3. **SSH-App auf dem iPhone installieren:**
   - App Store → **Termius** (kostenlos) installieren
   - Neuen Host anlegen:
     - Hostname: `2a01:4f8:202:1129:2447:2447:1:901`
     - Username: `root`
     - SSH Key hinterlegen (oder Passwort)
   - **Snippet** anlegen (für 1-Tap Deployment):
     - Name: `Deploy Auszeit`
     - Befehl: `cd /opt/auszeit && ./deploy-k3s.sh`

### Vom iPhone deployen

1. **Termius** öffnen
2. Zum Server verbinden (1 Tap)
3. **Snippet "Deploy Auszeit"** ausführen (1 Tap)

Das Script macht automatisch:
- `git pull` (neuester Code)
- Docker Image bauen
- Push zur privaten Registry
- K3s Deployment aktualisieren
- Pod-Status anzeigen

### Alternativ: Manuell per SSH

```bash
ssh root@2a01:4f8:202:1129:2447:2447:1:901 "cd /opt/auszeit && ./deploy-k3s.sh"
```

---

## Git Workflow

```bash
# Änderungen committen
git add -A
git commit -m "Beschreibung der Änderung"

# Auf GitHub pushen
git push origin main

# Dann deployen (siehe oben: Schnell-Deployment oder iPhone Deployment)
```
