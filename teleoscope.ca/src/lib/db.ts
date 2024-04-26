
import { MongoClient } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI;
if (MONGODB_URI === undefined) {
    throw new Error("Environment variable MONGODB_URI is not set");
}
const client = new MongoClient(MONGODB_URI);

await client.connect();

const db = client.db();

export { db };