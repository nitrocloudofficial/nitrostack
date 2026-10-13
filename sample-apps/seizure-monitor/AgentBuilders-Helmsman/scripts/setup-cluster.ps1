# Phase 1: create the kind cluster and deploy the guarded workload.
# Run from the helmsman/ folder in PowerShell.  Requires: docker, kind, kubectl.

$ErrorActionPreference = "Stop"

kind create cluster --name helmsman
kubectl create namespace shop
kubectl apply -f manifests/demo.yaml

Write-Host "Waiting for PodDisruptionBudget status to populate..."
$allowed = $null
for ($i = 0; $i -lt 30; $i++) {
  $allowed = (kubectl get pdb -n shop checkout-pdb -o jsonpath='{.status.disruptionsAllowed}' 2>$null)
  if ($allowed -ne "" -and $allowed -ne $null) { break }
  Start-Sleep -Seconds 2
}
Write-Host "PDB disruptionsAllowed = $allowed"
kubectl get pods,pdb -n shop
Write-Host "Cluster ready. Context should be kind-helmsman."
