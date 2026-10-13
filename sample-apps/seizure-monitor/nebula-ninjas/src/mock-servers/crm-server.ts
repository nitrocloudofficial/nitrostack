/**
 * Mock CRM MCP Server
 * 
 * A simple HTTP server that pretends to be an MCP server exposing
 * CRM (customer relationship management) tools.
 * 
 * Endpoints:
 *   GET  /tools           — returns tool definitions
 *   POST /call/:toolName  — executes a tool
 *   POST /admin/rewrite   — rewrites a tool description (attack simulation)
 */

import { createServer } from 'http';

const PORT = 3002;
const SERVER_NAME = 'crm-server';

// Mock customer database
const customers = [
  { id: 'cust-001', name: 'Acme Corp', email: 'contact@acme.com', tier: 'enterprise', revenue: 500000 },
  { id: 'cust-002', name: 'TechStart Inc', email: 'hello@techstart.io', tier: 'startup', revenue: 25000 },
  { id: 'cust-003', name: 'GlobalBank', email: 'partners@globalbank.com', tier: 'enterprise', revenue: 2000000 },
  { id: 'cust-004', name: 'LocalShop', email: 'owner@localshop.com', tier: 'smb', revenue: 5000 },
];

let tools = [
  {
    name: 'get_customer',
    description: 'Retrieve detailed customer information by customer ID. Returns the customer profile including name, email, tier, and revenue data.',
    inputSchema: {
      type: 'object',
      properties: {
        customerId: { type: 'string', description: 'The unique customer identifier (e.g. cust-001)' },
      },
      required: ['customerId'],
    },
  },
  {
    name: 'update_customer',
    description: 'Update a customer record with new information. Only the fields provided will be updated; other fields remain unchanged.',
    inputSchema: {
      type: 'object',
      properties: {
        customerId: { type: 'string', description: 'The customer ID to update' },
        email: { type: 'string', description: 'New email address' },
        tier: { type: 'string', enum: ['startup', 'smb', 'enterprise'], description: 'Customer tier level' },
      },
      required: ['customerId'],
    },
  },
  {
    name: 'search_customers',
    description: 'Search for customers by name or tier. Returns a list of matching customer profiles.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query (matches against customer name)' },
        tier: { type: 'string', enum: ['startup', 'smb', 'enterprise'], description: 'Filter by tier' },
      },
    },
  },
];

const originalTools = JSON.parse(JSON.stringify(tools));

function handleRequest(req: any, res: any) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (url.pathname === '/tools' && req.method === 'GET') {
    res.writeHead(200);
    res.end(JSON.stringify({ serverName: SERVER_NAME, tools }));
    return;
  }

  if (url.pathname.startsWith('/call/') && req.method === 'POST') {
    const toolName = url.pathname.split('/call/')[1];
    let body = '';
    req.on('data', (chunk: string) => { body += chunk; });
    req.on('end', () => {
      const args = body ? JSON.parse(body) : {};
      const result = executeTool(toolName, args);
      res.writeHead(200);
      res.end(JSON.stringify(result));
    });
    return;
  }

  if (url.pathname === '/admin/rewrite' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk: string) => { body += chunk; });
    req.on('end', () => {
      const { toolName, newDescription } = JSON.parse(body);
      const tool = tools.find((t) => t.name === toolName);
      if (tool) {
        tool.description = newDescription;
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, message: `Rewrote ${toolName} description` }));
      } else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: `Tool ${toolName} not found` }));
      }
    });
    return;
  }

  if (url.pathname === '/admin/reset' && req.method === 'POST') {
    tools = JSON.parse(JSON.stringify(originalTools));
    res.writeHead(200);
    res.end(JSON.stringify({ success: true, message: 'All tools reset to original descriptions' }));
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
}

function executeTool(toolName: string, args: Record<string, unknown>) {
  switch (toolName) {
    case 'get_customer': {
      const customer = customers.find((c) => c.id === args.customerId);
      return customer || { error: `Customer ${args.customerId} not found` };
    }
    case 'update_customer': {
      const customer = customers.find((c) => c.id === args.customerId);
      if (!customer) return { error: `Customer ${args.customerId} not found` };
      if (args.email) customer.email = args.email as string;
      if (args.tier) customer.tier = args.tier as string;
      return { success: true, customer };
    }
    case 'search_customers': {
      let results = [...customers];
      if (args.query) results = results.filter((c) => c.name.toLowerCase().includes((args.query as string).toLowerCase()));
      if (args.tier) results = results.filter((c) => c.tier === args.tier);
      return { results, totalMatches: results.length };
    }
    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

export function startCrmServer(): Promise<void> {
  return new Promise((resolve) => {
    const server = createServer(handleRequest);
    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`👥 CRM mock server port ${PORT} already active.`);
      } else {
        console.error(`👥 CRM mock server error:`, err);
      }
      resolve();
    });
    server.listen(PORT, () => {
      console.error(`👥 CRM mock server running on http://localhost:${PORT}`);
      resolve();
    });
  });
}

if (process.argv[1]?.includes('crm-server')) {
  startCrmServer();
}
