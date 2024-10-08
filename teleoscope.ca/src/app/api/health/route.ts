// pages/api/status.ts

import { NextApiRequest, NextApiResponse } from 'next';

// Authentication middleware
const basicAuth = (req: NextApiRequest, res: NextApiResponse) => {
  const auth = req.headers.authorization;

  if (!auth) {
    res.setHeader('WWW-Authenticate', 'Basic');
    res.status(401).json({ message: 'Unauthorized' });
    return false;
  }

  // Extract user and pass from Basic Auth header
  const [scheme, encoded] = auth.split(' ');
  if (scheme !== 'Basic') {
    res.status(401).json({ message: 'Unauthorized' });
    return false;
  }

  const buff = Buffer.from(encoded, 'base64');
  const [user, pass] = buff.toString('utf-8').split(':');

  // Check if the user and pass match
  if (user !== process.env.HEALTH_AUTH_USER || pass !== process.env.HEALTH_AUTH_PASS) {
    res.status(401).json({ message: 'Unauthorized' });
    return false;
  }

  return true;
};

const statusHandler = (req: NextApiRequest, res: NextApiResponse) => {
  // Check authentication first
  if (!basicAuth(req, res)) {
    return;
  }

  // Perform server status checks (for simplicity, just returning "OK" here)
  res.status(200).json({
    status: 'OK',
    uptime: process.uptime(),
    message: 'Server is healthy',
    timestamp: new Date(),
  });
};

export default statusHandler;
