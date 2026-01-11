# OAuth Implementation Security Analysis

## Overview
Analysis of the GitHub OAuth + IndieAuth implementation for security vulnerabilities and design issues.

## Current Security Posture ✅

### Strong Points

1. **CSRF Protection**
   - OAuth state parameter properly generated (32-byte random)
   - State validated on callback
   - State cleared after use

2. **Authorization Code Security**
   - Sealed with iron-session (encryption + MAC)
   - One-time use enforced (replay attack protection)
   - 10-minute expiration
   - Proper cleanup

3. **PKCE Support**
   - Optional PKCE with S256 and plain methods
   - Properly validated in token exchange
   - Challenge/verifier correctly implemented

4. **Session Security**
   - Encrypted session cookies (iron-session)
   - httpOnly, sameSite=lax
   - 7-day expiration

5. **Redirect URI Validation**
   - URL parsing validation
   - Protocol enforcement (https:// required)
   - Localhost development support

6. **Repository Access Control**
   - Verifies GitHub user owns/has write access to repo
   - Prevents unauthorized access

---

## Security Issues Found 🔴

### 1. **HIGH: Session Race Condition / Flow Confusion**

**Issue**: Different OAuth flows handle session differently:
- Normal login: `setSession(event, { oauthState })` - **REPLACES** entire session
- IndieAuth: `setSession(event, { ...session, oauthState, indieAuthRequest })` - **MERGES** session

**Attack Scenario**:
```
1. User starts IndieAuth flow in Tab 1
   → Session: { oauthState: 'A', indieAuthRequest: {...} }

2. User starts normal login in Tab 2
   → Session: { oauthState: 'B' }  [indieAuthRequest WIPED OUT]

3. Tab 1 callback arrives with state 'A'
   → Validation fails (session has state 'B')
   → Flow breaks

OR WORSE:

1. User starts normal login in Tab 1
   → Session: { oauthState: 'A' }

2. Attacker triggers IndieAuth with malicious redirect_uri in Tab 2
   → Session: { oauthState: 'B', indieAuthRequest: { redirectUri: 'https://evil.com' } }

3. Tab 1 callback completes
   → Checks session.indieAuthRequest (attacker's!)
   → Could redirect to evil.com with auth code
```

**Fix**: Make session handling consistent - always merge, or use flow identifier.

---

### 2. **MEDIUM: Subdomain Wildcard Acceptance**

**Current Behavior**:
```javascript
// Only validates protocol, not domain specifics
if (redirectUrl.protocol !== 'https:') { ... }
```

**Allowed Redirects**:
- ✅ `https://martinemde.com/callback`
- ✅ `https://anything.martinemde.com/callback` ← RISK
- ✅ `https://totally-different-domain.com/callback`

**Risk**:
- If `https://stale.martinemde.com` has subdomain takeover vulnerability
- Attacker can register redirect_uri to that subdomain
- Open redirect to attacker-controlled domain

**Mitigation**:
- Consider allowlist of specific domains/subdomains
- Or require client registration with allowed redirect_uri patterns

---

### 3. **MEDIUM: Missing client_id ↔ redirect_uri Relationship**

**Current State**: No validation that redirect_uri is under client_id domain

**IndieAuth Spec Recommendation** (RFC 8252):
- redirect_uri should be validated against client_id
- Typically: redirect_uri must be under client_id domain
- Example: `client_id=https://app.example.com` → redirect_uri must start with `https://app.example.com/`

**Attack Scenario**:
```
client_id: https://legitimate-app.com
redirect_uri: https://attacker.com/steal-code
```
Currently allowed! Auth code would be sent to attacker.com.

**Fix**: Add domain relationship validation.

---

### 4. **MEDIUM: Localhost Port Wildcard**

**Current Behavior**:
```javascript
const isLocalhost =
  redirectUrl.hostname === 'localhost' ||
  redirectUrl.hostname === '127.0.0.1' ||
  redirectUrl.hostname === '[::1]';

if (!isLocalhost || redirectUrl.protocol !== 'http:') {
  error(400, 'redirect_uri must use https');
}
```

**Allowed**:
- ✅ `http://localhost:3000/callback`
- ✅ `http://localhost:1/callback` ← Any port!
- ✅ `http://127.0.0.1:8080/callback`

**Risk**:
- If a vulnerable service runs on localhost:PORT
- Attacker could craft redirect_uri to exploit it
- Low risk in practice (localhost-only), but worth noting

**Recommendation**: Consider port allowlist for production

---

### 5. **LOW: No Scope Validation/Negotiation**

**Current State**: IndieAuth always grants `create update` scope

```typescript
// In authorize endpoint - no scope parameter handling
// In token endpoint:
return json({
  access_token: accessToken,
  scope: 'create update',  // Hardcoded
  me: authCode.me
});
```

**Issue**:
- No way for client to request limited scopes
- Always grants full write access
- Not a vulnerability per se, but limits principle of least privilege

---

## Redirect URI Validation - What's Actually Allowed?

### Current Implementation

**✅ ALLOWED**:
```
https://any-domain.com/any-path
https://subdomain.example.com/callback
http://localhost/callback
http://localhost:3000/callback
http://127.0.0.1:8080/callback
http://[::1]:9000/callback
```

**❌ REJECTED**:
```
http://example.com/callback          (non-https, non-localhost)
http://localhost.evil.com/callback   (hostname != 'localhost')
javascript:alert(1)                  (invalid URL / wrong protocol)
data:text/html,...                   (invalid URL / wrong protocol)
ftp://example.com/callback           (wrong protocol)
//example.com/callback               (invalid URL - no protocol)
```

### Edge Cases to Consider

**Protocol-relative URLs**: `//example.com/callback`
- ❌ Rejected (URL constructor requires protocol)

**Userinfo in URL**: `https://user:pass@example.com/callback`
- ✅ Allowed (but probably harmless - just ignored by most clients)

**Fragments**: `https://example.com/callback#fragment`
- ✅ Allowed (fragments ignored in OAuth)

**Non-standard ports**: `https://example.com:8443/callback`
- ✅ Allowed (valid for custom HTTPS ports)

---

## Flow Analysis: IndieAuth ↔ GitHub OAuth Handoff

### Normal GitHub Login Flow

```
┌─────────────┐
│ User clicks │
│   "Login"   │
└──────┬──────┘
       │
       v
┌─────────────────────────────────────┐
│ /auth/github/login                  │
│ - Generate state                    │
│ - setSession({ oauthState })        │ ← REPLACES session
│ - Redirect to GitHub                │
└──────┬──────────────────────────────┘
       │
       v
┌─────────────────────────────────────┐
│ GitHub                              │
│ User authorizes                     │
└──────┬──────────────────────────────┘
       │
       v
┌─────────────────────────────────────┐
│ /auth/github/callback?code=X&state=Y│
│ - Validate state === session.state  │
│ - Exchange code for token           │
│ - Get user info                     │
│ - Verify repo access                │
│ - session.indieAuthRequest?         │ ← Check flow type
│   NO → redirect to /editor          │
└─────────────────────────────────────┘
```

### IndieAuth Flow

```
┌─────────────────────────────────────┐
│ Client redirects user to:           │
│ /auth/indieauth/authorize?          │
│   me=https://martinemde.com/        │
│   client_id=https://app.com         │
│   redirect_uri=https://app.com/cb   │
│   state=client-state-123            │
└──────┬──────────────────────────────┘
       │
       v
┌─────────────────────────────────────┐
│ /auth/indieauth/authorize           │
│ - Validate all parameters           │
│ - Generate OAuth state              │
│ - setSession({                      │
│     ...session,                     │ ← MERGES session
│     oauthState,                     │
│     indieAuthRequest: {...}         │
│   })                                │
│ - Redirect to GitHub                │
└──────┬──────────────────────────────┘
       │
       v
┌─────────────────────────────────────┐
│ GitHub                              │
│ User authorizes                     │
└──────┬──────────────────────────────┘
       │
       v
┌─────────────────────────────────────┐
│ /auth/github/callback?code=X&state=Y│
│ - Validate state === session.state  │
│ - Exchange code for token           │
│ - Get user info                     │
│ - Verify repo access                │
│ - session.indieAuthRequest?         │
│   YES →                             │
│     - Create IndieAuth code         │
│     - Redirect to client redirect_uri│
│       with code + client state      │
└──────┬──────────────────────────────┘
       │
       v
┌─────────────────────────────────────┐
│ Client receives code                │
│ Exchanges at /auth/indieauth/token  │
│ - Validates code                    │
│ - Validates client_id matches       │
│ - Validates redirect_uri matches    │
│ - Validates PKCE if used            │
│ - Returns access token              │
└─────────────────────────────────────┘
```

### Key Security Properties

✅ **CSRF Protection**: Both flows use state parameter
✅ **Code Binding**: Auth code is sealed with client_id + redirect_uri
✅ **One-time Use**: Auth codes tracked and rejected on reuse
✅ **Expiration**: Auth codes expire after 10 minutes

⚠️ **Session Confusion**: Inconsistent session merge/replace
⚠️ **Open Redirect**: No domain allowlist on redirect_uri

---

## Recommendations

### Priority 1 (High - Fix Soon)

1. **Fix Session Race Condition**
   ```typescript
   // Option 1: Always merge sessions
   await setSession(event, {
     ...session,
     oauthState: state
   });

   // Option 2: Use flow identifier
   await setSession(event, {
     ...session,
     flows: {
       [flowId]: { oauthState, type: 'normal' }
     }
   });
   ```

2. **Add client_id/redirect_uri Validation**
   ```typescript
   // redirect_uri must be under client_id domain
   if (!redirectUrl.origin.startsWith(clientUrl.origin)) {
     error(400, 'redirect_uri must be under client_id origin');
   }
   ```

### Priority 2 (Medium - Consider for Hardening)

3. **Domain Allowlist for redirect_uri**
   ```typescript
   const ALLOWED_DOMAINS = [
     'martinemde.com',
     'localhost',
     '127.0.0.1',
     '[::1]'
   ];
   ```

4. **Port Validation for Production**
   ```typescript
   if (env.NODE_ENV === 'production') {
     if (redirectUrl.protocol === 'https:' && redirectUrl.port) {
       error(400, 'Custom ports not allowed in production');
     }
   }
   ```

### Priority 3 (Low - Nice to Have)

5. **Scope Negotiation**
   - Accept `scope` parameter in authorize endpoint
   - Validate against allowed scopes
   - Return granted scopes in token response

6. **Client Registration**
   - Pre-register allowed clients with redirect_uri patterns
   - Reject unauthorized clients

---

## Test Coverage Needed

- [ ] Session race condition tests
- [ ] client_id/redirect_uri relationship validation
- [ ] Subdomain redirect tests
- [ ] Port validation tests
- [ ] Concurrent flow handling

---

## Conclusion

The implementation has **good foundational security** with proper CSRF protection, encrypted sessions, and one-time-use auth codes.

The **main concerns** are:
1. Session handling inconsistency (flow confusion risk)
2. Permissive redirect_uri validation (open redirect potential)
3. Missing client_id/redirect_uri relationship validation

These should be addressed to achieve production-grade security.
