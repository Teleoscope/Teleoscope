import { authOptions } from 'pages/api/auth/[...nextauth]';
import { getServerSession } from "next-auth/next";

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions)
  

  if (!session) {
    res.status(401).json({ message: "You must be logged in.", session: session });
    return;
  }

  return res.json({
    message: 'Success',
    session: session
  })
}