import 'dotenv/config';
import mongoose from 'mongoose';
import { config } from '../server/config/index';
import { transferDataToMongo } from '../server/database/mongoSync';

async function main() {
  console.log('[Migrate] Connecting to MongoDB Atlas at:', config.mongoUri.replace(/:([^:@]+)@/, ':****@'));

  try {
    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 15000,
    });
    console.log('[Migrate] Connected successfully to MongoDB Atlas!');

    const result = await transferDataToMongo();
    console.log('[Migrate] Migration complete! Summary:');
    console.table(result.transferred);
    console.log('[Migrate] All data is now live on MongoDB Atlas!');
  } catch (err: any) {
    console.error('[Migrate] Migration failed:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

main();
