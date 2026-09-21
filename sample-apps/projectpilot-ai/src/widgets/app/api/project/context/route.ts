import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Project Context ID is required' }, { status: 400 });
  }

  // Points directly to the NitroStack HTTP resource or discovery endpoint
  const backendPort = process.env.MCP_SERVER_PORT || '3000';
  const resourceUri = `http://localhost:${backendPort}/mcp/resources/project://${id}/context`;

  try {
    const response = await fetch(resourceUri, {
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Backend error: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Unpack NitroStack MCP Resource wrapper payload
    if (data.contents?.[0]?.text) {
      const parsedContext = JSON.parse(data.contents[0].text);
      return NextResponse.json(parsedContext);
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to connect to NitroStack MCP server', details: error.message },
      { status: 502 }
    );
  }
}