"use server";;
import { MongodbAdapter } from "@lucia-auth/adapter-mongodb";
import { Lucia, RegisteredDatabaseUserAttributes } from "lucia";
import { Collection, Db } from "mongodb";
import { client } from "@/lib/db";

interface UserDoc extends RegisteredDatabaseUserAttributes {
    _id: string;
  }

interface SessionDoc {
  _id: string;
  expires_at: Date;
  user_id: string;
}



async function getUsersAndSessionsCollections(db: Db) {

    const SessionCollection = db.collection("sessions") as Collection<SessionDoc>;
    const UserCollection = db.collection("users") as Collection<UserDoc>;
    return { Session: SessionCollection, User: UserCollection };
  }


export async function connect(): Promise<
  Lucia<Record<never, never>, Record<never, never>>
> {
  const mongo_client = await client({serverSelectionTimeoutMS: 5000});
  const db = mongo_client.db();

  const { Session, User } = await getUsersAndSessionsCollections(db);
  
  const adapter = new MongodbAdapter(Session, User);

  const lucia = new Lucia(adapter, {
    sessionCookie: {
      expires: false,
      attributes: {
        secure: process.env.NODE_ENV === "production",
      },
    },
  });

  

  // mongo_client.close()

  return lucia;
}
