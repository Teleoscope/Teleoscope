import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import type { NextApiRequest, NextApiResponse } from "next";

const useSecureCookies = process.env.NEXT_PUBLIC_NEXTAUTH_URL.startsWith("https://");
const cookiePrefix = useSecureCookies ? "__Secure-" : ""; 
const domain = process.env.NEXT_PUBLIC_NEXTAUTH_URL.split("//")[1].split(":")[0]

console.log("domain", domain)
export const authOptions = {
  cookies: {
    sessionToken: {
      name: `${cookiePrefix}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        domain: domain,
        secure: useSecureCookies,
      },
    },
    },
  // Configure one or more authentication providers
  providers: [  
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET
    }),
    // ...add more providers here
  ],
  callbacks: {
    async jwt({ token }) {
      console.log("token", token)
      token.userRole = "admin"
      return token
    },
    async session({ session, token, user }) {
      // Send properties to the client, like an access_token from a provider.
      session.accessToken = token.accessToken
      console.log("session", session, token)
      return session
    }
  },
}


export default async function auth(req: NextApiRequest, res: NextApiResponse) {
  // Do whatever you want here, before the request is passed down to `NextAuth`
  console.log("nextAuth", req.url)
  return await NextAuth(req, res, authOptions)
}
// export default NextAuth(authOptions)