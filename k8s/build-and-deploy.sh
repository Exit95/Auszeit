#!/bin/bash
# Build Docker Image, Push to Registry, Deploy to K3s
# Usage: ./build-and-deploy.sh <app-name> [project-dir]
#
# Examples:
#   ./build-and-deploy.sh danapfel-de ../project-main
#   ./build-and-deploy.sh keramik-auszeit-de ../keramik-auszeit
set -euo pipefail

APP_NAME="${1:?Usage: $0 <app-name> [project-dir]}"
PROJECT_DIR="${2:-.}"
REGISTRY="10.1.9.0:5000"
IMAGE="${REGISTRY}/${APP_NAME}:latest"
K3S_SERVER="10.1.9.100"
K3S_KEY="/root/.ssh/danapfel"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== Building ${APP_NAME} ==="
echo "  Project: ${PROJECT_DIR}"
echo "  Image:   ${IMAGE}"
echo ""

# 1. Build
echo "--- Docker Build ---"
docker build -t "${IMAGE}" "${PROJECT_DIR}"

# 2. Push to Registry
echo "--- Push to Registry ---"
docker push "${IMAGE}"

# 3. Deploy to K3s (rolling update)
echo "--- Deploy to K3s ---"
ssh -i "${K3S_KEY}" -o StrictHostKeyChecking=accept-new "root@${K3S_SERVER}" \
  "kubectl rollout restart deployment/${APP_NAME} -n websites 2>/dev/null || echo 'Deployment not found, applying manifest...'"

# 4. If manifest exists, apply it
MANIFEST="${SCRIPT_DIR}/apps/${APP_NAME}.yaml"
if [ -f "${MANIFEST}" ]; then
  ssh -i "${K3S_KEY}" "root@${K3S_SERVER}" "kubectl apply -f -" < "${MANIFEST}"
fi

# 5. Wait and verify
echo "--- Waiting for rollout ---"
ssh -i "${K3S_KEY}" "root@${K3S_SERVER}" \
  "kubectl rollout status deployment/${APP_NAME} -n websites --timeout=120s"

echo ""
echo "=== ${APP_NAME} deployed successfully ==="
