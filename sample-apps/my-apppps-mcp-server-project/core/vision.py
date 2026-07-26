import os
import json
import requests
import base64
import mimetypes
import re

print("\n--- NEW v3.1 SCRIPT RUNNING (Fixes Applied) ---")

# --- 1. SETUP ---
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    GOOGLE_API_KEY = input("Enter your Google API Key: ").strip()

# --- 2. AUTO-DISCOVERY FUNCTION ---
def find_valid_model(api_key):
    """
    Asks Google: 'Which models can I use?'
    Returns the best available Vision model.
    """
    print("🔎 Checking available models for your API Key...")
    url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
    
    try:
        response = requests.get(url)
        if response.status_code != 200:
            print(f" Failed to list models. Status: {response.status_code}")
            print(f"   Response: {response.text}")
            return None
            
        data = response.json()
        available_models = [m['name'] for m in data.get('models', [])]
        
        priorities = [
            "models/gemini-1.5-flash",
            "models/gemini-1.5-flash-001",
            "models/gemini-1.5-flash-latest",
            "models/gemini-1.5-pro",
            "models/gemini-pro-vision"
        ]
        
        for priority in priorities:
            if priority in available_models:
                print(f" Found available model: {priority}")
                return priority.replace("models/", "") 
        
        print("Preferred models missing. Searching for fallback...")
        for m in data.get('models', []):
            if "generateContent" in m.get('supportedGenerationMethods', []):
                name = m['name']
                if "vision" in name or "flash" in name or "pro" in name:
                    print(f"Fallback model selected: {name}")
                    return name.replace("models/", "")

        print("No suitable Vision models found in your account.")
        return None
        
    except Exception as e:
        print(f"Network error checking models: {e}")
        return None

# Get the working model name dynamically
CURRENT_MODEL = find_valid_model(GOOGLE_API_KEY)

# --- 3. VISION AGENT ---
class GeminiVisionAgent:
    def analyze_image(self, image_path: str) -> dict:
        if not CURRENT_MODEL:
            print("Cannot proceed: No valid model found.")
            return {}

        print(f"🔍 [Vision Agent] Analyzing image using '{CURRENT_MODEL}'...")
        
        if not os.path.exists(image_path):
            print(f"Error: File '{image_path}' not found.")
            return {}
        
        mime_type, _ = mimetypes.guess_type(image_path)
        if not mime_type: mime_type = "image/png"
        
        try:
            with open(image_path, "rb") as f:
                image_data = base64.b64encode(f.read()).decode("utf-8")
        except Exception as e:
            print(f"File Read Error: {e}")
            return {}

        # --- UPDATED PROMPT HERE ---
        prompt_text = (
            "You are a Cloud Architect. Analyze this diagram.\n"
            "1. List all Azure resources found (e.g., VMs, SQL, Web Apps).\n"
            "2. If you see a VM, implicitly add VNet, Subnet, NIC, and Public IP address.\n"
            "3. Return the response as a strict JSON object."
        )

        payload = {
            "contents": [{
                "parts": [
                    {"text": prompt_text},
                    {"inline_data": {"mime_type": mime_type, "data": image_data}}
                ]
            }]
        }

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{CURRENT_MODEL}:generateContent?key={GOOGLE_API_KEY}"
        
        try:
            response = requests.post(url, json=payload)
            if response.status_code != 200:
                print(f"API FAIL (Status {response.status_code}): {response.text}")
                return {}
                
            result = response.json()
            try:
                raw_text = result['candidates'][0]['content']['parts'][0]['text']
                # Use regex to find the first JSON object
                match = re.search(r'\{.*\}', raw_text, re.DOTALL)
                if match:
                    json_str = match.group(0)
                    return json.loads(json_str)
                else:
                    print("No JSON found in response.")
                    return {}
            except Exception as e:
                print(f"Error parsing JSON: {e}")
                return {}

        except Exception as e:
            print(f"Connection Error: {e}")
            return {}

# --- 4. BICEP AGENT ---
class GeminiBicepAgent:
    def generate_bicep(self, summary: dict) -> str:
        if not CURRENT_MODEL: return ""
        print(f"[Bicep Agent] Generating Infrastructure as Code...")

        # --- UPDATED PROMPT HERE ---
        prompt = (
            "You are an Azure DevOps Engineer. Convert this JSON to 'main.bicep'.\n"
            "Rules:\n"
            "1. targetScope='resourceGroup'.\n"
            "2. Use 'Standard_B1s' for VMs.\n"
            "3. Ensure the VM has a Public IP address attached to the NIC.\n"
            "4. Use a hardcoded complex default password like 'P@ssw0rd1234!' for testing (Do NOT use newGuid).\n"
            "Output ONLY valid Bicep code."
            f"\n\nJSON Summary: {json.dumps(summary)}"
        )
        
        payload = { "contents": [{ "parts": [{"text": prompt}] }] }
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{CURRENT_MODEL}:generateContent?key={GOOGLE_API_KEY}"

        try:
            response = requests.post(url, json=payload)
            if response.status_code != 200: return ""
            result = response.json()
            raw_text = result['candidates'][0]['content']['parts'][0]['text']
            
            # Try to find code block first
            match = re.search(r'```bicep(.*?)```', raw_text, re.DOTALL)
            if match:
                return match.group(1).strip()
            
            # Fallback for just the code without blocks
            return raw_text.strip()
        except Exception as e:
            print(f"Error extracting Bicep code: {e}")
            return ""

# --- 5. MAIN ---
if __name__ == "__main__":
    if CURRENT_MODEL:
        vision = GeminiVisionAgent()
        coder = GeminiBicepAgent()
        
        image_file = "diagram.png" 

        arch_data = vision.analyze_image(image_file)
        
        if arch_data:
            print(f"Detected Resources: {list(arch_data.keys())}")
            bicep_code = coder.generate_bicep(arch_data)
            
            if bicep_code:
                with open("main.bicep", "w") as f:
                    f.write(bicep_code)
                print("Success! 'main.bicep' file created.")
            else:
                print("Failed to generate Bicep code.")
        else:
            print("Vision analysis returned empty results.")
