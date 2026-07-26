from agents.base_agent import BaseAgent

class SecurityComplianceAgent(BaseAgent):
    def __init__(self, subscription_id):
        super().__init__(subscription_id, "SecurityCompliance")

    def check_security_posture(self, resource_group):
        self.log(f"Scanning security posture for {resource_group}...")
        vms = self.compute_client.virtual_machines.list(resource_group)

        return [{
            "vm": vm.name,
            "checks": [
                "NSG configured",
                "Disk encryption",
                "Patch compliance"
            ]
        } for vm in vms]