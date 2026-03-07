import { MongoClient } from "mongodb";

// E2E/Playwright: use localhost so tests work without Docker (Next may load .env.local with Docker host)
const normalizeEnv = (value?: string) => {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  const lowered = trimmed.toLowerCase();
  if (lowered === "undefined" || lowered === "null") return undefined;
  return trimmed;
};

const directUri = normalizeEnv(process.env.MONGODB_URI);
const username = normalizeEnv(process.env.MONGODB_USERNAME);
const password = normalizeEnv(process.env.MONGODB_PASSWORD);
const host = normalizeEnv(process.env.MONGODB_HOST);
const optionsQuery = normalizeEnv(process.env.MONGODB_OPTIONS);
const composedUri =
  username && password && host
    ? `mongodb://${username}:${password}@${host}/${optionsQuery ? `?${optionsQuery}` : ""}`
    : undefined;
const rawUri = directUri || composedUri || "mongodb://localhost:27017";
const uri =
  process.env.PLAYWRIGHT_E2E === "1"
    ? rawUri.replace(/(mongodb:\/\/)([^@\/]*@)?mongodb(:\d+)?/, "$1$2localhost$3")
    : rawUri;
const options = {
  serverSelectionTimeoutMS: 60000,
  maxIdleTimeMS: 60000, // 1.0 minute
  socketTimeoutMS: 30000, // 0.5 minutes
  connectTimeoutMS: 30000 // 0.5 minutes
};

let client;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  let globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
export default clientPromise;
