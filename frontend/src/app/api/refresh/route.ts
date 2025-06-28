// Mark this route as dynamic
export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    // Use the internal Docker network address (server-side env var)
    const backendUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    
    const url = `${backendUrl}/api/refresh`;
    console.log('🔄 Proxying refresh request to:', url);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      cache: 'no-cache'
    });

    if (!response.ok) {
      throw new Error(`Backend responded with ${response.status}`);
    }

    const data = await response.json();
    
    return Response.json(data);
  } catch (error) {
    console.error('❌ Proxy refresh request failed:', error);
    return Response.json(
      { error: 'Failed to refresh data', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 