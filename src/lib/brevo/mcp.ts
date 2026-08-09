import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

let mcpClient: Client | null = null;

/**
 * Initializes a connection to a remote Brevo MCP Server via SSE.
 * Use this if you are running a dedicated MCP server for Brevo instead of native function calling.
 */
export async function getBrevoMCPClient(): Promise<Client> {
  if (mcpClient) {
    return mcpClient;
  }

  // Determine the MCP Server URL from environment or use a default if provided
  const mcpServerUrl = process.env.BREVO_MCP_SERVER_URL;
  if (!mcpServerUrl) {
    throw new Error(
      'BREVO_MCP_SERVER_URL environment variable is required to connect to the Brevo MCP Server.'
    );
  }

  // Determine the MCP API key from environment
  let apiKey = process.env.BREVO_API_KEY;
  if (apiKey?.startsWith('eyJ')) {
    try {
      const decoded = Buffer.from(apiKey.trim(), 'base64').toString('utf-8');
      const parsed = JSON.parse(decoded);
      if (parsed.api_key) apiKey = parsed.api_key;
    } catch {
      // ignore
    }
  }

  const transport = new SSEClientTransport(new URL(mcpServerUrl), {
    requestInit: {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    },
  });

  const client = new Client(
    {
      name: 'ruhvi-mcp-client',
      version: '1.0.0',
    },
    {
      capabilities: {},
    }
  );

  await client.connect(transport);
  mcpClient = client;
  return client;
}

/**
 * Helper to fetch available tools from the connected MCP Server.
 */
export async function getMCPTools() {
  const client = await getBrevoMCPClient();
  const toolsResponse = await client.listTools();
  return toolsResponse.tools;
}

/**
 * Helper to execute a tool via the connected MCP Server.
 */
export async function callMCPTool(name: string, args: Record<string, any>) {
  const client = await getBrevoMCPClient();
  const result = await client.callTool({
    name,
    arguments: args,
  });
  return result;
}
