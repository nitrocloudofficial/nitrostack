import os
from typing import Optional, List
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, HTTPException, BackgroundTasks, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import base64
import tempfile

# --- New Imports for Orchestrator ---
from agents.orchestrator import OrchestratorAgent, AgentType
from core.llm import get_azure_openai_client

# Assuming your agents are accessible from 'main' or their respective files
# Adjust import paths if you fully separated them into files (e.g., resource_agent.py)
from agents.resource_agent import ResourceOptimizationAgent
from agents.cost_agent import CostManagementAgent
from agents.security_agent import SecurityComplianceAgent
from agents.provisioning_agent import ProvisioningAgent

# Import vision agents for image-to-Bicep conversion
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), 'core'))
try:
    from core.vision import GeminiVisionAgent, GeminiBicepAgent
except ImportError:
    GeminiVisionAgent = None
    GeminiBicepAgent = None

# Import deployment agent for container deployments
try:
    from agents.deployment_agent import DeploymentAgent
except ImportError:
    DeploymentAgent = None

load_dotenv()

# -------------------------------------------------------------------------
# App Definition & Global State
# -------------------------------------------------------------------------
app = FastAPI(
    title="Azure Agentic Cloud API",
    description="AI-powered autonomous cloud management for Azure",
    version="1.1.0"
)

# Add CORS middleware to allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],  # Frontend dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Azure Agentic Cloud API is running", "docs_url": "/docs"}

# Global instances
orchestrator: Optional[OrchestratorAgent] = None
agents_registry = {}

@app.on_event("startup")
async def startup_event():
    """Initialize orchestrator and agents on startup to reuse connections"""
    global orchestrator, agents_registry
    
    print("Initializing Azure Agents and LLM...")
    
    try:
        subscription_id = os.getenv("AZURE_SUBSCRIPTION_ID")
        if not subscription_id:
            print("WARNING: AZURE_SUBSCRIPTION_ID not set.")

        llm_client = get_azure_openai_client()
        
        # Initialize agents once and store in registry
        agents_registry = {
            AgentType.RESOURCE_OPTIMIZATION: ResourceOptimizationAgent(subscription_id),
            AgentType.COST_MANAGEMENT: CostManagementAgent(subscription_id),
            AgentType.SECURITY_COMPLIANCE: SecurityComplianceAgent(subscription_id),
            AgentType.PROVISIONING: ProvisioningAgent(subscription_id, llm_client)
        }
        
        orchestrator = OrchestratorAgent(llm_client, agents_registry)
        print("System initialized successfully.")
        
    except Exception as e:
        print(f"Startup Error: {e}")

# -------------------------------------------------------------------------
# Pydantic Models
# -------------------------------------------------------------------------
class QueryRequest(BaseModel):
    query: str
    resource_group: Optional[str] = None

class OptimizationRequest(BaseModel):
    resource_group: str
    auto_apply: bool = False

class AgentResponse(BaseModel):
    status: str
    results: dict
    recommendations: Optional[List[dict]] = None

# -------------------------------------------------------------------------
# Core Endpoints
# -------------------------------------------------------------------------

@app.get("/health")
async def health_check():
    """Health check that also reports orchestrator status"""
    return {
        "status": "healthy", 
        "service": "azure-agent-system",
        "orchestrator_initialized": orchestrator is not None
    }

@app.get("/ready")
async def readiness_check():
    return {"status": "ready"}

@app.post("/query")
async def process_query(request: QueryRequest):
    """
    Smart endpoint - automatically routes natural language to appropriate agents
    """
    if not orchestrator:
        raise HTTPException(status_code=503, detail="Orchestrator not initialized")
    
    try:
        result = orchestrator.process_query(
            query=request.query,
            context={
                "resource_group": request.resource_group or os.getenv("AZURE_RESOURCE_GROUP")
            }
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# -------------------------------------------------------------------------
# Legacy / Specific Endpoints (Preserved)
# -------------------------------------------------------------------------

@app.post("/optimize/resources", response_model=AgentResponse)
async def optimize_resources(request: OptimizationRequest, background_tasks: BackgroundTasks):
    """Directly trigger resource optimization agent"""
    try:
        # Reuse global agent if available, else instantiate (fallback)
        if AgentType.RESOURCE_OPTIMIZATION in agents_registry:
            agent = agents_registry[AgentType.RESOURCE_OPTIMIZATION]
        else:
            subscription_id = os.getenv("AZURE_SUBSCRIPTION_ID")
            agent = ResourceOptimizationAgent(subscription_id)
        
        utilization = agent.analyze_vm_utilization(request.resource_group)
        idle_resources = agent.identify_idle_resources(request.resource_group)
        
        return AgentResponse(
            status="success",
            results={
                "utilization": utilization,
                "idle_resources": idle_resources
            },
            recommendations=[
                {"type": "optimization", "action": "Review idle resources for deletion"},
                {"type": "cost", "action": "Consider resizing underutilized VMs"}
            ]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze/costs", response_model=AgentResponse)
async def analyze_costs(request: OptimizationRequest):
    """Directly trigger cost management agent"""
    try:
        if AgentType.COST_MANAGEMENT in agents_registry:
            agent = agents_registry[AgentType.COST_MANAGEMENT]
        else:
            subscription_id = os.getenv("AZURE_SUBSCRIPTION_ID")
            agent = CostManagementAgent(subscription_id)
        
        costs = agent.get_resource_costs(request.resource_group)
        # Assuming generate_savings_recommendations exists in your agent, or we skip it
        recommendations = [] 
        if hasattr(agent, "generate_savings_recommendations"):
            recommendations = agent.generate_savings_recommendations(request.resource_group)
        
        return AgentResponse(
            status="success",
            results={"costs": costs},
            recommendations=recommendations
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/check/security", response_model=AgentResponse)
async def check_security(request: OptimizationRequest):
    """Directly trigger security agent"""
    try:
        if AgentType.SECURITY_COMPLIANCE in agents_registry:
            agent = agents_registry[AgentType.SECURITY_COMPLIANCE]
        else:
            subscription_id = os.getenv("AZURE_SUBSCRIPTION_ID")
            agent = SecurityComplianceAgent(subscription_id)
        
        issues = agent.check_security_posture(request.resource_group)
        
        return AgentResponse(
            status="success",
            results={"security_issues": issues}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# -------------------------------------------------------------------------
# Vision Endpoint (Image to Bicep)
# -------------------------------------------------------------------------

@app.post("/vision/analyze")
async def analyze_architecture_image(file: UploadFile = File(...)):
    """
    Upload an architecture diagram image and generate Bicep deployment code
    """
    if not GeminiVisionAgent or not GeminiBicepAgent:
        raise HTTPException(
            status_code=501,
            detail="Vision agents not available. Check core/vision.py import."
        )
    
    # Validate file type
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    try:
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name
        
        # Initialize vision agents
        vision_agent = GeminiVisionAgent()
        bicep_agent = GeminiBicepAgent()
        
        # Analyze image
        print(f"Analyzing uploaded image: {file.filename}")
        architecture_data = vision_agent.analyze_image(tmp_path)
        
        if not architecture_data:
            raise HTTPException(
                status_code=422,
                detail="Could not extract architecture information from image"
            )
        
        # Generate Bicep code
        print("Generating Bicep code from architecture...")
        bicep_code = bicep_agent.generate_bicep(architecture_data)
        
        if not bicep_code:
            raise HTTPException(
                status_code=422,
                detail="Could not generate Bicep code from architecture data"
            )
        
        # Clean up temp file
        os.unlink(tmp_path)
        
        return {
            "status": "success",
            "architecture_data": architecture_data,
            "bicep_code": bicep_code
        }
        
    except HTTPException:
        raise
    except Exception as e:
        # Clean up temp file on error
        if 'tmp_path' in locals():
            try:
                os.unlink(tmp_path)
            except:
                pass
        raise HTTPException(status_code=500, detail=str(e))

# -------------------------------------------------------------------------
# Deployment Endpoints (Railway-style)
# -------------------------------------------------------------------------

# Global storage for deployment tracking (use Redis/DB in production)
deployments_store = {}

@app.post("/deploy/upload")
async def upload_deployment_file(file: UploadFile = File(...)):
    """
    Upload project zip file for deployment
    """
    if not DeploymentAgent:
        raise HTTPException(
            status_code=501,
            detail="Deployment agent not available"
        )
    
    if not file.filename.endswith('.zip'):
        raise HTTPException(status_code=400, detail="Only .zip files are supported")
    
    try:
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix='.zip') as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name
        
        # Initialize deployment agent
        subscription_id = os.getenv('AZURE_SUBSCRIPTION_ID')
        deployment_agent = DeploymentAgent(subscription_id)
        
        # Upload to Azure Blob Storage
        upload_result = deployment_agent.upload_to_storage(tmp_path)
        
        # Clean up temp file
        os.unlink(tmp_path)
        
        return {
            "status": "success",
            "upload_id": upload_result["upload_id"],
            "message": "Project uploaded successfully"
        }
        
    except Exception as e:
        if 'tmp_path' in locals():
            try:
                os.unlink(tmp_path)
            except:
                pass
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/deploy/start")
async def start_deployment(request: dict):
    """
    Start deployment to Azure Container Instances
    """
    if not DeploymentAgent:
        raise HTTPException(status_code=501, detail="Deployment agent not available")
    
    upload_id = request.get('upload_id')
    app_name = request.get('app_name', 'myapp')
    
    if not upload_id:
        raise HTTPException(status_code=400, detail="upload_id is required")
    
    try:
        subscription_id = os.getenv('AZURE_SUBSCRIPTION_ID')
        resource_group = os.getenv('AZURE_RESOURCE_GROUP')
        
        deployment_agent = DeploymentAgent(subscription_id)
        
        # Start deployment
        result = deployment_agent.deploy_to_container(
            upload_id,
            app_name,
            resource_group
        )
        
        # Store deployment info
        deployments_store[result['deployment_id']] = {
            'container_group_name': result['container_group_name'],
            'app_name': app_name,
            'status': result['status']
        }
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/deploy/status/{deployment_id}")
async def get_deployment_status(deployment_id: str):
    """
    Get deployment status
    """
    if not DeploymentAgent:
        raise HTTPException(status_code=501, detail="Deployment agent not available")
    
    deployment_info = deployments_store.get(deployment_id)
    if not deployment_info:
        raise HTTPException(status_code=404, detail="Deployment not found")
    
    try:
        subscription_id = os.getenv('AZURE_SUBSCRIPTION_ID')
        resource_group = os.getenv('AZURE_RESOURCE_GROUP')
        
        deployment_agent = DeploymentAgent(subscription_id)
        
        status = deployment_agent.get_deployment_status(
            deployment_info['container_group_name'],
            resource_group
        )
        
        return status
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)