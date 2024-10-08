import { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import { exec } from 'child_process';

const secret = process.env.WEBHOOK_SECRET || 'webhook-secret';
const build_command = process.env.BUILD_COMMAND || 'echo $(date) >> filename.txt'

const verifySignature = (req: NextApiRequest, body: string) => {
  const signature = req.headers['x-hub-signature-256'] as string;
  const hmac = crypto.createHmac('sha256', secret);
  const digest = `sha256=${hmac.update(body).digest('hex')}`;

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const body = JSON.stringify(req.body);
  if (!verifySignature(req, body)) {
    return res.status(403).send('Invalid signature');
  }

  const event = req.headers['x-github-event'];

  // Handle the push event
  if (event === 'push') {
    const { ref } = req.body;

    // Check if it's the main branch
    if (ref === 'refs/heads/main') {
      // Execute the rebuild process (adjust the command to fit your setup)
      exec(build_command, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error executing command: ${error}`);
          return res.status(500).send('Error during rebuild');
        }
        console.log(`Rebuild output: ${stdout}`);
        console.error(`Rebuild stderr: ${stderr}`);
        res.status(200).send('Rebuild triggered');
      });
    } else {
      res.status(200).send('Not the main branch');
    }
  } else {
    res.status(400).send('Not a push event');
  }
}

export const config = {
  api: {
    bodyParser: false, // Important for signature validation
  },
};
