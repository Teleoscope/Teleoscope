
import { Db, MongoClient } from "mongodb";
import accounts from "@/schemas/accounts.json";
import sessions from "@/schemas/sessions.json";
import users from "@/schemas/users.json";
import teams from "@/schemas/teams.json";
import storage from "@/schemas/storage.json";
import workflows from "@/schemas/workflows.json";
import workspaces from "@/schemas/workspaces.json";


async function connect(uri: string) {
    const client = new MongoClient(uri);
    await client.connect();
    return client
}

let _client: MongoClient | null;
async function client() {
    if (!_client) {
        _client = await connect(process.env.MONGODB_URI!)
    }
    return _client
}

async function ensure_db_collections_exist(db: Db) {
    console.log("Ensuring that DB collections are correct and consistent...")
    const collections = await db.listCollections().toArray()
    const coll_names = collections.map(c => c.name)
    console.log("Collection names:", coll_names)
    
    if (!coll_names.includes("users")) {
        await db.createCollection("users", {
            validator: users,
            validationLevel: "strict"
            // TODO: validationLevel
        })
        await db.collection("users").createIndex(
            { "emails": 1 },
            {
                name: "emails",
                unique: true
            }
        )
    }
    if (!coll_names.includes("sessions")) {
        await db.createCollection("sessions", {
            validator: sessions,
            validationLevel: "strict"
        })
    }
    
    if (!coll_names.includes("accounts")) {
        await db.createCollection("accounts", {
            validator: accounts,
            validationLevel: "strict"
        })
    }

    if (!coll_names.includes("teams")) {
        await db.createCollection("teams", {
            validator: teams,
            validationLevel: "strict"
        })
    }

    if (!coll_names.includes("storage")) {
        await db.createCollection("storage", {
            validator: storage,
            validationLevel: "strict"
        })
    }

    if (!coll_names.includes("workflows")) {
        await db.createCollection("workflows", {
            validator: workflows,
            validationLevel: "strict"
        })
    }

    if (!coll_names.includes("workspaces")) {
        await db.createCollection("workspaces", {
            validator: workspaces,
            validationLevel: "strict"
        })
    }
}

export { client, connect, ensure_db_collections_exist };

