import NextAuth from "next-auth"
import GithubProvider from "next-auth/providers/github"
import EmailProvider from "next-auth/providers/email"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google";
import type { NextApiRequest, NextApiResponse } from "next"

export const authOptions = {
  // Configure one or more authentication providers
  providers: [  
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET
    }),
    // ...add more providers here
  ],
  
}


export default async function auth(req: NextApiRequest, res: NextApiResponse) {
  // Do whatever you want here, before the request is passed down to `NextAuth`
  console.log("nextAuth", req.url)
  return await NextAuth(req, res, authOptions)
}
// export default NextAuth(authOptions)