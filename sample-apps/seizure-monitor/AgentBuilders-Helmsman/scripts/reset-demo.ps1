# Reset the workload to 5 replicas between rehearsals.
kubectl scale deploy/checkout-service -n shop --replicas=5
kubectl get pods -n shop
