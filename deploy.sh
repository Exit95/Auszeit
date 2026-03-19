#!/bin/bash
set -euo pipefail

# Project: Keramik Auszeit
# Domain: keramik-auszeit.de
REGISTRY="10.1.9.0:5000"
IMAGE_NAME="keramik-auszeit-de"
TAG="${1:-latest}"
IMAGE="${REGISTRY}/${IMAGE_NAME}:${TAG}"
K3S_SERVER="root@10.1.9.100"
K3S_KEY="~/.ssh/danapfel"
APP_NAME="keramik-auszeit-de"
NAMESPACE="websites"

echo "=== Building ${IMAGE_NAME} ==="
docker build -t "${IMAGE}" .

echo "=== Pushing to Registry ==="
docker push "${IMAGE}"

echo "=== Deploying to K3s ==="
ssh -i "${K3S_KEY}" "${K3S_SERVER}" "kubectl rollout restart deployment/${APP_NAME} -n ${NAMESPACE}"

echo "=== Waiting for rollout ==="
ssh -i "${K3S_KEY}" "${K3S_SERVER}" "kubectl rollout status deployment/${APP_NAME} -n ${NAMESPACE} --timeout=120s"

echo "=== Done ==="
ssh -i "${K3S_KEY}" "${K3S_SERVER}" "kubectl get pods -n ${NAMESPACE} -l app=${APP_NAME}"
