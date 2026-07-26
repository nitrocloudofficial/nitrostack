from agents.base_agent import BaseAgent

class ResourceOptimizationAgent(BaseAgent):
    def __init__(self, subscription_id):
        super().__init__(subscription_id, "ResourceOptimizer")

    def analyze_vm_utilization(self, resource_group):
        self.log(f"Analyzing VM utilization in {resource_group}...")
        results = []
        vms = self.compute_client.virtual_machines.list(resource_group)

        for vm in vms:
            results.append({
                "vm": vm.name,
                "current_size": vm.hardware_profile.vm_size
            })
        return results

    def identify_idle_resources(self, resource_group):
        self.log(f"Checking for idle resources in {resource_group}...")
        idle = []
        vms = self.compute_client.virtual_machines.list(resource_group)

        for vm in vms:
            instance_view = self.compute_client.virtual_machines.instance_view(
                resource_group, vm.name
            )
            
            # Check for deallocated VMs
            for status in instance_view.statuses:
                if status.code == "PowerState/deallocated":
                    idle.append({
                        "name": vm.name,
                        "type": "VM",
                        "status": "Deallocated"
                    })
        return idle