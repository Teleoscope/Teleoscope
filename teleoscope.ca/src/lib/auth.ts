import { MongodbAdapter } from "@lucia-auth/adapter-mongodb";
import { Collection } from "mongodb";
import { Lucia, RegisteredDatabaseUserAttributes, Session } from "lucia";

import { mdb } from "@/lib/db";
import { cookies } from "next/headers";


interface UserDoc extends RegisteredDatabaseUserAttributes {
	_id: string;
}

interface SessionDoc {
	_id: string;
	expires_at: Date;
	user_id: string;
}

const db = await mdb()
const UserCollection = db.collection("users") as Collection<UserDoc>;
const SessionCollection = db.collection("sessions") as Collection<SessionDoc>;

const adapter = new MongodbAdapter(SessionCollection, UserCollection);

const lucia = new Lucia(adapter, {
	sessionCookie: {
		expires: false,
		attributes: {
			secure: process.env.NODE_ENV === "production"
		}
	},
	getUserAttributes: (attributes) => {
		return {
			// attributes has the type of DatabaseUserAttributes
			username: attributes.username
		};
	}
});

declare module "lucia" {
	interface Register {
		Lucia: typeof lucia;
		DatabaseUserAttributes: DatabaseUserAttributes;
	}
}

interface DatabaseUserAttributes {
	username: string;
}


export async function authenticate(userId: string): Promise<Session> {
	const session = await lucia.createSession(userId, {});
	const sessionCookie = lucia.createSessionCookie(session.id);
	cookies().set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
	return session
}