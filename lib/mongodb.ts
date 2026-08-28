import { MongoClient } from "mongodb";

let client: MongoClient | undefined;
export async function getMongoDb() {
  if (!process.env.MONGODB_URL) throw new Error("MONGODB_URL is not configured");
  client ??= new MongoClient(process.env.MONGODB_URL);
  await client.connect();
  return client.db(process.env.MONGODB_DB || "medmatch");
}
