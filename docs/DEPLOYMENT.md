# Render deployment

Each service uses a separate Supabase project in the Mayur account.

| Environment | URL | Supabase project | Deployment |
| --- | --- | --- | --- |
| Test | https://revoltz-supply-test.onrender.com | gwnnqpkvqxqfjamewigj | Automatically builds main commits |
| Production | https://revoltz-supply.onrender.com | idgjyuelnkbamdyarwfh | Explicit deploy after test verification |

Render workspace: tea-db7vffqjnfac73d2eaa0 (Mayur). Free Node services in Singapore. Test service: srv-dbi998142hec73cqed70. Production service: srv-dbi99m942hec73cqf640.

The private supply_app schema is provisioned by the database administrator. Each database has an independent supply_runtime login with USAGE/CREATE only in that schema, without superuser, create-role, create-database, or bypass-RLS privileges. Its password verifier is stored by PostgreSQL. Plaintext credentials and separate Better Auth secrets are stored only in Render environment configuration.

SUPPLY_DATABASE_URL uses the exact Supabase Session pooler endpoint on port 5432 and sslmode=verify-full. NODE_EXTRA_CA_CERTS=config/supabase-ca.crt adds the official Supabase Root 2021 CA to Node trust. This public CA was downloaded from the project dashboard certificate link; SHA-256 fingerprint: 807025AD50D4ED219D2C9C7D299C004F824EB000F7F65AFEF607D07B72E6CAFA. Certificate expiration: April 26, 2031. Certificate and hostname verification remain enabled.

Both services use npm ci followed by npm run build, then npm start. The repository .npmrc includes dev build dependencies even when NODE_ENV=production. NPM_CONFIG_INCLUDE=dev is also configured on Render. SUPPLY_ENVIRONMENT is test or production. Render supplies the canonical RENDER_EXTERNAL_URL.

Before production changes: run npm test and npm run build, deploy test, verify the complete affected flow, then explicitly deploy production. No test data should be copied to production.

The live smoke script scripts/smoke-deployment.py is intentionally restricted to the test hostname. It creates labeled test restaurant accounts and one RFQ and checks persistence, session behavior and access denial. It never creates production records.

Administrator activation requires the owner's actual signed-in immutable account ID in SUPPLY_ADMIN_USER_ID. Email verification, password recovery and backup restoration drills remain pilot limitations. Free service sleep and quota limits apply.
