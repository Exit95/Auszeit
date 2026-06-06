# Danapfel Digital — Server-Infrastruktur

## Server-Zugang

| System | Adresse | User | Auth |
|---|---|---|---|
| **Proxmox VE** | https://148.251.51.53:8006 | root | SSH-Key `~/.ssh/danapfel` |
| **SSH (PVE Host)** | `ssh DanapfelPVE` (Alias) | root | Key `~/.ssh/danapfel` |
| **Docker-Server** | 10.1.9.100 (via PVE) | root | Key `~/.ssh/danapfel` |
| **Mail VM** | 10.1.0.80 (via PVE) | root | Key `~/.ssh/danapfel` |
| **Grafana** | https://grafana.danapfel-digital.de | admin | Passwort |
| **Mailcow** | https://mail.danapfel-digital.de/admin | exit | Passwort |
| **Storage Box** | u563355.your-storagebox.de (Port 23) | u563355 | Key `~/.ssh/storagebox` |

## Architektur

```
Internet -> PVE Host (148.251.51.53)
              |
              +-- Port 80/443 -> DNAT -> Docker-Server (10.1.9.100)
              |                           |
              |                      Traefik (Reverse Proxy + Auto-TLS)
              |                           |
              |         +-----------------+------------------+
              |         |                 |                  |
              |    7 Webseiten      MariaDB/MinIO      Mail-Proxy
              |    (Docker Container)  (Docker)            |
              |                                            |
              +-- Mail-Ports (25,587,993,995) -> OPNsense -> Mail VM
              +-- SSH (22), PVE (8006) -> direkt
```

## VMs

| VMID | Name | Zweck | RAM | IP | Tags |
|---|---|---|---|---|---|
| 1000 | OPNSense | Firewall/Router | 8 GB | 10.0.0.1 (WAN), 10.1.0.1 (LAN) | firewall |
| 1080 | mail | Mailcow (5 Domains, 5 Mailboxen) | 8 GB | 10.1.0.80 | mailcow |
| 2000 | docker-server | Alle Webseiten + Traefik + MinIO + MariaDB + Registry | 4 GB | 10.1.9.100 | docker, traefik, webseiten |

## Docker-Server (VM 2000)

### Container

| Container | Image | Port | Zweck |
|---|---|---|---|
| traefik | traefik:v3.6 | 80, 443 | Reverse Proxy + Auto Let's Encrypt TLS |
| registry | registry:2 | 5000 | Private Docker Registry |
| minio | minio/minio | 9000, 9001 | S3-kompatiblen Object Storage |
| mariadb | mariadb:11 | 3306 | Datenbank (keramik-auszeit.de) |
| danapfel-de | localhost:5000/danapfel-de | 3000 | danapfel-digital.de |
| atelierkl-de | localhost:5000/atelierkl-de | 3000 | atelierkl.de |
| keramik-auszeit-de | localhost:5000/keramik-auszeit-de | 3000 | keramik-auszeit.de |
| galabau-fortkamp-de | localhost:5000/galabau-fortkamp.de | 4321 | galabau-fortkamp.de |
| hartmann-gruenwerk-de | localhost:5000/hartmann-gruenwerk-de | 3000 | hartmann-gruenwerk.de |
| ehren-deal-de | localhost:5000/ehren-deal-de | 3000 | ehren-deal.de |
| test-danapfel-digital-de | localhost:5000/test-danapfel-digital-de | 3000 | test-danapfel-digital.de |

### Verzeichnisstruktur auf dem Docker-Server

```
/srv/docker/
  traefik/
    docker-compose.yml          # Traefik Reverse Proxy
    data/acme.json              # Let's Encrypt Zertifikate
    dynamic/mail.yml            # Mail-Proxy Config
  apps/
    docker-compose.yml          # ALLE Webseiten + Infra

/srv/data/
  danapfel-digital/danapfel.db  # SQLite Datenbank
  minio/                        # MinIO S3 Daten (Bilder)
  registry/                     # Docker Registry Daten
```

## Projekt deployen

### Option 1: deploy.sh (empfohlen)
Jedes Projekt hat ein `deploy.sh` Script:
```bash
./deploy.sh
```

### Option 2: Manuell

```bash
# 1. Source-Code packen
tar czf /tmp/projekt.tar.gz --exclude=node_modules --exclude=dist --exclude=.git .

# 2. Zum Server kopieren
scp /tmp/projekt.tar.gz DanapfelPVE:/tmp/
ssh DanapfelPVE "scp -i /root/.ssh/danapfel /tmp/projekt.tar.gz root@10.1.9.100:/tmp/"

# 3. Auf dem Docker-Server bauen
ssh DanapfelPVE "ssh -i /root/.ssh/danapfel root@10.1.9.100 '
  mkdir -p /tmp/build && cd /tmp/build
  tar xzf /tmp/projekt.tar.gz
  docker build -t localhost:5000/IMAGE_NAME:latest .
  docker push localhost:5000/IMAGE_NAME:latest
  rm -rf /tmp/build
'"

# 4. Container neustarten
ssh DanapfelPVE "ssh -i /root/.ssh/danapfel root@10.1.9.100 '
  cd /srv/docker/apps
  docker compose pull CONTAINER_NAME
  docker compose up -d CONTAINER_NAME
'"

# 5. Pruefen
curl -sI https://DOMAIN.de | head -1
```

## Projekte

| Domain | Container-Name | Image | Port |
|---|---|---|---|
| danapfel-digital.de | danapfel-de | danapfel-de | 3000 |
| atelierkl.de | atelierkl-de | atelierkl-de | 3000 |
| keramik-auszeit.de | keramik-auszeit-de | keramik-auszeit-de | 3000 |
| galabau-fortkamp.de | galabau-fortkamp-de | galabau-fortkamp.de | 4321 |
| hartmann-gruenwerk.de | hartmann-gruenwerk-de | hartmann-gruenwerk-de | 3000 |
| ehren-deal.de | ehren-deal-de | ehren-deal-de | 3000 |
| test-danapfel-digital.de | test-danapfel-digital-de | test-danapfel-digital-de | 3000 |
| mail.danapfel-digital.de | - (Traefik Proxy) | - | - |

## Rollback

```bash
# Container auf vorherige Version zuruecksetzen
ssh DanapfelPVE "ssh -i /root/.ssh/danapfel root@10.1.9.100 '
  cd /srv/docker/apps
  docker compose stop CONTAINER_NAME
  docker compose up -d CONTAINER_NAME
'"

# Alle Container neustarten
ssh DanapfelPVE "ssh -i /root/.ssh/danapfel root@10.1.9.100 '
  cd /srv/docker/apps && docker compose restart
'"
```

## Backups

| Was | Wann | Wo |
|---|---|---|
| VM Backups | Sonntag 01:00 | PVE Host /var/lib/vz/dump/ |
| Offsite Backup | Sonntag 04:00 | Hetzner Storage Box |

## Debugging

```bash
# Container-Status
ssh DanapfelPVE "ssh -i /root/.ssh/danapfel root@10.1.9.100 'docker ps'"

# Container-Logs
ssh DanapfelPVE "ssh -i /root/.ssh/danapfel root@10.1.9.100 'docker logs CONTAINER_NAME --tail=50'"

# In Container einsteigen
ssh DanapfelPVE "ssh -i /root/.ssh/danapfel root@10.1.9.100 'docker exec -it CONTAINER_NAME sh'"

# Alle Container neustarten
ssh DanapfelPVE "ssh -i /root/.ssh/danapfel root@10.1.9.100 'cd /srv/docker/apps && docker compose restart'"

# Registry-Katalog
ssh DanapfelPVE "ssh -i /root/.ssh/danapfel root@10.1.9.100 'curl -s http://localhost:5000/v2/_catalog'"
```

## Netzwerk

| Interface | IP | Zweck |
|---|---|---|
| enp0s31f6 | 148.251.51.53/27 | WAN (Internet) |
| vmbr0 | 10.0.0.0/31 | OPNsense WAN-Bridge |
| vmbr1 | OVS Bridge | LAN (VLAN 1000) |
| vlan1000 | 10.1.0.254/16 | PVE Host Zugang zum LAN |

## NAT-Regeln (PVE Host)

```
Port 80,443 (TCP)  -> DNAT -> 10.1.9.100 (Docker-Server Traefik)
Port !22,8006 (TCP) -> DNAT -> 10.0.0.1 (OPNsense, fuer Mail etc.)
UDP                 -> DNAT -> 10.0.0.1 (OPNsense)
IPv6 80,443         -> socat Proxy -> 10.1.9.100
```
