from azure.mgmt.containerinstance import ContainerInstanceManagementClient
from azure.mgmt.storage import StorageManagementClient
from azure.mgmt.containerregistry import ContainerRegistryManagementClient
from azure.storage.blob import BlobServiceClient
from azure.identity import DefaultAzureCredential
import os
import zipfile
import tempfile
import uuid
import json
import time
import subprocess

class DeploymentAgent:
    """
    Agent for deploying user applications to Azure Container Instances
    """
    
    # Dockerfile templates for different project types
    DOCKERFILE_TEMPLATES = {
        "nodejs": """FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
""",
        "python": """FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["python", "app.py"]
""",
        "python-flask": """FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 5000
CMD ["python", "app.py"]
""",
        "python-fastapi": """FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
""",
        "go": """FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY go.* ./
RUN go mod download
COPY . .
RUN go build -o main .

FROM alpine:latest
WORKDIR /root/
COPY --from=builder /app/main .
EXPOSE 8080
CMD ["./main"]
""",
        "static": """FROM nginx:alpine
# Copy all project files to nginx html directory
COPY . /usr/share/nginx/html/
# Ensure nginx can read the files
RUN chmod -R 755 /usr/share/nginx/html && \
    chown -R nginx:nginx /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
"""
    }
    
    def __init__(self, subscription_id):
        self.subscription_id = subscription_id
        self.credential = DefaultAzureCredential()
        self.container_client = ContainerInstanceManagementClient(
            self.credential,
            subscription_id
        )
        self.acr_client = ContainerRegistryManagementClient(
            self.credential,
            subscription_id
        )
        
    def upload_to_storage(self, file_path, container_name="deployments"):
        """
        Upload project files to Azure Blob Storage
        """
        try:
            # Get storage account connection string from env
            connection_string = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
            if not connection_string:
                raise ValueError("AZURE_STORAGE_CONNECTION_STRING not set")
            
            blob_service_client = BlobServiceClient.from_connection_string(
                connection_string
            )
            
            # Create container if it doesn't exist
            try:
                container_client = blob_service_client.get_container_client(container_name)
                if not container_client.exists():
                    blob_service_client.create_container(container_name)
            except:
                blob_service_client.create_container(container_name)
            
            # Upload file with unique name
            blob_name = f"{uuid.uuid4()}.zip"
            blob_client = blob_service_client.get_blob_client(
                container=container_name,
                blob=blob_name
            )
            
            # Get file size for progress tracking
            file_size = os.path.getsize(file_path)
            print(f"Uploading {file_size / 1024 / 1024:.2f} MB to Azure Storage...")
            
            with open(file_path, "rb") as data:
                blob_client.upload_blob(
                    data, 
                    overwrite=True,
                    timeout=300,  # 5 minutes timeout per chunk
                    max_concurrency=4  # Parallel upload for faster speeds
                )
            
            print(f"Upload complete: {blob_name}")
            
            return {
                "upload_id": blob_name,
                "url": blob_client.url
            }
        except Exception as e:
            print(f"Upload error: {str(e)}")
            raise Exception(f"Upload failed: {str(e)}")
    
    def download_from_storage(self, upload_id, container_name="deployments"):
        """
        Download uploaded zip from blob storage
        """
        try:
            connection_string = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
            blob_service_client = BlobServiceClient.from_connection_string(connection_string)
            
            blob_client = blob_service_client.get_blob_client(
                container=container_name,
                blob=upload_id
            )
            
            # Download to temp file
            temp_zip = tempfile.NamedTemporaryFile(delete=False, suffix='.zip')
            with open(temp_zip.name, "wb") as f:
                f.write(blob_client.download_blob().readall())
            
            return temp_zip.name
        except Exception as e:
            raise Exception(f"Download failed: {str(e)}")
    
    def extract_project(self, zip_path):
        """
        Extract zip file to temporary directory
        """
        try:
            extract_dir = tempfile.mkdtemp()
            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                zip_ref.extractall(extract_dir)
            
            print(f"Extracted project to: {extract_dir}")
            return extract_dir
        except Exception as e:
            raise Exception(f"Extraction failed: {str(e)}")
    
    def detect_project_type(self, project_dir):
        """
        Auto-detect project type based on files present
        """
        # Check all files recursively
        all_files = []
        for root, dirs, files in os.walk(project_dir):
            all_files.extend(files)
        
        files_in_root = os.listdir(project_dir)
        
        # Priority 1: Check for Node.js SERVER apps (not just HTML with package.json)
        if 'package.json' in files_in_root:
            pkg_path = os.path.join(project_dir, 'package.json')
            try:
                with open(pkg_path, 'r') as f:
                    pkg_data = json.load(f)
                    # Only treat as Node.js if it has a start script (actual server)
                    if 'scripts' in pkg_data and 'start' in pkg_data['scripts']:
                        return 'nodejs', 3000
            except:
                pass
        
        # Priority 2: Python apps
        if 'requirements.txt' in files_in_root:
            req_path = os.path.join(project_dir, 'requirements.txt')
            with open(req_path, 'r') as f:
                content = f.read().lower()
                if 'flask' in content:
                    return 'python-flask', 5000
                elif 'fastapi' in content or 'uvicorn' in content:
                    return 'python-fastapi', 8000
                else:
                    return 'python', 8000
        
        # Priority 3: Go apps
        if 'go.mod' in files_in_root:
            return 'go', 8080
        
        # Default: Treat everything else as static HTML site
        # This handles pure HTML/CSS/JS projects
        return 'static', 80
    
    def generate_dockerfile(self, project_dir, project_type):
        """
        Generate Dockerfile for the project
        """
        dockerfile_path = os.path.join(project_dir, 'Dockerfile')
        
        # Check if Dockerfile already exists
        if os.path.exists(dockerfile_path):
            print("Using existing Dockerfile")
            return dockerfile_path
        
        # Generate Dockerfile from template
        template = self.DOCKERFILE_TEMPLATES.get(project_type, self.DOCKERFILE_TEMPLATES['static'])
        
        with open(dockerfile_path, 'w') as f:
            f.write(template)
        
        print(f"Generated Dockerfile for {project_type}")
        return dockerfile_path
    
    def build_and_push_to_acr(self, project_dir, image_name, resource_group):
        """
        Build Docker image and push to ACR using Docker CLI
        """
        try:
            acr_name = os.getenv('AZURE_CONTAINER_REGISTRY_NAME', 'sweproj123')
            acr_url = f"{acr_name}.azurecr.io"
            full_image_name = f"{acr_url}/{image_name}:latest"
            
            print(f"Building image: {full_image_name}")
            
            # Login to ACR
            login_cmd = f"az acr login --name {acr_name}"
            result = subprocess.run(login_cmd, shell=True, capture_output=True, text=True)
            if result.returncode != 0:
                raise Exception(f"ACR login failed: {result.stderr}")
            
            print("Logged into ACR")
            
            # Build image for AMD64 architecture (required for Azure Container Instances)
            build_cmd = f"docker build --platform linux/amd64 -t {full_image_name} {project_dir}"
            print(f"Running: {build_cmd}")
            result = subprocess.run(build_cmd, shell=True, capture_output=True, text=True)
            if result.returncode != 0:
                raise Exception(f"Docker build failed: {result.stderr}")
            
            print("Image built successfully")
            
            # Push to ACR
            push_cmd = f"docker push {full_image_name}"
            print(f"Pushing to ACR...")
            result = subprocess.run(push_cmd, shell=True, capture_output=True, text=True)
            if result.returncode != 0:
                raise Exception(f"Docker push failed: {result.stderr}")
            
            print("Image pushed to ACR")
            
            return full_image_name
        except Exception as e:
            raise Exception(f"Build/Push failed: {str(e)}")
    
    def deploy_to_container(self, upload_id, app_name, resource_group):
        """
        Deploy application to Azure Container Instances with custom image
        """
        try:
            deployment_id = str(uuid.uuid4())[:8]
            container_group_name = f"{app_name}-{deployment_id}"
            
            print(f"Starting deployment for {container_group_name}")
            
            # Download and extract project
            print("Downloading project...")
            zip_path = self.download_from_storage(upload_id)
            
            print("Extracting project...")
            project_dir = self.extract_project(zip_path)
            
            # Detect project type
            print("Detecting project type...")
            project_type, port = self.detect_project_type(project_dir)
            print(f"Detected: {project_type} (port {port})")
            
            # Generate Dockerfile
            print("Generating Dockerfile...")
            self.generate_dockerfile(project_dir, project_type)
            
            # Build and push to ACR
            print("Building and pushing to ACR...")
            image_name = self.build_and_push_to_acr(
                project_dir,
                f"app-{deployment_id}",
                resource_group
            )
            
            # Get region from environment variable
            location = os.getenv("AZURE_REGION", "centralindia")
            
            # Get ACR credentials
            acr_name = os.getenv('AZURE_CONTAINER_REGISTRY_NAME', 'sweproj123')
            acr_url = f"{acr_name}.azurecr.io"
            
            # Deploy container with custom image
            print(f"Deploying container to ACI...")
            container_group = {
                "location": location,
                "containers": [{
                    "name": container_group_name,
                    "image": image_name,
                    "resources": {
                        "requests": {
                            "cpu": 1.0,
                            "memory_in_gb": 1.5
                        }
                    },
                    "ports": [{"port": port}]
                }],
                "os_type": "Linux",
                "ip_address": {
                    "type": "Public",
                    "ports": [{"protocol": "TCP", "port": port}]
                },
                "image_registry_credentials": [{
                    "server": acr_url,
                    "username": acr_name,
                    "password": os.getenv('AZURE_CONTAINER_REGISTRY_PASSWORD')
                }],
                "restart_policy": "Always"
            }
            
            # Start deployment (async operation)
            poller = self.container_client.container_groups.begin_create_or_update(
                resource_group,
                container_group_name,
                container_group
            )
            
            # Cleanup
            os.unlink(zip_path)
            
            print(f"Deployment initiated: {container_group_name}")
            
            return {
                "deployment_id": deployment_id,
                "container_group_name": container_group_name,
                "status": "deploying",
                "message": f"Deploying {project_type} application"
            }
            
        except Exception as e:
            print(f"Deployment error: {str(e)}")
            raise Exception(f"Deployment failed: {str(e)}")
    
    def get_deployment_status(self, container_group_name, resource_group):
        """
        Get the status of a deployment
        """
        try:
            container_group = self.container_client.container_groups.get(
                resource_group,
                container_group_name
            )
            
            # Check provisioning state (this is more reliable than instance_view)
            provisioning_state = container_group.provisioning_state
            
            # Get container state if available
            containers_state = "Unknown"
            if container_group.containers and len(container_group.containers) > 0:
                first_container = container_group.containers[0]
                if hasattr(first_container, 'instance_view') and first_container.instance_view:
                    if first_container.instance_view.current_state:
                        containers_state = first_container.instance_view.current_state.state
            
            # Get the public IP if available
            url = None
            if container_group.ip_address:
                # The IP is directly on the ip_address object
                ip = container_group.ip_address.ip
                if ip:
                    url = f"http://{ip}"
            
            # Determine overall status
            is_succeeded = provisioning_state == "Succeeded"
            is_running = containers_state in ["Running", "Succeeded"]
            
            return {
                "status": "succeeded" if (is_succeeded and is_running) else "deploying",
                "state": f"{provisioning_state} - Container: {containers_state}",
                "url": url,
                "message": f"Provisioning: {provisioning_state}, Container: {containers_state}"
            }
        except Exception as e:
            return {
                "status": "failed",
                "message": str(e)
            }
    
    def get_logs(self, container_name, resource_group):
        """
        Get deployment logs from container
        """
        try:
            logs = self.container_client.containers.list_logs(
                resource_group,
                container_name,
                container_name  # container name within the group
            )
            return logs.content.split('\n') if logs.content else []
        except:
            return []
