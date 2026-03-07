# Authentication System

## Overview

Kali implements authentication using a **custom, zero-dependency OAuth 2.0 Authorization Code flow with PKCE** and **OpenID Connect (OIDC)**. No third-party auth libraries are used — the entire flow is built from scratch using the Web Crypto API and the [`jose`](https://github.com/panva/jose) library for encrypted session tokens (JWE).

Two identity providers are supported out of the box: **GitHub** (OAuth 2.0) and **Google** (OAuth 2.0 + OIDC).

---

## Standards Used

| Standard | Role |
|---|---|
| **OAuth 2.0** ([RFC 6749](https://tools.ietf.org/html/rfc6749)) | Authorization framework — defines how the app requests access on behalf of a user via the Authorization Code grant |
| **OIDC (OpenID Connect)** ([spec](https://openid.net/specs/openid-connect-core-1_0.html)) | Identity layer on top of OAuth 2.0 — Google returns a standardised `id_token` (JWT) containing user profile claims (`name`, `email`, `picture`) |
| **PKCE** ([RFC 7636](https://tools.ietf.org/html/rfc7636)) | Proof Key for Code Exchange — prevents authorization code interception attacks by binding the token request to the original authorization request via `code_verifier` / `code_challenge` (S256) |
| **State parameter** | CSRF protection — a cryptographically random value stored in an httpOnly cookie and verified on callback to ensure the response originated from the same browser session |
| **JWE** ([RFC 7516](https://tools.ietf.org/html/rfc7516)) | JSON Web Encryption — session data (tokens + user profile) is encrypted with AES-256-GCM using a server-side secret before being stored as a cookie |

---

## Environment Variables

All secrets are loaded at runtime via `$env/dynamic/private`. A `.env` file is required:

```env
# 32-byte hex secret for encrypting session cookies
# Generate with: openssl rand -hex 32
AUTH_SECRET=

# GitHub OAuth App — https://github.com/settings/developers
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Google OAuth — https://console.cloud.google.com/apis/credentials
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

### Provider Setup

| Provider | Console | Required callback URL |
|---|---|---|
| GitHub | [Developer Settings → OAuth Apps](https://github.com/settings/developers) | `http://localhost:5173/auth/callback/github` |
| Google | [Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials) | `http://localhost:5173/auth/callback/google` |

> In production, replace `http://localhost:5173` with your deployed origin.

---

## Key Files

```
src/
├── auth.ts                                 # Core auth module — providers, PKCE, token exchange,
│                                           #   session encryption, token refresh, user info fetchers
├── hooks.server.ts                         # SvelteKit handle hook — attaches auth() to event.locals
├── app.d.ts                                # TypeScript types for App.Locals and App.PageData
└── routes/
    ├── +page.server.ts                     # Landing page loader — exposes session to the page
    ├── +page.svelte                        # Landing page UI — login / welcome state
    ├── auth/
    │   ├── login/
    │   │   ├── +page.svelte                # Login page — GitHub & Google buttons
    │   │   ├── +page.server.ts             # Redirects to /home if already authenticated
    │   │   ├── github/
    │   │   │   └── +server.ts              # GET → generates PKCE + state, redirects to GitHub
    │   │   └── google/
    │   │       └── +server.ts              # GET → generates PKCE + state, redirects to Google
    │   ├── callback/
    │   │   ├── github/
    │   │   │   └── +server.ts              # GET → validates state, exchanges code, fetches user,
    │   │   │                               #   creates encrypted session, redirects to /home
    │   │   └── google/
    │   │       └── +server.ts              # GET → validates state, exchanges code, decodes OIDC
    │   │                                   #   id_token, creates session, redirects to /home
    │   └── logout/
    │       ├── github/
    │       │   └── +server.ts              # GET → destroys session cookie, redirects to /
    │       └── google/
    │           └── +server.ts              # GET → destroys session cookie, redirects to /
    └── home/
        ├── +page.server.ts                 # Route guard — redirects to /auth/login if no session
        └── +page.svelte                    # Protected page — displays user name, email, avatar
```

---

## Authentication Flow

### Sign-in (GitHub — OAuth 2.0 + PKCE)

```
Browser                        Kali Server                   GitHub
  │                                │                            │
  │  GET /auth/login/github        │                            │
  │───────────────────────────────>│                            │
  │                                │ Generate:                  │
  │                                │   code_verifier (32 bytes) │
  │                                │   code_challenge = SHA-256 │
  │                                │   state (16 bytes hex)     │
  │                                │                            │
  │                                │ Set httpOnly cookies:       │
  │                                │   oauth_state_github       │
  │                                │   oauth_verifier_github    │
  │                                │                            │
  │  302 → github.com/login/      │                            │
  │    oauth/authorize?            │                            │
  │    client_id=...               │                            │
  │    redirect_uri=.../callback   │                            │
  │    response_type=code          │                            │
  │    scope=read:user user:email  │                            │
  │    state=...                   │                            │
  │    code_challenge=...          │                            │
  │    code_challenge_method=S256  │                            │
  │<───────────────────────────────│                            │
  │                                │                            │
  │  GET github.com/login/oauth/authorize?...                   │
  │────────────────────────────────────────────────────────────>│
  │                                │                            │  User authenticates
  │  302 → /auth/callback/github?code=...&state=...            │
  │<────────────────────────────────────────────────────────────│
  │                                │                            │
  │  GET /auth/callback/github     │                            │
  │───────────────────────────────>│                            │
  │                                │ Read oauth_state cookie    │
  │                                │ Verify state === cookie    │
  │                                │ Read oauth_verifier cookie │
  │                                │ Clear OAuth cookies        │
  │                                │                            │
  │                                │ POST /login/oauth/         │
  │                                │   access_token             │
  │                                │   grant_type=              │
  │                                │     authorization_code     │
  │                                │   code=...                 │
  │                                │   code_verifier=...        │
  │                                │   client_id + secret       │
  │                                │───────────────────────────>│
  │                                │                            │
  │                                │  { access_token,           │
  │                                │    token_type }            │
  │                                │<───────────────────────────│
  │                                │                            │
  │                                │ GET /user + /user/emails   │
  │                                │   Authorization: Bearer    │
  │                                │───────────────────────────>│
  │                                │                            │
  │                                │  { name, email, avatar }   │
  │                                │<───────────────────────────│
  │                                │                            │
  │                                │ Encrypt session as JWE     │
  │                                │ Set 'session' cookie       │
  │                                │   (httpOnly, secure,       │
  │                                │    sameSite=lax, 30 days)  │
  │                                │                            │
  │  302 → /home                   │                            │
  │<───────────────────────────────│                            │
```

### Sign-in (Google — OAuth 2.0 + PKCE + OIDC)

The Google flow is identical up to the token exchange. The key differences are:

1. **Scopes** include `openid profile email` (OIDC scopes)
2. **Additional params**: `access_type=offline` (requests a refresh token) and `prompt=consent`
3. **Token response** includes an `id_token` — a signed JWT containing claims:
   - `sub` — unique Google user ID
   - `name` — display name
   - `email` — verified email address
   - `picture` — avatar URL
4. **User info is decoded from the `id_token`** rather than fetched from a separate API endpoint
5. **A `refresh_token`** is returned on first consent, enabling silent token renewal

### Token Refresh

When `getSession()` reads the session cookie, it checks `accessTokenExpiresAt`. If the access token will expire within 60 seconds and a `refreshToken` is stored, it automatically:

1. Sends a `grant_type=refresh_token` request to the provider's token endpoint
2. Updates `accessToken`, `refreshToken` (if rotated), and `accessTokenExpiresAt`
3. Re-encrypts and re-sets the session cookie with the new values

This happens transparently — the calling code always receives a valid session.

> **Note:** GitHub OAuth tokens do not expire by default, so refresh is primarily relevant for Google.

### Sign-out

```
Browser                        Kali Server
  │                                │
  │  GET /auth/logout/{provider}   │
  │───────────────────────────────>│
  │                                │ Delete 'session' cookie
  │  302 → /                       │
  │<───────────────────────────────│
```

### Route Protection (`/home`)

On every request to `/home`, the server-side `load` function calls `event.locals.auth()` before the page renders:

```
Browser                        Kali Server
  │                                │
  │  GET /home                     │
  │───────────────────────────────>│
  │                                │ Read 'session' cookie
  │                                │ Decrypt JWE with AUTH_SECRET
  │                                │ Check expiration
  │                                │ Auto-refresh tokens if needed
  │                                │
  │                         ┌──────┴──────┐
  │                    valid│             │invalid / missing
  │                         │             │
  │  200 /home page         │    303 → /auth/login
  │<────────────────────────│             │
  │                         │             │
```

---

## Session Management

### Architecture

Sessions are stored entirely in an encrypted cookie — there is no server-side session store or database. This means:

- **Stateless** — any server instance can validate a session without shared state
- **Tamper-proof** — the cookie payload is encrypted with AES-256-GCM; any modification invalidates it
- **Self-contained** — the cookie holds: user profile (`name`, `email`, `image`), provider name, access token, refresh token, and expiry timestamp

### Cookie Properties

| Property | Value | Reason |
|---|---|---|
| `name` | `session` | Single session cookie for all providers |
| `httpOnly` | `true` | Prevents client-side JavaScript access (XSS mitigation) |
| `secure` | `true` in production | Cookie only sent over HTTPS |
| `sameSite` | `lax` | Prevents CSRF — cookie not sent on cross-origin POST requests |
| `maxAge` | 30 days (2,592,000s) | Session lifetime |
| `path` | `/` | Available to all routes |

### Encryption

The session payload is serialized as a JWE (JSON Web Encryption) token using the `jose` library:

- **Algorithm**: `dir` (direct key agreement — no key wrapping)
- **Encryption**: `A256GCM` (AES-256 in Galois/Counter Mode)
- **Key**: First 32 bytes of `AUTH_SECRET` (256-bit)
- **Claims**: `iat` (issued at) and `exp` (expiration) are set automatically

### Session Lifecycle

```
Login callback
    │
    ▼
createSession()
    │  Encrypt user + tokens as JWE
    │  Set 'session' cookie (30 days)
    ▼
─── Request lifecycle ───
    │
    ▼
hooks.server.ts → event.locals.auth()
    │  Lazy: only decrypts on first call per request
    │  Result is cached for subsequent calls
    ▼
getSession()
    │  Decrypt JWE
    │  Check token expiry
    │  Auto-refresh if needed → re-encrypt + re-set cookie
    │  Return UserSession | null
    ▼
─── Logout ───
    │
    ▼
destroySession()
    │  Delete 'session' cookie
    ▼
```

### `UserSession` Type

```typescript
interface UserSession {
  user: {
    name: string;      // Display name (or GitHub username as fallback)
    email: string;     // Primary verified email
    image?: string;    // Avatar URL
  };
  provider: 'github' | 'google';
  accessToken: string;
  refreshToken?: string;         // Present for Google; absent for GitHub
  accessTokenExpiresAt?: number; // Unix timestamp; present for Google
}
```

---

## Security Properties

### PKCE (Proof Key for Code Exchange)

Every authorization request generates a fresh `code_verifier` (32 random bytes, base64url-encoded) and its SHA-256 `code_challenge`. The verifier is stored in an httpOnly cookie and sent during token exchange. This prevents authorization code interception even if the code leaks.

### State Parameter (CSRF Protection)

A 16-byte random hex string is generated per login attempt, stored in an httpOnly cookie (`oauth_state_{provider}`), and compared against the `state` query parameter on callback. Mismatches are rejected with a 400 error.

### OAuth Cookie Isolation

| Cookie | Purpose | Max Age |
|---|---|---|
| `oauth_state_{provider}` | CSRF protection (state verification) | 10 minutes |
| `oauth_verifier_{provider}` | PKCE code verifier for token exchange | 10 minutes |

Both are cleared immediately after the callback is processed, regardless of success or failure.

### Google OIDC ID Token

The `id_token` returned by Google is a JWT containing user claims. It is decoded (base64) but **not signature-verified** because:

1. It was received directly from Google's token endpoint over HTTPS (server-to-server)
2. It is consumed immediately and not stored or forwarded
3. This follows the [OpenID Connect spec §3.1.3.7](https://openid.net/specs/openid-connect-core-1_0.html#IDTokenValidation) which permits skipping verification when the token is obtained directly from the token endpoint over TLS

### Cookie Security Summary

| Threat | Mitigation |
|---|---|
| XSS reading session | `httpOnly` — JavaScript cannot access the cookie |
| Session tampering | JWE encryption (AES-256-GCM) — any modification fails decryption |
| Session theft over network | `secure` flag in production — cookie only sent over HTTPS |
| CSRF attacks | `sameSite=lax` + OAuth `state` parameter |
| Authorization code interception | PKCE with S256 challenge method |
| Token expiry | Automatic refresh using stored refresh tokens |
| Invalid/expired sessions | Failed decryption → cookie deleted, user redirected to login |

---

## Adding a New Provider

To add a third OAuth provider (e.g., GitLab, Discord):

1. **Add provider config** in `src/auth.ts` → `providers` object:
   ```typescript
   gitlab: {
     authorizeUrl: 'https://gitlab.com/oauth/authorize',
     tokenUrl: 'https://gitlab.com/oauth/token',
     scopes: ['read_user'],
     get clientId() { return env.GITLAB_CLIENT_ID ?? ''; },
     get clientSecret() { return env.GITLAB_CLIENT_SECRET ?? ''; }
   }
   ```

2. **Update the `Provider` type** — it is derived automatically from `keyof typeof providers`

3. **Add the `UserSession.provider` union** — update the type to include `'gitlab'`

4. **Create route files**:
   - `src/routes/auth/login/gitlab/+server.ts` — copy from GitHub login, change `'github'` → `'gitlab'`
   - `src/routes/auth/callback/gitlab/+server.ts` — implement user info fetching for the new provider
   - `src/routes/auth/logout/gitlab/+server.ts` — copy from GitHub logout, change provider name

5. **Add a button** on the login page (`src/routes/auth/login/+page.svelte`)

6. **Add environment variables** (`GITLAB_CLIENT_ID`, `GITLAB_CLIENT_SECRET`) to `.env`

### Sign-out

The sign-out form action calls `signOut()`, which:
1. Clears the encrypted session cookie server-side
2. Optionally calls the OIDC provider's `end_session_endpoint` (RP-initiated logout, if supported)
3. Redirects to `/`

---

## Session Management

Auth.js stores the session in a **signed, encrypted HTTP-only cookie** (`authjs.session-token`). There is no server-side session store by default — the session data is self-contained in the cookie.

| Property | Value |
|---|---|
| Cookie type | HTTP-only, Secure (production), SameSite=Lax |
| Encryption | AES-GCM via `AUTH_SECRET` |
| Default expiry | 30 days (rolling) |
| Data stored | `sub`, `name`, `email`, `picture` from OIDC `id_token` claims |

The session is accessed anywhere in server-side code via:

```ts
const session = await event.locals.auth()
// session is null if not authenticated, or { user: { name, email, image }, expires } if authenticated
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `AUTH_SECRET` | 32-byte random secret used to encrypt session cookies. Generate with `openssl rand -hex 32` |
| `OIDC_ISSUER` | Base URL of your OIDC provider (e.g. `https://accounts.google.com`) |
| `OIDC_CLIENT_ID` | Client ID registered with your OIDC provider |
| `OIDC_CLIENT_SECRET` | Client secret registered with your OIDC provider |

These are loaded at build time from `.env` via SvelteKit's `$env/static/private` — they are never exposed to the browser.

---

## OIDC Provider Configuration

When registering the Kali application with your OIDC provider, use these values:

| Setting | Value |
|---|---|
| **Grant type** | Authorization Code |
| **Redirect URI (dev)** | `http://localhost:5173/auth/callback/oidc` |
| **Redirect URI (prod)** | `https://yourdomain.com/auth/callback/oidc` |
| **Scopes** | `openid profile email` |
| **Token endpoint auth method** | `client_secret_post` |

The provider auto-discovers all endpoints (`/authorize`, `/token`, `/userinfo`, `/.well-known/openid-configuration`) from the `OIDC_ISSUER` URL.

---

## Security Properties

| Threat | Mitigation |
|---|---|
| CSRF on sign-in | `state` parameter verified on callback |
| Authorisation code interception | PKCE (`code_challenge` / `code_verifier`) |
| Session cookie theft | HTTP-only cookie (not accessible to JS), AES-GCM encrypted |
| Secret leakage | All secrets in `$env/static/private` — never sent to browser |
| Unprotected routes | Server-side `load()` guard redirects before page data is returned |
| Replay of `id_token` | Auth.js validates `iss`, `aud`, `exp`, and `nonce` claims |
