import { MongoClient, Db } from "mongodb";
import { isMemoryMongoUri, MemoryMongoClient } from "@/lib/memoryDb";

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function mongoUri(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "Please define the MONGODB_URI environment variable inside .env.local",
    );
  }
  return uri;
}

/**
 * Returns a cached MongoDB client. In development we reuse the same client
 * across hot reloads to avoid creating excess connections.
 */
export async function getMongoClient(): Promise<MongoClient> {
  const uri = mongoUri();
  const useMemory = isMemoryMongoUri(uri);

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
      const client = new MongoClient(uri);
      global._mongoClientPromise = client.connect();
    }
    cachedClient = await global._mongoClientPromise;
  } else {
    const client = new MongoClient(uri);
    cachedClient = await client.connect();
  }

  return cachedClient;
}

/**
 * Returns a MongoDB database instance. If no explicit database name is passed,
 * it falls back to the MONGODB_DB environment variable.
 */
export async function getDb(
  name: string = process.env.MONGODB_DB || "car-space-renting-system",
): Promise<Db> {
  if (cachedDb) {
    return cachedDb;
  }

  const client = await getMongoClient();
  cachedDb = client.db(name);
  return cachedDb;
}
