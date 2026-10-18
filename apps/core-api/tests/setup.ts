// Runs before any test file is loaded. Provides a valid baseline environment
// so modules that eagerly validate `process.env` via config/env.ts (e.g. lib/crypto.ts,
// lib/logger.ts, app.ts) can be imported safely in tests. Individual tests that need
// a real Mongo connection still override MONGODB_URI with an in-memory instance.
process.env.NODE_ENV ??= 'test';
process.env.MONGODB_URI ??= 'mongodb://localhost:27017';
process.env.MONGODB_DB_NAME ??= 'jobabai_test';
process.env.JWT_SECRET ??= 'test-jwt-secret-at-least-32-characters-long';
process.env.ENCRYPTION_KEY ??= Buffer.alloc(32, 7).toString('base64');
process.env.REGISTRATION_MODE ??= 'open';
process.env.META_APP_SECRET ??= 'test-meta-app-secret';
process.env.META_VERIFY_TOKEN ??= 'test-verify-token';
process.env.RAG_ENGINE_URL ??= 'http://localhost:4000';
process.env.RAG_ENGINE_INTERNAL_TOKEN ??= 'test-internal-token';
process.env.GOOGLE_OAUTH_CLIENT_ID ??= 'test-google-client-id';
process.env.GOOGLE_OAUTH_CLIENT_SECRET ??= 'test-google-client-secret';
process.env.GOOGLE_OAUTH_REDIRECT_URI ??= 'http://localhost:3000/integrations/google/callback';
