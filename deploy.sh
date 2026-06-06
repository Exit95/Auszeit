#!/usr/bin/env bash
# ============================================
# Malatelier Auszeit - Deploy via ProxyJump direkt zum Docker-Server
# Registry läuft auf localhost:5000 des Docker-Servers (10.1.9.100)
# ============================================

set -euo pipefail

APP_NAME="keramik-auszeit-de"
IMAGE="localhost:5000/${APP_NAME}:latest"
PVE_HOST="DanapfelPVE"
DOCKER_HOST="root@10.1.9.100"
LOCAL_KEY="$HOME/.ssh/danapfel"
TMP_ARCHIVE="/tmp/${APP_NAME}-src.tar.gz"
REMOTE_BUILD="/tmp/${APP_NAME}-build"

# Direkte Verbindung zu 10.1.9.100 via PVE als Jump-Host
SSH="ssh -o StrictHostKeyChecking=no -o ProxyJump=${PVE_HOST} -i ${LOCAL_KEY}"
SCP="scp -o StrictHostKeyChecking=no -o ProxyJump=${PVE_HOST} -i ${LOCAL_KEY}"

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'
log()  { echo -e "${GREEN}[deploy]${NC} $1"; }
fail() { echo -e "${RED}[error]${NC} $1"; exit 1; }

log "1/5  Projekt packen ..."
tar czf "${TMP_ARCHIVE}" \
  --exclude=node_modules --exclude=.git --exclude=dist \
  --exclude=.superpowers --exclude=.env --exclude='*Auszeit Keramik*' --exclude='*Auszeit_Galerie*' \
  -C "$(pwd)" .
log "     $(du -h ${TMP_ARCHIVE} | cut -f1) gepackt"

log "2/5  Archiv direkt zum Docker-Server senden ..."
${SCP} "${TMP_ARCHIVE}" "${DOCKER_HOST}:${TMP_ARCHIVE}" || fail "SCP fehlgeschlagen"
rm -f "${TMP_ARCHIVE}"

log "3/5  Docker Image bauen und in Registry pushen ..."
${SSH} "${DOCKER_HOST}" "
  rm -rf ${REMOTE_BUILD} &&
  mkdir -p ${REMOTE_BUILD} &&
  cd ${REMOTE_BUILD} &&
  tar xzf ${TMP_ARCHIVE} &&
  docker build -t ${IMAGE} . &&
  docker push ${IMAGE} &&
  rm -rf ${REMOTE_BUILD} ${TMP_ARCHIVE}
" || fail "Remote Build/Push fehlgeschlagen"

log "4/5  Container deployen ..."
${SSH} "${DOCKER_HOST}" "
  cd /srv/docker/apps &&
  docker compose pull ${APP_NAME} &&
  docker compose up -d --force-recreate ${APP_NAME}
" || fail "Deploy fehlgeschlagen"

log "5/5  Fertig! https://keramik-auszeit.de"
