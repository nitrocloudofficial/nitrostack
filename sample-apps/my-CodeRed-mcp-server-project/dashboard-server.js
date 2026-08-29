import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const app = express();
app.use(cors());
app.use(express.json());

let mcpClient = null;

async function getMcpClient() {
  if (mcpClient) return mcpClient;
  const transport = new StreamableHTTPClientTransport(new URL('http://localhost:3000/mcp'));
  const client = new Client({ name: 'dashboard-client', version: '1.0.0' }, { capabilities: {} });
  await client.connect(transport);
  mcpClient = client;
  return client;
}

async function callMcpTool(name, input) {
  const client = await getMcpClient();
  const result = await client.callTool({ name, arguments: input });
  const textBlock = result.content.find((c) => c.type === 'text');
  if (!textBlock) return {};
  try {
    return JSON.parse(textBlock.text);
  } catch {
    return { message: textBlock.text };
  }
}

// ---------- Data display routes ----------

app.get('/api/jira/:projectKey', async (req, res) => {
  try {
    res.json(await callMcpTool('get_pending_tasks', { projectKey: req.params.projectKey, maxResults: 25 }));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/calendar', async (req, res) => {
  try {
    res.json(await callMcpTool('list_events', {
      timeMin: new Date().toISOString(),
      timeMax: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      maxResults: 10
    }));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/gmail', async (req, res) => {
  try {
    res.json(await callMcpTool('search_emails', { query: '', maxResults: 10 }));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ---------- Direct action routes (widgets/forms — no AI involved) ----------

app.post('/api/action/send-email', async (req, res) => {
  try { res.json(await callMcpTool('send_email', req.body)); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/action/create-task', async (req, res) => {
  try { res.json(await callMcpTool('create_task', req.body)); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/action/create-event', async (req, res) => {
  try {
    const body = { ...req.body };
    if (body.attendees && typeof body.attendees === 'string') {
      body.attendees = body.attendees.split(',').map((s) => s.trim()).filter(Boolean);
    }
    res.json(await callMcpTool('create_event', body));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/action/update-status', async (req, res) => {
  try { res.json(await callMcpTool('update_status', req.body)); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/action/assign-issue', async (req, res) => {
  try { res.json(await callMcpTool('assign_issue', req.body)); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/action/prioritize-task', async (req, res) => {
  try { res.json(await callMcpTool('prioritize_task', req.body)); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// ---------- Chatbot using Groq (openai/gpt-oss-120b) ----------

app.post('/api/chat', async (req, res) => {
  try {
    const userMessage = req.body.message;

    const client = await getMcpClient();
    const toolsList = await client.listTools();
    const tools = toolsList.tools.map((t) => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: t.inputSchema
      }
    }));

    let messages = [{ role: 'user', content: userMessage }];

    for (let turn = 0; turn < 6; turn++) {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + process.env.GROQ_API_KEY
        },
        body: JSON.stringify({
          model: 'openai/gpt-oss-120b',
          messages,
          tools,
          tool_choice: 'auto'
        })
      });

      const data = await response.json();
      if (!response.ok) return res.status(500).json({ error: JSON.stringify(data) });

      const message = data.choices[0].message;

      if (!message.tool_calls || message.tool_calls.length === 0) {
        return res.json({ reply: message.content || '(no response)' });
      }

      messages.push(message);

      for (const toolCall of message.tool_calls) {
        let result;
        try {
          const args = JSON.parse(toolCall.function.arguments || '{}');
          result = await callMcpTool(toolCall.function.name, args);
        } catch (err) {
          result = 'Error: ' + err.message;
        }
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: typeof result === 'string' ? result : JSON.stringify(result)
        });
      }
    }

    res.json({ reply: 'Reached max tool-call turns without a final answer.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.use(express.static('dashboard'));

const PORT = 4000;
app.listen(PORT, () => console.log('Dashboard server running on http://localhost:' + PORT));