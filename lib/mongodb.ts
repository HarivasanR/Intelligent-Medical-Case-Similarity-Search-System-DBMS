import { MongoClient } from "mongodb";

let client: MongoClient | undefined;
export async function getMongoDb() {
  if (!process.env.MONGODB_URL) throw new Error("MONGODB_URL is not configured");
  // Fail fast (5s) instead of the driver's 30s default when MongoDB is not running.
  client ??= new MongoClient(process.env.MONGODB_URL, { serverSelectionTimeoutMS: 5000 });
  await client.connect();
  return client.db(process.env.MONGODB_DB || "medmatch");
}
