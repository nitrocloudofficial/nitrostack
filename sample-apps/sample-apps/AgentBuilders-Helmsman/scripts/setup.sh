#!/usr/bin/env bash
# HelmsMan — one-shot cluster setup
# Usage: ./scripts/setup.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
CLUSTER_NAME="helmsman"

# ── colours ──────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()  { echo -e "${GREEN}[✓]${NC} $*"; }
warn()  { echo -e "${YELLOW}[!]${NC} $*"; }
fail()  { echo -e "${RED}[✗]${NC} $*"; exit 1; }

# ── pre-flight checks ───────────────────────────────
command -v kind    >/dev/null 2>&1 || fail "kind not found. Install: https://kind.sigs.k8s.io/docs/user/quick-start/#installation"
command -v kubectl >/dev/null 2>&1 || fail "kubectl not found. Install: https://kubernetes.io/docs/tasks/tools/"
command -v docker  >/dev/null 2>&1 || fail "docker not found. Install: https://docs.docker.com/get-docker/"

# ── cluster lifecycle ────────────────────────────────
if kind get clusters 2>/dev/null | grep -q "^${CLUSTER_NAME}$"; then
  warn "Cluster '${CLUSTER_NAME}' already exists — reusing it."
else
  info "Creating kind cluster '${CLUSTER_NAME}' (1 control-plane + 2 workers)…"
  kind create cluster --config "${ROOT_DIR}/kind-config.yaml"
fi

# Point kubectl at the cluster
kubectl cluster-info --context "kind-${CLUSTER_NAME}" >/dev/null 2>&1 \
  || fail "Cannot reach the cluster. Is Docker running?"
info "kubectl context set to kind-${CLUSTER_NAME}"

# ── deploy workloads ────────────────────────────────
info "Creating 'shop' namespace…"
kubectl apply -f "${ROOT_DIR}/manifests/namespace.yaml"

info "Deploying workloads (checkout-service, cart-service, catalog-service)…"
kubectl apply -f "${ROOT_DIR}/manifests/deployments.yaml"

info "Applying PodDisruptionBudgets…"
kubectl apply -f "${ROOT_DIR}/manifests/pdbs.yaml"

info "Deploying kube-state-metrics…"
kubectl apply -f "${ROOT_DIR}/manifests/kube-state-metrics.yaml"

# ── wait for rollout ────────────────────────────────
info "Waiting for deployments to be ready…"
for dep in checkout-service cart-service catalog-service; do
  kubectl rollout status deployment/"${dep}" -n shop --timeout=120s
done
kubectl rollout status deployment/kube-state-metrics -n kube-system --timeout=120s

# ── summary ─────────────────────────────────────────
echo ""
info "══════════════════════════════════════════════════"
info " HelmsMan cluster is READY"
info "══════════════════════════════════════════════════"
echo ""
echo "  Nodes:"
kubectl get nodes -o wide 2>/dev/null | sed 's/^/    /'
echo ""
echo "  Workloads (shop namespace):"
kubectl get deployments -n shop -o wide 2>/dev/null | sed 's/^/    /'
echo ""
echo "  PodDisruptionBudgets:"
kubectl get pdb -n shop 2>/dev/null | sed 's/^/    /'
echo ""
echo "  Pods:"
kubectl get pods -n shop -o wide 2>/dev/null | sed 's/^/    /'
echo ""
info "Next: start the MCP server → npm run dev"
info "Demo: run 'kubectl get pods -n shop -w' in a second terminal to watch agents act."