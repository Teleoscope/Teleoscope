import { authOptions } from 'pages/api/auth/[...nextauth]';
import getSession from "next-auth/next";

export default async function handler(req, res) {
  const session = await getSession({req: req, authOptions: authOptions})


  if (!session) {
    res.status(401).json({ message: "You must be logged in.", session: session });
    return;
  }

  return res.json({
    message: 'Success',
    session: session
  })
}