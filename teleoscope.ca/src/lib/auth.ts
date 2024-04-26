import { MongodbAdapter } from "@lucia-auth/adapter-mongodb";
import { Collection } from "mongodb";
import { Lucia } from "lucia";

import { db } from "@/lib/db";

const User = db.collection("users") as Collection<UserDoc>;
const Session = db.collection("sessions") as Collection<SessionDoc>;

const adapter = new MongodbAdapter(Session, User);

interface UserDoc {
	_id: string;
}

interface SessionDoc {
	_id: string;
	expires_at: Date;
	user_id: string;
}

export const lucia = new Lucia(adapter, {
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
