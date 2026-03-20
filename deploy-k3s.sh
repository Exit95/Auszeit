#!/bin/bash
# =============================================================================
# K3s Deploy Script – Atelier Auszeit (keramik-auszeit.de)
# =============================================================================
# Vom iPhone per SSH ausführen:
#   ssh root@SERVER_IP "cd /opt/auszeit && ./deploy-k3s.sh"
#
# Oder mit Termius als Snippet speichern für 1-Tap Deployment.
# =============================================================================

set -e

# Konfiguration
REGISTRY="[2a01:4f8:202:1129:2447:2447:1:900]:5000"
IMAGE_NAME="keramik-auszeit-de"
REPO_URL="https://github.com/Exit95/Auszeit.git"
BUILD_DIR="/opt/auszeit"
K8S_DEPLOYMENT="keramik-auszeit-de"
K8S_NAMESPACE="default"

# Farben
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}==> Deployment startet...${NC}"
echo ""

# 1. Code aktualisieren
if [ -d "$BUILD_DIR/.git" ]; then
    echo -e "${YELLOW}[1/4] Git Pull...${NC}"
    cd "$BUILD_DIR"
    git pull origin main
else
    echo -e "${YELLOW}[1/4] Repo klonen...${NC}"
    git clone "$REPO_URL" "$BUILD_DIR"
    cd "$BUILD_DIR"
fi

# 2. Docker Image bauen
echo -e "${YELLOW}[2/4] Docker Image bauen...${NC}"
docker build --no-cache -t "$REGISTRY/$IMAGE_NAME:latest" .

# 3. Image in private Registry pushen
echo -e "${YELLOW}[3/4] Push zur Registry...${NC}"
docker push "$REGISTRY/$IMAGE_NAME:latest"

# 4. K3s Deployment aktualisieren
echo -e "${YELLOW}[4/4] K3s Rollout...${NC}"
kubectl rollout restart deployment/$K8S_DEPLOYMENT -n $K8S_NAMESPACE
kubectl rollout status deployment/$K8S_DEPLOYMENT -n $K8S_NAMESPACE --timeout=120s

echo ""
echo -e "${GREEN}==> Deployment erfolgreich!${NC}"
echo ""

# Status anzeigen
echo -e "${YELLOW}Pod-Status:${NC}"
kubectl get pods -n $K8S_NAMESPACE -l app=$IMAGE_NAME
echo ""
echo -e "${YELLOW}Service-Status:${NC}"
kubectl get svc -n $K8S_NAMESPACE -l app=$IMAGE_NAME
