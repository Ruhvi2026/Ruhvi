import { NextRequest, NextResponse } from 'next/server';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { authenticateMcpRequest } from '@/lib/ai/mcp-auth';
import { createRuhviMcpServer } from '@/lib/ai/mcp-tools';

// ---------------------------------------------------------------------------
// Security note: Force Node.js runtime — this route must never run on Edge.
// The service-role Supabase client uses Node.js crypto APIs not available in
// Edge runtime, and keeping it Node-only prevents accidental key exposure.
// ---------------------------------------------------------------------------
export const runtime = 'nodejs';

// Disable static caching — MCP is always dynamic
export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// Shared security headers applied to every MCP response
// ---------------------------------------------------------------------------
const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  Pragma: 'no-cache',
  // Prevent SSE buffering by reverse proxies
  'X-Accel-Buffering': 'no',
};

function applySecurityHeaders(res: Response): Response {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
    res.headers.set(k, v);
  }
  return res;
}

// ---------------------------------------------------------------------------
// Shared handler: authenticates + creates server + dispatches to transport
// ---------------------------------------------------------------------------
async function handleMcpRequest(req: NextRequest): Promise<Response> {
  // 1. Authenticate
  const auth = await authenticateMcpRequest(req.headers.get('authorization'));
  if (!auth.ok) {
    return new Response(JSON.stringify({ error: auth.message }), {
      status: auth.status,
      headers: { 'Content-Type': 'application/json', ...SECURITY_HEADERS },
    });
  }

  // 2. Create a fresh MCP server instance per request (stateless model)
  const mcpServer = createRuhviMcpServer({
    keyId: auth.keyId,
    keyName: auth.keyName,
    scopeLevel: auth.scopeLevel,
  });

  // 3. Create the Web-Standard transport (compatible with Next.js App Router)
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless — no server-side session
    enableJsonResponse: true, // prefer JSON over SSE for simple exchanges
  });

  // 4. Connect server to transport
  await mcpServer.connect(transport);

  // 5. Delegate to transport — receives a Web Standard Request, returns a Web Standard Response
  const response = await transport.handleRequest(req as unknown as Request);

  // 6. Apply security headers to the transport's response
  return applySecurityHeaders(response);
}

// ---------------------------------------------------------------------------
// POST /api/mcp  — MCP protocol messages (tool calls, list-tools, initialize)
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const response = await handleMcpRequest(req);
    // Re-wrap as NextResponse to stay in the Next.js response chain
    return new NextResponse(response.body, {
      status: response.status,
      headers: response.headers,
    });
  } catch (err) {
    console.error('[MCP] Unhandled POST error:', err);
    return new NextResponse(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...SECURITY_HEADERS },
      }
    );
  }
}

// ---------------------------------------------------------------------------
// GET /api/mcp  — SSE streaming endpoint for server-initiated messages
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const response = await handleMcpRequest(req);
    return new NextResponse(response.body, {
      status: response.status,
      headers: response.headers,
    });
  } catch (err) {
    console.error('[MCP] Unhandled GET error:', err);
    return new NextResponse(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...SECURITY_HEADERS },
      }
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/mcp  — Session teardown (stateless: returns 200 immediately)
// ---------------------------------------------------------------------------
export async function DELETE(req: NextRequest): Promise<NextResponse> {
  // Authenticate for symmetry — prevents unauthenticated endpoint probing
  const auth = await authenticateMcpRequest(req.headers.get('authorization'));
  if (!auth.ok) {
    return new NextResponse(JSON.stringify({ error: auth.message }), {
      status: auth.status,
      headers: { 'Content-Type': 'application/json', ...SECURITY_HEADERS },
    });
  }

  // Stateless server — nothing to tear down on the server side
  return new NextResponse(JSON.stringify({ message: 'Session closed' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...SECURITY_HEADERS },
  });
}
