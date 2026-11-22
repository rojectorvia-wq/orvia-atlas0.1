# ORVIA Security Architecture — Baseline 0.1

## Security objective

Protect restaurant tenants, identities, operational records, AI usage, credentials, and deployment infrastructure through layered controls. Security claims must be supported by tests and operational evidence.

## Trust boundaries

1. Browser and mobile clients are untrusted.
2. Every API request is untrusted until authentication and authorization complete.
3. A valid identity is not proof of access to a restaurant.
4. Restaurant IDs supplied by clients are selectors, never authorization evidence.
5. Model outputs, retrieved web pages, uploaded content, and agent messages are untrusted data.
6. Preview and development environments must not inherit production database credentials.
7. CI jobs and third-party actions receive only the permissions they require.

## Required controls

### Identity and authorization
- Verify signed identity tokens server-side.
- Enforce tenant membership and role permissions on every resource operation.
- Deny by default; never trust client-side visibility checks.
- Add MFA and secure session controls through the identity provider.
- Test cross-tenant access attempts for every endpoint.

### Data
- Enforce tenant boundaries in application queries and, where feasible, PostgreSQL Row-Level Security.
- Use parameterized SQL and strict input schemas.
- Encrypt transport and managed database storage; restrict database roles to least privilege.
- Minimize personal data in AI context and logs.
- Test encrypted backups and restoration procedures.

### API and abuse resistance
- Apply persistent, distributed rate limits keyed by identity and tenant.
- Bound request size, execution time, concurrency, and downstream spend.
- Validate content types, schemas, and allowed state transitions.
- Return generic errors; never return stack traces, secrets, SQL, or provider credentials.
- Add origin/CSRF protections where cookie-authenticated state-changing requests exist.

### AI safety
- Keep tenant context isolated and server-derived.
- Treat prompts, retrieved pages, files, and model outputs as untrusted.
- Use explicit tool allowlists and least-privilege service identities.
- Require human approval for consequential actions.
- Persist budget reservations and reconcile provider usage; in-memory limits are not financial controls.

### Supply chain and deployment
- Use read-only CI permissions by default.
- Audit and update dependencies; pin third-party actions to verified immutable commit SHAs.
- Scan source, dependencies, and repository history for secrets.
- Require review and passing checks before protected-branch merges.
- Separate preview credentials/data from production.
- Keep deployment rollback and incident response procedures tested.

### Detection and response
- Log security events with actor, tenant, action, result, and correlation ID while minimizing sensitive content.
- Alert on anomalous authentication, authorization failures, rate spikes, and unusual AI spend.
- Maintain incident triage, containment, credential rotation, recovery, and post-incident review procedures.

## Implementation status

This document defines target controls, not proof of implementation. Controls must be marked complete only after code review, tests, configuration verification, and operational evidence. No certification is implied.

## Current known gaps to close

- Audit every API route for server-side tenant membership and role enforcement.
- Verify PostgreSQL tenant isolation and assess Row-Level Security.
- Replace per-invocation AI budgets with persistent tenant-scoped reservations and reconciliation.
- Add distributed rate limiting and request-size limits.
- Review public health/diagnostic responses for information disclosure.
- Verify repository secret scanning, dependency alerts, branch protection, and private vulnerability reporting.
- Add security tests for cross-tenant access, privilege escalation, malformed input, and concurrent requests.
- Complete CSP only after inventorying Clerk, AI, and other required origins to avoid breaking authentication.
