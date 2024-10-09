import { NextRequest, NextResponse } from 'next/server';
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

const verifySignature = (req: NextRequest, body: string) => {
  const signature = req.headers.get('x-hub-signature-256') as string;
  const hmac = crypto.createHmac('sha256', secret);
  const digest = `sha256=${hmac.update(body).digest('hex')}`;

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
};

export async function POST(request: NextRequest) {
  if (request.method !== 'POST') {
    logToFile('Invalid request method');
    return NextResponse.json({ message: 'Method Not Allowed' }, { status: 405 });
  }

  const body = await request.text();
  if (!verifySignature(request, body)) {
    logToFile('Invalid signature attempt');
    return NextResponse.json({ message: 'Invalid signature' }, { status: 403 });
  }

  const event = request.headers.get('x-github-event');

  // Handle the push event
  if (event === 'push') {
    const { ref } = JSON.parse(body);

    // Check if it's the frontend branch
    if (ref === 'refs/heads/frontend') {
      exec(build_command, (error, stdout, stderr) => {
        if (error) {
          const errorMessage = `Error executing command: ${error.message}`;
          logToFile(errorMessage);
          return NextResponse.json({ message: 'Error during rebuild' }, { status: 500 });
        }

        logToFile(`Rebuild triggered successfully. Output: ${stdout}, Stderr: ${stderr}`);
        return NextResponse.json({ message: 'Rebuild triggered' }, { status: 200 });
      });
    } else {
      logToFile(`Push event not on frontend branch: ${ref}`);
      return NextResponse.json({ message: 'Not the main branch' }, { status: 200 });
    }
  } else {
    logToFile(`Unhandled GitHub event: ${event}`);
    return NextResponse.json({ message: 'Not a push event' }, { status: 400 });
  }
}
