# Keramik Auszeit — keramik-auszeit.de

## Projekt-Info
- **Domain:** keramik-auszeit.de, www.keramik-auszeit.de
- **Framework:** Astro (SSR, Node-Adapter)
- **Port:** 3000
- **Image:** `10.1.9.0:5000/keramik-auszeit-de:latest`
- **K8s:** Deployment `keramik-auszeit-de` in docker-compose.yml

## Architektur
- Astro SSR mit Node.js Runtime
- Keramik-Werkstatt mit Buchungssystem
- MariaDB-Datenbank fuer Buchungen, Workshops, Gutscheine, Bewertungen
- Stripe-Zahlungsintegration
- SMTP-Mailversand (Buchungsbestaetigungen etc.)
- S3-Bildspeicher (Hetzner Object Storage)
- Admin-Dashboard mit Passwort + TOTP
- Bilder werden ueber App-Routen proxied (`/uploads/`, `/products/`)
- Komplexestes Projekt im Portfolio

## Persistente Daten
- **MariaDB:** StatefulSet `keramik-auszeit-mariadb` mit 5Gi PVC (Buchungen, Workshops, Gutscheine, Bewertungen)
- **S3:** Bilder auf Hetzner Object Storage (Prefix: `Auszeit/`)
- **Backup:** CronJob taeglich um 03:00 Uhr (Datenbank-Backup)

## Secrets

### K8s Secret: `keramik-secrets`
- `ADMIN_PASSWORD` — Admin-Passwort
- `SUPERUSER_PASSWORD` — Superuser-Passwort
- `TOTP_SECRET` — TOTP fuer Admin-Login
- `SMTP_HOST` — SMTP-Server
- `SMTP_PORT` — SMTP-Port
- `SMTP_USER` — SMTP-Benutzername
- `SMTP_PASS` — SMTP-Passwort
- `STRIPE_SECRET_KEY` — Stripe Secret Key
- `STRIPE_PUBLISHABLE_KEY` — Stripe Publishable Key
- `DB_PASSWORD` — Datenbank-Passwort

### K8s Secret: `s3-credentials`
- `S3_ENDPOINT` — S3-Endpunkt (Hetzner Object Storage)
- `S3_BUCKET` — Bucket-Name
- `S3_ACCESS_KEY` — Zugriffsschluessel
- `S3_SECRET_KEY` — Geheimer Schluessel
- `S3_REGION` — Region

### K8s Secret: `mariadb-secrets`
- `MARIADB_ROOT_PASSWORD` — Root-Passwort
- `MARIADB_PASSWORD` — Datenbank-Passwort
- `MARIADB_USER` — Datenbank-Benutzer
- `MARIADB_DATABASE` — Datenbank-Name

## Deploy
```bash
# Lokal bauen und deployen
./deploy.sh

# Oder manuell:
docker build -t 10.1.9.0:5000/keramik-auszeit-de:latest .
docker push 10.1.9.0:5000/keramik-auszeit-de:latest
ssh -i ~/.ssh/danapfel root@10.1.9.100 "cd /srv/docker/apps && docker compose pull/keramik-auszeit-de -n websites"
```

## Auf den Server gelangen
```bash
# Build muss auf der Registry-VM (10.1.9.0) erfolgen, da lokaler PC keinen Zugriff auf Registry hat
# Option 1: deploy.sh nutzt SSH-Tunnel
./deploy.sh

# Option 2: Source-Code zum Server kopieren und dort bauen
tar czf /tmp/keramik-auszeit-src.tar.gz --exclude=node_modules --exclude=dist --exclude=.git .
scp /tmp/keramik-auszeit-src.tar.gz DanapfelPVE:/tmp/
ssh DanapfelPVE "scp -i /root/.ssh/danapfel /tmp/keramik-auszeit-src.tar.gz root@10.1.9.0:/tmp/"
ssh DanapfelPVE "ssh -i /root/.ssh/danapfel root@10.1.9.0 'mkdir -p /tmp/build && cd /tmp/build && tar xzf /tmp/keramik-auszeit-src.tar.gz && docker build -t 10.1.9.0:5000/keramik-auszeit-de:latest . && docker push 10.1.9.0:5000/keramik-auszeit-de:latest && rm -rf /tmp/build'"
ssh DanapfelPVE "ssh -i /root/.ssh/danapfel root@10.1.9.100 'cd /srv/docker/apps && docker compose pull/keramik-auszeit-de -n websites'"
```

## Rollback
```bash
ssh -i ~/.ssh/danapfel root@10.1.9.100 "kubectl rollout undo deployment/keramik-auszeit-de -n websites"
```

## Logs pruefen
```bash
ssh -i ~/.ssh/danapfel root@10.1.9.100 "kubectl logs -n websites -l app=keramik-auszeit-de --tail=50"
```

## Debugging
```bash
# Pod-Status
ssh -i ~/.ssh/danapfel root@10.1.9.100 "kubectl get pods -n websites -l app=keramik-auszeit-de"

# Shell im Pod
ssh -i ~/.ssh/danapfel root@10.1.9.100 "kubectl exec -it -n websites deployment/keramik-auszeit-de -- sh"

# MariaDB pruefen
ssh -i ~/.ssh/danapfel root@10.1.9.100 "kubectl get pods -n websites -l app=keramik-auszeit-mariadb"
ssh -i ~/.ssh/danapfel root@10.1.9.100 "kubectl exec -it -n websites statefulset/keramik-auszeit-mariadb -- mysql -u root -p"
```

## Infrastruktur
- **Server:** 148.251.51.53 (Hetzner, Proxmox VE)
- **Docker Cluster:** 3 Nodes (10.1.9.100, .101, .102)
- **Registry:** 10.1.9.0:5000 (VM 1900)
- **TLS:** cert-manager + Let's Encrypt (automatisch)
- **Ingress:** Traefik (Namespace traefik)
- **Monitoring:** Grafana unter grafana.danapfel-digital.de
