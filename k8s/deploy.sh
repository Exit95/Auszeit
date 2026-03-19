#!/bin/bash
# K8s Deployment Script - Danapfel Digital
# Usage: ./deploy.sh [app-name|all|infra]
set -euo pipefail

K3S_SERVER="10.1.9.100"
K3S_USER="root"
K3S_KEY="/root/.ssh/danapfel"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

ssh_k3s() {
  ssh -i "$K3S_KEY" -o StrictHostKeyChecking=accept-new "$K3S_USER@$K3S_SERVER" "$@"
}

deploy_infra() {
  echo "=== Deploying infrastructure ==="
  ssh_k3s "kubectl apply -f -" < "$SCRIPT_DIR/infra/namespace.yaml"
  ssh_k3s "kubectl apply -f -" < "$SCRIPT_DIR/infra/cluster-issuer.yaml"
  ssh_k3s "kubectl apply -f -" < "$SCRIPT_DIR/infra/redirect-middleware.yaml"
  ssh_k3s "kubectl apply -f -" < "$SCRIPT_DIR/infra/minio.yaml"
  echo "Infrastructure deployed."
}

deploy_app() {
  local app="$1"
  local file="$SCRIPT_DIR/apps/${app}.yaml"
  if [ ! -f "$file" ]; then
    echo "ERROR: $file not found"
    exit 1
  fi
  echo "=== Deploying $app ==="
  ssh_k3s "kubectl apply -f -" < "$file"
  echo "$app deployed."
}

deploy_backups() {
  echo "=== Deploying backup CronJobs ==="
  ssh_k3s "kubectl apply -f -" < "$SCRIPT_DIR/backups/mariadb-backup.yaml"
  ssh_k3s "kubectl apply -f -" < "$SCRIPT_DIR/backups/sqlite-backup.yaml"
  echo "Backup CronJobs deployed."
}

deploy_all() {
  deploy_infra
  for app in "$SCRIPT_DIR"/apps/*.yaml; do
    deploy_app "$(basename "$app" .yaml)"
  done
  deploy_backups
  echo ""
  echo "=== All deployments complete ==="
  ssh_k3s "kubectl get pods -n websites"
}

case "${1:-all}" in
  infra)    deploy_infra ;;
  backups)  deploy_backups ;;
  all)      deploy_all ;;
  *)        deploy_app "$1" ;;
esac
