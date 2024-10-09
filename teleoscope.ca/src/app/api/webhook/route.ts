import { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

const secret = process.env.WEBHOOK_SECRET || 'webhook-secret';
const build_command = process.env.BUILD_COMMAND || 'echo $(date) >> hookbuild.log'; 
const logFilePath = path.join(process.cwd(), 'webhook.log');

// Utility function to log messages
const logToFile = (message: string) => {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp} - ${message}\n`;
  fs.appendFileSync(logFilePath, logMessage, { encoding: 'utf8' });
};

const verifySignature = (req: NextApiRequest, body: string) => {
  const signature = req.headers['x-hub-signature-256'] as string;
  const hmac = crypto.createHmac('sha256', secret);
  const digest = `sha256=${hmac.update(body).digest('hex')}`;

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    logToFile('Invalid request method');
    return res.status(405).send('Method Not Allowed');
  }

  const body = JSON.stringify(req.body);
  if (!verifySignature(req, body)) {
    logToFile('Invalid signature attempt');
    return res.status(403).send('Invalid signature');
  }

  const event = req.headers['x-github-event'];

  // Handle the push event
  if (event === 'push') {
    const { ref } = req.body;

    // Check if it's the frontend branch
    if (ref === 'refs/heads/frontend') {
      exec(build_command, (error, stdout, stderr) => {
        if (error) {
          const errorMessage = `Error executing command: ${error.message}`;
          logToFile(errorMessage);
          return res.status(500).send('Error during rebuild');
        }

        logToFile(`Rebuild triggered successfully. Output: ${stdout}, Stderr: ${stderr}`);
        res.status(200).send('Rebuild triggered');
      });
    } else {
      logToFile(`Push event not on frontend branch: ${ref}`);
      res.status(200).send('Not the main branch');
    }
  } else {
    logToFile(`Unhandled GitHub event: ${event}`);
    res.status(400).send('Not a push event');
  }
}
