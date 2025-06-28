// Mark this route as dynamic
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Use the internal Docker network address (server-side env var)
    const backendUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    
    // Extract query parameters from the request URL
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    
    const url = `${backendUrl}/api/tickers${queryString ? '?' + queryString : ''}`;
    console.log('🔄 Proxying tickers request to:', url);
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-cache'
    });

    if (!response.ok) {
      throw new Error(`Backend responded with ${response.status}`);
    }

    const data = await response.json();
    
    return Response.json(data);
  } catch (error) {
    console.error('❌ Proxy tickers request failed:', error);
    return Response.json(
      { error: 'Failed to fetch tickers data', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 