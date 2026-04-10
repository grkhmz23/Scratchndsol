# Security Guide for Scratch 'n SOL

This document outlines all security measures implemented in the Scratch 'n SOL application.

## Table of Contents

- [Overview](#overview)
- [Security Features](#security-features)
- [Configuration](#configuration)
- [Best Practices](#best-practices)
- [Incident Response](#incident-response)

## Overview

Scratch 'n SOL is a cryptocurrency gambling application handling real SOL transactions. Security is paramount to protect user funds and prevent abuse.

### Threat Model

- **Financial attacks**: Double-spending, duplicate payouts, unauthorized transactions
- **Service abuse**: DDoS, rate limit bypassing, resource exhaustion
- **Data exposure**: Leaked private keys, transaction data, user information
- **Injection attacks**: NoSQL injection, XSS, CSRF

## Security Features

### 1. Rate Limiting & Quotas

Implemented in `server/middleware/rate-limiter.ts`:

| Endpoint Tier | Window | Max Requests | Block Duration |
|--------------|--------|--------------|----------------|
| Critical (payout) | 1 min | 5 | 5 min |
| Standard (game) | 1 min | 10 | 1 min |
| General (stats) | 1 min | 60 | - |
| Jackpot | 1 min | 20 | - |

**User Quotas**:
- Hourly: 100 requests
- Daily: 500 requests

### 2. Idempotency

All payment operations require an `X-Idempotency-Key` header:

```typescript
// Duplicate requests with same key return cached response
const response = await apiRequest('POST', '/api/games/payout', data, true);
```

Benefits:
- Prevents double-charges
- Prevents duplicate payouts
- Safe to retry failed requests

### 3. Retry Logic with Exponential Backoff

Implemented in `server/utils/retry.ts`:

```typescript
await withRetry(() => solanaService.sendPayout(wallet, amount), {
  maxRetries: 3,
  baseDelayMs: 2000,
  backoffMultiplier: 2,
});
```

Features:
- Jitter to prevent thundering herd
- Non-retryable error detection
- Circuit breaker pattern

### 4. Input Validation & Sanitization

**Wallet Address Validation**:
- Base58 format check
- Length validation (32-44 chars)
- Demo wallet prefix allowance

**Request Sanitization**:
- XSS prevention (script tag removal)
- NoSQL injection detection
- Request size limits (10MB)

### 5. Security Headers

All responses include:

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000
Content-Security-Policy: default-src 'self'; ...
Referrer-Policy: strict-origin-when-cross-origin
```

### 6. CORS Configuration

Whitelisted origins only:
- Production domain
- Vercel deployments
- Replit domains
- Localhost (development)

### 7. Error Handling

Production error responses:
```json
{
  "error": "INTERNAL_ERROR",
  "message": "An internal error occurred"
}
```

Stack traces and internal details are **never** exposed.

### 8. Transaction Verification

All payments verified on-chain:
- Transaction signature validation
- Recipient address verification
- Amount matching (±1% tolerance)
- Duplicate transaction detection

### 9. Payout Limits

Security caps to prevent drainage:
- Max single payout: 10 SOL
- Max hourly: 50 SOL
- Max daily: 200 SOL

### 10. Circuit Breaker

Automatic failure detection:
- 5 failures → Open circuit
- 1 minute cooldown
- Half-open test before full recovery

## Configuration

### Required Environment Variables

```bash
# Database
DATABASE_URL=postgres://user:pass@host/db

# Solana
POOL_WALLET_PRIVATE_KEY=base58_private_key
SOLANA_RPC_URL=https://rpc.helius.xyz/?api-key=...
VITE_SOLANA_NETWORK=mainnet
VITE_TEAM_WALLET=public_key
VITE_POOL_WALLET=public_key

# Security
SESSION_SECRET=random_32_char_string
```

### Security Checklist

Before deploying:

- [ ] All environment variables set
- [ ] `.env` in `.gitignore`
- [ ] `POOL_WALLET_PRIVATE_KEY` never logged
- [ ] Rate limits tested
- [ ] CORS origins restricted
- [ ] HTTPS enforced
- [ ] Dependencies audited (`npm audit`)
- [ ] TypeScript compilation clean
- [ ] Error responses don't leak data

## Best Practices

### For Developers

1. **Never log private keys or seeds**
2. **Always use parameterized queries** (Drizzle ORM handles this)
3. **Validate all inputs** with Zod schemas
4. **Use asyncHandler** to catch async errors
5. **Test with max rate limits** before deploying

### For Operations

1. **Monitor pool wallet balance**
2. **Set up alerts** for:
   - Unusual payout volume
   - Failed transaction spikes
   - Rate limit violations
3. **Regular dependency updates**
4. **Backup database daily**
5. **Test disaster recovery**

## Incident Response

### Suspected Breach

1. Immediately change `POOL_WALLET_PRIVATE_KEY`
2. Enable `MAINTENANCE_MODE` environment variable
3. Review logs for unauthorized access
4. Notify users if funds at risk

### DDoS Attack

Rate limiting will automatically block IPs exceeding limits. Monitor:
- 429 response rates
- Error spike patterns
- Unusual geographic distribution

### Smart Contract Issues

The application uses standard Solana SystemProgram transfers. If issues arise:
1. Pause new games via maintenance mode
2. Verify all pending transactions
3. Contact Solana Foundation if needed

## Security Audit

Run the security audit script:

```bash
./scripts/security-audit.sh
```

This checks:
- Node.js version
- Environment configuration
- Hardcoded secrets
- npm vulnerabilities
- TypeScript errors

## Reporting Vulnerabilities

If you discover a security vulnerability:

1. **DO NOT** open a public issue
2. Email security@scratchnsol.com (example)
3. Allow 48 hours for initial response
4. Responsible disclosure appreciated

## Security Updates

Subscribe to security advisories for:
- Solana Web3.js
- Express.js
- PostgreSQL
- Node.js runtime

---

**Last Updated**: 2025-04-10  
**Version**: 1.0.0
