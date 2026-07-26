from azure.identity import DefaultAzureCredential
from azure.mgmt.compute import ComputeManagementClient
from azure.mgmt.network import NetworkManagementClient
from azure.mgmt.resource import ResourceManagementClient
from azure.mgmt.storage import StorageManagementClient
from azure.mgmt.sql import SqlManagementClient
import os
import random
import string
import time
import json
from core.utils import safe_llm_call

class ProvisioningAgent:
    """
    Agent for provisioning Azure resources based on natural language requests
    """
    
    def __init__(self, subscription_id, llm_client=None):
        self.subscription_id = subscription_id
        self.llm_client = llm_client
        self.credential = DefaultAzureCredential()
        
        self.resource_client = ResourceManagementClient(self.credential, subscription_id)
        self.compute_client = ComputeManagementClient(self.credential, subscription_id)
        self.network_client = NetworkManagementClient(self.credential, subscription_id)
        self.storage_client = StorageManagementClient(self.credential, subscription_id)
        self.sql_client = SqlManagementClient(self.credential, subscription_id)
        
    def _generate_password(self, length=16):
        """Generate a secure random password"""
        alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
        return ''.join(random.choice(alphabet) for i in range(length))
        
    def analyze_request(self, query):
        """
        Analyze natural language query to extract provisioning parameters
        """
        prompt = f"""
        You are an Azure Infrastructure Expert.
        Extract parameters from the user query to provision an Azure resource.
        
        Supported Resource Types: 
        - "vm" (Virtual Machine)
        - "storage" (Storage Account)
        - "sql" (SQL Serve & Database)
        
        User Query: "{query}"
        
        Return JSON ONLY. Example formats:
        
        For VM:
        {{
            "type": "vm",
            "name": "vm-name",
            "os_type": "Linux",
            "dist": "Ubuntu",
            "size": "Standard_B1s",
            "location": "eastus"
        }}
        
        For Storage:
        {{
            "type": "storage",
            "name": "storageaccountname",
            "redundancy": "Standard_LRS", 
            "location": "eastus"
        }}
        
        For SQL:
        {{
            "type": "sql",
            "name": "sql-server-name",
            "db_name": "db-name",
            "sku": "Basic",
            "location": "eastus"
        }}
        
        Defaults:
        - location: {os.getenv('AZURE_REGION', 'eastus')}
        - vm size: Standard_B1s
        - storage redundancy: Standard_LRS
        - sql sku: Basic
        
        If name is not specified, generate a random one (like vm-1234, store456).
        """
        
        try:
            def _analyze():
                if hasattr(self.llm_client, "models"):
                    response = self.llm_client.models.generate_content(
                        model="models/gemini-2.5-flash",
                        contents=prompt
                    )
                    text = response.text.strip()
                    # Clean markdown
                    if text.startswith("```json"):
                        text = text[7:]
                    if text.endswith("```"):
                        text = text[:-3]
                    return json.loads(text)
                else:
                    # Fallback mock
                    return {
                        "type": "vm",
                        "name": f"vm-{random.randint(1000,9999)}",
                        "os_type": "Linux",
                        "dist": "Ubuntu",
                        "size": "Standard_B1s",
                        "location": os.getenv('AZURE_REGION', 'eastus')
                    }

            return safe_llm_call(_analyze)
        except Exception as e:
            print(f"Error parsing request: {e}")
            return {
                "type": "vm",
                "name": f"vm-{random.randint(1000,9999)}",
                "os_type": "Linux",
                "dist": "Ubuntu",
                "size": "Standard_B1s",
                "location": os.getenv('AZURE_REGION', 'eastus')
            }

    def provision(self, query, resource_group):
        """
        Main entry point for provisioning
        """
        print(f"Analyzing provisioning request: {query}")
        params = self.analyze_request(query)
        resource_type = params.get("type", "vm")
        
        try:
            if resource_type == "vm":
                return self._provision_vm(params, resource_group)
            elif resource_type == "storage":
                return self._provision_storage(params, resource_group)
            elif resource_type == "sql":
                return self._provision_sql(params, resource_group)
            else:
                return {"status": "failed", "message": f"Unsupported resource type: {resource_type}"}
        except Exception as e:
            print(f"Provisioning error: {e}")
            return {"status": "failed", "message": str(e)}

    def _provision_storage(self, params, resource_group):
        name = params.get("name", f"store{random.randint(1000,9999)}").lower().replace("-", "")[:24]
        location = params.get("location", "eastus")
        sku = params.get("redundancy", "Standard_LRS")
        
        print(f"Creating Storage Account {name} in {location}...")
        
        poller = self.storage_client.storage_accounts.begin_create(
            resource_group,
            name,
            {
                "location": location,
                "sku": {"name": sku},
                "kind": "StorageV2"
            }
        )
        account = poller.result()
        
        return {
            "status": "success",
            "message": f"Storage Account created: {name}",
            "details": {
                "name": name,
                "id": account.id,
                "primary_endpoints": account.primary_endpoints.as_dict()
            }
        }

    def _provision_sql(self, params, resource_group):
        server_name = params.get("name", f"sql-{random.randint(1000,9999)}").lower()
        db_name = params.get("db_name", "my-db")
        location = params.get("location", "eastus")
        admin_user = "sqladmin"
        admin_pass = self._generate_password()
        
        print(f"Creating SQL Server {server_name} in {location}...")
        
        # 1. Create Server
        poller = self.sql_client.servers.begin_create_or_update(
            resource_group,
            server_name,
            {
                "location": location,
                "administrator_login": admin_user,
                "administrator_login_password": admin_pass
            }
        )
        server = poller.result()
        
        # 2. Create Firewall Rule (Allow Azure Services)
        print("Configuring firewall...")
        self.sql_client.firewall_rules.create_or_update(
            resource_group,
            server_name,
            "AllowAzureServices",
            {
                "start_ip_address": "0.0.0.0",
                "end_ip_address": "0.0.0.0"
            }
        )
        
        # 3. Create Database
        print(f"Creating Database {db_name}...")
        poller = self.sql_client.databases.begin_create_or_update(
            resource_group,
            server_name,
            db_name,
            {
                "location": location,
                "sku": {"name": "Basic"}
            }
        )
        db = poller.result()
        
        return {
            "status": "success",
            "message": f"SQL Database created: {server_name}/{db_name}",
            "details": {
                "server": server_name,
                "database": db_name,
                "admin_user": admin_user,
                "admin_password": admin_pass,
                "fqdn": server.fully_qualified_domain_name
            }
        }

    def _provision_vm(self, params, resource_group):
        vm_name = params.get('name', f"vm-{random.randint(1000,9999)}")
        location = params.get('location', 'eastus')
        size = params.get('size', 'Standard_B1s')
        
        print(f"Starting provisioning for {vm_name} in {location} ({size})")
        
        # ... (Existing VM creation logic mostly same, simplifying for brevity/clarity) ...
        # Create Public IP
        poller = self.network_client.public_ip_addresses.begin_create_or_update(
            resource_group, f"{vm_name}-ip",
            {"location": location, "sku": {"name": "Standard"}, "public_ip_allocation_method": "Static", "public_ip_address_version": "IPv4"}
        )
        public_ip = poller.result()
        
        # Create VNET/Subnet (Quick setup)
        vnet_name = "default-vnet"
        try:
            subnet = self.network_client.subnets.get(resource_group, vnet_name, "default")
        except:
            # Create if not exists
            self.network_client.virtual_networks.begin_create_or_update(
                resource_group, vnet_name,
                {"location": location, "address_space": {"address_prefixes": ["10.0.0.0/16"]}}
            ).result()
            subnet = self.network_client.subnets.begin_create_or_update(
                resource_group, vnet_name, "default", {"address_prefix": "10.0.0.0/24"}
            ).result()

        # Create NIC
        poller = self.network_client.network_interfaces.begin_create_or_update(
            resource_group, f"{vm_name}-nic",
            {
                "location": location,
                "ip_configurations": [{
                    "name": "ipconfig1",
                    "subnet": {"id": subnet.id},
                    "public_ip_address": {"id": public_ip.id}
                }]
            }
        )
        nic = poller.result()
        
        # Create VM
        admin_user = "azureuser"
        admin_pass = self._generate_password()
        
        poller = self.compute_client.virtual_machines.begin_create_or_update(
            resource_group, vm_name,
            {
                "location": location,
                "hardware_profile": {"vm_size": size},
                "storage_profile": {
                    "image_reference": {
                        "publisher": "Canonical", "offer": "0001-com-ubuntu-server-jammy", "sku": "22_04-lts", "version": "latest"
                    },
                    "os_disk": {"create_option": "FromImage"}
                },
                "os_profile": {
                    "computer_name": vm_name, "admin_username": admin_user, "admin_password": admin_pass
                },
                "network_profile": {"network_interfaces": [{"id": nic.id}]}
            }
        )
        vm = poller.result()
        
        return {
            "status": "success",
            "message": f"VM created: {vm_name}",
            "details": {
                "vm_name": vm_name,
                "public_ip": public_ip.ip_address,
                "admin_user": admin_user,
                "admin_password": admin_pass
            }
        }
