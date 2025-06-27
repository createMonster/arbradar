# Docker Routing Fix: Frontend-Backend Communication

## Problem
Frontend webpage showed "Failed to fetch data" in Docker deployment, while working locally and backend health checks passed.

## Root Cause
**Environment Variable Mismatch**: Next.js server-side API routes couldn't access the backend because they were using client-side environment variables (`NEXT_PUBLIC_*`) which aren't available to server-side code in Docker containers.

## Solution
Added proper server-side environment variable and updated proxy routes to use it.

### Changes Made

**1. Updated `docker-compose.yml`:**
```yaml
frontend:
  environment:
    - API_URL=http://backend:3001          # ← Server-side variable
    - NEXT_PUBLIC_API_URL=http://backend:3001  # ← Client-side variable
```

**2. Updated proxy routes (`/api/spreads/route.ts`, `/api/health/route.ts`):**
```typescript
const backendUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
```

## Data Flow Architecture

### Browser → Frontend → Backend (Docker)
```
1. Browser
   ↓ HTTP: localhost:3000/api/spreads
2. Frontend Container (Next.js)
   ↓ Proxy Route: process.env.API_URL = http://backend:3001
3. Docker Network DNS
   ↓ Resolves 'backend' → Backend Container IP
4. Backend Container
   ↓ Processes request on port 3001
5. Response flows back: Backend → Frontend → Browser
```

### Local Development vs Docker

| Environment | Browser URL | Frontend → Backend | Backend URL |
|-------------|-------------|-------------------|-------------|
| **Local** | `localhost:3000` | `localhost:3001` | `localhost:3001` |
| **Docker** | `localhost:3000` | `backend:3001` | `backend:3001` |

## Key Docker Concepts

### Service Names as Hostnames
- `backend` in docker-compose.yml becomes a resolvable hostname
- Docker provides automatic DNS: `backend` → container IP
- Internal communication bypasses host ports

### Port Mapping
- **External**: `localhost:3001` → Host port 3001 → Backend container
- **Internal**: `backend:3001` → Direct container-to-container communication

### Environment Variables
- **`NEXT_PUBLIC_*`**: Available to client-side code (browser)
- **Regular variables**: Available to server-side code (containers)
- **Server-side API routes** need regular environment variables in Docker

## Why This Fix Works

1. **Server-side proxy routes** now have access to backend URL via `API_URL`
2. **Docker DNS resolution** handles `backend` hostname automatically  
3. **Container-to-container** communication works within Docker network
4. **Fallback mechanism** ensures local development still works
5. **Client-side code** unchanged - still uses proxy routes (`API_BASE_URL = ''`)

## Result
✅ Docker deployment now works correctly  
✅ Local development still works  
✅ Clean separation between client/server environment variables  
✅ Proper container networking without hardcoded IPs 