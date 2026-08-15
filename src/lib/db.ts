import { MongoClient, Db } from "mongodb";
import { isMemoryMongoUri, MemoryMongoClient } from "@/lib/memoryDb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;
const useMemory = isMemoryMongoUri(uri);

if (!uri) {
  throw new Error(
    "Please define the MONGODB_URI environment variable inside .env.local",
  );
}

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

/**
 * Returns a cached MongoDB client. In development we reuse the same client
 * across hot reloads to avoid creating excess connections.
 */
export async function getMongoClient(): Promise<MongoClient> {
  if (useMemory) {
    if (!cachedClient) {
      cachedClient = new MemoryMongoClient() as unknown as MongoClient;
    }
    return cachedClient;
  }

  if (cachedClient) {
    return cachedClient;
  }

  if (process.env.NODE_ENV === "development") {
    if (!global._mongoClientPromise) {
      const client = new MongoClient(uri as string);
      global._mongoClientPromise = client.connect();
    }
    cachedClient = await global._mongoClientPromise;
  } else {
    const client = new MongoClient(uri as string);
    cachedClient = await client.connect();
  }

  return cachedClient;
}

/**
 * Returns a MongoDB database instance. If no explicit database name is passed,
 * it falls back to the MONGODB_DB environment variable.
 */
export async function getDb(name: string = dbName || "car-space-renting-system"): Promise<Db> {
  if (cachedDb) {
    return cachedDb;
  }

  const client = await getMongoClient();
  cachedDb = client.db(name);
  return cachedDb;
}
