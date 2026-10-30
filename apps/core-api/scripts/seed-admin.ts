/**
 * One-time script to create the first admin account.
 *
 * Usage:
 *   npx tsx scripts/seed-admin.ts --email admin@jobabai.com --password <secret>
 *
 * Requires a valid .env file in apps/core-api/ with MONGODB_URI etc.
 */

import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { ObjectId } from 'mongodb';
import { connectDb, sellersCollection, closeDb } from '../src/lib/db.js';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const emailIdx = args.indexOf('--email');
  const passIdx = args.indexOf('--password');

  if (emailIdx === -1 || passIdx === -1) {
    console.error('Usage: npx tsx scripts/seed-admin.ts --email <email> --password <password>');
    process.exit(1);
  }

  const email = args[emailIdx + 1];
  const password = args[passIdx + 1];

  if (!email || !password || password.length < 12) {
    console.error('Email and password (min 12 chars) required');
    process.exit(1);
  }

  await connectDb();

  const existing = await sellersCollection().findOne({ email });
  if (existing) {
    if (existing.role === 'admin') {
      console.log(`Admin already exists: ${existing._id.toString()}`);
    } else {
      await sellersCollection().updateOne(
        { _id: existing._id },
        { $set: { role: 'admin', updatedAt: new Date() } },
      );
      console.log(`Upgraded existing seller to admin: ${existing._id.toString()}`);
    }
    await closeDb();
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const now = new Date();
  const doc = {
    _id: new ObjectId(),
    businessName: 'jobabai Admin',
    email,
    passwordHash,
    status: 'active' as const,
    role: 'admin' as const,
    plan: 'internal',
    webhookSubscribed: false,
    createdAt: now,
    updatedAt: now,
  };

  await sellersCollection().insertOne(doc);
  console.log(`Admin created successfully`);
  console.log(`  ID: ${doc._id.toString()}`);
  console.log(`  Email: ${email}`);

  await closeDb();
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
