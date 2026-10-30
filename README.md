# Revoltz Supply

Independent restaurant procurement pilot for Pune: restaurant RFQs, controlled supplier assignments, private itemized quotations, comparison, supplier selection and delivery confirmation. Suppliers invoice, collect payment and fulfil directly. No Revoltz-held payments or inventory.

## Stack

React/TypeScript/Vite frontend, Express/Node.js 24 server, Better Auth email/password sessions and a dedicated Supabase PostgreSQL project per environment. PostgreSQL records survive Render filesystem resets. The application does not depend on DineTap, AgencyOS or the earlier Sites preview.

## Run and verify

```sh
npm ci
npm test
npm run build
npm start
```

Configure SUPPLY_DATABASE_URL for the project's **Session pooler** connection (port 5432), BETTER_AUTH_SECRET (random, 32+ characters) and BETTER_AUTH_URL (the canonical app origin). On Render, BETTER_AUTH_URL defaults to RENDER_EXTERNAL_URL. Use SUPPLY_ENVIRONMENT=test for the isolated test service; production otherwise.

Do not use the IPv6 direct Supabase connection on an IPv4-only host. Keep database credentials and auth secrets in server runtime environment variables, never VITE_ variables or source. Do not disable TLS certificate verification. Use the SSL settings/certificate provided by Supabase for the selected connection.

The initial startup applies a checksum-protected Supply migration inside the private supply_app schema, then the installed Better Auth version's schema migrations. Supply migration is transactional and serialized. Back up/restore and review auth migrations before upgrading dependencies. No schema is exposed to the Supabase Data API; public and anonymous clients receive no database privileges.

## First administrator

Register/sign in to an account first. An operator then sets SUPPLY_ADMIN_USER_ID to that authenticated account's immutable ID and redeploys. No public signup can pick administrator access and no email match grants it. In the test environment that administrator can create explicitly labeled restaurant/supplier test profiles and switch between them to exercise the sourcing flow. Test switching is rejected in production.

## Security and pilot limits

HTTP-only auth sessions, maintained authentication library, authentication rate limits, server-side user validation, origin checks, bounded JSON requests, parameterized SQL, transactionally audited writes and tenant/assignment guards. Client-supplied identity headers are ignored. RLS is enabled on Supply tables as defense in depth; the server's table owner bypasses it, so backend ownership checks remain essential. Auth tables stay in the unexposed private schema.

This is an early supervised pilot, not a claim of commercial readiness. Email verification and password recovery are not configured yet. Do not treat an unverified email address as identity proof. Supplier approval is an operational review label, not a product-quality guarantee. Backups, restoration drills, multi-device authenticated browser tests, recovery email delivery and operational terms remain launch requirements. Free Render services can sleep; a free preview is not an uptime commitment.

## Tests

The runtime integration test uses the PostgreSQL protocol against a local embedded PostgreSQL engine. It exercises actual Better Auth signup/session/logout, RFQ persistence, cross-restaurant denial, cross-origin rejection, supplier quotations, idempotent selection and completion. It does not substitute for testing the deployed Supabase connection and live browser flow.

DineTap, Restaurant OS, AgencyOS and existing services are excluded from this repository and its migrations.
