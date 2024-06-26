import { authOptions } from 'pages/api/auth/[...nextauth]';
import { getServerSession } from "next-auth/next";

// Higher-order function to wrap API handlers with session validation
export default function withSecureSession(handler) {
  return async function secureHandler(req, res) {
    const session = await getServerSession(req, res, authOptions);

    if (!session) {
      return res.status(401).json({ message: "You must be logged in to access." });
    }

    // If session exists, call the original handler with all arguments
    return handler(req, res, session);
  };
}

