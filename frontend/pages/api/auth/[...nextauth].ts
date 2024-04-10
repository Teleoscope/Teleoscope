import NextAuth from "next-auth";
import type { NextApiRequest, NextApiResponse } from "next";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from 'bcryptjs';
import { MongoClient } from "mongodb";


const cookiePrefix = "__Secure-";


export const authOptions = {
  pages: {
    signIn: '/signin',
    // signOut: '/auth/signout',
    // error: '/auth/error', // Error code passed in query string as ?error=
    // verifyRequest: '/auth/verify-request', // (used for check email message)
    // newUser: '/auth/new-user' // New users will be directed here on first sign in (leave the property out if not of interest)
  },
  cookies: {
    sessionToken: {
      name: `${cookiePrefix}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: true,
      },
    },
  },
  // Configure one or more authentication providers
  providers: [  
    // GoogleProvider({
    //   clientId: process.env.GOOGLE_CLIENT_ID,
    //   clientSecret: process.env.GOOGLE_CLIENT_SECRET
    // }),
    CredentialsProvider({
      // The name to display on the sign in form (e.g. 'Sign in with...')
      name: 'your credentials.',
      // The credentials is used to generate a suitable form on the sign in page.
      // You can specify whatever fields you are expecting to be submitted.
      // e.g. domain, username, password, 2FA token, etc.
      // You can pass any HTML attribute to the <input> tag through the object.
      credentials: {
        username: { label: "Username", type: "text", placeholder: "jsmith" },
        database: { label: "Database", type: "text", placeholder: "aita" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, req) {
        // You need to provide your own logic here that takes the credentials
        // submitted and returns either a object representing a user or value
        // that is false/null if the credentials are invalid.
        // e.g. return { id: 1, name: 'J Smith', email: 'jsmith@example.com' }
        // You can also use the `req` object to obtain additional parameters
        // (i.e., the request IP address)
        const user = await checkCredentials(req)
        
        // If no error and we have user data, return it
        if (user) {
          return user
        }
        
        // Return null if user data could not be retrieved
        return null
      } 
    })
    // ...add more providers here
  ],
  callbacks: {
    async jwt({ token, user, account, profile, isNewUser }) {
      if (user) {
        token.user = user
      }
      return token
    },
    async session({ session, token, user }) {
      // Send properties to the client, like an access_token from a provider.
      session.user = token.user
      return session
    }
  },
  session: {
    strategy: "jwt",
  },
}

export default async function auth(req: NextApiRequest, res: NextApiResponse) {
  // Do whatever you want here, before the request is passed down to `NextAuth`
  return await NextAuth(req, res, authOptions)
}
// export default NextAuth(authOptions)




async function checkCredentials (req) {
  try {
    const client = await new MongoClient(process.env.MONGODB_REGISTRAR_URI).connect();
    
    const db = client.db("users");
    const credentials = req.body;

    const user = await db.collection("users").findOne({ username: credentials.username });
    if (user) {
      const compare = await bcrypt.compare(credentials.password, user.password);
      if (compare) {
        client.close();
        return {
          "username": user.username,
          "id": user._id.toString(), // Ensure consistent string ID representation
        };
      } else {
        client.close();
      }
    } else {
      const saltRounds = 10;  
      const salt = await bcrypt.genSalt(saltRounds);
      const hash = await bcrypt.hash(credentials.password, salt);

      const newUser = await db.collection("users").insertOne({ 
        username: credentials.username,
        password: hash,
      });
      client.close();
      return {
        "username": credentials.username,
        "id": newUser.insertedId.toString(),
      };
    }
  } catch (error) {
    console.error("Error:", error);
  }
}