#!/bin/bash

# Deployment Script für Testseite
# Dieses Script automatisiert den Deployment-Prozess

set -e  # Bei Fehler abbrechen

echo "🚀 Starte Deployment..."

# Farben für Output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. Git Pull (falls du Git verwendest)
if [ -d .git ]; then
    echo -e "${YELLOW}📥 Pulling latest changes from Git...${NC}"
    git pull
fi

# 2. Dependencies installieren/aktualisieren
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm install --production=false

# 3. Build erstellen
echo -e "${YELLOW}🔨 Building application...${NC}"
npm run build

# 4. Logs-Ordner erstellen (falls nicht vorhanden)
if [ ! -d "logs" ]; then
    echo -e "${YELLOW}📁 Creating logs directory...${NC}"
    mkdir -p logs
fi

# 5. Data-Ordner erstellen (falls nicht vorhanden)
if [ ! -d "data" ]; then
    echo -e "${YELLOW}📁 Creating data directory...${NC}"
    mkdir -p data
    echo '[]' > data/bookings.json
    echo '[]' > data/time-slots.json
fi

# 6. PM2 neu starten oder starten
echo -e "${YELLOW}🔄 Restarting PM2 application...${NC}"
if pm2 describe testseite > /dev/null 2>&1; then
    pm2 reload ecosystem.config.js --update-env
    echo -e "${GREEN}✅ Application reloaded${NC}"
else
    pm2 start ecosystem.config.js
    pm2 save
    echo -e "${GREEN}✅ Application started${NC}"
fi

# 7. Status anzeigen
echo -e "${GREEN}📊 Application Status:${NC}"
pm2 status testseite

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo ""
echo "Nützliche Befehle:"
echo "  pm2 logs testseite     - Logs anzeigen"
echo "  pm2 status             - Status prüfen"
echo "  pm2 restart testseite  - App neu starten"
echo "  pm2 stop testseite     - App stoppen"

