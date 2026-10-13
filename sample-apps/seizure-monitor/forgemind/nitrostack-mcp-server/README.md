# 1. Navigate to the MCP server directory
cd "c:\Users\Nethra R\Downloads\nitro-main\nitro-main\nitrostack-mcp-server"

# 2. Install dependencies and compile
npm install
npm run build




# 1. Navigate to the Python server directory
cd "c:\Users\Nethra R\Downloads\nitro-main\nitro-main\forgemind_server"

# 2. Create the virtual environment
python -m venv venv

# 3. Activate the virtual environment
.\venv\Scripts\Activate.ps1

# 4. Install backend dependencies
pip install -r requirements.txt

# 5. (Optional) Set your OpenAI API Key for live LLM diagnostics
$env:LLM_API_KEY="your-openai-api-key"

# 6. Start the API gateway
python -m uvicorn api_server:app --host 0.0.0.0 --port 8000
