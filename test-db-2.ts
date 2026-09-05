import { db } from './src/db/index.js';
import { sql } from 'drizzle-orm';
async function run() {
  const syncs = await db.execute(sql`SELECT * FROM sync_operations LIMIT 10`);
  console.log("Sync ops:", syncs.rows);
}
run().catch(console.error).then(() => process.exit(0));
