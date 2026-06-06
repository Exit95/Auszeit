#!/bin/bash
# ═══════════════════════════════════════════════════════════
# Deploy-Script: Brenn- und Abholverwaltung
# Baut, pusht und deployt inkl. Datenbank-Migration
# ═══════════════════════════════════════════════════════════

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

REGISTRY="[2a01:4f8:202:1129:2447:2447:1:900]:5000"
IMAGE="${REGISTRY}/keramik-auszeit-de:latest"
SERVER="root@2a01:4f8:202:1129:2447:2447:1:901"
SERVICE="keramik-auszeit-de_web"

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Brenn-Verwaltung – Deployment${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
echo ""

# ─── 1. Datenbank-Migration ───────────────────────────────
echo -e "${YELLOW}1/4 Datenbank-Migration…${NC}"
echo ""
echo "  Die Brenn-Verwaltung braucht MariaDB-Tabellen."
echo "  Falls MariaDB auf dem Server noch nicht läuft,"
echo "  muss sie zuerst eingerichtet werden."
echo ""
read -p "  Datenbank-Migration jetzt ausführen? (j/N) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Jj]$ ]]; then
    read -p "  DB-Host (Standard: 127.0.0.1): " DB_HOST
    DB_HOST=${DB_HOST:-127.0.0.1}

    read -p "  DB-Name (Standard: auszeit_prod): " DB_NAME
    DB_NAME=${DB_NAME:-auszeit_prod}

    read -p "  DB-User (Standard: auszeit_user): " DB_USER
    DB_USER=${DB_USER:-auszeit_user}

    read -sp "  DB-Passwort: " DB_PASS
    echo ""

    echo -e "  ${YELLOW}Führe Migration auf dem Server aus…${NC}"
    ssh "$SERVER" "mysql -h '${DB_HOST}' -u '${DB_USER}' -p'${DB_PASS}' '${DB_NAME}'" < migrations/run-all.sql

    echo -e "  ${GREEN}Migration erfolgreich!${NC}"
    echo ""

    # DB-Umgebungsvariablen im Stack setzen?
    echo "  Damit die App die Datenbank nutzt, müssen die DB-Umgebungsvariablen"
    echo "  in keramik-auszeit-de.yml gesetzt sein (DB_ENABLED=true etc.)."
    echo ""
    read -p "  Stack-YAML jetzt aktualisieren? (j/N) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Jj]$ ]]; then
        # Prüfen ob DB_ENABLED bereits drin ist
        if grep -q "DB_ENABLED" keramik-auszeit-de.yml; then
            echo -e "  ${GREEN}DB-Variablen sind bereits in der Stack-Datei.${NC}"
        else
            # Vor der networks:-Zeile einfügen
            sed -i "/^    networks:/i\\
      - DB_ENABLED=true\\
      - DB_HOST=${DB_HOST}\\
      - DB_PORT=3306\\
      - DB_NAME=${DB_NAME}\\
      - DB_USER=${DB_USER}\\
      - DB_PASSWORD=${DB_PASS}" keramik-auszeit-de.yml
            echo -e "  ${GREEN}DB-Variablen in Stack-YAML eingefügt.${NC}"
        fi

        echo ""
        echo -e "  ${YELLOW}Stack auf dem Server aktualisieren…${NC}"
        scp keramik-auszeit-de.yml "${SERVER}:/root/keramik-auszeit-de.yml"
        ssh "$SERVER" "docker stack deploy -c /root/keramik-auszeit-de.yml keramik-auszeit-de"
        echo -e "  ${GREEN}Stack aktualisiert.${NC}"
    fi
else
    echo -e "  ${YELLOW}Migration übersprungen.${NC}"
fi

echo ""

# ─── 2. Build ─────────────────────────────────────────────
echo -e "${YELLOW}2/4 Astro Build…${NC}"
npm run build
echo -e "${GREEN}Build erfolgreich.${NC}"
echo ""

# ─── 3. Docker Image bauen & pushen ───────────────────────
echo -e "${YELLOW}3/4 Docker Image bauen & pushen…${NC}"
docker build --no-cache -t "$IMAGE" .
docker push "$IMAGE"
echo -e "${GREEN}Image gepusht.${NC}"
echo ""

# ─── 4. Service deployen ──────────────────────────────────
echo -e "${YELLOW}4/4 Service auf Server aktualisieren…${NC}"

# Retry mit Backoff bei Netzwerkfehlern
MAX_RETRIES=4
RETRY_DELAY=2

for i in $(seq 1 $MAX_RETRIES); do
    if ssh "$SERVER" "docker service update --force --image $IMAGE $SERVICE" 2>&1; then
        break
    fi
    if [ $i -eq $MAX_RETRIES ]; then
        echo -e "${RED}Deployment fehlgeschlagen nach $MAX_RETRIES Versuchen.${NC}"
        exit 1
    fi
    echo -e "${YELLOW}Versuch $i fehlgeschlagen, warte ${RETRY_DELAY}s…${NC}"
    sleep $RETRY_DELAY
    RETRY_DELAY=$((RETRY_DELAY * 2))
done

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Deployment abgeschlossen!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
echo ""
echo "  Brenn-Verwaltung: https://keramik-auszeit.de/admin/brenn/"
echo ""
echo "  Logs prüfen:"
echo "    ssh $SERVER \"docker service logs $SERVICE --tail 50\""
echo ""
