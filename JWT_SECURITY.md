# JWT Security Implementation

This document explains the JWT (JSON Web Token) security implementation for the FitOnMe API.

## Overview

JWT authentication has been added to secure the backend API endpoints, particularly the `/api/try-on` endpoint which handles AI-powered virtual try-on requests.

## How It Works

### 1. Authentication Flow

```
User → Login/Sign Up (Supabase Auth)
     → Supabase issues JWT token
     → Token stored in browser
     → Frontend includes token in API requests
     → Backend verifies token
     → Request processed or rejected
```

### 2. Components

#### Backend: JWT Verification Middleware (`server/middleware/auth.js`)

Two middleware functions are available:

**`verifyAuth`** - Strict authentication (requires valid JWT):
```javascript
// Use when authentication is mandatory
app.post('/api/protected-endpoint', verifyAuth, async (req, res) => {
  // req.user contains authenticated user info
  console.log(req.user.id, req.user.email);
});
```

**`optionalAuth`** - Optional authentication (allows guest users):
```javascript
// Use when you want to support both auth and guest users
app.post('/api/try-on', optionalAuth, async (req, res) => {
  if (req.user) {
    // Authenticated user
    console.log('User:', req.user.email);
  } else {
    // Guest user
    console.log('Guest request');
  }
});
```

#### Frontend: Token Management (`src/lib/image-processor.js`)

The frontend automatically:
1. Checks if user is authenticated
2. Retrieves JWT token from Supabase session
3. Includes token in `Authorization` header
4. Falls back gracefully if no token available

```javascript
// Automatic JWT inclusion
const { data: { session } } = await supabase.auth.getSession();
if (session?.access_token) {
  headers['Authorization'] = `Bearer ${session.access_token}`;
}
```

## Implementation Details

### Backend (`server/index.js`)

```javascript
import { verifyAuth, optionalAuth } from './middleware/auth.js';

// /api/try-on uses optionalAuth
app.post('/api/try-on', optionalAuth, upload.fields([...]), async (req, res) => {
  if (req.user) {
    console.log(`[AUTH] Authenticated request from ${req.user.email}`);
    // Apply rate limiting, credit tracking, etc.
  } else {
    console.log('[AUTH] Guest request');
    // Apply guest limitations
  }
});
```

### Frontend (`src/lib/image-processor.js`)

```javascript
// Get JWT token from Supabase
const { supabase } = await import('./supabase');
const { data: { session } } = await supabase.auth.getSession();

if (session?.access_token) {
  headers['Authorization'] = `Bearer ${session.access_token}`;
}

// Make authenticated API call
const response = await fetch(`${apiUrl}/api/try-on`, {
  method: 'POST',
  headers,
  body: formData,
});
```

## Security Features

### 1. Token Verification

- Tokens are verified using Supabase's `getUser()` method
- Invalid/expired tokens are rejected with 401 status
- User info is attached to request object for use in handlers

### 2. Environment-Aware

The security implementation respects development/UAT environments:
- **Development:** Allows unauthenticated requests for testing
- **UAT:** Allows unauthenticated requests for user testing
- **Production:** Can enforce strict authentication if needed

### 3. User Information

After successful verification, `req.user` contains:
```javascript
{
  id: "uuid",         // User's unique ID
  email: "user@example.com",  // User's email
  role: "authenticated"       // User role
}
```

## Error Handling

### Backend Errors

**No Token:**
```json
{
  "error": "No authorization token provided",
  "message": "Please include a valid JWT token in the Authorization header"
}
```

**Invalid/Expired Token:**
```json
{
  "error": "Invalid or expired token",
  "message": "Please sign in again"
}
```

### Frontend Handling

```javascript
if (!response.ok) {
  const error = await response.json();
  if (response.status === 401) {
    // Handle authentication error
    // Prompt user to sign in
  }
}
```

## Testing

### 1. Test Authenticated Request

```bash
# Get your JWT token from browser DevTools
# Application → Local Storage → supabase.auth.token

curl -X POST http://localhost:3001/api/try-on \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "personImage=@person.jpg" \
  -F "clothingImage=@outfit.png"
```

### 2. Test Unauthenticated Request

```bash
# Without token (should work in dev/UAT mode)
curl -X POST http://localhost:3001/api/try-on \
  -F "personImage=@person.jpg" \
  -F "clothingImage=@outfit.png"
```

### 3. Test Invalid Token

```bash
# With invalid token
curl -X POST http://localhost:3001/api/try-on \
  -H "Authorization: Bearer invalid_token" \
  -F "personImage=@person.jpg" \
  -F "clothingImage=@outfit.png"

# Should return 401 error
```

## Monitoring & Logging

The backend logs authentication status for all requests:

```
[AUTH] Authenticated try-on request from user: user@example.com (uuid)
[AUTH] Unauthenticated try-on request (guest user)
```

Monitor these logs to:
- Track authenticated vs guest usage
- Identify authentication issues
- Monitor API access patterns

## Production Deployment

### Environment Variables

No additional environment variables needed! The middleware uses existing Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### Rate Limiting (Future Enhancement)

For production, consider adding rate limiting:

```javascript
import rateLimit from 'express-rate-limit';

const tryOnLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: req => req.user ? 100 : 10, // More for authenticated users
  message: 'Too many requests, please try again later'
});

app.post('/api/try-on', tryOnLimiter, optionalAuth, ...);
```

## Troubleshooting

### Issue: Token not being sent from frontend

**Solution:**
1. Check browser console for JWT-related logs
2. Verify user is authenticated: `supabase.auth.getSession()`
3. Check Network tab for Authorization header

### Issue: Backend rejecting valid tokens

**Solution:**
1. Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are correct
2. Check token hasn't expired (Supabase tokens expire after 1 hour by default)
3. Ensure Supabase client is properly initialized in middleware

### Issue: CORS errors with Authorization header

**Solution:**
```javascript
// Update CORS configuration in server/index.js
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://your-domain.vercel.app'
  ],
  credentials: true,
  exposedHeaders: ['Authorization']
}));
```

## Best Practices

1. **Always use HTTPS in production** - Tokens should never be transmitted over HTTP
2. **Handle token expiration gracefully** - Refresh tokens when needed
3. **Log authentication events** - Monitor for suspicious activity
4. **Rate limit by user** - Authenticated users get higher limits
5. **Validate user permissions** - Check credits/subscription status after authentication

## Future Enhancements

- [ ] Implement token refresh mechanism
- [ ] Add rate limiting per user
- [ ] Add API key support for server-to-server calls
- [ ] Implement webhook signature verification
- [ ] Add request logging and analytics
- [ ] Implement IP-based rate limiting for guests

## References

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
