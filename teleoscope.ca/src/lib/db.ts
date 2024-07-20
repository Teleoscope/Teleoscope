
import { Db, MongoClient, MongoClientOptions } from "mongodb";
import accounts from "@/schemas/accounts.json";
import sessions from "@/schemas/sessions.json";
import users from "@/schemas/users.json";
import teams from "@/schemas/teams.json";
import storage from "@/schemas/storage.json";
import workflows from "@/schemas/workflows.json";
import workspaces from "@/schemas/workspaces.json";
import notes from "@/schemas/notes.json";
import graph from "@/schemas/graph.json";
import documents from "@/schemas/documents.json";


async function connect(uri: string, options?: MongoClientOptions) {
    const client = new MongoClient(uri, options);
    await client.connect();
    return client
}


export const dbOp = async (operation: Function) => {
    const mongo_client = await client();
    try {
      const db = mongo_client.db();
      return await operation(mongo_client, db);
    } catch (error) {
        if (error.code === 121) { // Document validation error
          const details = error.errInfo.details;
          console.log('Document validation error:');
          console.log(JSON.stringify(details, null, 2));
        } else {
          console.error('An error occurred:', error);
        }
    }
    finally {
      mongo_client.close();
    }
  };



// let _client: MongoClient | null;
async function client(options: MongoClientOptions = {serverSelectionTimeoutMS: 60000}) {
    // if (!_client) {
        // _client = await connect(process.env.MONGODB_URI!)
    // }
    const _client = await connect(process.env.MONGODB_URI!, options);
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

    if (!coll_names.includes("notes")) {
        await db.createCollection("notes", {
            validator: notes,
            validationLevel: "strict"
        })
    }

    if (!coll_names.includes("documents")) {
        await db.createCollection("documents", {
            validator: documents,
            validationLevel: "strict"
        })
        await db.collection("documents").createIndex(
            { "title": "text", "text": "text" },
            {
                name: "text",
            }
        )
    }

    if (!coll_names.includes("graph")) {
        await db.createCollection("graph", {
            validator: graph,
            validationLevel: "strict"
        })
        await db.collection("graph").createIndex(
            { "uid": 1 },
            {
                name: "uid",
                unique: true
            }
        )
   
    }

    

}

export { client, connect, ensure_db_collections_exist };

