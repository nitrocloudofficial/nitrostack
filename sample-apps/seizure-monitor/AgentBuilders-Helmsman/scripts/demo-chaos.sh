#!/usr/bin/env bash
# HelmsMan — demo chaos scenarios
# Run these one at a time during a live demo to trigger agent reactions.
# Usage: ./scripts/demo-chaos.sh [scenario]
set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()  { echo -e "${GREEN}[✓]${NC} $*"; }
warn()  { echo -e "${YELLOW}[!]${NC} $*"; }
header(){ echo -e "\n${YELLOW}═══ $* ═══${NC}\n"; }

case "${1:-menu}" in

  # ── Scenario 1: Kill a checkout pod ────────────────
  kill-pod)
    header "Scenario: Kill a checkout-service pod"
    POD=$(kubectl get pods -n shop -l app=checkout-service -o jsonpath='{.items[0].metadata.name}')
    warn "Deleting pod ${POD}…"
    kubectl delete pod "${POD}" -n shop --grace-period=0 --force 2>/dev/null
    info "Pod deleted. The deployment will recreate it."
    info "Agent should notice via get_pod_health → see restart / not-ready state."
    echo ""
    kubectl get pods -n shop -l app=checkout-service
    ;;

  # ── Scenario 2: Scale up to simulate over-provisioning ──
  overprovision)
    header "Scenario: Over-provision catalog-service (scale to 8)"
    kubectl scale deployment catalog-service -n shop --replicas=8
    info "catalog-service scaled to 8 replicas."
    info "FinOps agent should notice the high cost and propose scale-down."
    echo ""
    kubectl get pods -n shop -l app=catalog-service
    ;;

  # ── Scenario 3: Breach attempt — manually try unsafe scale ──
  unsafe-scale)
    header "Scenario: Attempt to scale checkout-service to 1 (should be VETOED)"
    warn "This tests the safety gate. Call scale_deployment(checkout-service, 1) via the MCP server."
    warn "Expected: REJECTED — target 1 < floor 3 (policy min 3, PDB desiredHealthy 3)."
    info "You can also try via kubectl to show the MCP server is the guardian:"
    echo "  kubectl scale deployment checkout-service -n shop --replicas=1"
    echo "  (kubectl will succeed — but the MCP server would have blocked it.)"
    ;;

  # ── Scenario 4: Cordon a worker node ──────────────
  cordon-node)
    header "Scenario: Cordon a worker node"
    NODE=$(kubectl get nodes --no-headers | grep worker | head -1 | awk '{print $1}')
    if [ -z "$NODE" ]; then
      warn "No worker node found."
      exit 1
    fi
    warn "Cordoning node ${NODE}…"
    kubectl cordon "${NODE}"
    info "Node ${NODE} is now unschedulable."
    info "Agent should see this in get_cluster_state → unschedulable: true."
    info "To uncordon: kubectl uncordon ${NODE}"
    echo ""
    kubectl get nodes
    ;;

  # ── Scenario 5: Reset everything ──────────────────
  reset)
    header "Resetting cluster to initial state"
    kubectl scale deployment checkout-service -n shop --replicas=5
    kubectl scale deployment cart-service -n shop --replicas=3
    kubectl scale deployment catalog-service -n shop --replicas=4
    for node in $(kubectl get nodes --no-headers | grep worker | awk '{print $1}'); do
      kubectl uncordon "$node" 2>/dev/null || true
    done
    info "All deployments and nodes restored."
    echo ""
    kubectl get deployments -n shop
    echo ""
    kubectl get nodes
    ;;

  # ── Menu ──────────────────────────────────────────
  menu|*)
    echo ""
    echo "HelmsMan Demo Scenarios"
    echo "═══════════════════════"
    echo ""
    echo "  ./scripts/demo-chaos.sh kill-pod        Kill a checkout pod (triggers health alert)"
    echo "  ./scripts/demo-chaos.sh overprovision   Scale catalog to 8 (triggers FinOps)"
    echo "  ./scripts/demo-chaos.sh unsafe-scale    Info: how to test the safety veto"
    echo "  ./scripts/demo-chaos.sh cordon-node     Cordon a worker (triggers topology change)"
    echo "  ./scripts/demo-chaos.sh reset           Restore all to initial state"
    echo ""
    ;;
esac