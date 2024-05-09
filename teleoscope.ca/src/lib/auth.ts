import { MongodbAdapter } from "@lucia-auth/adapter-mongodb";
import { Collection } from "mongodb";
import { Lucia, RegisteredDatabaseUserAttributes, Session, User } from "lucia";
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


async function connect(): Promise<Lucia<Record<never, never>, Record<never, never>>> {
	const db = await mdb()
	const SessionCollection = db.collection("sessions") as Collection<SessionDoc>;
	const UserCollection = db.collection("users") as Collection<UserDoc>;
	
	const adapter = new MongodbAdapter(SessionCollection, UserCollection);
	
	const lucia = new Lucia(adapter, {
		sessionCookie: {
			expires: false,
			attributes: {
				secure: process.env.NODE_ENV === "production"
			}
		},
	});
	return lucia;
}




export async function validateRequest()
{
	const lucia = await connect()
	async (): Promise<{ user: User; session: Session } | { user: null; session: null }> => {
		const sessionId = cookies().get(lucia.sessionCookieName)?.value ?? null;
		if (!sessionId) {
			return {
				user: null,
				session: null
			};
		}

		const result = await lucia.validateSession(sessionId);
		
		console.log("result", result, sessionId)
		// next.js throws when you attempt to set cookie when rendering page
		try {
			if (result.session && result.session.fresh) {
				const sessionCookie = lucia.createSessionCookie(result.session.id);
				cookies().set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
			}
			if (!result.session) {
				const sessionCookie = lucia.createBlankSessionCookie();
				cookies().set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
			}
		} catch {}
		return result;
	}
}

// Authenticate
export async function authenticate(userId: string): Promise<Session> {
	const lucia = await connect()
	const session = await lucia.createSession(userId, {});
	const sessionCookie = lucia.createSessionCookie(session.id);
	cookies().set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
	return session
}

