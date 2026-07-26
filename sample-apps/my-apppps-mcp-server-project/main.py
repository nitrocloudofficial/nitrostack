import os
import json
from datetime import datetime
from azure.identity import DefaultAzureCredential
from azure.mgmt.compute import ComputeManagementClient
from azure.mgmt.resource import ResourceManagementClient
from azure.mgmt.monitor import MonitorManagementClient
from google import genai
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


# -------------------------------
# Gemini LLM Setup (Safe)
# -------------------------------
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY not set in environment variables")

gemini_client = genai.Client(api_key=GEMINI_API_KEY)


# -------------------------------
# Base Agent Class
# -------------------------------
class BaseAgent:
    def __init__(self, subscription_id, agent_name):
        if not subscription_id:
            raise ValueError("AZURE_SUBSCRIPTION_ID not set")

        self.subscription_id = subscription_id
        self.agent_name = agent_name
        self.credential = DefaultAzureCredential()

        self.compute_client = ComputeManagementClient(
            self.credential, subscription_id
        )
        self.resource_client = ResourceManagementClient(
            self.credential, subscription_id
        )
        self.monitor_client = MonitorManagementClient(
            self.credential, subscription_id
        )

    def log(self, message):
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] [{self.agent_name}] {message}")


# -------------------------------
# Resource Optimization Agent
# -------------------------------
class ResourceOptimizationAgent(BaseAgent):
    def __init__(self, subscription_id):
        super().__init__(subscription_id, "ResourceOptimizer")

    def analyze_vm_utilization(self, resource_group):
        results = []

        vms = self.compute_client.virtual_machines.list(resource_group)

        for vm in vms:
            results.append({
                "vm": vm.name,
                "current_size": vm.hardware_profile.vm_size
            })

        return results

    def identify_idle_resources(self, resource_group):
        idle = []

        vms = self.compute_client.virtual_machines.list(resource_group)

        for vm in vms:
            instance_view = self.compute_client.virtual_machines.instance_view(
                resource_group, vm.name
            )

            for status in instance_view.statuses:
                if status.code == "PowerState/deallocated":
                    idle.append({
                        "name": vm.name,
                        "type": "VM",
                        "status": "Deallocated"
                    })

        return idle


# -------------------------------
# Cost Management Agent
# -------------------------------
class CostManagementAgent(BaseAgent):
    def __init__(self, subscription_id):
        super().__init__(subscription_id, "CostManager")

    def get_resource_costs(self, resource_group):
        resources = self.resource_client.resources.list_by_resource_group(
            resource_group
        )

        return [{
            "name": r.name,
            "type": r.type,
            "location": r.location
        } for r in resources]


# -------------------------------
# Security Compliance Agent
# -------------------------------
class SecurityComplianceAgent(BaseAgent):
    def __init__(self, subscription_id):
        super().__init__(subscription_id, "SecurityCompliance")

    def check_security_posture(self, resource_group):
        vms = self.compute_client.virtual_machines.list(resource_group)

        return [{
            "vm": vm.name,
            "checks": [
                "NSG configured",
                "Disk encryption",
                "Patch compliance"
            ]
        } for vm in vms]


# -------------------------------
# AI Orchestrator
# -------------------------------
class AIOrchestrator:
    def __init__(self, subscription_id):
        self.resource_agent = ResourceOptimizationAgent(subscription_id)
        self.cost_agent = CostManagementAgent(subscription_id)
        self.security_agent = SecurityComplianceAgent(subscription_id)

    def call_llm(self, cloud_state):
        try:
            prompt = f"""
You are an Autonomous Cloud Optimization AI.

Return ONLY valid JSON.

{{
  "overall_risk": "",
  "optimization_actions": [],
  "cost_reduction_suggestions": [],
  "security_improvements": [],
  "confidence": ""
}}

Cloud State:
{json.dumps(cloud_state, indent=2)}
"""

            response = gemini_client.models.generate_content(
                model="models/gemini-2.5-flash",
                contents=prompt
            )

            # ----- Safe extraction -----
            if not response or not response.text:
                raise ValueError("Empty response from Gemini")

            cleaned = response.text.strip()

            # Remove markdown wrappers if present
            if cleaned.startswith("```"):
                cleaned = cleaned.replace("```json", "").replace("```", "").strip()

            return json.loads(cleaned)

        except Exception as e:
            print(f"[LLM ERROR] {str(e)}")

            return {
                "overall_risk": "UNKNOWN",
                "optimization_actions": [],
                "cost_reduction_suggestions": [],
                "security_improvements": [],
                "confidence": "LOW (Fallback Mode)"
            }

    def process_request(self, resource_group):

        cloud_state = {
            "resource_optimization": {
                "utilization": self.resource_agent.analyze_vm_utilization(resource_group),
                "idle_resources": self.resource_agent.identify_idle_resources(resource_group)
            },
            "cost_management": self.cost_agent.get_resource_costs(resource_group),
            "security": self.security_agent.check_security_posture(resource_group)
        }

        llm_decision = self.call_llm(cloud_state)

        return {
            "cloud_state": cloud_state,
            "ai_decision": llm_decision
        }


# -------------------------------
# Main Execution
# -------------------------------
if __name__ == "__main__":

    SUBSCRIPTION_ID = os.getenv("AZURE_SUBSCRIPTION_ID")
    RESOURCE_GROUP = os.getenv("AZURE_RESOURCE_GROUP")

    if not RESOURCE_GROUP:
        raise ValueError("AZURE_RESOURCE_GROUP not set")

    orchestrator = AIOrchestrator(SUBSCRIPTION_ID)

    results = orchestrator.process_request(RESOURCE_GROUP)

    print(json.dumps(results, indent=2))
