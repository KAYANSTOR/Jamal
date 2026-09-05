import { db } from './src/db/index.js';
import { sql } from 'drizzle-orm';
async function run() {
  const res = await db.execute(sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`);
  console.log(res.rows);
  const syncs = await db.execute(sql`SELECT COUNT(*) FROM sync_operations`);
  console.log("Sync ops:", syncs.rows);
}
run().catch(console.error).then(() => process.exit(0));
