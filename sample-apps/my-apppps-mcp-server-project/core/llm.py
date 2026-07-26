import os
from google import genai

# Create client using environment variable
_client = None

def get_azure_openai_client():
    global _client
    if _client is None:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY not found in environment variables")
        _client = genai.Client(api_key=api_key)
    return _client

# Compatibility wrapper for existing code using 'client' directly (if any)
# Ideally refactor all usages to use get_azure_openai_client()
class LazyClientProxy:
    def __getattr__(self, name):
        return getattr(get_azure_openai_client(), name)

client = LazyClientProxy()

def get_llm_decision(prompt: str):
    try:
        response = client.models.generate_content(
            model="models/gemini-2.5-flash",
            contents=prompt
        )

        return response.text

    except Exception as e:
        return f"LLM Error: {str(e)}"

