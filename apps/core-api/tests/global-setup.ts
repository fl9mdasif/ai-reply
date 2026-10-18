import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MongoMemoryServer } from 'mongodb-memory-server';

// One real mongod process for the entire test run, shared by every test file
// (each file uses its own MONGODB_DB_NAME against this one instance). Starting
// a separate mongod per file is what caused intermittent ECONNREFUSED races.
const uriFilePath = join(tmpdir(), 'jobabai-core-api-test-mongo-uri.json');

export default async function globalSetup(): Promise<() => Promise<void>> {
  const mongod = await MongoMemoryServer.create();
  writeFileSync(uriFilePath, JSON.stringify({ uri: mongod.getUri() }));

  return async function teardown(): Promise<void> {
    await mongod.stop();
    try {
      unlinkSync(uriFilePath);
    } catch {
      // already gone, nothing to clean up
    }
  };
}

export function getSharedMongoUri(): string {
  const raw = readFileSync(uriFilePath, 'utf8');
  return (JSON.parse(raw) as { uri: string }).uri;
}
