#!/usr/bin/env bash
# ============================================
# Malatelier Auszeit - Deploy via PVE → Docker-Server
# Registry läuft auf localhost:5000 des Docker-Servers (10.1.9.100)
# ============================================

set -euo pipefail

APP_NAME="keramik-auszeit-de"
IMAGE="localhost:5000/${APP_NAME}:latest"
PVE_HOST="DanapfelPVE"
DOCKER_HOST="root@10.1.9.100"
SSH_KEY="/root/.ssh/danapfel"
TMP_ARCHIVE="/tmp/${APP_NAME}-src.tar.gz"
REMOTE_BUILD="/tmp/${APP_NAME}-build"

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'
log()  { echo -e "${GREEN}[deploy]${NC} $1"; }
fail() { echo -e "${RED}[error]${NC} $1"; exit 1; }

log "1/6  Projekt packen ..."
tar czf "${TMP_ARCHIVE}" \
  --exclude=node_modules --exclude=.git --exclude=dist \
  --exclude=.superpowers --exclude=.env \
  -C "$(pwd)" .
log "     $(du -h ${TMP_ARCHIVE} | cut -f1) gepackt"

log "2/6  Archiv zum PVE senden ..."
scp "${TMP_ARCHIVE}" "${PVE_HOST}:${TMP_ARCHIVE}" || fail "SCP zum PVE fehlgeschlagen"

log "3/6  Archiv zum K3s-Server weiterleiten ..."
ssh "${PVE_HOST}" "scp -i ${SSH_KEY} ${TMP_ARCHIVE} ${DOCKER_HOST}:${TMP_ARCHIVE}" || fail "SCP zum K3s-Server fehlgeschlagen"

log "4/6  Docker Image bauen und in Registry pushen ..."
ssh "${PVE_HOST}" "ssh -i ${SSH_KEY} ${DOCKER_HOST} '\
  rm -rf ${REMOTE_BUILD} && \
  mkdir -p ${REMOTE_BUILD} && \
  cd ${REMOTE_BUILD} && \
  tar xzf ${TMP_ARCHIVE} && \
  docker build --no-cache -t ${IMAGE} . && \
  docker push ${IMAGE} && \
  rm -rf ${REMOTE_BUILD} ${TMP_ARCHIVE} \
'" || fail "Remote Build/Push fehlgeschlagen"

log "5/6  Container deployen ..."
ssh "${PVE_HOST}" "ssh -i ${SSH_KEY} ${DOCKER_HOST} '\
  cd /srv/docker/apps && \
  docker compose pull ${APP_NAME} && \
  docker compose up -d --force-recreate ${APP_NAME} \
'" || fail "Deploy fehlgeschlagen"

log "6/6  Aufräumen ..."
rm -f "${TMP_ARCHIVE}"
ssh "${PVE_HOST}" "rm -f ${TMP_ARCHIVE}" 2>/dev/null || true

log "Fertig! https://keramik-auszeit.de"
