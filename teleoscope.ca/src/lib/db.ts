
import { MongoClient } from "mongodb";
import accounts from "@/schemas/accounts.json";
import sessions from "@/schemas/sessions.json";
import users from "@/schemas/users.json";
import teams from "@/schemas/teams.json";
import storage from "@/schemas/storage.json";
import workflows from "@/schemas/workflows.json";
import workspaces from "@/schemas/workspaces.json";

const MONGODB_URI = process.env.MONGODB_URI ? process.env.MONGODB_URI : "";

async function connect(uri: string) {
    const client = new MongoClient(uri);
    await client.connect();
    return client
}

async function mdb() {
    return (await connect(MONGODB_URI)).db()
}

async function ensure() {
    console.log("Ensuring that DB collections are correct and consistent...")
    const db = (await connect(MONGODB_URI)).db();
    const collections = await db.listCollections().toArray()
    const coll_names = collections.map(c => c.name)
    if (!coll_names.includes("users")) {
        await db.createCollection("users", {
            validator: users
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
            validator: sessions
        })
    }
    
    if (!coll_names.includes("accounts")) {
        await db.createCollection("accounts", {
            validator: accounts
        })
    }

    if (!coll_names.includes("teams")) {
        await db.createCollection("teams", {
            validator: teams
        })
    }

    if (!coll_names.includes("storage")) {
        await db.createCollection("storage", {
            validator: storage
        })
    }

    if (!coll_names.includes("workflows")) {
        await db.createCollection("workflows", {
            validator: workflows
        })
    }

    if (!coll_names.includes("workspaces")) {
        await db.createCollection("workspaces", {
            validator: workspaces
        })
    }
}

export { mdb, connect, ensure };

