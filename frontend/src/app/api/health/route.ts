// Mark this route as dynamic
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const backendUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    
    const response = await fetch(`${backendUrl}/api/health`, {
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
    console.error('❌ Proxy health request failed:', error);
    return Response.json(
      { error: 'Failed to fetch health data', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 