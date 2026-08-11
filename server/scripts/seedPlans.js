/**
 * Seed / upsert SaaS plans (idempotent).
 * Usage: npm run seed:plans
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { buildMongoUri } from '../configs/db.js';
import { ensureDefaultPlans, serializePlan } from '../services/entitlementService.js';

const seed = async () => {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is required');
    process.exit(1);
  }

  await mongoose.connect(buildMongoUri(process.env.MONGODB_URI));
  const full = await ensureDefaultPlans();
  console.log('Default plan ready:', serializePlan(full));
  await mongoose.disconnect();
  process.exit(0);
};

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
