import json
from enum import Enum

class AgentType(Enum):
    RESOURCE_OPTIMIZATION = "resource_optimization"
    COST_MANAGEMENT = "cost_management"
    SECURITY_COMPLIANCE = "security_compliance"
    PROVISIONING = "provisioning"

from core.utils import safe_llm_call

class OrchestratorAgent:
    def __init__(self, llm_client, agents_registry):
        self.llm_client = llm_client
        self.agents_registry = agents_registry

    def _identify_intent_fast(self, query):
        """
        Fast keyword-based intent detection (no LLM required)
        """
        query_lower = query.lower()
        
        # Simple keyword matching - instant response
        if any(word in query_lower for word in ['idle', 'utilization', 'utilize', 'resize', 'underutilized', 'vm size']):
            return AgentType.RESOURCE_OPTIMIZATION
        elif any(word in query_lower for word in ['cost', 'price', 'bill', 'billing', 'expensive', 'list', 'resources', 'show']):
            return AgentType.COST_MANAGEMENT
        elif any(word in query_lower for word in ['security', 'firewall', 'nsg', 'compliance', 'secure', 'encrypt']):
            return AgentType.SECURITY_COMPLIANCE
        elif any(word in query_lower for word in ['deploy', 'create', 'provision', 'launch', 'setup', 'new vm']):
            return AgentType.PROVISIONING
        
        # Return None for ambiguous queries (will fall back to LLM)
        return None
    
    def _identify_intent(self, query):
        """
        Uses LLM to classify the user query into an AgentType.
        Falls back to fast keyword matching first.
        """
        # Try fast path first
        fast_result = self._identify_intent_fast(query)
        if fast_result is not None:
            print(f"Fast-path match: {fast_result.value}")
            return fast_result
        
        # Fall back to LLM for ambiguous queries
        print("Using LLM for intent classification...")
        prompt = f"""
        You are an Azure Cloud Orchestrator. 
        Classify the following user query into one of these categories:
        1. RESOURCE_OPTIMIZATION (keywords: idle, utilization, resize, vm size)
        2. COST_MANAGEMENT (keywords: cost, price, bill, expensive, list resources)
        3. SECURITY_COMPLIANCE (keywords: security, firewall, encryption, nsg, compliance)
        4. PROVISIONING (keywords: deploy, create, provision, new vm, launch, setup)
        
        User Query: "{query}"
        
        Return ONLY the category name exactly as written above. If unsure, default to COST_MANAGEMENT.
        """
        
        def _call_llm():
            if hasattr(self.llm_client, "models"): # Google GenAI style
                response = self.llm_client.models.generate_content(
                    model="models/gemini-2.5-flash", 
                    contents=prompt
                )
                return response.text.strip()
            else: # Azure OpenAI style (mocked for compatibility)
                return "RESOURCE_OPTIMIZATION" # Default fallback

        # Adaptation for different LLM client interfaces (Gemini/OpenAI)
        # Assuming the passed client has a generate_content or chat completion method
        try:
            text = safe_llm_call(_call_llm)
                
            # Map text to Enum
            if "RESOURCE" in text:
                return AgentType.RESOURCE_OPTIMIZATION
            elif "SECURITY" in text:
                return AgentType.SECURITY_COMPLIANCE
            elif "PROVISIONING" in text or "DEPLOY" in text or "CREATE" in text:
                return AgentType.PROVISIONING
            else:
                return AgentType.COST_MANAGEMENT
                
        except Exception as e:
            print(f"Error determining intent: {e}")
            return AgentType.COST_MANAGEMENT

    def process_query(self, query, context):
        resource_group = context.get("resource_group")
        
        # 1. Identify which agent needs to handle this
        agent_type = self._identify_intent(query)
        active_agent = self.agents_registry.get(agent_type)
        
        agents_used = [agent_type.value]
        agent_data = {}

        # 2. Execute Agent Logic
        if agent_type == AgentType.RESOURCE_OPTIMIZATION:
            agent_data = {
                "utilization": active_agent.analyze_vm_utilization(resource_group),
                "idle_vms": active_agent.identify_idle_resources(resource_group)
            }
        elif agent_type == AgentType.COST_MANAGEMENT:
            agent_data = {
                "resources": active_agent.get_resource_costs(resource_group)
            }
        elif agent_type == AgentType.SECURITY_COMPLIANCE:
            agent_data = {
                "security_scan": active_agent.check_security_posture(resource_group)
            }
        elif agent_type == AgentType.PROVISIONING:
            # For provisioning, we pass the query directly to let the agent extract params
            agent_data = active_agent.provision(query, resource_group)

        # 3. Generate response - use simple formatting for fast queries, LLM only if needed
        # For most queries, we can just return the data directly without LLM synthesis
        # This saves 2-5 seconds per query
        
        # Generate a simple response based on agent type
        if agent_type == AgentType.COST_MANAGEMENT:
            resources = agent_data.get('resources', [])
            final_response = f"Found {len(resources)} resources in {resource_group}:\n\n"
            for r in resources[:10]:  # Limit to first 10
                final_response += f"- {r['name']} ({r['type']}) in {r['location']}\n"
            if len(resources) > 10:
                final_response += f"\n... and {len(resources) - 10} more resources."
        
        elif agent_type == AgentType.RESOURCE_OPTIMIZATION:
            utilization = agent_data.get('utilization', [])
            idle_vms = agent_data.get('idle_vms', [])
            final_response = f"Resource Optimization Analysis:\n\n"
            final_response += f"VMs analyzed: {len(utilization)}\n"
            final_response += f"Idle/deallocated VMs: {len(idle_vms)}\n\n"
            if idle_vms:
                final_response += "Idle resources:\n"
                for vm in idle_vms:
                    final_response += f"- {vm['name']} ({vm['status']})\n"
        
        elif agent_type == AgentType.SECURITY_COMPLIANCE:
            security_scan = agent_data.get('security_scan', [])
            final_response = f"Security scan found {len(security_scan)} potential issues.\n\n"
            for issue in security_scan[:5]:  # Show first 5 issues
                final_response += f"- {issue}\n"
        
        elif agent_type == AgentType.PROVISIONING:
            # Provisioning might need more context, keep LLM for this
            final_prompt = f"""
            You are a helpful Cloud Assistant.
            
            User Query: {query}
            Context: {context}
            
            Provisioning result:
            {json.dumps(agent_data, indent=2)}
            
            Please provide a concise summary of what was provisioned.
            """
            try:
                def _generate_summary():
                    if hasattr(self.llm_client, "models"):
                        response = self.llm_client.models.generate_content(
                            model="models/gemini-2.5-flash", 
                            contents=final_prompt
                        )
                        return response.text.strip()
                    else:
                        return "Provisioning request processed."

                final_response = safe_llm_call(_generate_summary)
            except Exception as e:
                final_response = f"Provisioning completed. Details: {json.dumps(agent_data, indent=2)}"
        
        else:
            final_response = f"Query processed successfully. Results: {json.dumps(agent_data, indent=2)}"

        return {
            "response": final_response,
            "agents_used": agents_used,
            "data": agent_data
        }