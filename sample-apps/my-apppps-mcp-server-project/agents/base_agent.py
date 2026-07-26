import os
from datetime import datetime
from azure.identity import DefaultAzureCredential
from azure.mgmt.compute import ComputeManagementClient
from azure.mgmt.resource import ResourceManagementClient
from azure.mgmt.monitor import MonitorManagementClient

class BaseAgent:
    def __init__(self, subscription_id, agent_name):
        if not subscription_id:
            raise ValueError("AZURE_SUBSCRIPTION_ID not set")

        self.subscription_id = subscription_id
        self.agent_name = agent_name
        self.credential = DefaultAzureCredential()

        # Initialize common clients
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